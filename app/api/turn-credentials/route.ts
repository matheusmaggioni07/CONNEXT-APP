import { NextResponse } from "next/server"

export async function GET() {
  const apiKey = process.env.METERED_API_KEY
  const METERED_DOMAIN = "connextapp.metered.live"

  const fallbackServers: RTCIceServer[] = [
    // Google STUN servers (very reliable)
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },

    // Twilio STUN
    { urls: "stun:global.stun.twilio.com:3478" },

    // OpenRelay TURN servers (free, reliable for NAT traversal)
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
    {
      urls: "turn:openrelay.metered.ca:80?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },

    // Alternative free TURN from Metered
    {
      urls: "turn:a.relay.metered.ca:80",
      username: "e8c80d42e58d7958fd81fe5d",
      credential: "qTFbWzHYfDBQhMHd",
    },
    {
      urls: "turn:a.relay.metered.ca:80?transport=tcp",
      username: "e8c80d42e58d7958fd81fe5d",
      credential: "qTFbWzHYfDBQhMHd",
    },
    {
      urls: "turn:a.relay.metered.ca:443",
      username: "e8c80d42e58d7958fd81fe5d",
      credential: "qTFbWzHYfDBQhMHd",
    },
    {
      urls: "turns:a.relay.metered.ca:443?transport=tcp",
      username: "e8c80d42e58d7958fd81fe5d",
      credential: "qTFbWzHYfDBQhMHd",
    },
  ]

  if (apiKey) {
    try {
      const response = await fetch(`https://${METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${apiKey}`, {
        cache: "no-store",
      })

      if (response.ok) {
        const credentials = await response.json()

        // Combine Metered credentials with fallback servers
        return NextResponse.json({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            ...credentials,
            ...fallbackServers.slice(6), // Add fallback TURN servers
          ],
        })
      }
    } catch (error) {
      console.error("[v0] Metered fetch error:", error)
    }
  }

  return NextResponse.json({ iceServers: fallbackServers })
}
