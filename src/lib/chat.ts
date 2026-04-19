// Chat-iterate runner.
//
// After a user picks a winning persona, this module drives the follow-up
// conversation inside the same live sandbox:
//   - Load chat history from the DB.
//   - Build Anthropic messages (system = persona + chat-mode append, plus
//     previous turns and the new user message).
//   - Run a tool-use loop: Claude emits tool_use → we execute in the sandbox
//     → feed the tool_result back → repeat until Claude produces a final
//     assistant message (or we hit the tool-loop cap).
//   - Commit applied edits to the sandbox branch and push.
//   - Persist the turn (cost, tokens, latency) in ChatTurn.
//
// The returned iterator emits Server-Sent Events describing the turn.

import Anthropic from '@anthropic-ai/sdk'
import { Daytona, type Sandbox } from '@daytonaio/sdk'
import * as posixPath from 'node:path/posix'
import { getPersona, PersonaId } from './personas'
import { prisma } from './prisma'
import { loadKey } from './byok'
import { emitEvent, EventType } from './events'
import { markActivity } from './sandbox-lifecycle'
import { log } from './log'
import { computeCost, RATES } from './costing'
import { parseDiffStats, type FileDiffStat } from './diff-stats'
import { setupGitAskpass, tokenlessGitHubRemote } from './git-askpass'

export { parseDiffStats, type FileDiffStat }

/**
 * Resolve a model-supplied path against the sandbox repo root, refusing
 * any value that would escape the directory. Prevents Claude (or a prompt
 * injection inside file content Claude reads) from tricking us into
 * read/write of /etc/passwd, ~/.ssh/*, etc.
 */
function safeSandboxPath(repoDir: string, userPath: string): string | null {
  if (typeof userPath !== 'string' || userPath.length === 0) return null
  if (userPath.includes('\0')) return null
  // Reject absolute paths outright; we only accept repo-relative values.
  if (userPath.startsWith('/')) return null
  const resolved = posixPath.normalize(`${repoDir}/${userPath}`)
  const root = repoDir.endsWith('/') ? repoDir : `${repoDir}/`
  if (resolved !== repoDir && !resolved.startsWith(root)) return null
  return resolved
}

// Lazy singleton — see sandbox-lifecycle.ts for rationale (build-time import).
let _daytona: Daytona | null = null
function getDaytona(): Daytona {
  if (!_daytona) _daytona = new Daytona()
  return _daytona
}

export const MAX_TURNS_PER_PARTY = 20
export const TOOL_LOOP_CAP = 8
export const TURN_TIMEOUT_MS = 120_000
export const MAX_EDIT_LINES = 500

const COMMAND_WHITELIST: RegExp[] = [
  /^npm (install|ci)(\s.*)?$/,
  /^npm run (build|test|lint|typecheck|check)(\s.*)?$/,
  /^(pnpm|yarn|bun) (install|run [\w-]+)(\s.*)?$/,
  /^git (diff|log|status|show)(\s.*)?$/,
  /^ls(\s.*)?$/,
  /^cat \S+$/,
  /^head -n ?\d+ \S+$/,
  /^tail -n ?\d+ \S+$/,
]

const INJECTION_CHARS = /[;&|`$]|\$\(/

export function isWhitelisted(cmd: string): boolean {
  const trimmed = cmd.trim()
  if (INJECTION_CHARS.test(trimmed)) return false
  return COMMAND_WHITELIST.some((re) => re.test(trimmed))
}

const CHAT_SYSTEM_APPEND = `

── Chat-Iterate Mode ──
You previously delivered the implementation in this sandbox. The user is now refining interactively.
Keep your original persona's voice but:
- Make the minimum change that satisfies the request
- Read files before editing when unsure of state
- Use apply_edit(mode=patch) for targeted changes, mode=replace only when rewriting <50 lines
- After non-trivial changes consider running \`npm run build\` or \`npm run test\`
- Call request_permission before destructive ops (rm, force-push, schema changes)

Respond conversationally in 1–3 short paragraphs, then execute tools.`

const chatTools: Anthropic.Tool[] = [
  {
    name: 'apply_edit',
    description:
      'Apply an edit to a file in the sandbox. mode=replace sends the full file content; mode=patch sends a unified diff (preferred for multi-hunk edits).',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        mode: { type: 'string', enum: ['replace', 'patch'] },
        content: { type: 'string' },
      },
      required: ['path', 'mode', 'content'],
    },
  },
  {
    name: 'read_file',
    description: 'Read a file from the sandbox.',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
  },
  {
    name: 'run_command',
    description:
      'Run a whitelisted shell command in the sandbox. Whitelist: npm install/ci, npm run <build|test|lint|typecheck|check>, git diff/log/status/show, ls, cat, head, tail.',
    input_schema: {
      type: 'object',
      properties: { command: { type: 'string' } },
      required: ['command'],
    },
  },
  {
    name: 'request_permission',
    description:
      'Ask the user for permission to run a non-whitelisted command. The UI surfaces an approval card; the user accepts or denies before any execution.',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string' },
        rationale: { type: 'string' },
      },
      required: ['command', 'rationale'],
    },
  },
]

