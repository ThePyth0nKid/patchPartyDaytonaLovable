# 03 — Chat-iterate Runner

## Why

The actual product-differentiator. After the race, user picks a winner and iterates via chat — code changes happen live in the already-running sandbox, preview reloads, commits pile up on the same branch, PR ships with full history.

## Flow

1. User clicks "Pick this one" on a done agent.
2. `POST /api/party/[id]/pick { agentId }`:
   - Insert `PickDecision`.
   - Set `Party.chatSessionAgentId = agentId`.
   - Set `Party.sandboxState = ACTIVE`, `sandboxLastActivityAt = now()`.
   - Terminate other 4 sandboxes: `daytona.sandbox.delete()` for each non-picked agent's `sandboxId`.
   - Emit `persona.picked`.
3. UI switches to split-layout: chat-pane + preview-iframe.
4. User types message, submits. `POST /api/party/[id]/chat { message }`:
   - Load `ChatTurn` history for this party.
   - Build Anthropic messages array: system-prompt (picked persona + chat-append), history, new user message.
   - Stream Anthropic response. When tool-call arrives, execute in sandbox, stream result back into conversation.
   - On final assistant message: commit to sandbox git, insert `ChatTurn`, emit `chat.turn.applied`.

## Tools Opus Can Call

```ts
const chatTools: Anthropic.Tool[] = [
  {
    name: 'apply_edit',
    description: 'Apply a text edit to a file in the sandbox. Unified diff format preferred for multi-hunk edits.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to repo root' },
        mode: { type: 'string', enum: ['replace', 'patch'] },
        content: { type: 'string', description: 'Full file content (mode=replace) or unified diff (mode=patch)' },
      },
      required: ['path', 'mode', 'content'],
    },
  },
  {
    name: 'read_file',
    description: 'Read a file from the sandbox. Use before apply_edit when unsure of current content.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
      },
      required: ['path'],
    },
  },
  {
    name: 'run_command',
    description: 'Run a whitelisted shell command in the sandbox. Whitelist: npm install, npm run build/test/lint, git diff, git log, git status, ls, cat (with path arg). For anything else, call request_permission first.',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string' },
      },
      required: ['command'],
    },
  },
  {
    name: 'request_permission',
    description: 'Ask the user for permission to run a non-whitelisted command. They will approve or deny in the UI.',
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
```

## Command Whitelist

Regex-gated in `src/lib/chat.ts`:

```ts
const COMMAND_WHITELIST = [
  /^npm (install|ci)(\s.*)?$/,
  /^npm run (build|test|lint|typecheck|check)(\s.*)?$/,
  /^(pnpm|yarn|bun) (install|run [\w-]+)(\s.*)?$/,
  /^git (diff|log|status|show)(\s.*)?$/,
  /^ls(\s.*)?$/,
  /^cat \S+$/,
  /^head -n ?\d+ \S+$/,
  /^tail -n ?\d+ \S+$/,
]
export function isWhitelisted(cmd: string): boolean {
  return COMMAND_WHITELIST.some((re) => re.test(cmd.trim()))
}
```

Any shell-injection character (`;`, `|`, `&`, `\``, `$(`) → reject even if prefix matches.

## Limits (hardcoded v2.0)

- **Max 20 chat-turns** per party session.
- **Auto-summarization** after turn 8: Haiku condenses turns 1..5 into a single context-blob sent as system-prompt append. Saves input-tokens significantly.
- **`apply_edit` max 500 diff-lines per call** — prevents runaway rewrites.
- **Tool-loop max 8 iterations** — an Opus turn can chain tool_use → tool_result → tool_use, but cap at 8 to prevent infinite loops.
- **Per-turn wall-clock timeout**: 120s. Abort + emit `chat.turn.failed` if exceeded.

## Chat System-Prompt Append

Appended after picked persona's system prompt:

```
── Chat-Iterate Mode ──
You previously delivered the implementation in this sandbox. The user is now refining interactively.
Keep your original persona's voice but:
- Make the minimum change that satisfies the request
- Read files before editing when unsure of state
- Use apply_edit(mode=patch) for targeted changes, mode=replace only when rewriting <50 lines
- After making changes, consider running a quick `npm run build` or `npm run test` if the change is non-trivial
- Ask request_permission before destructive ops (rm, force-push, schema changes)

Respond conversationally in 1-3 short paragraphs, then execute tools.
```

## SSE Chunk Stream

`/api/party/[id]/chat` returns `text/event-stream`:

```
event: turn_started
data: {"turnIndex": 3}

event: text_delta
data: {"content": "I'll update the button color now."}

event: text_delta
data: {"content": " Reading the current file first..."}

event: tool_call
data: {"tool": "read_file", "input": {"path": "src/Button.tsx"}}

event: tool_result
data: {"toolUseId": "...", "output": "..."}

event: tool_call
data: {"tool": "apply_edit", "input": {...}}

event: commit
data: {"sha": "abc123", "message": "chat: make button teal"}

event: turn_done
data: {"turnIndex": 3, "costUsd": 0.0234, "latencyMs": 8420}
```

Chunk flush cadence: every 500ms (accumulate text_delta events in a buffer, flush on interval). Token-stream variant flushes per-token, ships in v2.1.

## Schema additions (Party)

```prisma
chatSessionAgentId    String?
sandboxState          SandboxState  @default(ACTIVE)
sandboxLastActivityAt DateTime?
sandboxPausedAt       DateTime?

enum SandboxState {
  ACTIVE
  IDLE_WARN
  PAUSED
  RESUMING
  TERMINATED
}
```

## Acceptance

1. Pick → other 4 sandboxes gone within 5s (check Daytona dashboard).
2. 5 consecutive chat-turns → 5 git commits on branch, 5 rows in ChatTurn table, `SELECT sum(cost_usd) FROM chat_turns WHERE party_id = '...'` < $0.50.
3. Tool-loop: user says "make the button teal and run tests" → sequence: read_file → apply_edit → run_command(npm run test) → text response with test result.
4. Non-whitelisted command: Opus calls `request_permission('rm -rf node_modules', 'clean rebuild')` → UI shows approval card → user accepts → re-runs as `run_command`.
5. 21st turn attempt → API returns 429 "Chat session limit reached. Ship PR to finalize."
