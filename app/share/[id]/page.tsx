import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase.from("builder_projects").select("name, description").eq("id", id).single()

  return {
    title: project?.name || "Projeto Compartilhado",
    description: project?.description || "Criado com Connext Builder",
  }
}

export default async function SharePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from("builder_projects")
    .select(`
      *,
      profiles:user_id (
        name,
        avatar_url
      )
    `)
    .eq("id", id)
    .single()

  if (error || !project) {
    notFound()
  }

  const { data: files } = await supabase
    .from("builder_files")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)

  const latestCode = files?.[0]?.content || project.code || ""

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-semibold text-foreground">Connext Builder</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Criado por {(project.profiles as { name?: string })?.name || "Usuário"}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
          {project.description && <p className="text-muted-foreground mt-1">{project.description}</p>}
        </div>

        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <div className="bg-muted px-4 py-2 border-b border-border flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <span className="text-xs text-muted-foreground ml-2">Preview</span>
          </div>

          <div className="p-6 min-h-[500px]">
            {latestCode ? (
              <div
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: `<pre><code>${latestCode.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`,
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Nenhum código disponível para este projeto.</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <a
            href="/dashboard/builder"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Criar meu próprio site
          </a>
        </div>
      </main>
    </div>
  )
}
