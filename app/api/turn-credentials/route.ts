import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { createErrorResponse, handleAPIError } from "@/lib/error-handler"

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    // Check rate limit
    const { success, remaining, resetAfter } = await checkRateLimit(ip, RATE_LIMITS.turnCredentials)

    if (!success) {
      return NextResponse.json(
        createErrorResponse(429, "Too many requests. Please try again later.", "RATE_LIMIT_EXCEEDED"),
        {
          status: 429,
          headers: {
            "Retry-After": resetAfter.toString(),
            "X-RateLimit-Remaining": "0",
          },
        },
      )
    }

    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(createErrorResponse(401, "Unauthorized", "UNAUTHORIZED"), { status: 401 })
    }

    // Verify user exists in profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(createErrorResponse(403, "User profile not found", "PROFILE_NOT_FOUND"), {
        status: 403,
      })
    }

    // Fetch Metered TURN credentials
    const domain = process.env.METERED_DOMAIN
    const apiKey = process.env.METERED_API_KEY

    let iceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
    ]

    if (domain && apiKey && apiKey.length > 10) {
      try {
        const response = await fetch(`https://${domain}/api/v1/turn/credentials?apikey=${apiKey}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        })

        if (response.ok) {
          const data = await response.json()
          iceServers = [...iceServers, ...(data.iceServers || [])]
          console.log("[TURN Credentials] Fetched from Metered")
        }
      } catch (err) {
        console.warn("[TURN Credentials] Metered fetch failed, using fallback", err)
      }
    }

    return NextResponse.json(
      { iceServers, ttl: 3600 },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=300",
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "X-RateLimit-Limit": RATE_LIMITS.turnCredentials.limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
        },
      },
    )
  } catch (error) {
    const { statusCode, body } = handleAPIError(error, "Failed to fetch TURN credentials")
    return NextResponse.json(body, { status: statusCode })
  }
}
