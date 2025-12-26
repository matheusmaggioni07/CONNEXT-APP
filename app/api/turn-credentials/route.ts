import { NextResponse } from "next/server"

export async function GET() {
  const apiKey = process.env.METERED_API_KEY
  const METERED_DOMAIN = "connextapp.metered.live"

  const fallbackServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
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
  ]

  if (apiKey) {
    try {
      const response = await fetch(`https://${METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${apiKey}`)

      if (response.ok) {
        const credentials = await response.json()
        return NextResponse.json({
          iceServers: [...credentials, ...fallbackServers],
        })
      }
    } catch (error) {
      console.warn("[v0] Metered credentials fetch failed, using fallback:", error)
    }
  }

  return NextResponse.json({ iceServers: fallbackServers })
}
