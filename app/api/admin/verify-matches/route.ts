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

    // TESTE 1: Verificar se tabela de likes existe e é acessível
    const { data: likes, error: likesError } = await supabase.from("likes").select("id").limit(1)

    if (likesError) {
      return NextResponse.json(
        {
          status: "fail",
          error: "Likes table not accessible",
          details: likesError,
        },
        { status: 500 },
      )
    }

    // TESTE 2: Verificar se tabela de matches existe e é acessível
    const { data: matches, error: matchesError } = await supabase.from("matches").select("id").limit(1)

    if (matchesError) {
      return NextResponse.json(
        {
          status: "fail",
          error: "Matches table not accessible",
          details: matchesError,
        },
        { status: 500 },
      )
    }

    // TESTE 3: Verificar se profiles pode ser lido
    const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id").limit(1)

    if (profilesError) {
      return NextResponse.json(
        {
          status: "fail",
          error: "Profiles table not readable",
          details: profilesError,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      status: "pass",
      message: "Matches system is functional",
      details: {
        likesAccessible: true,
        matchesAccessible: true,
        profilesReadable: true,
        likesCount: likes?.length || 0,
        matchesCount: matches?.length || 0,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { status: "fail", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