export type ChatSseEvent =
  | { event: 'turn_started'; data: { turnIndex: number } }
  | { event: 'text_delta'; data: { content: string } }
  | {
      event: 'tool_call'
      data: { tool: string; input: unknown; toolUseId: string }
    }
  | {
      event: 'tool_result'
      data: { toolUseId: string; output: string; isError?: boolean }
    }
  | { event: 'commit'; data: { sha: string; message: string } }
  | {
      event: 'diff_stats'
      data: { turnIndex: number; files: FileDiffStat[] }
    }
  | {
      event: 'turn_done'
      data: { turnIndex: number; costUsd: number; latencyMs: number }
    }
  | { event: 'turn_failed'; data: { error: string } }

export interface ChatRunContext {
  partyId: string
  userId: string
  userToken: string
}

async function getAnthropicForUser(userId: string): Promise<Anthropic> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferredKeyMode: true },
  })
  if (user?.preferredKeyMode === 'BYOK') {
    const key = await loadKey(userId)
    if (key) return new Anthropic({ apiKey: key })
  }
  return new Anthropic()
}

async function executeTool(
  sandbox: Sandbox,
  repoDir: string,
  name: string,
  input: unknown,
): Promise<{ output: string; isError: boolean; applied?: string }> {
  if (name === 'read_file') {
    const { path } = input as { path: string }
    const safe = safeSandboxPath(repoDir, path)
    if (!safe) {
      return { output: `read_file refused: path "${path}" escapes the repo root.`, isError: true }
    }
    try {
      const buf = await sandbox.fs.downloadFile(safe)
      const text = buf.toString('utf-8')
      return { output: text.slice(0, 20_000), isError: false }
    } catch (error: unknown) {
      return { output: `read_file failed: ${String(error)}`, isError: true }
    }
  }

  if (name === 'apply_edit') {
    const { path, mode, content } = input as {
      path: string
      mode: 'replace' | 'patch'
      content: string
    }
    const safe = safeSandboxPath(repoDir, path)
    if (!safe) {
      return { output: `apply_edit refused: path "${path}" escapes the repo root.`, isError: true }
    }
    const lineCount = content.split('\n').length
    if (lineCount > MAX_EDIT_LINES) {
      return {
        output: `apply_edit refused: ${lineCount} lines exceeds MAX_EDIT_LINES (${MAX_EDIT_LINES}). Split into smaller edits.`,
        isError: true,
      }
    }
    try {
      if (mode === 'replace') {
        await sandbox.fs.uploadFile(Buffer.from(content, 'utf-8'), safe)
        return { output: `Wrote ${path} (${lineCount} lines).`, isError: false, applied: path }
      }
      // mode=patch — write patch to tmp, git apply --reject, report rejects
      const patchPath = `${repoDir}/.patchparty-chat.patch`
      await sandbox.fs.uploadFile(Buffer.from(content, 'utf-8'), patchPath)
      const applyResult = await sandbox.process.executeCommand(
        `cd ${repoDir} && git apply --reject --whitespace=fix .patchparty-chat.patch; rc=$?; rm -f .patchparty-chat.patch; exit $rc`,
      )
      if (applyResult.exitCode !== 0) {
        return {
          output: `git apply failed (exit ${applyResult.exitCode}):\n${applyResult.result?.slice(0, 4000) ?? ''}`,
          isError: true,
        }
      }
      return { output: `Patch applied to ${path}.`, isError: false, applied: path }
    } catch (error: unknown) {
      return { output: `apply_edit failed: ${String(error)}`, isError: true }
    }
  }

  if (name === 'run_command') {
    const { command } = input as { command: string }
    if (!isWhitelisted(command)) {
      return {
        output: `Command not whitelisted. Call request_permission first: ${command}`,
        isError: true,
      }
    }
    try {
      const exec = await sandbox.process.executeCommand(
        `cd ${repoDir} && ${command}`,
      )
      const output = (exec.result ?? '').slice(0, 8000)
      return {
        output: `exit=${exec.exitCode}\n${output}`,
        isError: (exec.exitCode ?? 0) !== 0,
      }
    } catch (error: unknown) {
      return { output: `run_command threw: ${String(error)}`, isError: true }
    }
  }

  if (name === 'request_permission') {
    // v2.0: auto-deny non-whitelisted commands. Approval UI ships later.
    // Opus sees the denial and must pivot.
    const { command } = input as { command: string; rationale: string }
    return {
      output: `Permission denied for "${command}". Non-whitelisted commands require user approval (UI not yet available in v2.0). Use only whitelisted commands.`,
      isError: false,
    }
  }

  return { output: `Unknown tool: ${name}`, isError: true }
}

