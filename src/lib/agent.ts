// The agent that runs in a single Daytona sandbox.
// Spawns sandbox, clones repo, runs Claude, applies changes,
// starts dev-server, generates Live-Preview URL. KEEPS SANDBOX ALIVE.

import { Daytona } from '@daytonaio/sdk'
import Anthropic from '@anthropic-ai/sdk'
import { Persona } from './personas'
import { AgentState, AgentStatus, Party } from './types'
import { partyStore } from './store'
import { setupGitAskpass, tokenlessGitHubRemote } from './git-askpass'

const anthropic = new Anthropic()
const daytona = new Daytona()

// How long to keep the sandbox alive after success (for live preview).
// User has this long to inspect & pick. Then auto-stops.
const PREVIEW_LIFETIME_MINUTES = 15

export interface RunAgentOptions {
  /** GitHub OAuth access token of the user who started the party — used to push the branch. */
  userToken: string
}

export async function runAgent(
  party: Party,
  persona: Persona,
  options: RunAgentOptions,
): Promise<void> {
  const emit = (state: Partial<AgentState>) => {
    partyStore.emit(party.id, {
      type: 'agent_update',
      persona: persona.id,
      state,
    })
    partyStore.update(party.id, (p) => ({
      ...p,
      agents: {
        ...p.agents,
        [persona.id]: { ...(p.agents[persona.id] ?? {}), ...state },
      },
    }))
  }

  const setStatus = (status: AgentStatus, message: string) => {
    emit({ status, message })
  }

  let sandbox
  let success = false

  try {
    // 1. Spin up PUBLIC sandbox (so preview URLs work in iframes without auth)
    setStatus('initializing', 'Spinning up sandbox...')
    sandbox = await daytona.create({
      language: 'typescript',
      public: true,
      autoStopInterval: PREVIEW_LIFETIME_MINUTES,
    })

    // 2. Clone the repo (shallow for speed)
    setStatus('cloning', `Cloning ${party.repoOwner}/${party.repoName}...`)
    await sandbox.process.executeCommand(
      `cd /home/daytona && git clone --depth 1 https://github.com/${party.repoOwner}/${party.repoName}.git repo`,
    )

    // 3. Read codebase context for Claude
    setStatus('reading', 'Reading codebase...')
    const fileList = await sandbox.process.executeCommand(
      `cd /home/daytona/repo && find . -type f \\( -name "*.tsx" -o -name "*.jsx" -o -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" -o -name "*.css" \\) ! -path "*/node_modules/*" ! -path "*/.git/*" | head -25`,
    )
    const filesForContext = fileList.result?.split('\n').filter(Boolean) ?? []

    const contextFiles: string[] = []
    for (const f of filesForContext.slice(0, 12)) {
      try {
        const content = await sandbox.fs.downloadFile(
          `/home/daytona/repo/${f.replace('./', '')}`,
        )
        const text = content.toString('utf-8').slice(0, 2500)
        contextFiles.push(`--- ${f} ---\n${text}`)
      } catch {
        // skip unreadable files
      }
    }

    // 4. Generate code with Claude using persona prompt
    setStatus('generating', `${persona.name} is thinking...`)
    // Opus 4.7 rejects the assistant-message prefill trick with
    // invalid_request_error ("model does not support assistant message
    // prefill"). Instead we steer via the user prompt — tells Claude the
    // exact opening token — and rely on parseClaudeResponse's regex
    // extractor to handle any stray prose that slips through.
    const opener = persona.id === 'innovator' ? '{' : '['
    const closer = persona.id === 'innovator' ? '}' : ']'
    const userPrompt = `${buildUserPrompt(party, contextFiles)}

Begin your response immediately with \`${opener}\` and end with \`${closer}\`. No prose, no markdown fences, no commentary — only raw JSON.`

    const startGen = Date.now()
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 16000,
      system: persona.systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    if (response.stop_reason === 'max_tokens') {
      throw new Error(
        `Claude hit max_tokens (${response.usage.output_tokens}) before finishing the JSON — response is truncated`,
      )
    }

    const fullText = textContent.text

    // 5. Apply code changes to sandbox filesystem
    setStatus('writing', 'Applying changes...')
    const fileChanges = parseClaudeResponse(fullText, persona.id)

    let linesAdded = 0
    for (const change of fileChanges) {
      const fullPath = `/home/daytona/repo/${change.path}`
      const parentDir = fullPath.substring(0, fullPath.lastIndexOf('/'))
      await sandbox.process.executeCommand(`mkdir -p ${parentDir}`)
      await sandbox.fs.uploadFile(Buffer.from(change.content), fullPath)
      linesAdded += change.content.split('\n').length
    }

    // 6. Install deps + start dev server (THE LOVABLE MOMENT)
    setStatus('testing', 'Installing dependencies...')
    const installResult = await sandbox.process.executeCommand(
      'cd /home/daytona/repo && npm install --no-audit --no-fund --prefer-offline',
      undefined,
      undefined,
      300_000, // 5 min timeout
    )

    if (installResult.exitCode !== 0) {
      console.error(`[${persona.id}] npm install failed:`, installResult.result)
      // Continue — preview won't work but PR data still useful
    }

    setStatus('committing', 'Starting dev server...')
    // Start dev server detached
    await sandbox.process.executeCommand(
      'cd /home/daytona/repo && nohup npm run dev > /tmp/dev.log 2>&1 &',
    )

    // Wait for dev-server to bind to port 3000
    await new Promise((resolve) => setTimeout(resolve, 4000))

    // 7. Get the Live Preview URL — THE MAGIC
    let previewUrl: string | undefined
    let previewToken: string | undefined
    try {
      const preview = await sandbox.getPreviewLink(3000)
      previewUrl = preview.url
      previewToken = preview.token
      console.log(`[${persona.id}] Preview live at:`, previewUrl)
    } catch (e) {
      console.error(`[${persona.id}] Could not get preview URL:`, e)
    }

    // 8. Branch + commit + push (so the PR endpoint can reference the branch).
    // Push via GIT_ASKPASS helper: the token never lands in argv (Daytona
    // captures executeCommand argv in its process logs).
    //
    // The commit message carries `party.issueTitle` which originates from
    // GitHub's API — not PatchParty user input — but GitHub issue titles
    // can still contain backticks, $(), pipes, and semicolons. Base64 the
    // message so shell metacharacters can never escape into the commit
    // command, matching the pattern used by commitTurn in chat.ts.
    const branchName = `patchparty/${persona.id}/${party.id.slice(0, 8)}`
    const commitMessage = `feat: ${party.issueTitle} (via PatchParty: ${persona.name})`
    const commitMessageB64 = Buffer.from(
      commitMessage.slice(0, 300),
      'utf-8',
    ).toString('base64')
    await sandbox.process.executeCommand(
      `cd /home/daytona/repo && git config user.email "bot@patchparty.dev" && git config user.name "PatchParty ${persona.name}" && git checkout -b ${branchName} && git add -A && msg=$(echo ${commitMessageB64} | base64 -d) && git commit -m "$msg" --allow-empty`,
    )
    const askpass = await setupGitAskpass(sandbox, options.userToken)
    try {
      const remote = tokenlessGitHubRemote(party.repoOwner, party.repoName)
      await sandbox.process.executeCommand(
        `cd /home/daytona/repo && ${askpass.envPrefix} git -c credential.helper= push "${remote}" ${branchName}`,
      )
    } finally {
      await askpass.cleanup()
    }

    // Generate human-friendly summary using cheaper Haiku
    const summary = await generateSummary(persona, fileChanges, party.issueTitle)

    success = true

    emit({
      status: 'done',
      message: previewUrl ? `${persona.name} is live.` : `${persona.name} done.`,
      finishedAt: Date.now(),
      stats: {
        linesAdded,
        linesRemoved: 0,
        filesChanged: fileChanges.length,
        durationMs: Date.now() - startGen,
      },
      result: {
        files: fileChanges,
        branchName,
        summary,
        previewUrl,
        previewToken,
        sandboxId: sandbox.id,
      },
    })
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err)
    const friendly = friendlyAgentError(raw)
    console.error(`[${persona.id}] Error:`, err)
    emit({
      status: 'error',
      message: friendly,
      error: raw,
    })
  } finally {
    // CRITICAL: only delete sandbox on FAILURE.
    // On success: keep alive so the user can see the preview.
    // autoStopInterval (15 min) cleans up automatically.
    if (sandbox && !success) {
      try {
        await daytona.delete(sandbox)
      } catch (e) {
        console.error('Cleanup failed:', e)
      }
    }
  }
}

