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

    const { data: userQueue, error: queueError } = await supabase
      .from("video_queue")
      .select("*")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .single()

    if (queueError || !userQueue) {
      console.log("[v0] Queue entry not found for roomId:", roomId)
      return NextResponse.json({
        status: "not_found",
        partnerId: null,
        partnerProfile: null,
      })
    }

    if (userQueue.status === "active" && userQueue.matched_user_id) {
      const partnerId = userQueue.matched_user_id

      const { data: partnerProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, city")
        .eq("id", partnerId)
        .single()

      if (profileError) {
        console.error("[v0] Error fetching partner profile:", profileError)
      }

      return NextResponse.json({
        status: "active",
        partnerId,
        partnerProfile: partnerProfile || null,
      })
    }

    // Still waiting
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
