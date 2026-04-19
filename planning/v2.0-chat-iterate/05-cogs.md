# 05 — COGS Instrumentation + Prompt Caching

## Why

Without measurement: can't ship pricing. Gründer guesstimate was $0.50/party; realistic list-price estimate is $3.50–$5.50. Must measure reality across 100 parties before v2.1 pricing goes live.

## Prompt Caching

Anthropic prompt-caching cuts cached-input-tokens to ~10% of uncached rate. TTL 5min. Suitable for:
- Persona system-prompts (same across entire party; in chat-iterate, same across entire session within 5min windows)
- Base chat-system-prompt-append
- Issue context (title/body) across all 5 personas within a race

In `src/lib/personas/index.ts`:
```ts
// existing:
export const personaSystemPrompt = (p: Persona): string => `
You are ${p.name}...
...
`

// new wrapper for Anthropic messages API:
export function personaSystemBlocks(p: Persona): Anthropic.Messages.TextBlockParam[] {
  return [
    {
      type: 'text',
      text: personaSystemPrompt(p),
      cache_control: { type: 'ephemeral' },
    },
  ]
}
```

Pass `system: personaSystemBlocks(persona)` to `anthropic.messages.create`. This is shape-compatible — string-form system-prompt still works, block-form adds the cache-control.

For chat-iterate, prepend to messages a system-blob list:
```ts
system: [
  { type: 'text', text: personaSystemPrompt(persona), cache_control: { type: 'ephemeral' } },
  { type: 'text', text: CHAT_MODE_APPEND, cache_control: { type: 'ephemeral' } },
  { type: 'text', text: `Issue: ${party.issueTitle}\n\n${party.issueBody}`, cache_control: { type: 'ephemeral' } },
]
```

Anthropic caches by prefix-match of system+messages tuple. Chat-turn N+1 hits cache for turns 1..N-1 automatically when within TTL.

## Rate Sheet (hardcoded, reviewed quarterly)

```ts
// src/lib/costing.ts
export const RATES = {
  // per 1M tokens
  'claude-opus-4-7': {
    input: 15,
    cacheRead: 1.5,
    cacheCreate: 18.75,
    output: 75,
  },
  'claude-haiku-4-5-20251001': {
    input: 1,
    cacheRead: 0.1,
    cacheCreate: 1.25,
    output: 5,
  },
  'claude-sonnet-4-6': {
    input: 3,
    cacheRead: 0.3,
    cacheCreate: 3.75,
    output: 15,
  },
  // per second
  daytona: {
    active: 0.02 / 60, // ~$0.02/min
    paused: 0.01 / 3600, // ~$0.01/h storage
  },
} as const
```

## AgentMetric Writes

In `src/lib/agent.ts` after each `anthropic.messages.create` call (or stream completion):

```ts
const usage = response.usage
const inputTokens = usage.input_tokens
const outputTokens = usage.output_tokens
const cacheReadTokens = usage.cache_read_input_tokens ?? 0
const cacheCreateTokens = usage.cache_creation_input_tokens ?? 0
const latencyMs = Date.now() - startTime

// accumulate in a per-agent counter, flush to AgentMetric on finish:
metrics.inputTokens += inputTokens
metrics.outputTokens += outputTokens
metrics.cacheReadTokens += cacheReadTokens
metrics.cacheCreateTokens += cacheCreateTokens
metrics.latencyMs += latencyMs

// on runAgent() finish:
await prisma.agentMetric.create({
  data: {
    agentId: agent.id,
    partyId: party.id,
    ...metrics,
    sandboxTimeMs,
    costUsd: computeCost('claude-opus-4-7', metrics, sandboxTimeMs),
  },
})
```

Same for `ChatTurn` inserts — each chat-turn carries its own token counts + cost.

## Cost Function

```ts
export function computeCost(
  model: keyof typeof RATES,
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheCreateTokens: number },
  sandboxTimeMs: number
): number {
  if (model === 'daytona') throw new Error('use computeSandboxCost for daytona')
  const r = RATES[model]
  const ai =
    (usage.inputTokens * r.input +
      usage.cacheReadTokens * r.cacheRead +
      usage.cacheCreateTokens * r.cacheCreate +
      usage.outputTokens * r.output) /
    1_000_000
  const sandboxSeconds = sandboxTimeMs / 1000
  const daytona = sandboxSeconds * RATES.daytona.active
  return Number((ai + daytona).toFixed(4))
}
```

## CLI Report

`npm run costs -- --since 2026-04-20`:

```
PatchParty COGS Report — since 2026-04-20
──────────────────────────────────────────

Parties:               87
Complete:              81 (93%)
Failed:                 6 (7%)

Cost-per-party (complete):
  Median:              $1.42
  p75:                 $1.89
  p95:                 $2.61
  Max:                 $4.88  (party #abc123, 5 Opus retries + 14-turn chat)

Token breakdown (complete parties, median):
  Input tokens:      112,450
  Cache-read tokens:  84,220  (hit rate: 43%)
  Output tokens:       8,940

Sandbox time (median):    184s

By persona (avg cost):
  accessibility-audit:  $1.51
  typescript-pedant:    $1.38
  minimal-scope:        $1.29
  react-optimizer:      $1.56
  pragmatic-fixer:      $1.34

Chat-sessions:       48 parties had ≥1 chat turn
  Avg turns:         4.2
  Avg added cost:    $0.37 per chatted party
```

Implementation: `npm run costs` = `tsx scripts/costs-report.ts`.

```ts
// scripts/costs-report.ts
const metrics = await prisma.agentMetric.findMany({
  where: { createdAt: { gte: since } },
  include: { party: true },
})
// aggregate...
```

## Acceptance

1. After 10 test-parties: `AgentMetric` has 50 rows (5 per party), `ChatTurn` has ≥5 rows (chat-sessions).
2. Each AgentMetric row's `costUsd > 0`, matches manual spot-check against Anthropic dashboard billing.
3. `npm run costs -- --since <yesterday>` runs in <5s, outputs structured report.
4. Chat-turn 3 in a session shows `cacheReadTokens > 0` (caching working across turns).
5. Median cost per party ≤ $1.80 after 50 parties with caching enabled.
