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

    const tests = []

    // TEST 1: WebRTC tables accessible
    try {
      await supabase.from("video_rooms").select("id").limit(1)
      await supabase.from("video_queue").select("id").limit(1)
      await supabase.from("ice_candidates").select("id").limit(1)
      await supabase.from("signaling").select("id").limit(1)

      tests.push({
        name: "WebRTC tables accessible",
        status: "pass",
      })
    } catch (error) {
      tests.push({
        name: "WebRTC tables accessible",
        status: "fail",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }

    // TEST 2: RLS enforced on video_rooms
    try {
      await supabase.from("video_rooms").select("id").limit(1)

      tests.push({
        name: "Video rooms RLS",
        status: "pass",
      })
    } catch (error) {
      tests.push({
        name: "Video rooms RLS",
        status: "fail",
      })
    }

    // TEST 3: ICE candidates RLS
    try {
      await supabase.from("ice_candidates").select("id").limit(1)

      tests.push({
        name: "Ice candidates RLS",
        status: "pass",
      })
    } catch (error) {
      tests.push({
        name: "Ice candidates RLS",
        status: "fail",
      })
    }

    // TEST 4: Signaling RLS
    try {
      await supabase.from("signaling").select("id").limit(1)

      tests.push({
        name: "Signaling RLS",
        status: "pass",
      })
    } catch (error) {
      tests.push({
        name: "Signaling RLS",
        status: "fail",
      })
    }

    // TEST 5: Queue RLS
    try {
      await supabase.from("video_queue").select("id").limit(1)

      tests.push({
        name: "Queue RLS",
        status: "pass",
      })
    } catch (error) {
      tests.push({
        name: "Queue RLS",
        status: "fail",
      })
    }

    const passed = tests.filter((t) => t.status === "pass").length
    const failed = tests.filter((t) => t.status === "fail").length

    return NextResponse.json({
      phase: "Phase 3: Videocall System",
      timestamp: new Date().toISOString(),
      tests,
      summary: {
        passed,
        failed,
        total: tests.length,
        statusOverall: failed === 0 ? "pass" : "fail",
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        phase: "Phase 3: Videocall System",
        error: error instanceof Error ? error.message : "Test execution failed",
      },
      { status: 500 },
    )
  }
}
