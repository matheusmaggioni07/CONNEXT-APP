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

    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 })
    }

    const { data: existingRoom } = await supabase
      .from("video_queue")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .single()

    if (existingRoom) {
      return NextResponse.json({
        success: true,
        roomId: existingRoom.room_id,
        matched: false,
        partnerId: null,
        partnerProfile: null,
      })
    }

    const { data: waitingRooms } = await supabase
      .from("video_queue")
      .select("*, profiles:user_id(id, full_name, avatar_url, city)")
      .eq("status", "waiting")
      .limit(1)

    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    if (waitingRooms && waitingRooms.length > 0) {
      const waitingRoom = waitingRooms[0]
      const partnerId = waitingRoom.user_id
      const partnerProfile = waitingRoom.profiles

      // Update waiting room to active with matched partner
      await supabase
        .from("video_queue")
        .update({
          status: "active",
          matched_user_id: userId,
          room_id: roomId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", waitingRoom.id)

      // Create new active room for current user
      await supabase.from("video_queue").insert({
        user_id: userId,
        room_id: roomId,
        status: "active",
        matched_user_id: partnerId,
        created_at: new Date().toISOString(),
      })

      return NextResponse.json({
        success: true,
        roomId,
        matched: true,
        partnerId,
        partnerProfile,
      })
    }

    await supabase.from("video_queue").insert({
      user_id: userId,
      room_id: roomId,
      status: "waiting",
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      roomId,
      matched: false,
      partnerId: null,
      partnerProfile: null,
    })
  } catch (error) {
    console.error("[v0] Video queue join error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
