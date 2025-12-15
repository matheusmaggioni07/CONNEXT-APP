import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"
import { SYSTEM_PROMPT } from "./constants"
import { generateFallbackCode } from "./fallback"

export async function POST(req: Request) {
  const { prompt, projectContext, history } = await req.json()

  console.log("[v0] Builder API called with prompt:", prompt?.substring(0, 100))

  if (!prompt || prompt.trim().length < 3) {
    return Response.json(
      {
        error: "Prompt muito curto",
        code: null,
      },
      { status: 400 },
    )
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

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

INSTRUÇÕES CRÍTICAS:
1. Retorne APENAS o código JSX, começando com "export default function Site()"
2. NÃO inclua markdown, explicações ou comentários fora do código
3. Use React.useState para estados (não import useState)
4. Inclua todas as seções: navbar, hero, sobre, features, contato, footer
5. Use cores apropriadas para o contexto (times de futebol usam cores do time)
6. Menu mobile funcional com useState
7. Navegação suave com scrollToSection
8. Formulário de contato funcional
9. Design moderno com Tailwind CSS e gradientes
10. Animações sutis com hover e transition`

    console.log("[v0] Calling AI API...")

    try {
      const { text } = await generateText({
        model: "anthropic/claude-sonnet-4-20250514",
        system: SYSTEM_PROMPT,
        prompt: enhancedPrompt,
        maxTokens: 16000,
        temperature: 0.7,
      })

      console.log("[v0] AI response length:", text?.length)

      if (!text || text.length < 100) {
        console.log("[v0] Empty response, using fallback")
        return Response.json({
          code: generateFallbackCode(prompt),
          explanation: `Site "${prompt.substring(0, 50)}${prompt.length > 50 ? "..." : ""}" gerado com sucesso!`,
          remainingRequests: 20,
        })
      }

      let code = text
        .trim()
        .replace(/^```(?:jsx|tsx|javascript|typescript|react)?\s*\n?/gm, "")
        .replace(/\n?```\s*$/gm, "")
        .replace(/^Here.*?:\s*\n/gim, "")
        .replace(/^Aqui.*?:\s*\n/gim, "")
        .replace(/^Vou criar.*?:\s*\n/gim, "")
        .replace(/^Claro.*?:\s*\n/gim, "")
        .trim()

      const exportIndex = code.indexOf("export default function")
      if (exportIndex > 0) {
        code = code.substring(exportIndex)
      }

      const hasValidStructure =
        code.includes("export default function") &&
        code.includes("return") &&
        code.includes("<") &&
        code.includes("</") &&
        code.length > 500

      if (!hasValidStructure) {
        console.log("[v0] Invalid code structure, using fallback")
        code = generateFallbackCode(prompt)
      }

      console.log("[v0] Final code length:", code?.length)

      return Response.json({
        code,
        explanation: `Site "${prompt.substring(0, 50)}${prompt.length > 50 ? "..." : ""}" gerado com sucesso!`,
        remainingRequests: user ? -1 : 20,
      })
    } catch (aiError) {
      console.error("[v0] AI Error, using fallback:", aiError)
      return Response.json({
        code: generateFallbackCode(prompt),
        explanation: `Site "${prompt.substring(0, 50)}${prompt.length > 50 ? "..." : ""}" gerado com sucesso!`,
        remainingRequests: 20,
      })
    }
  } catch (error) {
    console.error("[v0] Builder Error:", error)

    return Response.json({
      code: generateFallbackCode(prompt),
      explanation: `Site "${prompt.substring(0, 50)}${prompt.length > 50 ? "..." : ""}" gerado com sucesso!`,
      remainingRequests: 20,
    })
  }
}
