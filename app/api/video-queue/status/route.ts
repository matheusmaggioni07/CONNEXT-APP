import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    })

    const { roomId, userId } = await req.json()
    if (!roomId || !userId) {
      return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 })
    }

    const { data: roomEntries, error: queueError } = await supabase
      .from("video_queue")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })

    if (queueError || !roomEntries || roomEntries.length === 0) {
      console.log("[v0] Room not found for roomId:", roomId)
      return NextResponse.json({
        status: "not_found",
        partnerId: null,
        partnerProfile: null,
      })
    }

    const userEntry = roomEntries.find((entry) => entry.user_id === userId)

    if (!userEntry) {
      console.log("[v0] User entry not found in room:", roomId, userId)
      return NextResponse.json({
        status: "not_found",
        partnerId: null,
        partnerProfile: null,
      })
    }

    if (userEntry.status === "active" && userEntry.matched_user_id) {
      const partnerId = userEntry.matched_user_id

      const { data: partnerProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, city")
        .eq("id", partnerId)
        .single()

      if (profileError) {
        console.error("[v0] Error fetching partner profile:", profileError)
      }

      console.log("[v0] User matched with:", partnerId)
      return NextResponse.json({
        status: "active",
        partnerId,
        partnerProfile: partnerProfile || null,
      })
    }

    const activeEntries = roomEntries.filter((entry) => entry.status === "active")
    if (activeEntries.length >= 2) {
      const partner = activeEntries.find((entry) => entry.user_id !== userId)

      if (partner) {
        const partnerId = partner.user_id
        const { data: partnerProfile, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, city")
          .eq("id", partnerId)
          .single()

        if (profileError) {
          console.error("[v0] Error fetching partner profile:", profileError)
        }

        console.log("[v0] Match found - multiple active entries:", partnerId)
        return NextResponse.json({
          status: "active",
          partnerId,
          partnerProfile: partnerProfile || null,
        })
      }
    }

    // Still waiting
    console.log("[v0] Still waiting in room:", roomId)
    return NextResponse.json({
      status: "waiting",
      partnerId: null,
      partnerProfile: null,
    })
  } catch (error) {
    console.error("[v0] Video queue status error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
