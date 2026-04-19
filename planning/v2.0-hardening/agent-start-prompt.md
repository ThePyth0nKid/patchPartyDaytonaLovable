# Agent Start Prompt — PatchParty v2.0 Hardening Pass

> Copy everything below the `---` into your next agent session. It is fully self-contained. Do not paraphrase or summarise it for the agent — paste verbatim.

---

You are taking over the PatchParty codebase at `C:\Users\nelso\Desktop\patchPartyDaytonaLovable` for a single hardening pass. The previous session shipped the full v2.0 "Race, Pick, Iterate" release end-to-end in one autonomous run. Typecheck is green, all eight implementation tasks are complete, no migration has been deployed to Railway yet. The code is on `main`.

Three review swarms (code-reviewer, security-reviewer, architect) then audited the shipped code and returned a punch list. Your job is to execute the punch list — **not to add features, not to refactor for elegance, not to start v2.1**. You are closing the gap between "it runs" and "it can go to a ten-person beta."

## Project context

PatchParty races 5 AI personas against a single GitHub issue, each inside its own Daytona sandbox. User picks a winner. After pick, losers terminate and the winner's sandbox stays warm for chat-iterate (Opus tool-use loop in the same sandbox). Lifecycle: ACTIVE → IDLE_WARN → PAUSED → TERMINATED via cron. BYOK (Bring Your Own Anthropic Key) is a first-class mode. Telemetry writes PartyEvent / AgentMetric / ChatTurn / PickDecision to Postgres for future Moat (pick-rate RLHF dataset). Stack: Next.js 15 App Router, Prisma 6, Postgres (Railway), `@daytonaio/sdk`, `@anthropic-ai/sdk`, `pg` for LISTEN/NOTIFY cross-container SSE fanout.

The full product plan sits at `C:\Users\nelso\.claude\plans\cheerful-nibbling-quail.md`. Read it only if a finding below is ambiguous — don't re-plan.

## Absolute scope

- **Yes**: fix the findings listed below, add tests where they make the fix credible, update COGS/telemetry only where a finding demands it, small UX polish only if directly tied to a finding (e.g. error surfacing on byok-card).
- **No**: new features, v2.1 work (Stripe, admin dashboard, divergence benchmark), v2.2 (patterns), Prisma model additions beyond what a finding requires, `SandboxSession` from the architect review (defer to v2.1), `projectId` backfill from architect risk #5 (defer to v2.2 — log it in `planning/v2.0-hardening/deferred.md` instead).
- **No**: running `railway up` or any migration against production without explicit confirmation from the user. Local `prisma migrate dev --create-only` is fine; `prisma migrate deploy` is not.

## The work — priority-ordered

Each item has a verdict, exact file:line (from the reviews), one-sentence fix, and optional note. Group work into four commits: `fix(security)`, `fix(lifecycle)`, `fix(cost)`, `fix(ux-and-hygiene)`. Ship one commit, typecheck, run the smoke path below, move on.

### P0 — CRITICAL (must ship before any beta)

1. **Path traversal in `read_file` and `apply_edit`** — `src/lib/chat.ts:158-200`
   Opus is treated as adversarial (prompt injection via issue body is trivial). Both `read_file` (line 159) and `apply_edit` replace mode (line 183) concatenate a Claude-controlled `path` directly after `repoDir`. `../../etc/passwd` escapes. Fix: resolve `path.resolve(repoDir, inputPath)`, assert the resolved path `startsWith(repoDir + '/')`, reject with a tool_result `isError: true` otherwise. Apply to all three branches (read, replace, patch filename).

2. **GitHub token in shell argv** — `src/lib/agent.ts:194` and `src/lib/chat.ts:287`
   `git push "https://x-access-token:${token}@github.com/..."` leaks the token via `/proc/<pid>/cmdline` inside the Daytona sandbox (any process on the sandbox can read it). Fix: write a `GIT_ASKPASS` helper script to a 0700 tmp path and set `GIT_ASKPASS` in the command env, or use `git -c credential.helper=...` with the token via env. Do the same fix in both files in one sweep.

3. **RESUMING terminal trap** — `src/lib/sandbox-lifecycle.ts:117-151`, `src/app/api/cron/sandbox-lifecycle/route.ts`, `src/app/api/party/[id]/chat/route.ts`
   `resumeParty` sets `sandboxState = 'RESUMING'` and returns on Daytona failure without reverting. Cron query ignores RESUMING. Chat route only rejects TERMINATED. Fix: (a) in `resumeParty` catch block, reset to `PAUSED` before returning; (b) add a cron arm that recovers `RESUMING` rows older than 90s back to `PAUSED`; (c) chat route gates on `sandboxState === 'ACTIVE'` only (PAUSED/IDLE_WARN redirect to resume flow, RESUMING returns 409).

