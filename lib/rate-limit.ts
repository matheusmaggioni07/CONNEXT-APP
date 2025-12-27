import { kv } from "@vercel/kv"

export interface RateLimitConfig {
  limit: number
  window: number // in seconds
  keyPrefix: string
}

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): Promise<{ success: boolean; remaining: number; resetAfter: number }> {
  const key = `${config.keyPrefix}:${identifier}`

  try {
    const current = await kv.incr(key)

    if (current === 1) {
      await kv.expire(key, config.window)
    }

    const ttl = await kv.ttl(key)

    if (current > config.limit) {
      return {
        success: false,
        remaining: 0,
        resetAfter: Math.max(ttl, 1),
      }
    }

    return {
      success: true,
      remaining: Math.max(0, config.limit - current),
      resetAfter: Math.max(ttl, 0),
    }
  } catch (error) {
    console.error("[Rate Limit] Error:", error)
    // Fail open - allow request if rate limit service is down
    return {
      success: true,
      remaining: config.limit,
      resetAfter: 0,
    }
  }
}

export const RATE_LIMITS = {
  turnCredentials: { limit: 10, window: 60, keyPrefix: "ratelimit:turn" } as RateLimitConfig,
  videoJoin: { limit: 30, window: 3600, keyPrefix: "ratelimit:video_join" } as RateLimitConfig,
  emailResend: { limit: 5, window: 86400, keyPrefix: "ratelimit:email_resend" } as RateLimitConfig,
  apiGeneral: { limit: 100, window: 60, keyPrefix: "ratelimit:api" } as RateLimitConfig,
  login: { limit: 10, window: 300, keyPrefix: "ratelimit:login" } as RateLimitConfig,
}
