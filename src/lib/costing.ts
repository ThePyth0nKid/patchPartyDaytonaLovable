// COGS instrumentation. Computes token + sandbox cost from metric rows.
//
// Rate sheet — keep in sync with Anthropic + Daytona pricing. Reviewed
// quarterly. USD per token / per second.

export const RATES = {
  opus: {
    input: 15 / 1_000_000,
    output: 75 / 1_000_000,
    cacheRead: 1.5 / 1_000_000,
    cacheCreate: 18.75 / 1_000_000,
  },
  haiku: {
    input: 1 / 1_000_000,
    output: 5 / 1_000_000,
    cacheRead: 0.1 / 1_000_000,
    cacheCreate: 1.25 / 1_000_000,
  },
  daytona: {
    perSecond: 0.02 / 60, // ~$0.02/min while ACTIVE
  },
} as const

export type ModelKind = 'opus' | 'haiku'

export interface TokenUsage {
  model: ModelKind
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
  cacheCreateTokens?: number
}

/** Compute dollar cost for a single message. */
export function computeCost(usage: TokenUsage): number {
  const rates = RATES[usage.model]
  return (
    usage.inputTokens * rates.input +
    usage.outputTokens * rates.output +
    (usage.cacheReadTokens ?? 0) * rates.cacheRead +
    (usage.cacheCreateTokens ?? 0) * rates.cacheCreate
  )
}

export function sandboxCost(timeMs: number): number {
  return (timeMs / 1000) * RATES.daytona.perSecond
}

export interface PartyCostBreakdown {
  partyId: string
  agentTokenCost: number
  chatTokenCost: number
  sandboxCost: number
  total: number
  agentCount: number
  chatTurnCount: number
}

/**
 * Aggregate a party's full COGS from AgentMetric + ChatTurn.
 * Uses lazy Prisma import so this file can be pulled into scripts without
 * dragging the whole prisma-generated client into the bundle.
 */
export async function computePartyCost(
  partyId: string,
): Promise<PartyCostBreakdown> {
  const { prisma } = await import('./prisma')
  const [metrics, turns] = await Promise.all([
    prisma.agentMetric.findMany({ where: { partyId } }),
    prisma.chatTurn.findMany({ where: { partyId } }),
  ])

  const agentTokenCost = metrics.reduce(
    (acc, m) => acc + Number(m.costUsd ?? 0),
    0,
  )
  const sandbox = metrics.reduce(
    (acc, m) => acc + sandboxCost(m.sandboxTimeMs ?? 0),
    0,
  )
  const chatTokenCost = turns.reduce(
    (acc, t) => acc + Number(t.costUsd ?? 0),
    0,
  )

  return {
    partyId,
    agentTokenCost,
    chatTokenCost,
    sandboxCost: sandbox,
    total: agentTokenCost + chatTokenCost + sandbox,
    agentCount: metrics.length,
    chatTurnCount: turns.length,
  }
}
