// Distributed rate limiter for PatchParty's hot endpoints.
//
// Uses Upstash's serverless Redis via `@upstash/ratelimit` so the counter
// survives a Railway redeploy and spans replicas if we scale out. The
// module degrades gracefully: if `UPSTASH_REDIS_REST_URL` /
// `UPSTASH_REDIS_REST_TOKEN` are missing (local dev without Upstash
// configured), every request is allowed. This is intentional — we don't
// want local dev to 429 silently when the only effect of "no limit" is
// that one dev machine can't DoS itself.
//
// Policy (T2.2): 4 chat turns per 60 seconds per signed-in user.
// Returns `Retry-After` in seconds so the client can show "try again in 12s".

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { log } from './log'

export interface RateLimitResult {
  allowed: boolean
  /** Seconds until the next attempt is allowed. Only meaningful when allowed=false. */
  retryAfterSeconds: number
  /** Remaining requests in the current window. -1 when the limiter is inactive. */
  remaining: number
}

let warnedMissingCreds = false
function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    // Local dev without Upstash is expected; production with no limiter
    // means every rate-limited route (chat, respawn) silently allows
    // unlimited calls. Log once per process so it's grep-able in Railway
    // but doesn't spam on every request.
    if (process.env.NODE_ENV === 'production' && !warnedMissingCreds) {
      warnedMissingCreds = true
      log.error(
        'UPSTASH_REDIS creds missing in production — rate limiters DISABLED',
      )
    }
    return null
  }
  return new Redis({ url, token })
}

function buildLimiter(): Ratelimit | null {
  const redis = getRedis()
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(4, '60 s'),
    analytics: false,
    prefix: 'patchparty:chat',
  })
}

function buildRespawnLimiter(): Ratelimit | null {
  const redis = getRedis()
  if (!redis) return null
  // Respawn boots a whole Daytona sandbox (~30–90 s, ~$0.01–0.05 of
  // compute). 2 per 5 min is generous for a human retrying after a
  // failure and tight enough to stop click-spam from draining the quota.
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(2, '300 s'),
    analytics: false,
    prefix: 'patchparty:respawn',
  })
}

let limiterSingleton: Ratelimit | null | undefined
function getLimiter(): Ratelimit | null {
  if (limiterSingleton === undefined) {
    limiterSingleton = buildLimiter()
  }
  return limiterSingleton
}

let respawnLimiterSingleton: Ratelimit | null | undefined
function getRespawnLimiter(): Ratelimit | null {
  if (respawnLimiterSingleton === undefined) {
    respawnLimiterSingleton = buildRespawnLimiter()
  }
  return respawnLimiterSingleton
}

/**
 * Consume one token for this user. Returns `{allowed:false, retryAfterSeconds}`
 * when the sliding window is full. If Upstash isn't configured, always
 * allows (see module comment).
 */
export async function checkChatRateLimit(
  userId: string,
): Promise<RateLimitResult> {
  const limiter = getLimiter()
  if (!limiter) {
    return { allowed: true, retryAfterSeconds: 0, remaining: -1 }
  }
  const result = await limiter.limit(`user:${userId}`)
  if (result.success) {
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: result.remaining,
    }
  }
  const retryAfterMs = Math.max(0, result.reset - Date.now())
  return {
    allowed: false,
    retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    remaining: 0,
  }
}

/**
 * Consume one token for this user on the respawn limiter. Respawn is
 * strictly more expensive than chat (spins a fresh Daytona sandbox), so
 * the window is tighter: 2 per 5 min. Same graceful no-op when Upstash
 * isn't configured.
 */
export async function checkRespawnRateLimit(
  userId: string,
): Promise<RateLimitResult> {
  const limiter = getRespawnLimiter()
  if (!limiter) {
    return { allowed: true, retryAfterSeconds: 0, remaining: -1 }
  }
  const result = await limiter.limit(`user:${userId}`)
  if (result.success) {
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: result.remaining,
    }
  }
  const retryAfterMs = Math.max(0, result.reset - Date.now())
  return {
    allowed: false,
    retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    remaining: 0,
  }
}
