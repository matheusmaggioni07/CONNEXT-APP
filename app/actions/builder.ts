"use server"

import { createClient } from "@/lib/supabase/server"

export async function getProjects() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized", projects: [] }

  const { data, error } = await supabase
    .from("builder_projects")
    .select("*, builder_files(*)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  if (error) return { error: error.message, projects: [] }
  return { projects: data || [] }
}

export async function createProject(name: string, description?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  const { data, error } = await supabase
    .from("builder_projects")
    .insert({ user_id: user.id, name, description })
    .select()
    .single()

  if (error) return { error: error.message }
  return { project: data }
}

export async function saveProjectFile(
  projectId: string,
  name: string,
  path: string,
  content: string,
  language = "typescript",
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  // Check if file exists
  const { data: existingFile } = await supabase
    .from("builder_files")
    .select("id")
    .eq("project_id", projectId)
    .eq("path", path)
    .single()

  if (existingFile) {
    // Update existing file
    const { data, error } = await supabase
      .from("builder_files")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", existingFile.id)
      .select()
      .single()

    if (error) return { error: error.message }
    return { file: data }
  } else {
    // Create new file
    const { data, error } = await supabase
      .from("builder_files")
      .insert({ project_id: projectId, name, path, content, language })
      .select()
      .single()

    if (error) return { error: error.message }
    return { file: data }
  }
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  const { error } = await supabase.from("builder_projects").delete().eq("id", projectId).eq("user_id", user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function createVersion(projectId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  // Get current files
  const { data: files } = await supabase.from("builder_files").select("*").eq("project_id", projectId)

  // Get latest version number
  const { data: latestVersion } = await supabase
    .from("builder_versions")
    .select("version_number")
    .eq("project_id", projectId)
    .order("version_number", { ascending: false })
    .limit(1)
    .single()

  const newVersionNumber = (latestVersion?.version_number || 0) + 1

  const { data, error } = await supabase
    .from("builder_versions")
    .insert({
      project_id: projectId,
      version_number: newVersionNumber,
      files: files || [],
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { version: data }
}

export async function restoreVersion(projectId: string, versionId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  // Get version
  const { data: version, error: versionError } = await supabase
    .from("builder_versions")
    .select("files")
    .eq("id", versionId)
    .eq("project_id", projectId)
    .single()

  if (versionError || !version) return { error: "Version not found" }

  // Delete current files
  await supabase.from("builder_files").delete().eq("project_id", projectId)

  // Restore files from version
  const files = version.files as any[]
  if (files && files.length > 0) {
    const { error } = await supabase.from("builder_files").insert(
      files.map((f) => ({
        project_id: projectId,
        name: f.name,
        path: f.path,
        content: f.content,
        language: f.language,
      })),
    )

    if (error) return { error: error.message }
  }

  return { success: true }
}
