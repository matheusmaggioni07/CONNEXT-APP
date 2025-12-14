import { generateText } from "ai"
import { createClient } from "@/lib/supabase/server"

const SYSTEM_PROMPT = `Você é um desenvolvedor frontend expert especializado em criar sites e landing pages profissionais com React e Tailwind CSS.

## REGRAS ABSOLUTAS:

1. **FORMATO**: Retorne APENAS código JSX válido, sem explicações, sem markdown, sem \`\`\`
2. **ESTRUTURA**: O código DEVE começar EXATAMENTE com "export default function" 
3. **ESTILO**: Use Tailwind CSS para toda estilização
4. **DESIGN**: Cores vibrantes com gradientes roxo (#a855f7), rosa (#ec4899), laranja (#f97316)
5. **RESPONSIVO**: Todos os componentes devem funcionar em mobile e desktop

## ESTRUTURA OBRIGATÓRIA DO SITE:

1. **Navbar fixa** - Logo, links de navegação, botão CTA
2. **Hero Section** - Título impactante com gradiente, subtítulo, botões de ação, imagem/ilustração
3. **Features/Benefícios** - Grid com ícones e descrições
4. **Testimonials** (se aplicável) - Depoimentos com foto e citação
5. **Pricing** (se aplicável) - Tabela de preços comparativa
6. **CTA Final** - Chamada para ação com formulário ou botão
7. **Footer** - Links, redes sociais, copyright

## REFERÊNCIAS DE DESIGN POR TIPO:

### Landing Page Startup/SaaS:
- Hero: Gradiente escuro, título grande, mockup do produto
- Features: Grid 3x2 com ícones SVG inline
- Cores: Roxo #a855f7, Rosa #ec4899, fundo #030014

### E-commerce/Loja:
- Hero: Produto em destaque, preço promocional
- Grid de produtos com hover effects
- Cores: Adequadas ao produto

### Portfolio/Pessoal:
- Hero: Foto pessoal, bio curta
- Grid de projetos/trabalhos
- Cores: Minimalistas ou vibrantes conforme personalidade

### Time de Futebol:
- Use as cores oficiais do time
- Grêmio: Azul #0066B3, Preto #000000, Branco
- Inter: Vermelho #E31E24, Branco
- Flamengo: Vermelho #C4161C, Preto #000000

## ÍCONES (use SVG inline):
- Zap: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
- Check: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
- Star: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>

## EXEMPLO DE CÓDIGO CORRETO:

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030014] text-white">
      <nav className="fixed w-full z-50 bg-black/50 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Logo</span>
          <div className="hidden md:flex gap-8">
            <a href="#" className="hover:text-purple-400 transition">Início</a>
            <a href="#" className="hover:text-purple-400 transition">Recursos</a>
            <a href="#" className="hover:text-purple-400 transition">Preços</a>
          </div>
          <button className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-full font-semibold hover:opacity-90 transition">
            Começar
          </button>
        </div>
      </nav>
      
      <main className="pt-24">
        <section className="container mx-auto px-6 py-20 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
            Título Impactante
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Subtítulo explicativo que convence o visitante a tomar ação.
          </p>
          <div className="flex gap-4 justify-center">
            <button className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 rounded-full font-semibold hover:scale-105 transition transform">
              Ação Principal
            </button>
            <button className="border border-white/20 px-8 py-4 rounded-full font-semibold hover:bg-white/10 transition">
              Saiba Mais
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

LEMBRE-SE: Retorne APENAS o código, começando com "export default function" e terminando com o fechamento do componente. Nada mais.`

