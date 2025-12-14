import { generateText } from "ai"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const { prompt, projectContext, history, userId } = await req.json()

  try {
    // Verificar autenticação
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Não autenticado", code: "", explanation: "" }, { status: 401 })
    }

    // Verificar créditos do usuário
    const { data: profile } = await supabase.from("profiles").select("plan, builder_credits").eq("id", user.id).single()

    if (!profile) {
      return Response.json({ error: "Perfil não encontrado", code: "", explanation: "" }, { status: 404 })
    }

    // Verificar se tem créditos (usuários Pro têm ilimitado)
    if (profile.plan !== "pro" && (profile.builder_credits || 0) <= 0) {
      return Response.json({ error: "Créditos insuficientes", code: "", explanation: "" }, { status: 403 })
    }

    // Construir contexto do projeto
    const projectFiles =
      projectContext?.map((f: { name: string; content: string }) => `// ${f.name}\n${f.content}`).join("\n\n") || ""

    // Construir histórico de mensagens
    const historyContext =
      history
        ?.map((m: { role: string; content: string }) => `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.content}`)
        .join("\n") || ""

    // System prompt para geração de código
    const systemPrompt = `Você é um expert em criar sites e aplicações web modernas com React e Tailwind CSS.
    
REGRAS OBRIGATÓRIAS:
1. Retorne APENAS código JSX válido em um único componente React
2. Use 'export default function' para o componente principal
3. Use Tailwind CSS para estilização
4. Inclua estilos inline com <style> para animações customizadas
5. Use cores vibrantes e design moderno
6. Adicione gradientes, sombras e efeitos visuais
7. Inclua seções: navbar, hero, features, CTA, footer
8. Use emojis ou SVGs simples para ícones
9. NÃO use imports externos (exceto React que já está disponível)
10. Retorne SOMENTE o código, sem explicações antes ou depois

${projectFiles ? `\nARQUIVOS DO PROJETO:\n${projectFiles}` : ""}
${historyContext ? `\nHISTÓRICO:\n${historyContext}` : ""}`

    // Chamar Claude via AI SDK
    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: systemPrompt,
      prompt: `Crie um site profissional para: ${prompt}

Retorne APENAS o código React/JSX completo, começando com 'export default function' e terminando com o fechamento do componente. Sem markdown, sem explicações.`,
      maxTokens: 8000,
      temperature: 0.7,
    })

    // Extrair código do response
    let code = text.trim()

    // Limpar markdown se houver
    if (code.startsWith("```")) {
      code = code
        .replace(/```(?:jsx|tsx|javascript|typescript)?\n?/g, "")
        .replace(/```$/g, "")
        .trim()
    }

    // Garantir que começa com export default
    if (!code.includes("export default function")) {
      code = `export default function GeneratedSite() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Erro ao gerar</h1>
        <p className="text-gray-300">Por favor, tente novamente com uma descrição mais detalhada.</p>
      </div>
    </div>
  )
}`
    }

    // Decrementar créditos se não for Pro
    if (profile.plan !== "pro") {
      await supabase
        .from("profiles")
        .update({ builder_credits: Math.max(0, (profile.builder_credits || 0) - 1) })
        .eq("id", user.id)
    }

    // Salvar log de uso
    await supabase
      .from("builder_logs")
      .insert({
        user_id: user.id,
        prompt: prompt,
        created_at: new Date().toISOString(),
      })
      .catch(() => {}) // Ignorar erro se tabela não existir

    return Response.json({
      code,
      explanation: "Site gerado com sucesso! Veja o preview ao lado.",
      remainingRequests: profile.plan === "pro" ? -1 : Math.max(0, (profile.builder_credits || 0) - 1),
    })
  } catch (error) {
    console.error("[v0] Error generating code:", error)
    return Response.json(
      {
        code: "",
        explanation: "Erro ao gerar código. Usando geração local como fallback.",
        remainingRequests: -1,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
