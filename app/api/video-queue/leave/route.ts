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

    if (roomId && roomId !== "undefined") {
      await supabase.from("video_queue").delete().eq("room_id", roomId)

      await supabase.from("signaling").delete().eq("room_id", roomId)
      await supabase.from("ice_candidates").delete().eq("room_id", roomId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Video queue leave error:", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