export async function POST(req: Request) {
  const { prompt, projectContext, history } = await req.json()

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Não autenticado", code: "", explanation: "" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single()

    const projectFiles =
      projectContext?.map((f: { name: string; content: string }) => `// ${f.name}\n${f.content}`).join("\n\n") || ""

    const historyContext =
      history
        ?.slice(-4)
        .map((m: { role: string; content: string }) => `${m.role === "user" ? "Usuário" : "IA"}: ${m.content}`)
        .join("\n") || ""

    const enhancedPrompt = `Crie um site profissional completo para: "${prompt}"

${projectFiles ? `\nCONTEXTO DO PROJETO:\n${projectFiles}` : ""}
${historyContext ? `\nHISTÓRICO DE CONVERSA:\n${historyContext}` : ""}

INSTRUÇÕES ESPECÍFICAS:
- Analise o pedido e identifique o tipo de site (landing page, portfolio, loja, etc)
- Use cores e design apropriados para o contexto
- Inclua todas as seções relevantes: navbar, hero, features, CTA, footer
- O site deve ser visualmente impressionante e profissional
- Retorne APENAS o código JSX, começando com "export default function"`

    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: SYSTEM_PROMPT,
      prompt: enhancedPrompt,
      maxTokens: 12000,
      temperature: 0.7,
    })

    let code = text.trim()

    // Remover markdown
    code = code
      .replace(/^```(?:jsx|tsx|javascript|typescript|react)?\s*\n?/gm, "")
      .replace(/\n?```\s*$/gm, "")
      .replace(/^Here.*?:\s*\n/gim, "")
      .replace(/^I'll create.*?:\s*\n/gim, "")
      .replace(/^Sure.*?:\s*\n/gim, "")
      .replace(/^This.*?:\s*\n/gim, "")
      .trim()

    // Encontrar início do export default
    const exportIndex = code.indexOf("export default function")
    if (exportIndex > 0) {
      code = code.substring(exportIndex)
    }

    if (!code.includes("export default function")) {
      code = generateFallbackCode(prompt)
    }

    const hasReturn = code.includes("return")
    const hasJSX = code.includes("<") && code.includes(">")

    if (!hasReturn || !hasJSX) {
      code = generateFallbackCode(prompt)
    }

    return Response.json({
      code,
      explanation: `Site "${prompt.substring(0, 50)}${prompt.length > 50 ? "..." : ""}" gerado com sucesso! Veja o preview ao lado.`,
      remainingRequests: profile?.plan === "pro" ? -1 : 20,
    })
  } catch (error) {
    console.error("[Connext Builder] Error:", error)

    const fallbackCode = generateFallbackCode(prompt)

    return Response.json({
      code: fallbackCode,
      explanation: "Site gerado! Tente novamente com mais detalhes para um resultado ainda melhor.",
      remainingRequests: 20,
    })
  }
}