4. **Command injection in commit message path** — `src/lib/chat.ts:281-284`
   `message.replace(/"/g, '\\"')` does not protect against backticks, `$(...)`, or single quotes that can break out of the double-quoted commit message. Fix: pass the message via stdin (`git commit -F -` piping the message) or write it to a tmp file and use `-F <file>`, not shell-quote.

### P1 — HIGH

5. **`INJECTION_CHARS` misses newlines** — `src/lib/chat.ts:44`
   Add `\n`, `\r` to the reject pattern. Include a unit test that `isWhitelisted("ls\nnpm run build")` returns false.

6. **turnIndex race / unique constraint** — `src/lib/chat.ts:326-337`
   `COUNT(*) + 1` without a lock races. Fix: rely on the `@@unique([partyId, turnIndex])` constraint — wrap the chat-turn `create` in a retry that bumps `turnIndex` on P2002, capped at 3 retries. Alternative: wrap in a `$transaction` that does `SELECT max(turnIndex) FOR UPDATE` first.

7. **`markActivity` clobbers paused state** — `src/lib/sandbox-lifecycle.ts:28-32`
   Scope the `update` to `where: { id: partyId, sandboxState: { in: ['ACTIVE', 'IDLE_WARN'] } }` so PAUSED/RESUMING/TERMINATED are never silently re-flipped to ACTIVE by a lost SSE reconnect or late request.

8. **`ListenerHub` never reconnects** — `src/lib/store.ts:117-160, 135-137`
   On pg `error`, reset `this.client = null` AND `this.connecting = null`, then schedule `setTimeout(() => this.ensureConnected(), 1000)` with exponential backoff (cap 30s). Add a structured log at each retry.

9. **`PartyStore.update()` drops cross-container writes** — `src/lib/store.ts:272-296`
   If container A emitted via pg_notify but container B has no Map entry, `update()` returns silently. Fix: make `update` async, hydrate from Postgres on Map miss (reuse the `get()` path), then apply updater + persist. Treat Map strictly as a read cache.

10. **Preview proxy strips CSP, re-adds nothing** — `src/app/api/preview/[target]/[[...path]]/route.ts` (around lines 183-185)
    Post-pick the iframe sits next to the chat pane on `patchparty.dev`. Sandboxed HTML has full access to `window.parent` today. Fix: always set `Content-Security-Policy: frame-ancestors 'self'` and `X-Frame-Options: SAMEORIGIN` on proxy responses; apply `sandbox="allow-scripts allow-same-origin"` AND `referrerpolicy="no-referrer"` on the iframe in `src/app/party/[id]/page.tsx` (both pre-pick ComparePanel iframe and post-pick ChatLayout iframe).

11. **Preview token leaks via Referer** — `src/app/party/[id]/page.tsx` and proxy route
    Token is base64'd into the URL path, so it ends up in Referer of every sub-request the sandboxed app makes. Short-term fix: add `referrerpolicy="no-referrer"` on the iframe (see #10). Medium-term: ticket for moving token to HTTP-only cookie, flag for v2.1 — log in `planning/v2.0-hardening/deferred.md`.

12. **Cron auth is not timing-safe** — `src/app/api/cron/sandbox-lifecycle/route.ts:27-29`
    Replace both string `===` comparisons with `crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(secret))`. Handle length-mismatch before the compare (timingSafeEqual throws on unequal lengths).

13. **`/api/byok/validate` has no rate limit** — billing-drain oracle
    Add a per-user in-memory (or Prisma-backed) counter: 5 validate calls per minute per `session.user.id`. Return 429 beyond. Same limiter can later move to Redis.

14. **`saveKey` double-validates** — `src/lib/byok.ts:65`
    Remove the redundant `validateAnthropicKey()` call inside `saveKey`. The `/api/byok` POST route already validates. Update the comment to match.

15. **BYOK bypass has no concurrent-party guard** — `src/app/api/party/start/route.ts:53-65`
    BYOK skips daily-quota correctly, but a BYOK user can still spin up 5 × N concurrent sandboxes. Add a concurrent-party check (max 2 concurrent RUNNING parties per user regardless of key mode) — it's a Daytona COGS guard, not an Anthropic one.

16. **`sandboxTimeMs` under-reports** — `src/lib/agent.ts:252-253`
    Currently set to `Date.now() - startGen`, which starts after sandbox boot. Move a second timestamp `sandboxStart = Date.now()` to immediately before `daytona.create()` (line ~87) and record `sandboxTimeMs = Date.now() - sandboxStart`. This makes `computePartyCost` honest for the COGS dashboard.

