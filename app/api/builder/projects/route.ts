import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { sanitizeString } from "@/lib/security"
import { checkRateLimit, auditLog } from "@/lib/redis"

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return request.headers.get("x-real-ip") || "127.0.0.1"
}

// GET - List user's projects
export async function GET(request: NextRequest) {
  const ip = getClientIP(request)

  try {
    const rateLimit = await checkRateLimit(`builder:${ip}`, 60, 60)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
      .limit(100) // Limit results

    if (error) {
      console.error("Error fetching projects:", error)
      return NextResponse.json({ error: "Error fetching projects" }, { status: 500 })
    }

    return NextResponse.json({ projects })
  } catch (error) {
    console.error("Error in GET /api/builder/projects:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// POST - Create new project
export async function POST(request: NextRequest) {
  const ip = getClientIP(request)

  try {
    const rateLimit = await checkRateLimit(`builder:create:${ip}`, 10, 60)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const name = sanitizeString(body.name || "").slice(0, 100)
    const description = sanitizeString(body.description || "").slice(0, 500)

    if (name && name.length < 2) {
      return NextResponse.json({ error: "Invalid project name" }, { status: 400 })
    }

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
      return NextResponse.json({ error: "Error creating project" }, { status: 500 })
    }

    await auditLog("project_created", {
      userId: user.id,
      projectId: project.id,
      ip,
    }).catch(() => {})

    return NextResponse.json({ project })
  } catch (error) {
    console.error("Error in POST /api/builder/projects:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
