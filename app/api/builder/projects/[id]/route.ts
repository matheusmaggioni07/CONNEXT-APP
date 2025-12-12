import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { sanitizeString, isValidUUID } from "@/lib/security"
import { checkRateLimit, auditLog } from "@/lib/redis"

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return request.headers.get("x-real-ip") || "127.0.0.1"
}

// GET - Get single project with files
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = getClientIP(request)

  try {
    const { id } = await params

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
    }

    const rateLimit = await checkRateLimit(`builder:get:${ip}`, 100, 60)
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

    const { data: project, error } = await supabase
      .from("builder_projects")
      .select(
        `
        *,
        builder_files (*)
      `,
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error("Error in GET /api/builder/projects/[id]:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// PUT - Update project
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = getClientIP(request)

  try {
    const { id } = await params

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
    }

    const rateLimit = await checkRateLimit(`builder:update:${ip}`, 30, 60)
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

    const { data: existingProject } = await supabase
      .from("builder_projects")
      .select("id, user_id")
      .eq("id", id)
      .single()

    if (!existingProject || existingProject.user_id !== user.id) {
      await auditLog("unauthorized_update_attempt", {
        userId: user.id,
        projectId: id,
        ip,
      }).catch(() => {})
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()

    const name = sanitizeString(body.name || "").slice(0, 100)
    const description = sanitizeString(body.description || "").slice(0, 500)

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Invalid project name" }, { status: 400 })
    }

    const { data: project, error } = await supabase
      .from("builder_projects")
      .update({
        name,
        description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating project:", error)
      return NextResponse.json({ error: "Error updating project" }, { status: 500 })
    }

    await auditLog("project_updated", {
      userId: user.id,
      projectId: id,
      ip,
    }).catch(() => {})

    return NextResponse.json({ project })
  } catch (error) {
    console.error("Error in PUT /api/builder/projects/[id]:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// DELETE - Delete project
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = getClientIP(request)

  try {
    const { id } = await params

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 })
    }

    const rateLimit = await checkRateLimit(`builder:delete:${ip}`, 10, 60)
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

    const { data: existingProject } = await supabase
      .from("builder_projects")
      .select("id, user_id, name")
      .eq("id", id)
      .single()

    if (!existingProject || existingProject.user_id !== user.id) {
      await auditLog("unauthorized_delete_attempt", {
        userId: user.id,
        projectId: id,
        ip,
      }).catch(() => {})
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete files first
    await supabase.from("builder_files").delete().eq("project_id", id)

    // Delete project
    const { error } = await supabase.from("builder_projects").delete().eq("id", id).eq("user_id", user.id)

    if (error) {
      console.error("Error deleting project:", error)
      return NextResponse.json({ error: "Error deleting project" }, { status: 500 })
    }

    await auditLog("project_deleted", {
      userId: user.id,
      projectId: id,
      projectName: existingProject.name,
      ip,
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/builder/projects/[id]:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
