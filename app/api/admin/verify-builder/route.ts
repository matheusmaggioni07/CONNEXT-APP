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

    // TESTE 1: Projetos acessível
    const { data: projects, error: projectsError } = await supabase.from("projects").select("id").limit(1)

    if (projectsError) {
      return NextResponse.json(
        {
          status: "fail",
          error: "Projects table not accessible",
          details: projectsError,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      status: "pass",
      message: "Builder system is functional",
      details: {
        projectsAccessible: true,
        projectsCount: projects?.length || 0,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { status: "fail", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
