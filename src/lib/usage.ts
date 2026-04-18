// Usage / rate-limit helpers.
//
// A single UsageCounter row per user tracks `partiesToday`; the dayStart
// timestamp rolls forward whenever we notice a new UTC day. The caller is
// expected to use these helpers inside the party-start handler before any
// agent is fired, so we don't spawn sandboxes we'd only refuse afterward.

import { prisma } from './prisma'

export const DAILY_PARTY_LIMIT = 5
export const CONCURRENT_PARTIES_LIMIT = 1

export interface UsageSnapshot {
  partiesToday: number
  partiesTotal: number
  dayStart: Date
  remaining: number
}

function sameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

export async function loadUsage(userId: string): Promise<UsageSnapshot> {
  const row = await prisma.usageCounter.upsert({
    where: { userId },
    create: { userId },
    update: {},
  })
  const now = new Date()
  const partiesToday = sameUtcDay(row.dayStart, now) ? row.partiesToday : 0
  return {
    partiesToday,
    partiesTotal: row.partiesTotal,
    dayStart: row.dayStart,
    remaining: Math.max(0, DAILY_PARTY_LIMIT - partiesToday),
  }
}

export interface UsageCheckResult {
  ok: boolean
  reason?: 'daily-limit' | 'concurrent-limit'
  remaining: number
}

export async function checkAndReserveUsage(
  userId: string,
): Promise<UsageCheckResult> {
  const [usage, runningCount] = await Promise.all([
    loadUsage(userId),
    prisma.party.count({ where: { userId, status: 'RUNNING' } }),
  ])

  if (runningCount >= CONCURRENT_PARTIES_LIMIT) {
    return { ok: false, reason: 'concurrent-limit', remaining: usage.remaining }
  }

  if (usage.remaining <= 0) {
    return { ok: false, reason: 'daily-limit', remaining: 0 }
  }

  const now = new Date()
  const rollOver = !sameUtcDay(usage.dayStart, now)
  await prisma.usageCounter.update({
    where: { userId },
    data: {
      partiesToday: rollOver ? 1 : { increment: 1 },
      partiesTotal: { increment: 1 },
      dayStart: rollOver ? now : undefined,
    },
  })

  return { ok: true, remaining: usage.remaining - 1 }
}