function buildUserPrompt(party: Party, contextFiles: string[]): string {
  return `# GitHub Issue to Implement

**Title:** ${party.issueTitle}

**Description:**
${party.issueBody}

---

# Codebase Context (selected files)

${contextFiles.join('\n\n')}

---

# Your Task

Implement this issue according to your philosophy. Return ONLY a JSON response in the format specified in your system prompt — no markdown fences, no explanation outside the JSON.

CRITICAL: After your changes, the dev server (npm run dev) will be started automatically and shown to the user as a LIVE PREVIEW. Make sure your code COMPILES and the dev server boots without errors. Don't introduce missing dependencies — use only what's already in package.json.`
}

/**
 * Map raw agent errors to short, user-facing messages. The full raw message
 * still lands in AgentState.error for the "Show details" expander in the UI.
 */
function friendlyAgentError(raw: string): string {
  const s = raw.toLowerCase()
  if (s.includes('max_tokens') || s.includes('truncated')) {
    return 'Claude ran out of output tokens before finishing — the issue is too large for one pass. Try a narrower issue.'
  }
  if (s.includes('invalid json') || s.includes('could not parse claude')) {
    return 'Claude returned malformed JSON. This sometimes happens on complex issues — try again.'
  }
  if (s.includes('rate_limit') || s.includes('429')) {
    return 'Anthropic rate limit hit. Wait a minute and retry.'
  }
  if (s.includes('overloaded')) {
    return 'Anthropic API is overloaded. Retry in a few seconds.'
  }
  if (s.includes('timeout') || s.includes('timed out')) {
    return 'Operation timed out. The sandbox or Claude call took too long.'
  }
  if (s.includes('git push') || s.includes('authentication failed')) {
    return 'Could not push branch to GitHub. Check that the app has write access to this repo.'
  }
  if (s.includes('npm install') || s.includes('enoent') || s.includes('eresolve')) {
    return 'Dependency install failed in the sandbox.'
  }
  if (s.includes('sandbox') && s.includes('limit')) {
    return 'Daytona sandbox quota reached. Try again in a moment.'
  }
  return 'Agent failed. Open details below for the exact error.'
}

