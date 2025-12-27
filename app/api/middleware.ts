import { type NextRequest, NextResponse } from "next/server"
import { checkRateLimit, type RATE_LIMITS } from "@/lib/rate-limit"
import { createErrorResponse } from "@/lib/error-handler"

export async function withRateLimit(
  request: NextRequest,
  rateLimitConfig: (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS],
  handler: (request: NextRequest) => Promise<NextResponse>,
) {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

  const { success, remaining, resetAfter } = await checkRateLimit(ip, rateLimitConfig)

  if (!success) {
    return NextResponse.json(
      createErrorResponse(429, "Too many requests. Please try again later.", "RATE_LIMIT_EXCEEDED"),
      {
        status: 429,
        headers: {
          "Retry-After": resetAfter.toString(),
          "X-RateLimit-Limit": rateLimitConfig.limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(Date.now() + resetAfter * 1000).toISOString(),
        },
      },
    )
  }

  const response = await handler(request)

  // Add rate limit headers to response
  response.headers.set("X-RateLimit-Limit", rateLimitConfig.limit.toString())
  response.headers.set("X-RateLimit-Remaining", remaining.toString())
  response.headers.set("X-RateLimit-Reset", new Date(Date.now() + resetAfter * 1000).toISOString())

  return response
}

export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: any) => Promise<NextResponse>,
) {
  const supabase = require("@/lib/supabase/server").createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(createErrorResponse(401, "Unauthorized", "UNAUTHORIZED"), { status: 401 })
  }

  return handler(request, user)
}
