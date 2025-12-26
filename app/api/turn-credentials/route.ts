import { NextResponse } from "next/server"

export async function GET() {
  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    {
      urls: "turn:a.relay.metered.ca:80",
      username: "87e69d8f6e87d94518d47ac4",
      credential: "yWdZ8VhPV8dLGF0H",
    },
    {
      urls: "turn:a.relay.metered.ca:80?transport=tcp",
      username: "87e69d8f6e87d94518d47ac4",
      credential: "yWdZ8VhPV8dLGF0H",
    },
    {
      urls: "turn:a.relay.metered.ca:443",
      username: "87e69d8f6e87d94518d47ac4",
      credential: "yWdZ8VhPV8dLGF0H",
    },
    {
      urls: "turns:a.relay.metered.ca:443?transport=tcp",
      username: "87e69d8f6e87d94518d47ac4",
      credential: "yWdZ8VhPV8dLGF0H",
    },
  ]

  console.log("[v0] Returning Metered TURN servers")
  return NextResponse.json({ iceServers, ttl: 3600 })
}
