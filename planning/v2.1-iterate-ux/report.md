# v2.1 Iterate-UX — Final Report

**Date:** 2026-04-19
**Branch:** `main`
**Range:** `150e486` (Sprint 1) → `c0961c0` (T4.3 follow-up, end of Sprint 4)

## What shipped

### Sprint 1 — Data model foundation

| Commit | Task(s) | Summary |
|---|---|---|
| `150e486` | T1.1 – T1.5 | Schema (`ChatTurn.diffStats/commitSha/revertedByTurnIndex`, `Agent.sandboxTerminatedAt`), `runChatTurn` concurrency guard via pending-row + P2002 retry (see D1 — shipped instead of `pg_try_advisory_xact_lock`), per-turn `diffStats` capture + `commitSha`, `GIT_ASKPASS` helper replacing token-in-URL, `terminateLosers` parallelization + cron reconciliation keyed off `Party.updatedAt` (D2). |
| `84a24cc` | follow-up | 2 CRITICAL + 3 HIGH reviewer findings. |

### Sprint 2 — Security hardening

| Commit | Task(s) | Summary |
|---|---|---|
| `7d2245d` | T2.1, T2.3, T2.5 | Iframe `sandbox=` attribute + `frame-ancestors 'self'` CSP, safe-path secrets deny-list (18 unit tests), custom-header CSRF (`x-patchparty-request: 1`). |
| `b209a43` | T2.6 – T2.8 (D9) | Security-reviewer follow-up: auth + ownership on `/api/sandbox/cleanup` (CRITICAL), preview-proxy SSRF hostname allowlist (HIGH, D6), Windows-backslash path tests (HIGH), auth-before-CSRF reorder on all 4 write routes (MEDIUM). |
| `b05fd0c` | T2.2 | Sliding-window rate limit on `/chat` (4 req / 60s per user) via `@upstash/ratelimit`. Graceful no-op when Upstash creds absent (D5). |

### Sprint 3 — UI build

| Commit | Task(s) | Summary |
|---|---|---|
| `a6d3186` | T3.1 + T3.6 | `IteratePage` / `PreviewPane` / `ViewportToggle` / `SandboxBanner` extraction. Grid layout `lg:grid-cols-[minmax(0,1fr)_480px]`. `localStorage` persistence under `patchparty:viewport`. Mobile device frame without iframe remount. ChatPane kept as the TurnColumn body for this task (D7); ViewportToggle bundled in (D8). |
| `2f6b719` + `5706ea0` | T2.4 + T3.2 | TurnCard + DiffDrawer + `/turns/[idx]/diff` endpoint (sandbox-primary, GitHub-fallback). `prism-react-renderer` element API — zero `dangerouslySetInnerHTML`. Closes S2. |
| `e62a3d8` + `f33c196` | T3.3 | InputDock + 5 hard-coded chip templates (`shorter`, `add-tests`, `run-build`, `mobile-first`, `undo-last`). No merge fields, no interpolation. Closes S7. |
| `094c4d2` + `525a22c` | T3.4 | `POST /chat/undo` as soft-delete: mark target `status='undone'`, set `revertedByTurnIndex` on synthetic, `git revert` inside sandbox, never force-push. Closes S10. |
| `b817501` + `4453f8d` | T3.5 | ShipSheet + `/ship/preview` endpoint. User-editable title + body. Server strips `<!-- ... -->` and caps at 2000 chars via `sanitizeShipBody`. Closes S5. |

### Sprint 4 — Polish + smoke

| Commit | Task(s) | Summary |
|---|---|---|
| `c10e568` + `0f09e0e` | T4.1 | Failed + undone turns no longer count against the 20-turn cap. New `countChargeableTurns` helper in `src/lib/chat-constants.ts` used by both the server (`reserveTurnSlot`) and the client (`TurnColumn` header). Absolute row cap (`MAX_TOTAL_TURNS_PER_PARTY = 200`) guards runaway undo loops. |
| `e389d3a` + `3c09343` | T4.2 | Cumulative cost meter in the turn header. Variable-precision formatting (sub-cent → 4 decimals, cent range → 3, dollar → 2, runaway → `>$999,999`). aria-label + aria-hidden for screen-reader clarity. |
| `fc2fe15` + `c0961c0` | T4.3 | ShipSheet draft persistence in `localStorage(patchparty:ship:${partyId})`. Draft wins over server preview on reopen. Cleared on successful PR creation. Length caps (title 200, body 2000) + strict shape validation in `parseShipDraft`. |

## Security checklist outcome (`05-security-checklist.md`)

