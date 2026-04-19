# Decisions Log — v2.1 Iterate-UX

Implementation-time decisions that fill gaps in the plan. Each entry: 2 lines max.

## 2026-04-19

### D1 — T1.3 concurrency guard: pending-row check instead of `pg_advisory_lock`

`02-data-model-changes.md` §concurrency offered three options: `pg_try_advisory_xact_lock` (bugged — releases immediately on autocommit), `pg_advisory_lock` session-scoped (needs dedicated Prisma connection; conflicts with Prisma's connection pool and async generator lifetime of ~120 s), or Upstash Redis (defer to T2.2).

Shipped a pure Postgres guard using the existing `ChatTurn` unique `(partyId, turnIndex)` index: before the Anthropic call, insert a `status='pending'` row claiming the next `turnIndex`. On P2002, retry with `turnIndex++` up to 3 times. Before the insert, short-circuit if a non-stale pending row (< `TURN_TIMEOUT_MS * 1.5` old) already exists for the party — this is the user-facing "Another turn in progress" case. On completion, `UPDATE` the pending row with final status/cost/diffStats.

Why: no new deps, no connection-pool footguns, same invariant (max one live Anthropic call per party), and the pending row doubles as crash-recovery evidence for cron to reap later if needed.

### D2 — T1.5 reconciliation window keyed off `Party.updatedAt`, not a dedicated `pickedAt` column

Planning doc §cron sweep asked for losers "older than 5 minutes since the pick". No `Party.pickedAt` column exists in the schema; `PickDecision.createdAt` is the authoritative pick time but joining through it per-party is awkward in Prisma's query builder.

Shipped: the cron query filters `Party.updatedAt < cutoff` as a proxy — the pick transaction already updates `Party.chatSessionAgentId` + `sandboxState`, which touches `updatedAt`. If something else nudges `updatedAt` later (e.g. activity), the cron simply defers reconciliation another 5 min, which is safe. The `Agent.sandboxTerminatedAt IS NULL` + `sandboxId IS NOT NULL` filter still guarantees we only retry genuinely-stuck losers.

Why not add `pickedAt`: extra migration for a 1-bit-of-information field that `PickDecision.createdAt` already records exactly; querying `updatedAt` with the other filters is sufficient for the "retry after 5 min" semantics.

### D3 — T1.5 no isolated unit test for `terminateLosers` parallelization

The parallelization + `sandboxTerminatedAt` stamping is covered by the plan's manual acceptance test (pick a persona, verify 2 loser timestamps set within 5 s; stub a Daytona failure, verify cron sweep retries). Writing a pure-TS unit test would require mocking the Daytona SDK singleton + Prisma client end-to-end, which the project has no existing harness for (no vitest/jest; node:test runs only pure-logic modules). Defer to manual smoke (T4.4 step 4) — same signal, no net-new infra debt.

### D4 — T2.5 CSRF constants split into `csrf-constants.ts`

`client-fetch.ts` (browser) imports the header name/value from what was originally `csrf.ts`. But `csrf.ts` also imports `NextRequest`/`NextResponse` from `next/server` for the `requireCsrfHeader` guard, which would transitively pull Next.js server internals into the client bundle. Extracted the two string constants into a dependency-free `csrf-constants.ts`; server `csrf.ts` re-exports them for legacy callers. Zero runtime change, cleaner bundle graph.

### D5 — T2.2 rate-limit degrades gracefully without Upstash

Upstash creds (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) are optional. When missing, `checkChatRateLimit` returns `{ allowed: true, remaining: -1 }` and every request passes. This is intentional — a local dev machine without Upstash should be able to run end-to-end without the limiter 429-ing the developer. Production must set both env vars; `.env.example` documents this with an explicit "NOT for prod" warning.

### D6 — T2.7 Preview-proxy SSRF allowlist via hostname suffix, not exact match

Daytona returns preview URLs like `https://3000-u1234.proxy.daytona.work`, and the exact hostname varies by org/region. Hardcoding the whole URL isn't feasible. We check `new URL(raw)` → require `https:` + `hostname.endsWith(suffix)` against a comma-separated list (`DAYTONA_PREVIEW_HOST_SUFFIXES`, default `.daytona.work,.daytona.app,.daytona.io`). Self-hosted Daytona users override the env var.

### D7 — T3.1 IteratePage skeleton keeps existing ChatPane as the TurnColumn body

The UX spec in `01-ux-spec.md` calls for a `TurnColumn` containing `TurnCard[]` / `InputDock` / `ChipRow`. T3.1's acceptance criterion is only "post-pick shows the new layout; no regression in pick-flow or pre-pick compare view." We achieve that by rendering the pre-existing `ChatPane` inside the right-hand grid column for now, and let T3.2 (TurnCard + DiffDrawer) and T3.3 (InputDock + chips) swap in the new primitives. This keeps each commit small and auditable instead of landing 1000+ lines in one go.

### D8 — T3.6 ViewportToggle landed inside T3.1

Building `ViewportToggle` as a dumb skeleton in T3.1 and re-wiring it in T3.6 would have been duplicated work. The toggle ships fully wired in T3.1: segmented control, mobile device frame (no iframe remount — `src` stays stable to preserve HMR), localStorage persistence under `patchparty:viewport`, honest-limitation tooltip. T3.6 is therefore marked complete by T3.1.

### D9 — Security-reviewer follow-up fixes (post-Sprint-2)

Code-reviewer agent flagged 5 findings against the Sprint 2 commit. Landed as one follow-up commit (b209a43):

- **CRITICAL** /api/sandbox/cleanup was unauthenticated — added `auth()` + Agent/Party ownership filter before Daytona delete. sendBeacon carries session cookies, so the auth flow still works.
- **HIGH** /api/preview/[target] accepted any decoded URL → SSRF. Added the hostname-suffix allowlist (see D6).
- **HIGH** Windows-backslash paths in safe-path. Added 3 test cases (`.\.env`, `sub\.env.production`, `nested\path\to\id_rsa`) — all correctly refused by the existing backslash-to-slash normalisation.
- **MEDIUM** CSRF check fired before auth on all four routes → unauthenticated probes got 403 instead of 401, leaking route existence. Reordered all four POST handlers to `auth()` → `requireCsrfHeader()` → work.
- **MEDIUM** CSP is clickjacking-only (`frame-src` + `frame-ancestors`) — no `script-src`/`default-src`. Documented gap, not in this sprint.

