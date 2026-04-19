# 01 — Telemetry Pipeline

## Why

Today: in-memory `EventEmitter` in `src/lib/store.ts`. Container restart = subscribers lose events. No historical record of state-changes. Can't measure pick-rates, COGS, or build patterns from data.

v2.0 needs a durable event-log + cross-container pub/sub to enable:
- Pick-telemetry as RLHF-dataset (the actual moat)
- Observability for chat-iterate debugging
- COGS per party (AgentMetric + ChatTurn)

## Architecture

```
runAgent() / chat.ts / pick route
        │
        ▼
  emitEvent(type, payload)     ← src/lib/events.ts
        │
        ├─ prisma.partyEvent.create(...)        [durable]
        └─ pg_notify('party_events', json)       [realtime]
                                   │
                                   ▼
                          Postgres LISTEN        ← src/lib/store.ts (refactored)
                                   │
                                   ▼
                          SSE Chunk → Client
```

## Event Types (const enum)

```ts
export const EventType = {
  PARTY_STARTED: 'party.started',
  PARTY_COMPLETED: 'party.completed',
  PARTY_FAILED: 'party.failed',
  AGENT_QUEUED: 'agent.queued',
  AGENT_RUNNING: 'agent.running',
  AGENT_STREAMING: 'agent.streaming',
  AGENT_DONE: 'agent.done',
  AGENT_ERROR: 'agent.error',
  PERSONA_PICKED: 'persona.picked',
  SANDBOX_PAUSED: 'sandbox.paused',
  SANDBOX_RESUMED: 'sandbox.resumed',
  SANDBOX_TERMINATED: 'sandbox.terminated',
  CHAT_TURN_SENT: 'chat.turn.sent',
  CHAT_TURN_APPLIED: 'chat.turn.applied',
  CHAT_TURN_FAILED: 'chat.turn.failed',
  PR_OPENED: 'pr.opened',
  PR_MERGED: 'pr.merged',
  PR_CLOSED_UNMERGED: 'pr.closed_unmerged',
  BYOK_KEY_USED: 'byok.key_used',
  BYOK_KEY_ROTATED: 'byok.key_rotated',
} as const
export type EventType = (typeof EventType)[keyof typeof EventType]
```

## TraceId Propagation

```ts
// src/lib/trace.ts
import { AsyncLocalStorage } from 'node:async_hooks'
const traceStorage = new AsyncLocalStorage<{ traceId: string }>()

export function withTrace<T>(traceId: string, fn: () => T): T {
  return traceStorage.run({ traceId }, fn)
}
export function getCurrentTraceId(): string | undefined {
  return traceStorage.getStore()?.traceId
}
```

- `POST /api/party/start` generates `traceId = nanoid(16)`, wraps handler in `withTrace`.
- `runAgent()` pulls current traceId, passes to Anthropic-SDK as custom header `anthropic-trace-id`.
- `/api/party/[id]/chat` generates new `chatTraceId` per turn (linked to parent `partyTraceId` via `payload.parentTraceId`).

## emitEvent Contract

```ts
// src/lib/events.ts
export async function emitEvent(
  type: EventType,
  payload: {
    partyId: string
    agentId?: string
    [k: string]: unknown
  }
): Promise<void> {
  const traceId = getCurrentTraceId() ?? 'no-trace'
  await prisma.partyEvent.create({
    data: { partyId: payload.partyId, agentId: payload.agentId, type, traceId, payload },
  })
  await prisma.$executeRaw`SELECT pg_notify('party_events', ${JSON.stringify({
    partyId: payload.partyId,
    type,
    traceId,
    payload,
  })})`
}
```

## Postgres LISTEN (SSE)

Refactor `partyStore.subscribe(partyId, cb)`:
- Dedicated pg-Client (not via Prisma — Prisma doesn't expose LISTEN cleanly) using `pg` package.
- `LISTEN party_events`.
- On `notification` event: parse JSON, filter by `partyId`, call `cb(event)`.
- Maintain *memory-subscribers-map* for same-container fan-out (optimization: emit once to LISTEN, fan out in-memory to all same-party SSE-handlers).

## Schema

```prisma
model PartyEvent {
  id        BigInt   @id @default(autoincrement())
  partyId   String
  agentId   String?
  type      String   // EventType string literal
  traceId   String
  payload   Json
  createdAt DateTime @default(now())

  party Party @relation(fields: [partyId], references: [id], onDelete: Cascade)

  @@index([partyId, createdAt])
  @@index([traceId])
  @@index([type, createdAt])
}

model AgentMetric {
  id                String   @id @default(cuid())
  agentId           String   @unique
  partyId           String
  inputTokens       Int      @default(0)
  outputTokens      Int      @default(0)
  cacheReadTokens   Int      @default(0)
  cacheCreateTokens Int      @default(0)
  latencyMs         Int      @default(0)
  sandboxTimeMs     Int      @default(0)
  toolCalls         Json?
  costUsd           Decimal  @db.Decimal(10, 4) @default(0)
  createdAt         DateTime @default(now())

  agent Agent @relation(fields: [agentId], references: [id], onDelete: Cascade)
  party Party @relation(fields: [partyId], references: [id], onDelete: Cascade)

  @@index([partyId])
}

model PickDecision {
  id             String   @id @default(cuid())
  partyId        String   @unique
  pickedAgentId  String
  reasonText     String?  @db.Text
  comparedAgents String[]
  createdAt      DateTime @default(now())

  party Party @relation(fields: [partyId], references: [id], onDelete: Cascade)
}

model ChatTurn {
  id               String   @id @default(cuid())
  partyId          String
  turnIndex        Int
  userMessage      String   @db.Text
  assistantResponse String? @db.Text
  toolCalls        Json?
  diffApplied      String[]
  inputTokens      Int      @default(0)
  outputTokens    Int      @default(0)
  cacheReadTokens  Int      @default(0)
  latencyMs        Int      @default(0)
  costUsd          Decimal  @db.Decimal(10, 4) @default(0)
  status           String   // sent|applied|failed
  error            String?  @db.Text
  createdAt        DateTime @default(now())

  party Party @relation(fields: [partyId], references: [id], onDelete: Cascade)

  @@unique([partyId, turnIndex])
  @@index([partyId, createdAt])
}
```

## Acceptance

- `SELECT count(*) FROM party_events WHERE party_id = '<id>'` returns ≥ 10 events for a typical race+chat party.
- Every `party.started` has matching `party.completed` or `party.failed` within 15 min.
- Container-restart in middle of party → new SSE connection receives subsequent events via LISTEN (not memory-emitter).
