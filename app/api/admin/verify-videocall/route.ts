import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")
    if (token !== `Bearer ${process.env.ADMIN_TEST_TOKEN}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      },
    )

    // TESTE 1: Video rooms acessível
    const { data: rooms, error: roomsError } = await supabase.from("video_rooms").select("id").limit(1)

    if (roomsError) {
      return NextResponse.json(
        {
          status: "fail",
          error: "Video rooms table not accessible",
          details: roomsError,
        },
        { status: 500 },
      )
    }

    // TESTE 2: Video queue acessível
    const { data: queue, error: queueError } = await supabase.from("video_queue").select("id").limit(1)

    if (queueError) {
      return NextResponse.json(
        {
          status: "fail",
          error: "Video queue table not accessible",
          details: queueError,
        },
        { status: 500 },
      )
    }

    // TESTE 3: ICE candidates acessível
    const { data: iceData, error: iceError } = await supabase.from("ice_candidates").select("id").limit(1)

    if (iceError) {
      return NextResponse.json(
        {
          status: "fail",
          error: "ICE candidates table not accessible",
          details: iceError,
        },
        { status: 500 },
      )
    }

    // TESTE 4: Signaling acessível
    const { data: sigData, error: sigError } = await supabase.from("signaling").select("id").limit(1)

    if (sigError) {
      return NextResponse.json(
        {
          status: "fail",
          error: "Signaling table not accessible",
          details: sigError,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      status: "pass",
      message: "Videocall system is functional",
      details: {
        roomsAccessible: true,
        queueAccessible: true,
        iceAccessible: true,
        signalingAccessible: true,
        roomsCount: rooms?.length || 0,
        queueCount: queue?.length || 0,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { status: "fail", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
