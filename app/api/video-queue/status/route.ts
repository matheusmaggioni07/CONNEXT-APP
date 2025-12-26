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

    const { data: userEntry, error: userError } = await supabase
      .from("video_queue")
      .select("*")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .single()

    if (userError || !userEntry) {
      console.log("[v0] User entry not found")
      return NextResponse.json({
        status: "not_found",
        matched: false,
        partnerId: null,
        partnerProfile: null,
      })
    }

    if (userEntry.matched_user_id) {
      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, city")
        .eq("id", userEntry.matched_user_id)
        .single()

      console.log("[v0] Returning matched partner:", userEntry.matched_user_id)
      return NextResponse.json({
        status: "active",
        matched: true,
        partnerId: userEntry.matched_user_id,
        partnerProfile: partnerProfile || null,
      })
    }

    const { data: roomEntries, error: roomError } = await supabase
      .from("video_queue")
      .select("user_id, status")
      .eq("room_id", roomId)

    if (roomError || !roomEntries) {
      console.log("[v0] Error fetching room entries")
      return NextResponse.json({
        status: "error",
        matched: false,
        partnerId: null,
        partnerProfile: null,
      })
    }

    const activeCount = roomEntries.length
    console.log("[v0] Room status - active users:", activeCount)

    if (activeCount >= 2) {
      // Find the other user
      const partner = roomEntries.find((entry) => entry.user_id !== userId)
      if (partner) {
        const { data: partnerProfile } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, city")
          .eq("id", partner.user_id)
          .single()

        console.log("[v0] Match detected - returning partner:", partner.user_id)
        return NextResponse.json({
          status: "active",
          matched: true,
          partnerId: partner.user_id,
          partnerProfile: partnerProfile || null,
        })
      }
    }

    // Still waiting
    return NextResponse.json({
      status: "waiting",
      matched: false,
      partnerId: null,
      partnerProfile: null,
    })
  } catch (error) {
    console.error("[v0] Video queue status error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
