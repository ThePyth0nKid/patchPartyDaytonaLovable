# v2.0 — Race, Pick, Iterate

**Target:** 6 weeks from start. Ships the chat-iterate flow + telemetry pipeline + BYOK.

**Nordstern:** User starts race → picks winner → chats to iterate code live in preview → ships PR. Every interaction lands in telemetry pipeline.

## Scope

1. **Telemetry Pipeline** — `PartyEvent`, `AgentMetric`, `PickDecision`, `ChatTurn` models; `traceId` propagated via AsyncLocalStorage; Postgres LISTEN/NOTIFY replaces in-memory pub/sub.
2. **Chat-iterate-live** — winner-sandbox stays warm; Opus with `apply_edit`/`run_command`/`read_file` tools; chunk-streaming (token-stream = v2.1 pro-feature).
3. **Sandbox-Pause/Resume** — state-machine: ACTIVE → IDLE_WARN → PAUSED → TERMINATED. Resume reactivates paused sandbox in <10s.
4. **BYOK** — user-provided Anthropic key, AES-GCM encrypted at rest, eliminates COGS-risk for power users.
5. **Prompt-Caching** — `cache_control: ephemeral` on persona system-prompts; ~60% input-token savings on chat-sessions.
6. **COGS-Instrumentation** — `src/lib/costing.ts` aggregates from AgentMetric + ChatTurn; CLI report `npm run costs`.

## Sub-docs

- [`01-telemetry-pipeline.md`](./01-telemetry-pipeline.md) — event-schema, traceId, pg_notify
- [`02-byok.md`](./02-byok.md) — encryption, validation, UI
- [`03-chat-iterate.md`](./03-chat-iterate.md) — tool-executor, chat-history, limits
- [`04-sandbox-lifecycle.md`](./04-sandbox-lifecycle.md) — state-machine + cron
- [`05-cogs.md`](./05-cogs.md) — rate-sheet, costing, prompt-caching

## Ship Criteria (all green before v2.0 live)

- [ ] 7 smoke-tests green (see cheerful-nibbling-quail.md)
- [ ] Security-review of `src/lib/byok.ts` + `src/lib/crypto.ts`
- [ ] 2-week beta with ≥10 external users, 0 P0 bugs
- [ ] Median COGS ≤ $1.80/party, p95 ≤ $3.00
- [ ] Migration reversible on staging

## Status

- Plan approved: 2026-04-18
- Phase 1 (planning folder + schema): in progress
