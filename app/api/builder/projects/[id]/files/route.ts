import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// POST - Save file to project
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Verify project belongs to user
    const { data: project } = await supabase
      .from("builder_projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single()

    if (!project) {
      return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const { name, path, content, language } = body

    // Check if file with same path exists, update it
    const { data: existingFile } = await supabase
      .from("builder_files")
      .select("id")
      .eq("project_id", projectId)
      .eq("path", path)
      .single()

    if (existingFile) {
      // Update existing file
      const { data: file, error } = await supabase
        .from("builder_files")
        .update({
          content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingFile.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating file:", error)
        return NextResponse.json({ error: "Erro ao atualizar arquivo" }, { status: 500 })
      }

      // Update project updated_at
      await supabase.from("builder_projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId)

      return NextResponse.json({ file })
    }

    // Create new file
    const { data: file, error } = await supabase
      .from("builder_files")
      .insert({
        project_id: projectId,
        name: name || "component.tsx",
        path: path || "/component.tsx",
        content,
        language: language || "tsx",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating file:", error)
      return NextResponse.json({ error: "Erro ao criar arquivo" }, { status: 500 })
    }

    // Update project updated_at
    await supabase.from("builder_projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId)

    return NextResponse.json({ file })
  } catch (error) {
    console.error("Error in POST /api/builder/projects/[id]/files:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
