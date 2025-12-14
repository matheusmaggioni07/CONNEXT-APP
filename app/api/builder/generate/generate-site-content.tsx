"use client"

import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"
import { generateFallbackCode } from "./fallback"

const SYSTEM_PROMPT = `Você é um desenvolvedor frontend expert especializado em criar sites e landing pages PROFISSIONAIS e 100% FUNCIONAIS com React e Tailwind CSS.

## REGRAS ABSOLUTAS:

1. **FORMATO**: Retorne APENAS código JSX válido, sem explicações, sem markdown, sem \`\`\`
2. **ESTRUTURA**: O código DEVE começar EXATAMENTE com "export default function"
3. **ESTILO**: Use Tailwind CSS para toda estilização
4. **FUNCIONALIDADE**: TODOS os botões e links DEVEM funcionar com navegação por âncoras

## REQUISITOS DE FUNCIONALIDADE (OBRIGATÓRIO):

### Navegação Funcional:
- Cada link no menu DEVE ter href="#secao-correspondente"
- Cada seção DEVE ter id="secao-correspondente"
- Use scroll-behavior: smooth via classe scroll-smooth no html/body
- Exemplo: <a href="#sobre">Sobre</a> → <section id="sobre">

### Botões Interativos:
- Botões de CTA devem rolar para seções: onClick={() => document.getElementById('contato')?.scrollIntoView({behavior: 'smooth'})}
- Botões de formulário devem ter type="submit" ou onClick handlers
- Adicione estados hover/active/focus visíveis

### Formulários Funcionais:
- Inclua formulário de contato com campos: nome, email, mensagem
- Use onSubmit com preventDefault e alert de confirmação
- Adicione validação básica com required

### Interatividade:
- Menu mobile com useState para toggle
- Animações de hover em cards e botões
- Transições suaves (transition-all duration-300)

## ESTRUTURA OBRIGATÓRIA:

export default function Site() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    alert('Mensagem enviada com sucesso!')
  }

  return (
    <div className="min-h-screen">
      {/* Navbar com links funcionais */}
      <nav>
        <a href="#inicio">Início</a>
        <a href="#sobre">Sobre</a>
        <a href="#servicos">Serviços</a>
        <a href="#contato">Contato</a>
        <button onClick={() => scrollToSection('contato')}>Fale Conosco</button>
      </nav>

      {/* Seções com IDs correspondentes */}
      <section id="inicio">Hero</section>
      <section id="sobre">Sobre</section>
      <section id="servicos">Serviços</section>
      <section id="contato">
        <form onSubmit={handleSubmit}>
          <input type="text" name="nome" placeholder="Nome" required />
          <input type="email" name="email" placeholder="Email" required />
          <textarea name="mensagem" placeholder="Mensagem" required />
          <button type="submit">Enviar</button>
        </form>
      </section>

      <footer>© 2025</footer>
    </div>
  )
}

## DESIGN PROFISSIONAL:

### Cores e Gradientes:
- Fundo escuro: bg-[#030014] ou bg-gradient-to-br from-gray-900 to-black
- Primária: from-purple-500 to-pink-500
- Acentos: text-purple-400, border-purple-500/50
- Cards: bg-white/5 border border-white/10

### Tipografia:
- Títulos: text-5xl md:text-7xl font-bold
- Subtítulos: text-xl text-gray-400
- Gradiente no texto: bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent

### Componentes:
- Navbar fixa: fixed w-full z-50 bg-black/50 backdrop-blur-xl
- Botões: px-8 py-4 rounded-full font-semibold hover:scale-105 transition
- Cards: p-8 rounded-2xl hover:border-purple-500/50 transition-all duration-300
- Seções: py-20 ou py-32 para espaçamento generoso

### Ícones SVG Inline:
<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
</svg>

## TIPOS DE SITE:

### Landing Page/SaaS:
- Hero com título impactante + CTA
- Features em grid 3x3
- Depoimentos
- Preços
- FAQ
- Formulário de contato

### Portfolio:
- Hero com foto/avatar
- Grid de projetos
- Skills
- Experiência
- Contato

### E-commerce:
- Header com carrinho
- Grid de produtos
- Categorias
- Produto destaque
- Newsletter

### Time de Futebol:
- Grêmio: bg-blue-900, Azul #0066B3
- Inter: bg-red-900, Vermelho #E31E24
- Flamengo: bg-red-900 + preto

IMPORTANTE: Gere sites COMPLETOS com TODAS as seções, navegação funcional, formulários que funcionam, e design profissional. NUNCA use placeholders ou "Lorem ipsum".`

export async function generateSiteContent(prompt: string, projectContext?: any[], history?: any[]) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("[v0] User not authenticated")
    return { error: "Não autenticado", code: "", explanation: "", remainingRequests: 0 }
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
- Retorne APENAS o código JSX, começando com "export default function"
- Implemente navegação funcional com href="#secao-correspondente" e id="secao-correspondente"
- Implemente botões interativos com scrollIntoView para seções
- Inclua formulário de contato com validação e alert de confirmação
- Implemente menu mobile com useState para toggle
- Adicione animações de hover e transições suaves`

  console.log("[v0] Calling Claude API...")

  const { text } = await generateText({
    model: "anthropic/claude-sonnet-4-20250514",
    system: SYSTEM_PROMPT,
    prompt: enhancedPrompt,
    maxTokens: 12000,
    temperature: 0.7,
  })

  console.log("[v0] Claude response length:", text?.length)
  console.log("[v0] Claude response preview:", text?.substring(0, 300))

  let code = text.trim()

  code = code
    .replace(/^```(?:jsx|tsx|javascript|typescript|react)?\s*\n?/gm, "")
    .replace(/\n?```\s*$/gm, "")
    .replace(/^Here.*?:\s*\n/gim, "")
    .replace(/^I'll create.*?:\s*\n/gim, "")
    .replace(/^Sure.*?:\s*\n/gim, "")
    .replace(/^This.*?:\s*\n/gim, "")
    .replace(/^Aqui.*?:\s*\n/gim, "")
    .replace(/^Vou criar.*?:\s*\n/gim, "")
    .replace(/^Claro.*?:\s*\n/gim, "")
    .trim()

  // Encontrar início do export default
  const exportIndex = code.indexOf("export default function")
  if (exportIndex > 0) {
    code = code.substring(exportIndex)
  }

  console.log("[v0] Cleaned code length:", code?.length)
  console.log("[v0] Has export default:", code?.includes("export default function"))

  if (!code.includes("export default function")) {
    console.log("[v0] No export default found, using fallback")
    code = generateFallbackCode(prompt)
  }

  const hasReturn = code.includes("return")
  const hasJSX = code.includes("<") && code.includes(">")

  if (!hasReturn || !hasJSX) {
    console.log("[v0] Invalid code structure, using fallback. hasReturn:", hasReturn, "hasJSX:", hasJSX)
    code = generateFallbackCode(prompt)
  }

  console.log("[v0] Final code length:", code?.length)

  return {
    code,
    explanation: `Site "${prompt.substring(0, 50)}${prompt.length > 50 ? "..." : ""}" gerado com sucesso! Veja o preview ao lado.`,
    remainingRequests: profile?.plan === "pro" ? -1 : 20,
  }
}
