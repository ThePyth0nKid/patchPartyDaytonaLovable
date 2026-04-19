// Usage / rate-limit helpers.
//
// A single UsageCounter row per user tracks `partiesToday`; the dayStart
// timestamp rolls forward whenever we notice a new UTC day. The caller is
// expected to use these helpers inside the party-start handler before any
// agent is fired, so we don't spawn sandboxes we'd only refuse afterward.
//
// Maintainer bypass: users whose `githubLogin` is in the comma-separated
// env var `MAINTAINER_GITHUB_LOGINS` skip both the daily and concurrent
// check AND don't increment the counter. Intended for the project's own
// maintainers to test in production without fighting their own gate.

import { prisma } from './prisma'
import { parseMaintainerLogins } from './maintainers'

export const DAILY_PARTY_LIMIT = 5
export const CONCURRENT_PARTIES_LIMIT = 1

export interface UsageSnapshot {
  partiesToday: number
  partiesTotal: number
  dayStart: Date
  remaining: number
  /** True when this user bypasses daily/concurrent caps (maintainer). */
  unlimited: boolean
}

function sameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

/**
 * True when this user's `githubLogin` is listed in
 * `MAINTAINER_GITHUB_LOGINS`. Case-insensitive. Returns false for users
 * without a linked githubLogin.
 */
export async function isMaintainer(userId: string): Promise<boolean> {
  const logins = parseMaintainerLogins()
  if (logins.size === 0) return false
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { githubLogin: true },
  })
  if (!user?.githubLogin) return false
  return logins.has(user.githubLogin.toLowerCase())
}

export async function loadUsage(userId: string): Promise<UsageSnapshot> {
  const [row, maintainer] = await Promise.all([
    prisma.usageCounter.upsert({
      where: { userId },
      create: { userId },
      update: {},
    }),
    isMaintainer(userId),
  ])
  const now = new Date()
  const partiesToday = sameUtcDay(row.dayStart, now) ? row.partiesToday : 0
  return {
    partiesToday,
    partiesTotal: row.partiesTotal,
    dayStart: row.dayStart,
    remaining: maintainer
      ? DAILY_PARTY_LIMIT
      : Math.max(0, DAILY_PARTY_LIMIT - partiesToday),
    unlimited: maintainer,
  }
}

export interface UsageCheckResult {
  ok: boolean
  reason?: 'daily-limit' | 'concurrent-limit'
  remaining: number
  /** True when the caller is a maintainer and bypassed all gates. */
  unlimited?: boolean
}

export async function checkAndReserveUsage(
  userId: string,
): Promise<UsageCheckResult> {
  if (await isMaintainer(userId)) {
    // Maintainers don't count against either cap, and we don't increment
    // the counter — keeps their UsageCounter row representative of a
    // normal user session if they ever switch contexts.
    return { ok: true, remaining: DAILY_PARTY_LIMIT, unlimited: true }
  }

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
