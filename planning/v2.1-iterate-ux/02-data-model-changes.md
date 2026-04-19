# Data Model Changes — P0 Prerequisite

The TurnCard design depends on data that does not exist in the current schema. **This sprint must ship before any UI work.** Red team correctly flagged: without line counts and commitSha persisted per turn, the file-pills and DiffDrawer have nothing to render.

## Current state (verified by reading the code, not guessed)

From `src/lib/chat.ts` `runChatTurn` (lines 336-569):

```ts
await prisma.chatTurn.create({
  data: {
    partyId,
    turnIndex,                 // existingTurns (COUNT)
    userMessage,
    assistantResponse,
    toolCalls: toolCalls,      // JSON
    diffApplied: filesApplied, // string[] — JUST PATHS, no counts, no diff content
    inputTokens, outputTokens, cacheReadTokens, cacheCreateTokens,
    latencyMs, costUsd,
    status,                    // 'applied' | 'failed'
    error,
  },
})
```

`commitSha` is **captured** in the code (`commitTurn` returns it, yielded as SSE `commit` event) but **not persisted** in `ChatTurn`.

## Target state (what UI needs)

### Prisma schema changes

File: `prisma/schema.prisma` — `ChatTurn` model.

```prisma
model ChatTurn {
  id                      String   @id @default(cuid())
  partyId                 String
  turnIndex               Int
  userMessage             String
  assistantResponse       String?
  toolCalls               Json?
  diffApplied             String[] // KEEP — backwards compat; flat path list
  // NEW:
  diffStats               Json?    // Array<{ path: string, added: number, removed: number, status: 'A'|'M'|'D' }>
  commitSha               String?  // SHA of the single commit this turn produced
  revertedByTurnIndex     Int?     // if this turn was later reverted, index of the revert turn
  // existing:
  inputTokens             Int
  outputTokens            Int
  cacheReadTokens         Int
  cacheCreateTokens       Int
  latencyMs               Int
  costUsd                 Decimal
  status                  String   // 'applied' | 'failed' | 'undone' (NEW VALUE)
  error                   String?
  createdAt               DateTime @default(now())
  party                   Party    @relation(fields: [partyId], references: [id], onDelete: Cascade)

  @@unique([partyId, turnIndex])
  @@index([partyId])
}
```

File: `prisma/schema.prisma` — `Agent` model.

```prisma
model Agent {
  // ...existing fields
  sandboxId                String?
  // NEW:
  sandboxTerminatedAt      DateTime?  // set when loser sandbox is destroyed at pick
  // ...
}
```

Migration path: `npx prisma migrate dev --create-only --name v2_1_iterate_turn_diff`, review SQL, then `prisma migrate deploy` only with explicit user consent.

## chat.ts runtime changes

### New function: compute diff stats after commit

In `src/lib/chat.ts`, extend `commitTurn` to also run `git show --numstat HEAD^..HEAD` and `git show --name-status HEAD^..HEAD`, parse, return.

```ts
// After the git push succeeds, before returning the SHA:
const numstat = await sandbox.process.executeCommand(
  `cd ${repoDir} && git show --numstat --format= HEAD`,
)
const namestatus = await sandbox.process.executeCommand(
  `cd ${repoDir} && git show --name-status --format= HEAD`,
)
const diffStats = parseDiffStats(numstat.result ?? '', namestatus.result ?? '')
return { sha: sha.result?.trim(), diffStats }
```

Implementation of `parseDiffStats`:

```ts
function parseDiffStats(numstatOut: string, namestatusOut: string): FileDiffStat[] {
  const statusByPath = new Map<string, 'A'|'M'|'D'>()
  for (const line of namestatusOut.split('\n')) {
    const m = line.trim().match(/^([AMD])\s+(.+)$/)
    if (m) statusByPath.set(m[2], m[1] as 'A'|'M'|'D')
  }
  const out: FileDiffStat[] = []
  for (const line of numstatOut.split('\n')) {
    const m = line.trim().match(/^(\d+|-)\s+(\d+|-)\s+(.+)$/)
    if (!m) continue
    const added = m[1] === '-' ? 0 : parseInt(m[1], 10)
    const removed = m[2] === '-' ? 0 : parseInt(m[2], 10)
    const path = m[3]
    out.push({ path, added, removed, status: statusByPath.get(path) ?? 'M' })
  }
  return out
}

export type FileDiffStat = {
  path: string
  added: number
  removed: number
  status: 'A' | 'M' | 'D'
}
```

### New SSE event: diff_stats

Add to `ChatSseEvent` discriminated union in `src/lib/chat.ts`:

```ts
export type ChatSseEvent =
  // ...existing events
  | { event: 'diff_stats'; data: { turnIndex: number; files: FileDiffStat[] } }
```

Yield after the `commit` event:

```ts
if (commitSha) {
  yield { event: 'commit', data: { sha: commitSha, message: userMessage.slice(0, 80) } }
  yield { event: 'diff_stats', data: { turnIndex, files: diffStats } }
}
```

### Persist in ChatTurn.create call

Extend the existing `prisma.chatTurn.create` call:

```ts
await prisma.chatTurn.create({
  data: {
    // ...existing fields
    commitSha: commitSha ?? null,
    diffStats: diffStats as unknown as object,
    // diffApplied stays for backwards compat
  },
})
```

