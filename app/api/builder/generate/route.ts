import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createClient } from "@/lib/supabase/server"

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const MAX_REQUESTS_PER_HOUR = 20
const MAX_TOKENS = 4000

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = Date.now()
    const userRateLimit = rateLimitMap.get(user.id)

    if (userRateLimit) {
      if (now < userRateLimit.resetAt) {
        if (userRateLimit.count >= MAX_REQUESTS_PER_HOUR) {
          return NextResponse.json(
            {
              error: "Limite de requisições atingido. Aguarde 1 hora ou faça upgrade para PRO.",
              remainingTime: Math.ceil((userRateLimit.resetAt - now) / 60000),
            },
            { status: 429 },
          )
        }
        userRateLimit.count++
      } else {
        rateLimitMap.set(user.id, { count: 1, resetAt: now + 3600000 })
      }
    } else {
      rateLimitMap.set(user.id, { count: 1, resetAt: now + 3600000 })
    }

    const { prompt, projectContext, history } = await req.json()

    const recentHistory = history?.slice(-3) || []
    const historyContext = recentHistory.map((m: any) => `${m.role}: ${m.content}`).join("\n")

    const systemPrompt = `Você é o MELHOR designer e desenvolvedor de interfaces do mundo. Você cria sites que parecem ter custado $50,000+.

REGRAS ABSOLUTAS:
1. NUNCA inclua imports no código - comece direto com "export default function"
2. NUNCA use comentários no código
3. SEMPRE use fundo escuro (#030014 ou #0a0a0f) - a menos que o usuário peça cores claras
4. SEMPRE crie designs IMPRESSIONANTES que parecem de empresas como Apple, Stripe, Linear, Vercel

PALETA DE CORES (ESCURA POR PADRÃO):
- Background: bg-[#030014] ou bg-[#0a0a0f]
- Cards/Sections: bg-white/5 ou bg-gradient-to-b from-white/5 to-transparent
- Borders: border-white/10 ou border-white/5
- Text Primary: text-white
- Text Secondary: text-gray-400
- Accent: from-purple-500 to-pink-500 (gradientes)
- Buttons: bg-white text-black (primário) ou border border-white/20 (secundário)

TÉCNICAS DE DESIGN PREMIUM:
1. ANIMATED BACKGROUNDS:
   <div className="fixed inset-0 overflow-hidden pointer-events-none">
     <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
   </div>

2. GLASSMORPHISM:
   className="backdrop-blur-xl bg-white/5 border border-white/10"

3. GRADIENTES EM TEXTO:
   className="bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent"

4. CARDS PREMIUM:
   className="p-8 rounded-3xl bg-gradient-to-b from-white/10 to-transparent border border-white/10 hover:border-white/20 transition-all duration-500"

5. BOTÕES PREMIUM:
   Primário: className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-all"
   Secundário: className="px-8 py-4 border border-white/20 rounded-full text-white hover:bg-white/5 transition-all"
   Gradiente: className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-semibold hover:shadow-2xl hover:shadow-purple-500/25"

6. BADGES/PILLS:
   className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm"

7. HOVER EFFECTS:
   hover:scale-105 hover:-translate-y-1 transition-all duration-300

8. STATS/NUMBERS:
   className="text-5xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent"

ESTRUTURA OBRIGATÓRIA PARA LANDING PAGES:
1. Nav: Sticky, backdrop-blur, border-b border-white/5
2. Hero: Badge + Título ENORME (text-6xl md:text-8xl) + Descrição + 2 Botões + Stats
3. Features: Grid 3 colunas com cards hover
4. Social Proof / Logos
5. CTA Section: Background diferenciado
6. Footer: Simples e elegante

CÓDIGO - FORMATO EXATO:
export default function NomeDoComponente() {
  return (
    <div className="min-h-screen bg-[#030014]">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>
      
      {/* Content here */}
    </div>
  )
}

RETORNE APENAS O CÓDIGO, SEM MARKDOWN, SEM EXPLICAÇÕES.

${historyContext ? `CONTEXTO ANTERIOR:\n${historyContext}` : ""}`

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: systemPrompt,
      prompt: `Crie: ${prompt}

LEMBRE-SE: 
- NÃO inclua imports
- Comece com "export default function"  
- Use fundo ESCURO (#030014)
- Crie algo IMPRESSIONANTE e PROFISSIONAL`,
      maxTokens: MAX_TOKENS,
    })

    let code = text.trim()

    // Extract code from markdown blocks if present
    const codeMatch = code.match(/```(?:jsx?|tsx?|javascript|typescript)?\n?([\s\S]*?)```/)
    if (codeMatch) {
      code = codeMatch[1].trim()
    }

    // Remove any imports that slipped through
    code = code.replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*\n?/gm, "")
    code = code.replace(/^import\s*['"][^'"]+['"];?\s*\n?/gm, "")

    // Ensure code starts with export
    if (!code.startsWith("export")) {
      const exportMatch = code.match(/export\s+default\s+function[\s\S]*/)
      if (exportMatch) {
        code = exportMatch[0]
      }
    }

    const currentLimit = rateLimitMap.get(user.id)
    const remainingRequests = currentLimit ? MAX_REQUESTS_PER_HOUR - currentLimit.count : MAX_REQUESTS_PER_HOUR

    return NextResponse.json({
      code,
      explanation: "Código gerado com sucesso!",
      remainingRequests,
    })
  } catch (error: any) {
    console.error("[Builder] Error generating code:", error)

    if (error?.message?.includes("credit") || error?.message?.includes("billing")) {
      return NextResponse.json(
        {
          error: "Créditos insuficientes. Por favor, verifique sua conta Vercel.",
          fallback: true,
        },
        { status: 402 },
      )
    }

    return NextResponse.json(
      {
        error: "Falha ao gerar código. Tente novamente.",
        fallback: true,
      },
      { status: 500 },
    )
  }
}
