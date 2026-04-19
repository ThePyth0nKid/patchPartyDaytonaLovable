# Agent Start Prompt — PatchParty v2.1 Iterate-UX (Resume Session)

> Copy everything below the `---` into your next agent session after context-clear. It is fully self-contained. Do not paraphrase or summarize — paste verbatim.

---

You are resuming the PatchParty v2.1 Iterate-UX redesign at `C:\Users\nelso\Desktop\patchPartyDaytonaLovable` on branch `main`. Sprint 1 (data-model foundation) and Sprint 2 (security hardening) have shipped. Sprint 3 has started — T3.1 (IteratePage skeleton + viewport toggle) landed. You are picking up at **T3.2 (TurnCard + DiffDrawer)**.

## What shipped so far (commits in order)

| Commit | Task(s) | What landed |
|---|---|---|
| `150e486` | T1.1 – T1.5 | Sprint 1: schema (ChatTurn.diffStats/commitSha/revertedByTurnIndex, Agent.sandboxTerminatedAt), runChatTurn concurrency guard (pending-row + P2002 retry — see D1), per-turn diffStats capture + commitSha, GIT_ASKPASS for git push, terminateLosers parallelization + cron reconciliation (see D2/D3) |
| `84a24cc` | Sprint 1 follow-up | Reviewer-flagged fixes: 2 CRITICAL + 3 HIGH |
| `7d2245d` | T2.1, T2.3, T2.5 | Sprint 2: iframe sandbox attr + frame-ancestors CSP, safe-path secrets deny-list (18 unit tests), custom-header CSRF (`x-patchparty-request: 1`) |
| `b209a43` | T2.6, T2.7, T2.8 | Security-reviewer swarm fixes (see D9): auth + ownership on `/api/sandbox/cleanup` (CRITICAL), preview-proxy SSRF allowlist (HIGH, D6), Windows-backslash path tests (HIGH), auth-before-CSRF reorder on all 4 write routes (MEDIUM) |
| `b05fd0c` | T2.2 | Sliding-window rate limit on `/chat` (4 req/60s per user) via `@upstash/ratelimit`. Gracefully no-ops when Upstash creds absent — see D5 |
| `a6d3186` | T3.1, T3.6 | IteratePage extraction: PreviewPane / ViewportToggle / SandboxBanner / IteratePage; grid layout `lg:grid-cols-[minmax(0,1fr)_480px]`; localStorage persistence of viewport under `patchparty:viewport`; mobile device frame without iframe remount. ChatPane kept as the TurnColumn body for now (see D7). ViewportToggle bundled into T3.1 (D8) |

All decisions D1–D9 are recorded in `planning/v2.1-iterate-ux/decisions.md`. Do not re-litigate them.

## Remaining tasks — priority order

### Sprint 3 (UI build)

- **T2.4 + T3.2 (bundle these)** — `TurnCard` + `DiffDrawer` + `GET /api/party/[id]/turns/[idx]/diff` endpoint. Use `prism-react-renderer` (element-based — **no** `dangerouslySetInnerHTML`, no `dompurify` path). Closes **S2** in `05-security-checklist.md`. Add a fixture test: diff containing `</pre><script>alert(1)</script><pre>` must render as literal text.
- **T3.3** — `InputDock` + 5 hard-coded chip templates (Shorter / Add tests / Run build / Mobile-first / Undo last). **No merge fields, no `{{...}}` interpolation.** Closes **S7**. Chips are a file-level `const` array of `{ id, label, prompt }`.
- **T3.4** — `POST /api/party/[id]/chat/undo` endpoint + UI. Soft-delete only: mark the target turn `status='undone'`, set `revertedByTurnIndex` on the new reverting turn, run `git revert` inside the sandbox, **never** force-push. Extend the existing CSRF guard on this route. Closes **S10** (audit-trail preserved).
- **T3.5** — `ShipSheet` + `GET /api/party/[id]/ship/preview` endpoint. User-editable PR body + title. Server strips `/<!--[\s\S]*?-->/g` from body before sending to GitHub and caps at 2000 chars. Closes **S5**.

### Sprint 4 (polish + smoke)

- **T4.1** — Failed turns don't count against the 20-turn cap. `buildMessageHistory` already filters on `status='applied'` (see S10 note); verify the counter in `runChatTurn` uses the same filter.
- **T4.2** — Cumulative cost meter in `IterateHeader`. Sum `ChatTurn.totalCostUsd` for applied turns; display under persona name.
- **T4.3** — `ShipSheet` localStorage draft persistence. Key: `patchparty:ship-draft:${partyId}`.
- **T4.4** — End-to-end manual smoke. Run `TESTING.md` first (foundation smoke), then the 13-step script in `03-tasks.md §T4.4`. Write `planning/v2.1-iterate-ux/report.md`.