function generateFallbackCode(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase()

  // Detectar tipo de site
  const isGremio = lowerPrompt.includes("grêmio") || lowerPrompt.includes("gremio")
  const isInter =
    lowerPrompt.includes("inter") || lowerPrompt.includes("internacional") || lowerPrompt.includes("colorado")
  const isGrenal = lowerPrompt.includes("grenal") || (isGremio && isInter)
  const isPortfolio =
    lowerPrompt.includes("portfolio") || lowerPrompt.includes("portfólio") || lowerPrompt.includes("pessoal")
  const isEcommerce =
    lowerPrompt.includes("loja") || lowerPrompt.includes("ecommerce") || lowerPrompt.includes("produtos")

  // Extrair nome do prompt
  const nomeMatch = prompt.match(/(?:site|loja|portfolio|página)\s+(?:da|do|de|para)\s+([A-Za-zÀ-ú\s]+)/i)
  const nome = nomeMatch ? nomeMatch[1].trim() : "Meu Site"

  if (isGrenal) {
    return `export default function GrenalSite() {
  return (
    <div className="min-h-screen">
      <nav className="fixed w-full z-50 bg-black/90 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <span className="text-2xl font-bold">⚽ Grenal</span>
          <div className="flex gap-4">
            <span className="text-blue-500 font-bold">GRÊMIO</span>
            <span className="text-white">vs</span>
            <span className="text-red-500 font-bold">INTER</span>
          </div>
        </div>
      </nav>
      <main className="pt-20">
        <section className="relative h-screen flex">
          <div className="w-1/2 bg-gradient-to-br from-blue-900 via-blue-700 to-black flex items-center justify-center">
            <div className="text-center text-white p-8">
              <h2 className="text-6xl font-bold mb-4">GRÊMIO</h2>
              <p className="text-2xl text-blue-200">Imortal Tricolor</p>
              <p className="mt-4 text-blue-300">🏆 3x Libertadores</p>
            </div>
          </div>
          <div className="w-1/2 bg-gradient-to-br from-red-900 via-red-600 to-black flex items-center justify-center">
            <div className="text-center text-white p-8">
              <h2 className="text-6xl font-bold mb-4">INTER</h2>
              <p className="text-2xl text-red-200">Colorado</p>
              <p className="mt-4 text-red-300">🏆 2x Libertadores</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}`
  }

  if (isGremio) {
    return `export default function GremioSite() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-black text-white">
      <nav className="fixed w-full z-50 bg-blue-900/90 backdrop-blur-xl border-b border-blue-500/20">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <span className="text-2xl font-bold">⚽ GRÊMIO FBPA</span>
          <div className="hidden md:flex gap-8">
            <a href="#" className="hover:text-blue-300 transition">História</a>
            <a href="#" className="hover:text-blue-300 transition">Títulos</a>
            <a href="#" className="hover:text-blue-300 transition">Elenco</a>
          </div>
        </div>
      </nav>
      <main className="pt-20">
        <section className="container mx-auto px-6 py-20 text-center">
          <h1 className="text-6xl md:text-8xl font-bold mb-6">IMORTAL TRICOLOR</h1>
          <p className="text-2xl text-blue-200 mb-8">O maior do Sul desde 1903</p>
          <div className="flex justify-center gap-8 text-center">
            <div className="p-6 bg-blue-800/50 rounded-2xl"><p className="text-4xl font-bold">3x</p><p className="text-blue-300">Libertadores</p></div>
            <div className="p-6 bg-blue-800/50 rounded-2xl"><p className="text-4xl font-bold">5x</p><p className="text-blue-300">Copa do Brasil</p></div>
            <div className="p-6 bg-blue-800/50 rounded-2xl"><p className="text-4xl font-bold">2x</p><p className="text-blue-300">Brasileirão</p></div>
          </div>
        </section>
      </main>
    </div>
  )
}`
  }

  if (isInter) {
    return `export default function InterSite() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-700 to-black text-white">
      <nav className="fixed w-full z-50 bg-red-900/90 backdrop-blur-xl border-b border-red-500/20">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <span className="text-2xl font-bold">⚽ INTER</span>
          <div className="hidden md:flex gap-8">
            <a href="#" className="hover:text-red-300 transition">História</a>
            <a href="#" className="hover:text-red-300 transition">Títulos</a>
            <a href="#" className="hover:text-red-300 transition">Elenco</a>
          </div>
        </div>
      </nav>
      <main className="pt-20">
        <section className="container mx-auto px-6 py-20 text-center">
          <h1 className="text-6xl md:text-8xl font-bold mb-6">COLORADO</h1>
          <p className="text-2xl text-red-200 mb-8">Sport Club Internacional desde 1909</p>
          <div className="flex justify-center gap-8 text-center">
            <div className="p-6 bg-red-800/50 rounded-2xl"><p className="text-4xl font-bold">2x</p><p className="text-red-300">Libertadores</p></div>
            <div className="p-6 bg-red-800/50 rounded-2xl"><p className="text-4xl font-bold">1x</p><p className="text-red-300">Mundial</p></div>
            <div className="p-6 bg-red-800/50 rounded-2xl"><p className="text-4xl font-bold">3x</p><p className="text-red-300">Brasileirão</p></div>
          </div>
        </section>
      </main>
    </div>
  )
}`
  }

  // Default profissional
  return `export default function ${nome.replace(/\s+/g, "")}Site() {
  return (
    <div className="min-h-screen bg-[#030014] text-white">
      <nav className="fixed w-full z-50 bg-black/50 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">${nome}</span>
          <div className="hidden md:flex gap-8">
            <a href="#" className="hover:text-purple-400 transition">Início</a>
            <a href="#" className="hover:text-purple-400 transition">Sobre</a>
            <a href="#" className="hover:text-purple-400 transition">Contato</a>
          </div>
          <button className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-full font-semibold hover:opacity-90 transition">
            Começar
          </button>
        </div>
      </nav>
      <main className="pt-24">
        <section className="container mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 text-purple-400 text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            Disponível agora
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
            Bem-vindo à ${nome}
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Transformamos ideias em realidade digital com design moderno e tecnologia de ponta.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 rounded-full font-semibold hover:scale-105 transition transform">
              Começar Agora →
            </button>
            <button className="border border-white/20 px-8 py-4 rounded-full font-semibold hover:bg-white/10 transition">
              Saiba Mais
            </button>
          </div>
        </section>
        <section className="container mx-auto px-6 py-20">
          <h2 className="text-3xl font-bold text-center mb-12">Por que nos escolher?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Rápido</h3>
              <p className="text-gray-400">Entrega ágil sem comprometer a qualidade.</p>
            </div>
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Confiável</h3>
              <p className="text-gray-400">Compromisso com excelência e resultados.</p>
            </div>
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Dedicado</h3>
              <p className="text-gray-400">Foco total na satisfação do cliente.</p>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-white/10 py-12">
        <div className="container mx-auto px-6 text-center text-gray-400">
          <p>© 2025 ${nome}. Criado com Connext Builder.</p>
        </div>
      </footer>
    </div>
  )
}`
}
