# Tasks — Priority-Ordered Sprint Plan

Four sprints. Ship sequentially. Each task has a file-level scope and acceptance criterion. If a finding turns out to already be fixed by the v2.0-hardening pass, log in `deferred.md` and move on.

---

## Sprint 1 — Data Model Foundation (P0 blockers)

**Cannot ship UI without this.** The TurnCard design depends on data the schema doesn't hold today.

### T1.1 — Prisma schema changes

- **Files:** `prisma/schema.prisma`
- **Changes:** extend `ChatTurn` with `diffStats Json?`, `commitSha String?`, `revertedByTurnIndex Int?`; extend `status` enum/string to accept `'undone'`. Add `Agent.sandboxTerminatedAt DateTime?`.
- **Command:** `npx prisma migrate dev --create-only --name v2_1_iterate_turn_diff`
- **Accept:** migration SQL reviewed manually, applies clean on a fresh DB, `prisma generate` produces usable types.
- **Don't:** run `prisma migrate deploy` against Railway without explicit user OK.

### T1.2 — parseDiffStats + git numstat capture in commitTurn

- **Files:** `src/lib/chat.ts`
- **Changes:** see `02-data-model-changes.md` §chat.ts runtime changes. Add `parseDiffStats`, extend `commitTurn` return type to include `diffStats`, modify caller to yield `diff_stats` SSE event and persist in `ChatTurn.create`.
- **Accept:** 3-fixture unit test in `tests/diff-stats.test.ts` covers added/modified/deleted file parsing. Integration: make a dummy turn, inspect DB row has non-null `diffStats` and `commitSha`.

### T1.3 — Advisory lock in runChatTurn

- **Files:** `src/lib/chat.ts`, possibly `src/lib/prisma.ts`
- **Changes:** add transaction-bound or session-bound advisory lock at top of `runChatTurn`. See `02-data-model-changes.md` §concurrency. If session lock: document the dedicated-connection approach.
- **Accept:** manual test: fire two `curl` POSTs in parallel to `/chat`; the second receives `turn_failed` or 429. No duplicate `turnIndex` in DB.
- **Defense-in-depth:** wrap `ChatTurn.create` in P2002-retry loop (max 3).

### T1.4 — Token leak fix (GIT_ASKPASS)

- **Files:** `src/lib/agent.ts`, `src/lib/chat.ts`
- **Changes:** see `02-data-model-changes.md` §token handling. Both `git push` call sites switch to `GIT_ASKPASS` helper script with 0700 mode, env-based token, delete after push.
- **Accept:** unit test greps the final command string for `x-access-token:` + the actual token value — must not find either substring in argv.
- **Cross-check:** confirm whether `planning/v2.0-hardening/` already shipped this. If so, mark this task done in `deferred.md`.

### T1.5 — Loser teardown parallelization + recording

- **Files:** `src/lib/sandbox-lifecycle.ts`, `src/app/api/party/[id]/pick/route.ts`, `src/app/api/cron/sandbox-lifecycle/route.ts`
- **Changes:** change `terminateLosers` inner loop to `Promise.allSettled`. Set `agent.sandboxTerminatedAt = new Date()` on successful delete. In cron, add reconciliation query that retries termination for losers with `sandboxTerminatedAt IS NULL` older than 5 minutes.
- **Accept:** manual: pick a persona, verify 2 loser `sandboxTerminatedAt` timestamps set within 5s. Simulate failure: stub Daytona delete to throw for one loser; cron sweep retries on next tick.

**Sprint 1 commit plan:** 3 commits.
- `feat(schema): extend ChatTurn with diffStats + commitSha` (T1.1)
- `feat(chat): capture per-turn diff stats + advisory lock` (T1.2, T1.3)
- `fix(security): replace git push URL token with GIT_ASKPASS + loser teardown hardening` (T1.4, T1.5)

---

## Sprint 2 — Security Hardening (P1)

Nothing ships to users without these. Non-negotiable for public demo.

### T2.1 — Iframe sandbox attribute + CSP

- **Files:** `src/app/party/[id]/page.tsx` (iframe JSX), `src/app/api/preview/[target]/[[...path]]/route.ts` (proxy response headers), `next.config.ts` (global CSP)
- **Changes:** add `sandbox="allow-scripts allow-same-origin allow-forms allow-popups-to-escape-sandbox"` + `referrerpolicy="no-referrer"` on every preview iframe instance. Proxy always adds `Content-Security-Policy: frame-ancestors 'self'`. `next.config` adds app-wide `Content-Security-Policy: frame-src 'self'`.
- **Accept:** open devtools, confirm iframe has sandbox attr; attempt `window.parent.postMessage` from iframe — blocked or cleanly isolated.
- **Cross-check:** v2.0-hardening item #10 covered this; verify before re-doing.

