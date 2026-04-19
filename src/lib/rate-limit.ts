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

export interface RateLimitResult {
  allowed: boolean
  /** Seconds until the next attempt is allowed. Only meaningful when allowed=false. */
  retryAfterSeconds: number
  /** Remaining requests in the current window. -1 when the limiter is inactive. */
  remaining: number
}

function buildLimiter(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  const redis = new Redis({ url, token })
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(4, '60 s'),
    analytics: false,
    prefix: 'patchparty:chat',
  })
}

let limiterSingleton: Ratelimit | null | undefined
function getLimiter(): Ratelimit | null {
  if (limiterSingleton === undefined) {
    limiterSingleton = buildLimiter()
  }
  return limiterSingleton
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
