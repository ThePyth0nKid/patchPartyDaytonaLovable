// Usage / rate-limit helpers.
//
// A single UsageCounter row per user tracks `partiesToday`; the dayStart
// timestamp rolls forward whenever we notice a new UTC day. The caller is
// expected to use these helpers inside the party-start handler before any
// agent is fired, so we don't spawn sandboxes we'd only refuse afterward.
//
// Maintainer bypass: users whose `githubLogin` is in the comma-separated
// env var `MAINTAINER_GITHUB_LOGINS` skip the daily cap and get a lifted
// concurrent cap (MAINTAINER_CONCURRENT_LIMIT). They still respect a
// concurrent cap — a stolen maintainer session otherwise enables unbounded
// parallel Daytona/Anthropic spend (see security review on 9f2a84f).

import { prisma } from './prisma'
import { log } from './log'
import { parseMaintainerLogins } from './maintainers'

export const DAILY_PARTY_LIMIT = 5
export const CONCURRENT_PARTIES_LIMIT = 1
/** Concurrent cap for maintainers. Lifted vs. normal users but not ∞. */
export const MAINTAINER_CONCURRENT_LIMIT = 3

export interface UsageSnapshot {
  partiesToday: number
  partiesTotal: number
  dayStart: Date
  remaining: number
  /** True when this user bypasses the daily cap (maintainer). */
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
 * without a linked githubLogin, and fails closed (returns false) on DB
 * errors so a transient Postgres hiccup can't accidentally grant bypass.
 */
export async function isMaintainer(userId: string): Promise<boolean> {
  const logins = parseMaintainerLogins()
  if (logins.size === 0) return false
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { githubLogin: true },
    })
    if (!user?.githubLogin) return false
    return logins.has(user.githubLogin.toLowerCase())
  } catch (err) {
    log.warn('isMaintainer DB lookup failed, defaulting to false', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    })
    return false
  }
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
  /** True when the caller is a maintainer and bypassed the daily cap. */
  unlimited?: boolean
}

export async function checkAndReserveUsage(
  userId: string,
): Promise<UsageCheckResult> {
  const maintainer = await isMaintainer(userId)

  // Maintainers skip the daily cap but still respect a (lifted) concurrent
  // cap so a stolen session can't fan out unlimited parallel sandboxes.
  if (maintainer) {
    const runningCount = await prisma.party.count({
      where: { userId, status: 'RUNNING' },
    })
    if (runningCount >= MAINTAINER_CONCURRENT_LIMIT) {
      return {
        ok: false,
        reason: 'concurrent-limit',
        remaining: DAILY_PARTY_LIMIT,
        unlimited: true,
      }
    }
    return { ok: true, remaining: DAILY_PARTY_LIMIT, unlimited: true }
  }

  // Normal users: one concurrent + 5/day. We already know they're not a
  // maintainer, so skip the redundant isMaintainer() lookup inside
  // loadUsage by reading the counter + running-count directly.
  const now = new Date()
  const [row, runningCount] = await Promise.all([
    prisma.usageCounter.upsert({
      where: { userId },
      create: { userId },
      update: {},
    }),
    prisma.party.count({ where: { userId, status: 'RUNNING' } }),
  ])

  const partiesToday = sameUtcDay(row.dayStart, now) ? row.partiesToday : 0
  const remaining = Math.max(0, DAILY_PARTY_LIMIT - partiesToday)

  if (runningCount >= CONCURRENT_PARTIES_LIMIT) {
    return { ok: false, reason: 'concurrent-limit', remaining }
  }

  if (remaining <= 0) {
    return { ok: false, reason: 'daily-limit', remaining: 0 }
  }

  const rollOver = !sameUtcDay(row.dayStart, now)
  await prisma.usageCounter.update({
    where: { userId },
    data: {
      partiesToday: rollOver ? 1 : { increment: 1 },
      partiesTotal: { increment: 1 },
      dayStart: rollOver ? now : undefined,
    },
  })

  return { ok: true, remaining: remaining - 1 }
}