### T2.2 — Rate limit on /chat

- **Files:** `src/app/api/party/[id]/chat/route.ts`, new `src/lib/rate-limit.ts` (if not already present)
- **Changes:** install `@upstash/ratelimit` + `@upstash/redis`, add sliding-window limiter: 4 requests per 60 seconds per `session.user.id`. Return 429 with `Retry-After` header. Plus a per-party in-flight guard (lock from T1.3 may already cover this).
- **Accept:** script that fires 5 requests in 30s receives 4× 200 SSE and 1× 429.
- **Env:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` added to Railway config.

### T2.3 — Deny-list for secrets files in read_file + apply_edit

- **Files:** `src/lib/chat.ts` (`safeSandboxPath` function)
- **Changes:** after path-escape check, also reject paths matching any of `/^\.env(\..+)?$/`, `/\.(pem|key)$/`, `/^id_(rsa|ed25519|ecdsa|dsa)(\.pub)?$/`. Return `tool_result` with `isError: true` and a clear message.
- **Accept:** unit test: `safeSandboxPath('/home/daytona/repo', '.env')` returns null; `safeSandboxPath('/home/daytona/repo', 'src/.env.example')` also returns null (patterns check basename and anywhere in path). Add 8 positive + 4 negative fixtures.

### T2.4 — Diff syntax highlighting without dangerouslySetInnerHTML

- **Files:** new `src/app/party/[id]/diff-drawer.tsx`, dependency: `prism-react-renderer`
- **Changes:** render unified diff via `prism-react-renderer`'s React-element API. Do not use `react-syntax-highlighter` with `dangerouslySetInnerHTML`. If a hand-rolled tokenizer is used, ensure content goes through React text-node rendering (escaped by default).
- **Accept:** test with a diff content containing `<script>alert(1)</script>` — renders literal text, no script execution.

### T2.5 — CSRF custom header (lightweight)

- **Files:** `src/app/party/[id]/page.tsx` (fetch calls), `src/app/api/party/[id]/pr/route.ts`, `src/app/api/party/[id]/chat/undo/route.ts`
- **Changes:** every state-changing POST from the client adds a custom header `x-patchparty-request: 1`. Every write-route checks `req.headers.get('x-patchparty-request') === '1'` and rejects with 403 otherwise.
- **Accept:** `curl -X POST /api/party/x/pr` without the header → 403; same request with the header → normal processing.
- **Defer:** full token-based CSRF (oslo/csrf) for v2.2 unless subdomains appear.

**Sprint 2 commit plan:** 2 commits.
- `fix(security): iframe sandbox + rate limit + secrets deny-list` (T2.1-T2.3)
- `feat(ship-ui): DiffDrawer with safe highlighting + CSRF custom header` (T2.4-T2.5) — though DiffDrawer scaffolding may slide into Sprint 3

---

## Sprint 3 — UI Build (the main event)

All infrastructure is now in place. Build the visible product.

### T3.1 — IteratePage skeleton + component extraction

- **Files:** new `src/app/party/[id]/iterate-page.tsx`, `preview-pane.tsx`, `turn-column.tsx`, `viewport-toggle.tsx`, `sandbox-banner.tsx`. Modify `src/app/party/[id]/page.tsx` to render `<IteratePage>` post-pick instead of the current inline chat+preview rendering.
- **Accept:** post-pick navigation shows the new layout; no regression in pick-flow or pre-pick compare view.

### T3.2 — TurnCard + DiffDrawer

- **Files:** new `src/app/party/[id]/turn-card.tsx`, `diff-drawer.tsx`. New endpoint `src/app/api/party/[id]/turns/[turnIndex]/diff/route.ts` (sandbox-primary, GitHub-fallback).
- **Accept:** click a file pill → DiffDrawer opens with unified diff; close re-collapses. Multi-turn history hydrates correctly with diff pills for each.

### T3.3 — InputDock + 5 chips

- **Files:** new `src/app/party/[id]/input-dock.tsx`, `chip-row.tsx`. Update existing `chat-pane.tsx` or deprecate in favor of new components (if logic merges into `TurnColumn`).
- **Accept:** click chip → textarea pre-fills with template (not auto-sent). `Undo last` chip triggers POST /chat/undo directly. Keyboard Enter sends; Shift+Enter newlines.

### T3.4 — Undo last turn (endpoint + UI)

- **Files:** new `src/app/api/party/[id]/chat/undo/route.ts`. Extend `turn-card.tsx` with undo affordance on latest applied non-reverted turn.
- **Accept:** undo round-trip: click → confirm dialog → POST → revert commit appears in sandbox + GitHub branch → original `TurnCard` shows reverted state → new synthetic `TurnCard` shows at bottom → next Anthropic call excludes undone turn's messages (check via DB query of buildMessageHistory).

### T3.5 — ShipSheet + Ship preview endpoint

- **Files:** new `src/app/party/[id]/ship-sheet.tsx`, `ship-bar.tsx`, `src/app/api/party/[id]/ship/preview/route.ts`. Modify existing `src/app/api/party/[id]/pr/route.ts` to accept optional `title?` + `body?` in POST body.
- **Accept:** click ShipBar → sheet opens with pre-filled title/body/diff summary → edit → Ship → PR created on GitHub → success state with link. Failure state retains user edits.

### T3.6 — ViewportToggle wired to preview iframe

- **Files:** `src/app/party/[id]/viewport-toggle.tsx`, `preview-pane.tsx`
- **Changes:** segmented control, localStorage persistence, honest-limitation tooltip. CSS-only viewport change, no iframe src mutation.
- **Accept:** toggle Desktop ↔ Mobile → iframe visibly reframes; HMR inside the iframe continues to work (file edit in sandbox → preview hot-reloads).

**Sprint 3 commit plan:** 5-6 commits, one per T3.x. Typecheck + manual smoke after each.

---

## Sprint 4 — Polish + Smoke

### T4.1 — Failed turns shouldn't count against the 20-turn cap (P2 → P1 if it bites)

- **Files:** `src/lib/chat.ts`
- **Changes:** the count check at line ~361 should filter `status: 'applied'`. Failed turns still get persisted but don't block new turns.
- **Accept:** 19 applied turns + 1 failed turn → user can still send turn 20.

### T4.2 — Cumulative cost meter

- **Files:** `src/app/party/[id]/iterate-header.tsx` or similar
- **Changes:** show `turnCountUsed / 20 · $0.42 total` in header. Sum from hydrated history + streaming turn costs.
- **Accept:** counter matches sum of ChatTurn.costUsd for the party.

### T4.3 — Party-level stickiness of ShipSheet draft

- **Files:** `src/app/party/[id]/ship-sheet.tsx`
- **Changes:** persist unsaved edits to `localStorage(`patchparty:ship:${partyId}`)` so navigating away + back preserves them. Clear on successful ship.
- **Accept:** open sheet, edit body, close tab, reopen → edits preserved.

### T4.4 — End-to-end smoke

Manual test script:

1. Start a party from a GitHub issue URL.
2. Wait for 3 personas to finish.
3. Peek at one persona's preview (pre-pick). Close peek.
4. Pick one. Verify 2 loser sandboxes terminate within 10s (check `sandboxTerminatedAt`).
5. IteratePage renders with preview + empty turn list.
6. Toggle Viewport Desktop → Mobile → Desktop. Confirm iframe reframes, no reload.
7. Send chat message "make the header sticky". Watch SSE stream: turn_started → text_delta → tool_call → tool_result → commit → diff_stats → turn_done. TurnCard renders with file pill(s), click one → DiffDrawer shows diff.
8. Click `Run build` chip → template inserted → edit → send. Build runs in sandbox.
9. Click `Undo last` → confirm → revert commit appears; original TurnCard greyed.
10. Click ShipBar → sheet opens with pre-filled body → ship → PR link appears.
11. Open PR URL in new tab → verify PR body matches sheet edits.
12. Wait 10 min idle → sandbox pauses → banner shows → resume → iterate again without issues.
13. Re-ship or terminate sandbox from success card.

### T4.5 — deferred.md

Log any finding intentionally skipped with a 1-line reason. Examples: "CSRF full token solution — defer to v2.2 unless subdomains". "Daily managed cost cap — defer to v2.2 per user decision".

---

## Report

At end of Sprint 4, write `planning/v2.1-iterate-ux/report.md` covering: what shipped, what deferred, any schema migrations applied, any security regressions resolved, smoke-test outcome.