Run `TaskList` on session start to see task state (they're already in the task store).

## Read order before writing code

1. `planning/v2.1-iterate-ux/README.md` — ship criteria
2. `planning/v2.1-iterate-ux/00-locked-decisions.md` — non-negotiables (keep open)
3. `planning/v2.1-iterate-ux/01-ux-spec.md` — TurnCard + DiffDrawer + InputDock + ShipSheet specs
4. `planning/v2.1-iterate-ux/03-tasks.md` — T3.2 onward: exact acceptance criteria
5. `planning/v2.1-iterate-ux/05-security-checklist.md` — S2/S5/S7/S10 — these are what the remaining work closes out
6. `planning/v2.1-iterate-ux/decisions.md` — D1–D9, especially D4 (csrf-constants), D5 (Upstash fallback), D6 (SSRF allowlist), D7 (T3.1 kept ChatPane)
7. `planning/v2.1-iterate-ux/TESTING.md` — what's verifiable today; extend as new tasks land

## Grounding step — read these files before editing

- `src/app/party/[id]/iterate-page.tsx` — the current post-pick orchestrator; T3.2 replaces the `<ChatPane>` child with `<TurnColumn>` which contains `<TurnCard[]>` + `<InputDock>`
- `src/app/party/[id]/chat-pane.tsx` — to understand current turn rendering + SSE subscription that TurnCard must inherit from
- `src/lib/chat.ts` — `runChatTurn` + `buildMessageHistory`; where diffStats is captured; where T4.1 must filter
- `src/app/api/party/[id]/chat/route.ts` — POST pattern (auth → CSRF → rate-limit → stream); T3.4 undo follows the same skeleton
- `src/app/api/party/[id]/pr/route.ts` — current canned PR body; T3.5 adds user-editable path
- `src/lib/client-fetch.ts` + `src/lib/csrf-constants.ts` — client-side `csrfFetch` + constants; all new write routes go through this
- `src/lib/safe-path.ts` + `tests/safe-path.test.ts` — already hardened; T3.4's `git revert` must still go through this if it reads files

## Env vars — required for production, optional for local dev

Documented in `.env.example`:

- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — **required in prod** for S3 rate limit. Without them, limiter is a no-op (D5). `.env.example` calls this out explicitly.
- `DAYTONA_PREVIEW_HOST_SUFFIXES` — optional, defaults to `.daytona.work,.daytona.app,.daytona.io` (D6). Self-hosted Daytona users override.
- `BYOK_ENCRYPTION_KEY` — 32-byte base64; required since v2.0.

## Absolute scope

**YES:**
- Finish Sprint 3 (T2.4+T3.2, T3.3, T3.4, T3.5) and Sprint 4 (T4.1–T4.4).
- Close S2, S5, S7 in `05-security-checklist.md` with the corresponding task commits.
- Write unit tests alongside fixes — no TDD-later.
- After each UI commit, run the `code-reviewer` agent. After any security-sensitive change, `security-reviewer`.

**NO:**
- Do not re-litigate locked decisions (`00-locked-decisions.md`) or D1–D9 (`decisions.md`).
- Do not ship S8 (managed-mode daily cost cap) — deferred to v2.2. Log in `deferred.md` before smoke.
- Do not run `prisma migrate deploy`, `railway up`, `git push --force`, `git reset --hard origin/main`, or delete branches without explicit user OK.
- Do not use `--no-verify`, `--no-gpg-sign`, or amend commits. Fix hook failures and create new commits.
- Do not add features outside this scope (no divergence benchmark, no v2.2 patterns, no admin dashboard).

## Operational rules

- Branch is `main`. Commit per task, not per file. Use conventional-commit style matching the existing log (e.g., `feat(v2.1-iterate): T3.2 — TurnCard + DiffDrawer + diff endpoint`).
- After each commit: `bun tsc --noEmit` + run the new unit tests + `code-reviewer`. If a finding lands, fix in a follow-up commit named `fix(v2.1-iterate): address T3.x reviewer findings`.
- Before starting Sprint 4 smoke, re-run `TESTING.md` steps 1–28 to confirm no regressions.
- If you hit an ambiguity the plan doesn't cover, make the judgment call and add a 2-line entry to `decisions.md`. Don't stop unless a locked decision is affected.

## End state

- T2.4 + T3.2 + T3.3 + T3.4 + T3.5 landed on `main` with typecheck green
- T4.1 – T4.4 landed, including `report.md`
- S2, S5, S7, S10 all checked in `05-security-checklist.md`; S8 logged as deferred in `deferred.md`
- `TESTING.md` smoke passes end-to-end locally
- No Railway deploy — user triggers it explicitly after review

Begin by running `TaskList` to see the task state. Then read files 1–7 above. Then start T2.4 + T3.2 together (one commit).
