import { NextResponse } from "next/server"

export async function GET() {
  const apiKey = process.env.METERED_API_KEY

  // Your Metered.ca domain
  const METERED_DOMAIN = "connextapp.metered.live"

  if (apiKey) {
    try {
      // Fetch dynamic TURN credentials from your Metered account
      const response = await fetch(`https://${METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${apiKey}`, {
        cache: "no-store",
      })

      if (response.ok) {
        const credentials = await response.json()
        console.log("[v0] Metered credentials fetched successfully")
        return NextResponse.json({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: `stun:${METERED_DOMAIN}:80` },
            ...credentials,
          ],
        })
      } else {
        console.error("[v0] Metered API error:", response.status)
      }
    } catch (error) {
      console.error("[v0] Metered fetch error:", error)
    }
  }

  // Fallback: Use your domain with static TURN servers
  const FALLBACK_SERVERS = [
    // Google STUN
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },

    // Your Metered.ca TURN servers
    {
      urls: `turn:${METERED_DOMAIN}:80`,
      username: "83eebabf8b4cce9d5dbcb649",
      credential: "2D7JvfkOQtBdYW3R",
    },
    {
      urls: `turn:${METERED_DOMAIN}:80?transport=tcp`,
      username: "83eebabf8b4cce9d5dbcb649",
      credential: "2D7JvfkOQtBdYW3R",
    },
    {
      urls: `turn:${METERED_DOMAIN}:443`,
      username: "83eebabf8b4cce9d5dbcb649",
      credential: "2D7JvfkOQtBdYW3R",
    },
    {
      urls: `turn:${METERED_DOMAIN}:443?transport=tcp`,
      username: "83eebabf8b4cce9d5dbcb649",
      credential: "2D7JvfkOQtBdYW3R",
    },
    {
      urls: `turns:${METERED_DOMAIN}:443?transport=tcp`,
      username: "83eebabf8b4cce9d5dbcb649",
      credential: "2D7JvfkOQtBdYW3R",
    },
  ]

  return NextResponse.json({ iceServers: FALLBACK_SERVERS })
}
