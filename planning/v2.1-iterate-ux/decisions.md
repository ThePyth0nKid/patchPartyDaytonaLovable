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