/** Strip trailing commas before `]` or `}` — a common Claude LLM mistake. */
function stripTrailingCommas(s: string): string {
  return s.replace(/,(\s*[\]}])/g, '$1')
}

function tryParse(s: string): unknown | null {
  try {
    return JSON.parse(s)
  } catch {
    try {
      return JSON.parse(stripTrailingCommas(s))
    } catch {
      return null
    }
  }
}

function normalizeShape(
  parsed: unknown,
  personaId: string,
): Array<{ path: string; action: 'create' | 'modify'; content: string }> | null {
  if (Array.isArray(parsed)) {
    return parsed as Array<{ path: string; action: 'create' | 'modify'; content: string }>
  }
  if (
    personaId === 'innovator' &&
    parsed &&
    typeof parsed === 'object' &&
    Array.isArray((parsed as { base?: unknown }).base)
  ) {
    return (parsed as { base: Array<{ path: string; action: 'create' | 'modify'; content: string }> }).base
  }
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { files?: unknown }).files)) {
    return (parsed as { files: Array<{ path: string; action: 'create' | 'modify'; content: string }> }).files
  }
  return null
}

/** Extract the line/column around a JSON.parse error position for diagnostics. */
function snippetAround(source: string, positionMatch: RegExpMatchArray | null): string {
  if (!positionMatch) return ''
  const pos = Number(positionMatch[1])
  const start = Math.max(0, pos - 40)
  const end = Math.min(source.length, pos + 40)
  return source.slice(start, end).replace(/\s+/g, ' ')
}

function parseClaudeResponse(
  text: string,
  personaId: string,
): Array<{ path: string; action: 'create' | 'modify'; content: string }> {
  let cleaned = text.trim()
  // Strip ``` fences if Claude added them despite instructions
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')

  // 1) Whole-response parse, with trailing-comma salvage
  const direct = tryParse(cleaned)
  if (direct !== null) {
    const shape = normalizeShape(direct, personaId)
    if (shape) return shape
  }

  // 2) Extract first JSON block from anywhere in the response
  const match = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/)
  if (match) {
    const extracted = tryParse(match[0])
    if (extracted !== null) {
      const shape = normalizeShape(extracted, personaId)
      if (shape) return shape
    }
  }

  // 3) Give up — surface a precise diagnostic
  let detail = 'invalid JSON'
  try {
    JSON.parse(cleaned)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const pos = msg.match(/position (\d+)/)
    const snippet = snippetAround(cleaned, pos)
    detail = snippet ? `${msg} — near: "…${snippet}…"` : msg
  }
  throw new Error(`Claude returned invalid JSON (${detail})`)
}

async function generateSummary(
  persona: Persona,
  files: Array<{ path: string; action: string; content: string }>,
  issueTitle: string,
): Promise<string> {
  try {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `${persona.name} (${persona.tagline}) implemented "${issueTitle}" by changing ${files.length} file(s): ${files.map((f) => f.path).join(', ')}. In 2 sentences, explain what this implementation prioritizes and what tradeoffs it makes. Match the persona's philosophy.`,
        },
      ],
    })
    const text = resp.content.find((c) => c.type === 'text')
    return text && text.type === 'text' ? text.text : 'Implementation complete.'
  } catch {
    return `${persona.name} implementation: ${files.length} files changed.`
  }
}
