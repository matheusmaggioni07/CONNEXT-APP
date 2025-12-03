import { NextResponse } from "next/server"

export async function GET() {
  const apiKey = process.env.METERED_API_KEY
  const METERED_DOMAIN = "connextapp.metered.live"

  if (apiKey) {
    try {
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

  // These are well-known public TURN servers that work for most cases
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
