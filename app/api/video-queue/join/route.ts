import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    })

    const body = await req.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 })
    }

    const { data: existingQueue } = await supabase
      .from("video_queue")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .single()

    if (existingQueue) {
      console.log("[v0] User already active in room:", existingQueue.room_id)
      return NextResponse.json({
        success: true,
        roomId: existingQueue.room_id,
        matched: !!existingQueue.matched_user_id,
        partnerId: existingQueue.matched_user_id || null,
        partnerProfile: null,
      })
    }

    const { data: waitingUsers, error: waitError } = await supabase
      .from("video_queue")
      .select("user_id, room_id, id")
      .eq("status", "waiting")
      .order("created_at", { ascending: true })
      .limit(1)

    if (waitError) {
      console.error("[v0] Error finding waiting users:", waitError)
    }

    if (waitingUsers && waitingUsers.length > 0) {
      const waitingUser = waitingUsers[0]
      const partnerId = waitingUser.user_id
      const roomId = waitingUser.room_id

      console.log("[v0] MATCH FOUND - Creating bidirectional match")

      // Update waiting user to active
      const { error: updateError } = await supabase
        .from("video_queue")
        .update({
          status: "active",
          matched_user_id: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", waitingUser.id)

      if (updateError) {
        console.error("[v0] Error updating waiting user:", updateError)
        return NextResponse.json({ success: false, error: String(updateError) }, { status: 500 })
      }

      // Insert new user as active in same room
      const { error: insertError } = await supabase.from("video_queue").insert({
        user_id: userId,
        room_id: roomId,
        status: "active",
        matched_user_id: partnerId,
        created_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error("[v0] Error inserting current user:", insertError)
        return NextResponse.json({ success: false, error: String(insertError) }, { status: 500 })
      }

      // Fetch partner profile
      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, city")
        .eq("id", partnerId)
        .single()

      return NextResponse.json({
        success: true,
        roomId,
        matched: true,
        partnerId,
        partnerProfile: partnerProfile || null,
      })
    }

    const roomId = generateUUID()

    const { error: insertError } = await supabase.from("video_queue").insert({
      user_id: userId,
      room_id: roomId,
      status: "waiting",
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error("[v0] Error creating waiting entry:", insertError)
      return NextResponse.json({ success: false, error: String(insertError) }, { status: 500 })
    }

    console.log("[v0] User added to WAITING queue in new room:", roomId)

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
