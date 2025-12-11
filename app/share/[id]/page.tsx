"use client"

import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from("builder_projects")
    .select("*")
    .eq("id", id)
    .single()

  let projectData = project

  if (projectError || !project) {
    // Try to find by slug-like id
    const { data: projectByName } = await supabase
      .from("builder_projects")
      .select("*")
      .ilike("name", `%${id}%`)
      .limit(1)
      .single()

    if (!projectByName) {
      notFound()
    }
    projectData = projectByName
  }

  // Fetch project files
  const { data: files } = await supabase
    .from("builder_files")
    .select("*")
    .eq("project_id", projectData?.id || id)
    .order("created_at", { ascending: false })
    .limit(1)

  const latestFile = files?.[0]

  if (!latestFile?.content) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 flex items-center justify-center border border-purple-500/30">
            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Projeto Vazio</h1>
          <p className="text-gray-400 mb-6">Este projeto ainda não possui conteúdo para exibir.</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-semibold hover:opacity-90 transition-all"
          >
            Voltar ao Connext
          </a>
        </div>
      </div>
    )
  }

  // Generate preview HTML from the stored code
  const generatePreviewHtml = (code: string) => {
    let jsxContent = code

    const returnMatch = jsxContent.match(/return\s*$$\s*([\s\S]*)\s*$$\s*;?\s*\}[\s\S]*$/)
    if (returnMatch) {
      jsxContent = returnMatch[1]
    } else {
      jsxContent = jsxContent.replace(/^[\s\S]*?(?=<div|<section|<main|<nav|<header)/m, "")
    }

    let html = jsxContent
      .replace(/className=/g, "class=")
      .replace(/\{`([^`]*)`\}/g, "$1")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/onClick=\{[^}]*\}/g, "")
      .replace(/onChange=\{[^}]*\}/g, "")
      .replace(/onSubmit=\{[^}]*\}/g, "")
      .replace(/key=\{[^}]*\}/g, "")
      .replace(/style=\{\{([^}]*)\}\}/g, (match, styles) => {
        const cssStyles = styles.replace(/animationDelay:\s*'([^']+)'/g, "animation-delay: $1").replace(/,\s*/g, "; ")
        return `style="${cssStyles}"`
      })
      .replace(/<>/g, "<div>")
      .replace(/<\/>/g, "</div>")

    html = html.replace(/\{[^}]*\}/g, "")

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectData?.name || "Projeto Connext"}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    @keyframes pulse { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.3; } }
    .animate-pulse { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
  </style>
</head>
<body>
${html}
</body>
</html>`
  }

  const previewHtml = generatePreviewHtml(latestFile.content)

  return (
    <div className="min-h-screen bg-[#030014]">
      {/* Header */}
      <div className="h-14 bg-[#0d0d14] border-b border-purple-500/20 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-white">Connext Builder</span>
          </a>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400 text-sm truncate max-w-[200px]">{projectData?.name || "Projeto"}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/dashboard/builder"
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-all"
          >
            Criar meu site
          </a>
        </div>
      </div>

      {/* Preview */}
      <iframe
        srcDoc={previewHtml}
        className="w-full border-0"
        style={{ height: "calc(100vh - 56px)" }}
        title="Preview"
        sandbox="allow-scripts"
      />
    </div>
  )
}
