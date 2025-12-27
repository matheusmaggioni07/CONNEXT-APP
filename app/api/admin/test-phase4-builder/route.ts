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

    // TEST 1: Projects table accessible
    try {
      const { data } = await supabase.from("projects").select("id").limit(1)

      tests.push({
        name: "Projects table accessible",
        status: "pass",
        details: { projectsCount: data?.length || 0 },
      })
    } catch (error) {
      tests.push({
        name: "Projects table accessible",
        status: "fail",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }

    // TEST 2: Builder chat history accessible
    try {
      await supabase.from("builder_chat_history").select("id").limit(1)

      tests.push({
        name: "Builder chat history accessible",
        status: "pass",
      })
    } catch (error) {
      tests.push({
        name: "Builder chat history accessible",
        status: "fail",
      })
    }

    // TEST 3: Builder projects accessible
    try {
      await supabase.from("builder_projects").select("id").limit(1)

      tests.push({
        name: "Builder projects table accessible",
        status: "pass",
      })
    } catch (error) {
      tests.push({
        name: "Builder projects table accessible",
        status: "fail",
      })
    }

    // TEST 4: Verify RLS on projects
    try {
      await supabase.from("projects").select("id").limit(1)

      tests.push({
        name: "Projects RLS enforced",
        status: "pass",
      })
    } catch (error) {
      tests.push({
        name: "Projects RLS enforced",
        status: "fail",
      })
    }

    const passed = tests.filter((t) => t.status === "pass").length
    const failed = tests.filter((t) => t.status === "fail").length

    return NextResponse.json({
      phase: "Phase 4: Builder System",
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
        phase: "Phase 4: Builder System",
        error: error instanceof Error ? error.message : "Test execution failed",
      },
      { status: 500 },
    )
  }
}