// Any pending ChatTurn row older than this is considered crashed and eligible
// for reaping on the next reservation. TURN_TIMEOUT_MS is 120 s, so 2× gives
// the in-flight turn headroom for slow final-commit pushes before another
// tab's turn is allowed to claim the slot.
const LIVE_PENDING_WINDOW_MS = TURN_TIMEOUT_MS * 2

type ReservationResult =
  | { kind: 'ok'; turnIndex: number; turnId: string }
  | { kind: 'inflight' }
  | { kind: 'cap_reached' }

/**
 * Reserve the next turnIndex atomically. Holds a Postgres transaction-bound
 * advisory lock while it (a) checks for any live pending turn, (b) reaps
 * stale pending rows, (c) checks the 20-turn cap, (d) inserts a pending
 * row with the computed turnIndex. The advisory lock serialises concurrent
 * reservations; the pending row then serves as the cross-request in-flight
 * signal until the caller updates it to applied/failed.
 */
async function reserveTurnSlot(
  partyId: string,
  userMessage: string,
): Promise<ReservationResult> {
  return prisma.$transaction(async (tx) => {
    const lockRow = await tx.$queryRaw<{ ok: boolean }[]>`
      SELECT pg_try_advisory_xact_lock(hashtext(${partyId})::bigint) AS ok
    `
    if (!lockRow[0]?.ok) return { kind: 'inflight' as const }

    const livePendingCutoff = new Date(Date.now() - LIVE_PENDING_WINDOW_MS)
    const livePending = await tx.chatTurn.findFirst({
      where: {
        partyId,
        status: 'pending',
        createdAt: { gte: livePendingCutoff },
      },
      select: { id: true },
    })
    if (livePending) return { kind: 'inflight' as const }

    await tx.chatTurn.updateMany({
      where: { partyId, status: 'pending', createdAt: { lt: livePendingCutoff } },
      data: { status: 'failed', error: 'stale pending reaped' },
    })

    const existingTurns = await tx.chatTurn.count({ where: { partyId } })
    if (existingTurns >= MAX_TURNS_PER_PARTY) {
      return { kind: 'cap_reached' as const }
    }

    const turnIndex = existingTurns
    const row = await tx.chatTurn.create({
      data: {
        partyId,
        turnIndex,
        userMessage,
        diffApplied: [],
        status: 'pending',
      },
      select: { id: true },
    })
    return { kind: 'ok' as const, turnIndex, turnId: row.id }
  })
}

interface TurnResult {
  assistantText: string
  commitSha?: string
  diffStats: FileDiffStat[]
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheCreateTokens: number
  costUsd: number
  latencyMs: number
  toolCalls: Array<{ name: string; input: unknown }>
  filesApplied: string[]
}

async function buildMessageHistory(
  partyId: string,
): Promise<Anthropic.MessageParam[]> {
  const turns = await prisma.chatTurn.findMany({
    where: { partyId, status: 'applied' },
    orderBy: { turnIndex: 'asc' },
    take: 30,
  })
  const history: Anthropic.MessageParam[] = []
  for (const t of turns) {
    history.push({ role: 'user', content: t.userMessage })
    if (t.assistantResponse) {
      history.push({ role: 'assistant', content: t.assistantResponse })
    }
  }
  return history
}

export interface CommitTurnResult {
  sha: string
  diffStats: FileDiffStat[]
}

