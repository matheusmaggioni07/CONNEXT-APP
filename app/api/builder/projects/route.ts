import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET - List user's projects
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { data: projects, error } = await supabase
      .from("builder_projects")
      .select(
        `
        *,
        builder_files (
          id,
          name,
          path,
          language,
          created_at
        )
      `,
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Error fetching projects:", error)
      return NextResponse.json({ error: "Erro ao buscar projetos" }, { status: 500 })
    }

    return NextResponse.json({ projects })
  } catch (error) {
    console.error("Error in GET /api/builder/projects:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST - Create new project
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description } = body

    const { data: project, error } = await supabase
      .from("builder_projects")
      .insert({
        user_id: user.id,
        name: name || `Projeto ${Date.now()}`,
        description: description || "Novo projeto criado com Connext Builder",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating project:", error)
      return NextResponse.json({ error: "Erro ao criar projeto" }, { status: 500 })
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error("Error in POST /api/builder/projects:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
