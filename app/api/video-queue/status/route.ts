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

    const { data: room } = await supabase
      .from("video_queue")
      .select("*, profiles:matched_user_id(id, full_name, avatar_url, city)")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .single()

    if (!room) {
      return NextResponse.json({
        status: "not_found",
        partnerId: null,
        partnerProfile: null,
      })
    }

    if (room.status === "active" && room.matched_user_id) {
      return NextResponse.json({
        status: "active",
        partnerId: room.matched_user_id,
        partnerProfile: room.profiles,
      })
    }

    return NextResponse.json({
      status: room.status,
      partnerId: null,
      partnerProfile: null,
    })
  } catch (error) {
    console.error("[v0] Video queue status error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