async function commitTurn(
  sandbox: Sandbox,
  repoDir: string,
  userToken: string,
  party: { repoOwner: string; repoName: string },
  branch: string,
  message: string,
): Promise<CommitTurnResult | undefined> {
  try {
    // Base64-encode the commit message so backticks, $(), and other shell
    // metacharacters in user input cannot escape into the shell. The shell
    // only sees the base64 alphabet [A-Za-z0-9+/=].
    const truncated = message.slice(0, 200)
    const encoded = Buffer.from(truncated, 'utf-8').toString('base64')
    const exec = await sandbox.process.executeCommand(
      `cd ${repoDir} && git add -A && msg=$(echo ${encoded} | base64 -d) && git -c user.email=chat@patchparty.dev -c user.name="PatchParty Chat" commit -m "chat: $msg" || echo 'nothing-to-commit'`,
    )
    if ((exec.result ?? '').includes('nothing-to-commit')) return undefined

    // Push via GIT_ASKPASS helper so the token never lands in argv (Daytona
    // captures command lines in its process logs). See src/lib/git-askpass.ts.
    const askpass = await setupGitAskpass(sandbox, userToken)
    try {
      const remote = tokenlessGitHubRemote(party.repoOwner, party.repoName)
      await sandbox.process.executeCommand(
        `cd ${repoDir} && ${askpass.envPrefix} git -c credential.helper= push "${remote}" HEAD:${branch}`,
      )
    } finally {
      await askpass.cleanup()
    }
    const shaExec = await sandbox.process.executeCommand(
      `cd ${repoDir} && git rev-parse HEAD`,
    )
    const sha = shaExec.result?.trim()
    if (!sha) return undefined

    // Capture per-file diff stats for this commit so the UI can render
    // TurnCard pills without re-running git later (works even once the
    // sandbox is paused/terminated).
    const numstatExec = await sandbox.process.executeCommand(
      `cd ${repoDir} && git show --numstat --format= HEAD`,
    )
    const namestatusExec = await sandbox.process.executeCommand(
      `cd ${repoDir} && git show --name-status --format= HEAD`,
    )
    const diffStats = parseDiffStats(
      numstatExec.result ?? '',
      namestatusExec.result ?? '',
    )
    return { sha, diffStats }
  } catch (error: unknown) {
    log.error('chat.commitTurn failed', { error: String(error) })
    return undefined
  }
}