## Concurrency: Postgres advisory lock

**Red team P0-2:** two concurrent `POST /chat` requests race at the `existingTurns` count → duplicate turnIndex → double Opus billing.

**Fix:** add an advisory lock at the top of `runChatTurn`, before any Anthropic call or DB write.

```ts
// Advisory lock key: hashtext('chat:partyId') — unique per party
const lockKey = hashPartyId(ctx.partyId)
const lockAcquired = await prisma.$queryRaw<[{ ok: boolean }]>`
  SELECT pg_try_advisory_xact_lock(${lockKey}) AS ok
`
if (!lockAcquired[0]?.ok) {
  yield { event: 'turn_failed', data: { error: 'Another turn is in progress. Wait a moment.' } }
  return null
}
// lock auto-releases at transaction end
```

Caveat: `pg_try_advisory_xact_lock` only holds for a transaction. For long-running SSE (up to 120s), use session-level lock instead:

```ts
await prisma.$executeRaw`SELECT pg_advisory_lock(${lockKey})`
try {
  // ... run the full turn
} finally {
  await prisma.$executeRaw`SELECT pg_advisory_unlock(${lockKey})`
}
```

Session lock needs a dedicated Prisma connection — use `prisma.$connect()` or a separate client instance. Document the choice; prefer transaction-bound lock if possible for safety on crashes.

**Alternative (if Prisma session locks are problematic):** use a Redis key `chat:inflight:{partyId}` with TTL 130s (slightly above `TURN_TIMEOUT_MS`). Upstash works on Railway.

**Also: add unique retry on `ChatTurn.create`:** the `@@unique([partyId, turnIndex])` is already present. Wrap the create in a `try/catch` for `P2002` (unique violation) and retry with `turnIndex++`, capped at 3 retries. Defense in depth.

## Token handling (agent.ts + chat.ts)

**Red team P1-3:** `agent.ts:194` and `chat.ts:322` interpolate the GitHub OAuth token into the shell argv. Daytona's process logs may capture it.

**Fix:** use `GIT_ASKPASS` or a credential helper, not URL interpolation.

```ts
// BEFORE:
const remote = `https://x-access-token:${userToken}@github.com/...`
await sandbox.process.executeCommand(`cd ${repoDir} && git push "${remote}" HEAD:${branch}`)

// AFTER — write an askpass helper, set env:
const askpassPath = `${repoDir}/.patchparty-askpass.sh`
await sandbox.fs.uploadFile(
  Buffer.from(`#!/bin/sh\necho "${userToken}"\n`, 'utf-8'),
  askpassPath,
)
await sandbox.process.executeCommand(`chmod 0700 ${askpassPath}`)
await sandbox.process.executeCommand(
  `cd ${repoDir} && GIT_ASKPASS=${askpassPath} GIT_TERMINAL_PROMPT=0 git -c credential.helper= push https://x-access-token@github.com/${owner}/${repo}.git HEAD:${branch}`,
)
await sandbox.fs.deleteFile(askpassPath)
```

Apply the same pattern in both `src/lib/agent.ts` and `src/lib/chat.ts`. Add a unit test that verifies no token substring appears in any command string that reaches `sandbox.process.executeCommand`.

(Note: some of this was flagged in `planning/v2.0-hardening/agent-start-prompt.md` item #2; verify whether the v2.0-hardening pass already applied it before re-doing it here.)

## New/modified endpoints (summary)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/party/[id]/turns/[turnIndex]/diff?path=<p>` | **NEW** — fetch unified diff for one file of one turn |
| GET | `/api/party/[id]/ship/preview` | **NEW** — pre-fill ShipSheet (title, body, aggregate diff) |
| POST | `/api/party/[id]/chat/undo` | **NEW** — revert last applied turn |
| POST | `/api/party/[id]/chat` | **MODIFIED** — add advisory lock, emit `diff_stats` event |
| POST | `/api/party/[id]/pick` | **MODIFIED** — parallelize `terminateLosers`, record `sandboxTerminatedAt` |
| POST | `/api/party/[id]/pr` | **MODIFIED** — accept optional `title?`, `body?` in body |
| GET | `/api/cron/sandbox-lifecycle` | **MODIFIED** — add loser-reconciliation sweep |

## Acceptance criteria for this sprint

- [ ] Prisma migration file present and reviewed (SQL-level) — not deployed
- [ ] Migration is reversible (down-migration works on staging fixture)
- [ ] `ChatTurn.diffStats` populated for every new turn; type matches `FileDiffStat[]`
- [ ] `ChatTurn.commitSha` populated for every successful commit
- [ ] `parseDiffStats` has unit test with 3 fixtures: added file, modified file, deleted file
- [ ] SSE `diff_stats` event fires after `commit` event (integration test or manual)
- [ ] Advisory lock rejects second concurrent `/chat` request with 200-SSE containing `turn_failed`
- [ ] Chat-history endpoint returns `diffStats` + `commitSha` in the response shape
- [ ] Token no longer appears in any `sandbox.process.executeCommand` argv — verified by a unit test
- [ ] Typecheck green, no new ESLint warnings
