import { NextResponse } from "next/server"

export async function GET() {
  const apiKey = process.env.METERED_API_KEY
  const METERED_DOMAIN = "connextapp.metered.live"

  if (apiKey) {
    try {
      console.log("[v0] Fetching TURN credentials...")
      const response = await fetch(`https://${METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${apiKey}`, {
        cache: "no-store",
      })

      if (response.ok) {
        const credentials = await response.json()
        console.log("[v0] Metered credentials fetched successfully")
        console.log("[v0] Credentials count:", credentials.length)

        if (credentials.length > 0) {
          const first = credentials[0]
          console.log("[v0] First credential has username:", !!first.username)
          console.log("[v0] First credential urls:", first.urls)
        }

        return NextResponse.json({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            ...credentials,
          ],
        })
      } else {
        const errorText = await response.text()
        console.error("[v0] Metered API error:", response.status, errorText)
      }
    } catch (error) {
      console.error("[v0] Metered fetch error:", error)
    }
  } else {
    console.log("[v0] No METERED_API_KEY, using fallback servers")
  }

  const iceServers = [
    // Google STUN servers (very reliable)
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },

    // Twilio STUN (reliable)
    { urls: "stun:global.stun.twilio.com:3478" },

    // OpenRelay TURN (free public, works for NAT traversal)
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turns:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },

    // Alternative free TURN from Metered OpenRelay
    {
      urls: "turn:openrelay.metered.ca:80?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ]

  return NextResponse.json({ iceServers })
}
