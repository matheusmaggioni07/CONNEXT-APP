import { NextResponse } from "next/server"

export async function GET() {
  try {
    const domain = process.env.METERED_DOMAIN
    const apiKey = process.env.METERED_API_KEY

    if (domain && apiKey) {
      console.log("[v0] Fetching Metered TURN credentials from:", domain)

      try {
        const response = await fetch(`https://${domain}/api/v1/turn/credentials?apikey=${apiKey}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()
          const iceServers = [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
            ...(data.iceServers || []),
          ]
          console.log("[v0] Metered credentials received:", iceServers.length, "servers")
          return NextResponse.json({ iceServers, ttl: data.ttl || 3600 }, { status: 200 })
        }
      } catch (err) {
        console.error("[v0] Metered fetch error:", err)
      }
    }

    const iceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
      { urls: "stun:stun.services.mozilla.com:3478" },
      { urls: "stun:openrelay.metered.ca:80" },
    ]

    console.log("[v0] Using fallback STUN servers only")
    return NextResponse.json({ iceServers, ttl: 300 }, { status: 200 })
  } catch (error) {
    console.error("[v0] TURN credentials error:", error)
    return NextResponse.json(
      {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
        ttl: 300,
      },
      { status: 200 },
    )
  }
}