| # | Severity | Status |
|---|---|---|
| S1 | HIGH | ✅ shipped (T2.1) |
| S2 | HIGH | ✅ shipped (T2.4 + T3.2) |
| S3 | HIGH | ✅ shipped (T2.2) |
| S4 | MEDIUM | ✅ shipped (T2.5) |
| S5 | MEDIUM | ✅ shipped (T3.5) |
| S6 | MEDIUM | ✅ shipped (T2.3) |
| S7 | MEDIUM | ✅ shipped (T3.3) |
| S8 | MEDIUM | **deferred to v2.2** — see `deferred.md` |
| S9 | LOW | ✅ promoted to CRITICAL and fixed in D9 follow-up |
| S10 | LOW | ✅ shipped (T3.4) |
| S11 | LOW | ✅ audit passed (grep-confirmed in T3.1) |

## Schema migrations

One migration applied: `v2_1_iterate_turn_diff` (T1.1) — extends `ChatTurn` with `diffStats Json?`, `commitSha String?`, `revertedByTurnIndex Int?`, and adds `Agent.sandboxTerminatedAt DateTime?`. Was **not** deployed to Railway via `prisma migrate deploy` — user runs that explicitly after review (per locked rule).

## Test coverage

`node --test --experimental-strip-types tests/*.test.ts` as of `c0961c0`:

| Test file | Count | Scope |
|---|---|---|
| `chargeable-turns.test.ts` | 12 | T4.1 chargeable-turn counter (failed/undone exclusion, undo-pair net-zero, synthetic-failed, unknown-status safe-by-default) |
| `chip-templates.test.ts` | 4 | T3.3 chip immutability (no `{{…}}` / `${…}`, no party/repo/file references) |
| `diff-drawer-xss.test.ts` | 5 | S2 unified diff rendering of attacker fixtures as literal text |
| `diff-stats.test.ts` | 12 | T1.2 `parseDiffStats` over `git diff --numstat` fixtures |
| `format-cost.test.ts` | 6 | T4.2 USD formatting (null/NaN/negative, sub-cent / cent / dollar bands, runaway clamp, 1e-10 rounding) |
| `git-askpass.test.ts` | 7 | T1.4 token never appears in argv; 0700 permissions on helper |
| `safe-path.test.ts` | 18 | T2.3 + D9 secrets deny-list + Windows backslash cases |
| `ship-body-sanitize.test.ts` | 15 | T3.5 HTML-comment strip, dangling-opener truncation, 2000-char cap, composed with `buildPreviewBody` |
| `ship-draft.test.ts` | 16 | T4.3 validator (null / malformed / mistyped / oversized / boundary) + DOM round-trip + SSR + quota-exceeded |
| **Total** | **95** | all passing |

## Decisions log

Nine implementation-time decisions (D1–D9) are recorded in `decisions.md`. The three that had the biggest impact on the final shape:

- **D1** — Pure Postgres pending-row concurrency guard beat the three `pg_advisory_lock` alternatives on simplicity (no new deps, no connection-pool footguns).
- **D5** — Rate limiter no-ops gracefully without Upstash creds; prod must set both env vars.
- **D9** — Security-reviewer swarm uncovered one CRITICAL (unauth `/api/sandbox/cleanup`) + two HIGH, all fixed in a single follow-up commit.

## Smoke outcome

Manual E2E was **not** executed by this agent session — the 13-step smoke in `TESTING.md §T` is a browser + Daytona + GitHub flow requiring human interaction. All programmatic checks that stand in for the smoke passed:

- `bun tsc --noEmit` — clean, 0 errors.
- `node --test tests/*.test.ts` — 95/95 passing.
- Grep-audits for the invariants the test suite doesn't express directly (`dangerouslySetInnerHTML` in the Turn/Diff/Ship tree → 0 hits; `{{…}}` / `${…}` in chip templates → 0 hits; `.env` / `id_rsa` patterns in safe-path → refused by unit tests).

The user runs section T (13-step end-to-end) against their own Railway deploy + GitHub repo + Daytona quota. Any failure there should be filed as an issue referencing the step number; no commits land on `main` until it's green.

## What's deferred

See `planning/v2.1-iterate-ux/deferred.md`. Six items:

- S8 — managed-mode daily cost cap → v2.2
- `/pr` rate limit → v2.2
- Full token-based CSRF (oslo/csrf) → v2.2 if subdomains appear
- ShipSheet stale-draft banner → v2.2
- ShipSheet `userId`-prefixed localStorage key → v2.2
- CSP `script-src` / `default-src` tightening → v2.2

## Ready-to-ship state

- Branch `main` at `c0961c0`. No uncommitted files.
- All 8 Sprint 3–4 tasks completed. All follow-up commits landed.
- No Railway deploy triggered. No `git push --force`. No hook skips.
- `TESTING.md` extended with sections L–T covering the new v2.1 surfaces.
- Security checklist 10 of 11 shipped; the last is explicitly deferred with a tracking entry.