17. **Tool-loop $ cap** — `src/lib/chat.ts:28-30, 370-436`
    Worst-case chat is 20 turns × 8 tool-loops × 4096 output tokens ≈ $49. Add an intra-turn early-break: after each Opus call, accumulate `costUsd` via `computeCost`; if cumulative turn cost exceeds `$1.00`, break the loop with a `turn_failed` event ("budget cap reached — please split the ask"). Runtime, not schema change.

### P2 — MEDIUM

18. **`chat-history` returns failed turns** — `src/app/api/party/[id]/chat-history/route.ts:32-43`
    Comment says excluded; query doesn't filter. Fix: `where: { partyId: id, status: 'applied' }`.

19. **`/api/byok/validate` returns 200 on failure** — `src/app/api/byok/validate/route.ts:30-32`
    Change to 400 with `{ ok: false, error }` so client `res.ok` check is reliable. Update `byok-card.tsx` client if it currently treats 200-with-ok-false as a special case.

20. **`BYOK_KEY_USED` emits with `partyId: 'n/a'`** — `src/lib/agent.ts:34`
    Violates FK. Either make `PartyEvent.partyId` nullable in the schema (requires migration — prefer this, event model is meant to cover cross-party events) or guard the emit: only fire `BYOK_KEY_USED` when a real party context is available. Pick the first — adjust schema + downstream indexes.

21. **`byok-card.tsx` swallows delete errors** — `src/app/app/settings/byok-card.tsx:84-88`
    Render the error in a small red row, same pattern as the validate error handling.

22. **`chat-pane.tsx` duplicates `MAX_TURNS_PER_PARTY`** — `src/app/party/[id]/chat-pane.tsx:14`
    Export a plain constant from `src/lib/chat-constants.ts` (or top of `src/lib/chat.ts` if it doesn't pull server-only imports) and import in both places.

23. **`scripts/costs.ts` N+1** — `scripts/costs.ts:79-81`
    Replace per-party query with two `groupBy` queries over `AgentMetric` and `ChatTurn` keyed by `partyId`, join in JS. Keep the `--party <id>` branch using `computePartyCost` as-is.

24. **HKDF comment vs. reality** — `src/lib/crypto.ts:35-38`
    Keep the current implementation (it works correctly — the static salt is used correctly, PRK is 32 bytes, single expand is fine for fixed-length 32-byte output), but replace the hand-rolled HMAC chain with `crypto.hkdfSync` for auditability, and update the comment to match. Cryptographic behaviour must be bit-identical to the current encrypted blobs, otherwise existing encrypted keys in DB become unreadable — verify with a round-trip test using a fixture.

## Deliverables

1. Every finding above either fixed, or explicitly logged in `planning/v2.0-hardening/deferred.md` with a one-sentence reason. Don't defer silently.
2. A short Vitest (or Node:test) suite at `tests/chat-tools.test.ts` covering: path-traversal rejection for `read_file`/`apply_edit`, newline rejection in whitelist, turn-index retry on conflict, timing-safe cron compare. No full e2e — unit only.
3. Typecheck green (`npx tsc --noEmit`), no new ESLint warnings.
4. `npm run costs` still works against a local DB with fixture parties.
5. A single `planning/v2.0-hardening/report.md` documenting what shipped and what deferred.

## Smoke path after each commit

```
npx tsc --noEmit
npx vitest run   (or node --test, whichever the repo has)
```

After all four commits, manual smoke (no deploy):
- Start dev server, auth, click a backlog issue, verify the 5-persona race still reaches `done`
- Click Pick on one — verify UI flips to chat layout
- Send one chat message, verify a commit appears in the branch
- Let the party go idle for 10 min (or shorten the lifecycle constants locally), verify IDLE_WARN → PAUSED → resume round-trip
- Toggle Settings → BYOK → invalid key rejects with 400 now (not 200); valid key saves; delete key shows error if it fails

## Operational instructions

- Auto-mode is active: execute immediately, make reasonable assumptions, do not ask before low-risk edits.
- For each finding, read the file before editing; do not blind-patch on line numbers because they may have drifted by 1-2 lines from the review.
- Use TaskCreate/TaskUpdate to track the 24 findings. Group them by commit plan: security (1,2,4,5,10-13,15), lifecycle (3,7,8,9), cost (16,17,23), ux-and-hygiene (6,14,18-22,24).
- Every fix that adds code should add the matching unit test in the same commit — no TDD-later.
- If a finding turns out to be a misdiagnosis after reading the actual file, say so in `planning/v2.0-hardening/deferred.md` with a one-line reason and skip it. Trust but verify the reviews.
- Never run `prisma migrate deploy`, `railway up`, or `git push --force`. Any such action requires explicit user confirmation in-chat.
- End state: report at `planning/v2.0-hardening/report.md`, all 4 commits on `main`, typecheck green, tests passing, manual smoke passed.

Begin.