export async function* runChatTurn(
  ctx: ChatRunContext,
  userMessage: string,
): AsyncGenerator<ChatSseEvent, TurnResult | null, void> {
  const start = Date.now()

  const party = await prisma.party.findUnique({
    where: { id: ctx.partyId },
    include: { agents: true },
  })
  if (!party || !party.chatSessionAgentId) {
    yield { event: 'turn_failed', data: { error: 'no chat session' } }
    return null
  }
  if (party.userId !== ctx.userId) {
    yield { event: 'turn_failed', data: { error: 'forbidden' } }
    return null
  }

  const agent = party.agents.find((a) => a.id === party.chatSessionAgentId)
  if (!agent?.sandboxId || !agent.branchName) {
    yield { event: 'turn_failed', data: { error: 'sandbox missing' } }
    return null
  }

  let reservation: ReservationResult
  try {
    reservation = await reserveTurnSlot(ctx.partyId, userMessage)
  } catch (error: unknown) {
    log.error('chat.reserveTurnSlot failed', {
      partyId: ctx.partyId,
      error: String(error),
    })
    yield { event: 'turn_failed', data: { error: 'internal error' } }
    return null
  }
  if (reservation.kind === 'inflight') {
    yield {
      event: 'turn_failed',
      data: { error: 'Another turn is in progress. Wait a moment.' },
    }
    return null
  }
  if (reservation.kind === 'cap_reached') {
    yield {
      event: 'turn_failed',
      data: { error: 'Chat session limit reached. Ship the PR to finalize.' },
    }
    return null
  }

  const { turnIndex, turnId } = reservation
  yield { event: 'turn_started', data: { turnIndex } }

  const persona = getPersona(agent.personaId as PersonaId)
  const systemPrompt = persona.systemPrompt + CHAT_SYSTEM_APPEND

  const history = await buildMessageHistory(ctx.partyId)
  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: 'user', content: userMessage },
  ]

  void emitEvent(EventType.CHAT_TURN_SENT, {
    partyId: ctx.partyId,
    agentId: agent.id,
    turnIndex,
  })
  await markActivity(ctx.partyId)

  const anthropic = await getAnthropicForUser(ctx.userId)
  const sandbox = await getDaytona().get(agent.sandboxId)
  const repoDir = '/home/daytona/repo'

  let totalInput = 0
  let totalOutput = 0
  let cacheRead = 0
  let cacheCreate = 0
  let assistantText = ''
  const toolCalls: Array<{ name: string; input: unknown }> = []
  const filesApplied: string[] = []
  let errorMessage: string | undefined

  try {
    for (let loop = 0; loop < TOOL_LOOP_CAP; loop++) {
      if (Date.now() - start > TURN_TIMEOUT_MS) {
        errorMessage = 'turn timed out'
        break
      }

      const response = await anthropic.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 4096,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: chatTools,
        messages,
      })

      totalInput += response.usage.input_tokens
      totalOutput += response.usage.output_tokens
      cacheRead += response.usage.cache_read_input_tokens ?? 0
      cacheCreate += response.usage.cache_creation_input_tokens ?? 0

      const toolUses: Anthropic.ToolUseBlock[] = []
      for (const block of response.content) {
        if (block.type === 'text') {
          assistantText += block.text
          yield { event: 'text_delta', data: { content: block.text } }
        } else if (block.type === 'tool_use') {
          toolUses.push(block)
          toolCalls.push({ name: block.name, input: block.input })
          yield {
            event: 'tool_call',
            data: { tool: block.name, input: block.input, toolUseId: block.id },
          }
        }
      }

      if (response.stop_reason !== 'tool_use' || toolUses.length === 0) {
        break
      }

      messages.push({ role: 'assistant', content: response.content })

      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const tu of toolUses) {
        const result = await executeTool(sandbox, repoDir, tu.name, tu.input)
        if (result.applied) filesApplied.push(result.applied)
        yield {
          event: 'tool_result',
          data: {
            toolUseId: tu.id,
            output: result.output,
            isError: result.isError,
          },
        }
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: result.output,
          is_error: result.isError,
        })
      }
      messages.push({ role: 'user', content: toolResults })
    }
  } catch (error: unknown) {
    // Redact: Anthropic SDK errors can echo headers/keys into the message
    // and we yield this string verbatim into the SSE stream.
    if (error instanceof Anthropic.APIError) {
      errorMessage = `Anthropic API error (status ${error.status})`
    } else if (error instanceof Error) {
      errorMessage = error.name === 'AbortError' ? 'turn aborted' : 'internal error'
    } else {
      errorMessage = 'internal error'
    }
    log.error('chat.runChatTurn failed', {
      partyId: ctx.partyId,
      error: String(error),
    })
  }

  const latencyMs = Date.now() - start
  const costUsd = computeCost({
    model: 'opus',
    inputTokens: totalInput,
    outputTokens: totalOutput,
    cacheReadTokens: cacheRead,
    cacheCreateTokens: cacheCreate,
  })

  let commitSha: string | undefined
  let diffStats: FileDiffStat[] = []
  if (filesApplied.length > 0 && !errorMessage) {
    const committed = await commitTurn(
      sandbox,
      repoDir,
      ctx.userToken,
      party,
      agent.branchName,
      userMessage.slice(0, 80),
    )
    if (committed) {
      commitSha = committed.sha
      diffStats = committed.diffStats
      yield {
        event: 'commit',
        data: { sha: committed.sha, message: userMessage.slice(0, 80) },
      }
      yield {
        event: 'diff_stats',
        data: { turnIndex, files: committed.diffStats },
      }
    }
  }

  const status = errorMessage ? 'failed' : 'applied'
  try {
    await prisma.chatTurn.update({
      where: { id: turnId },
      data: {
        assistantResponse: assistantText || null,
        toolCalls: toolCalls as unknown as object,
        diffApplied: filesApplied,
        diffStats: diffStats as unknown as object,
        commitSha: commitSha ?? null,
        inputTokens: totalInput,
        outputTokens: totalOutput,
        cacheReadTokens: cacheRead,
        cacheCreateTokens: cacheCreate,
        latencyMs,
        costUsd: costUsd.toFixed(4),
        status,
        error: errorMessage ?? null,
      },
    })
  } catch (error: unknown) {
    log.error('chat.persist failed', { error: String(error) })
  }

  void emitEvent(
    errorMessage ? EventType.CHAT_TURN_FAILED : EventType.CHAT_TURN_APPLIED,
    {
      partyId: ctx.partyId,
      agentId: agent.id,
      turnIndex,
      costUsd,
      filesApplied,
      ...(errorMessage ? { error: errorMessage } : {}),
    },
  )

  if (errorMessage) {
    yield { event: 'turn_failed', data: { error: errorMessage } }
    return null
  }
  yield { event: 'turn_done', data: { turnIndex, costUsd, latencyMs } }

  return {
    assistantText,
    commitSha,
    diffStats,
    inputTokens: totalInput,
    outputTokens: totalOutput,
    cacheReadTokens: cacheRead,
    cacheCreateTokens: cacheCreate,
    costUsd,
    latencyMs,
    toolCalls,
    filesApplied,
  }
}

export { RATES }
