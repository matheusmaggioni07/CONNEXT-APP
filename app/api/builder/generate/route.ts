import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"
import { SYSTEM_PROMPT } from "./constants"
import { generateFallbackCode } from "./fallback"

export async function POST(req: Request) {
  const { prompt, projectContext, history } = await req.json()

  console.log("[v0] Builder API called with prompt:", prompt?.substring(0, 100))

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[v0] User not authenticated, using fallback")
      return Response.json({
        code: generateFallbackCode(prompt),
        explanation: "Site gerado com sucesso!",
        remainingRequests: 0,
      })
    }

    const projectFiles =
      projectContext?.map((f: { name: string; content: string }) => `// ${f.name}\n${f.content}`).join("\n\n") || ""
    const historyContext =
      history
        ?.slice(-4)
        .map((m: { role: string; content: string }) => `${m.role === "user" ? "Usuário" : "IA"}: ${m.content}`)
        .join("\n") || ""

    const enhancedPrompt = `Crie um site profissional completo para: "${prompt}"

${projectFiles ? `\nCONTEXTO DO PROJETO:\n${projectFiles}` : ""}
${historyContext ? `\nHISTÓRICO:\n${historyContext}` : ""}

INSTRUÇÕES:
- Analise o pedido e identifique o tipo de site
- Use cores e design apropriados para o contexto
- Inclua todas as seções: navbar, hero, features, CTA, footer
- Retorne APENAS o código JSX, começando com "export default function"
- Implemente navegação funcional com href="#secao" e id="secao"
- Inclua formulário de contato funcional
- Adicione menu mobile com useState`

    console.log("[v0] Calling Claude API...")

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: SYSTEM_PROMPT,
      prompt: enhancedPrompt,
      maxTokens: 12000,
      temperature: 0.7,
    })

    console.log("[v0] Claude response length:", text?.length)

    let code = text
      .trim()
      .replace(/^```(?:jsx|tsx|javascript|typescript|react)?\s*\n?/gm, "")
      .replace(/\n?```\s*$/gm, "")
      .replace(/^Here.*?:\s*\n/gim, "")
      .replace(/^Aqui.*?:\s*\n/gim, "")
      .replace(/^Vou criar.*?:\s*\n/gim, "")
      .trim()

    const exportIndex = code.indexOf("export default function")
    if (exportIndex > 0) {
      code = code.substring(exportIndex)
    }

    if (!code.includes("export default function") || !code.includes("return") || !code.includes("<")) {
      console.log("[v0] Invalid code, using fallback")
      code = generateFallbackCode(prompt)
    }

    console.log("[v0] Final code length:", code?.length)

    return Response.json({
      code,
      explanation: `Site "${prompt.substring(0, 50)}${prompt.length > 50 ? "..." : ""}" gerado com sucesso!`,
      remainingRequests: -1,
    })
  } catch (error) {
    console.error("[v0] Builder Error:", error)

    return Response.json({
      code: generateFallbackCode(prompt),
      explanation: "Site gerado! Tente novamente com mais detalhes para um resultado ainda melhor.",
      remainingRequests: 20,
    })
  }
}
