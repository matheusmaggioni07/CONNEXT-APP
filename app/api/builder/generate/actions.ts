"use server"

import { generateText } from "ai"

interface GenerateCodeParams {
  prompt: string
  projectContext?: Array<{ name: string; content: string }>
  history?: Array<{ role: string; content: string }>
  userId?: string
}

const MASTER_SYSTEM_PROMPT = `Você é o CONNEXT BUILDER - o mais avançado gerador de sites com IA do mundo.

## REGRA FUNDAMENTAL
Você DEVE gerar EXATAMENTE o que o usuário pediu. Se o usuário pedir um site do Grêmio, você gera um site do Grêmio com cores azul/preto/branco, escudo, história do clube, títulos, etc. NUNCA gere algo genérico.

## ANÁLISE SEMÂNTICA DO PEDIDO
Antes de gerar, analise profundamente:
1. TEMA: Qual é o tema específico? (time de futebol, empresa, portfolio, e-commerce, etc.)
2. IDENTIDADE: Quais cores, logos, símbolos estão associados?
3. CONTEÚDO: Que informações são relevantes para esse tema?
4. PÚBLICO: Quem vai acessar esse site?
5. OBJETIVO: Qual a finalidade do site?

## TIMES DE FUTEBOL BRASILEIROS - REFERÊNCIA OBRIGATÓRIA

### Grêmio FBPA
- Cores: Azul (#0047AB), Preto (#000000), Branco (#FFFFFF)
- Mascote: Mosqueteiro
- Estádio: Arena do Grêmio
- Fundação: 15 de setembro de 1903
- Títulos: 3 Libertadores, 2 Mundiais, 5 Copa do Brasil, 42+ Gauchões
- Apelidos: Imortal Tricolor, Tricolor Gaúcho

### Internacional
- Cores: Vermelho (#E31B23), Branco (#FFFFFF)
- Mascote: Saci
- Estádio: Beira-Rio
- Fundação: 4 de abril de 1909
- Títulos: 3 Libertadores, 1 Mundial, 3 Copa do Brasil, 45+ Gauchões
- Apelidos: Colorado, Clube do Povo

### Flamengo
- Cores: Vermelho (#BF0000), Preto (#000000)
- Estádio: Maracanã
- Títulos: 3 Libertadores, 1 Mundial, 8 Brasileirões
- Apelidos: Mengão, Nação Rubro-Negra

### Corinthians
- Cores: Preto (#000000), Branco (#FFFFFF)
- Estádio: Neo Química Arena
- Títulos: 1 Libertadores, 2 Mundiais, 7 Brasileirões
- Apelidos: Timão, Todo Poderoso

### Palmeiras
- Cores: Verde (#006437), Branco (#FFFFFF)
- Estádio: Allianz Parque
- Títulos: 3 Libertadores, 12 Brasileirões
- Apelidos: Verdão, Porco

### Santos
- Cores: Preto (#000000), Branco (#FFFFFF)
- Estádio: Vila Belmiro
- Títulos: 3 Libertadores, 2 Mundiais, 8 Brasileirões
- Lendas: Pelé, Neymar

### São Paulo
- Cores: Vermelho (#FF0000), Preto (#000000), Branco (#FFFFFF)
- Estádio: Morumbi
- Títulos: 3 Libertadores, 3 Mundiais, 6 Brasileirões
- Apelidos: Tricolor Paulista, Soberano

## FORMATO DE SAÍDA

Gere APENAS o código React/JSX. Sem explicações, sem markdown, sem \`\`\`.

O código deve:
1. Ser um componente React funcional exportado como default
2. Usar Tailwind CSS para estilização
3. Ser 100% responsivo (mobile-first)
4. Ter design moderno e profissional
5. Incluir animações sutis
6. Ter todas as seções relevantes para o tema

## ESTRUTURA PADRÃO DE UM SITE COMPLETO

1. Navbar fixa com blur
2. Hero section impactante
3. Seções de conteúdo relevantes ao tema
4. Call-to-actions
5. Footer

## EXEMPLOS DE INTERPRETAÇÃO

- "site do grêmio" → Site completo do Grêmio FBPA com cores azul/preto/branco
- "landing page startup" → Landing page moderna para startup de tecnologia
- "portfolio designer" → Portfolio profissional para designer
- "loja virtual" → E-commerce com grid de produtos
- "grenal" → Site sobre o clássico Grêmio x Internacional

LEMBRE-SE: O usuário confia em você para entregar EXATAMENTE o que ele pediu. Não decepcione.`

function analyzePrompt(prompt: string): {
  theme: string
  colors: string[]
  sections: string[]
  style: string
} {
  const lowerPrompt = prompt.toLowerCase()

  // Times de futebol
  if (lowerPrompt.includes("grêmio") || lowerPrompt.includes("gremio")) {
    return {
      theme: "Grêmio FBPA",
      colors: ["#0047AB", "#000000", "#FFFFFF"],
      sections: ["hero", "títulos", "história", "elenco", "arena"],
      style: "esportivo",
    }
  }

  if (lowerPrompt.includes("inter") || lowerPrompt.includes("internacional")) {
    return {
      theme: "Internacional",
      colors: ["#E31B23", "#FFFFFF"],
      sections: ["hero", "títulos", "história", "elenco", "beira-rio"],
      style: "esportivo",
    }
  }

  if (lowerPrompt.includes("grenal")) {
    return {
      theme: "Grenal - Clássico Gaúcho",
      colors: ["#0047AB", "#E31B23", "#FFFFFF"],
      sections: ["hero", "história", "estatísticas", "próximo jogo"],
      style: "esportivo-rivalidade",
    }
  }

  if (lowerPrompt.includes("flamengo")) {
    return {
      theme: "Flamengo",
      colors: ["#BF0000", "#000000", "#FFFFFF"],
      sections: ["hero", "títulos", "nação", "maracanã"],
      style: "esportivo",
    }
  }

  // Tipos de sites
  if (lowerPrompt.includes("startup") || lowerPrompt.includes("saas")) {
    return {
      theme: "Startup/SaaS",
      colors: ["#7C3AED", "#EC4899", "#030014"],
      sections: ["hero", "features", "pricing", "testimonials", "cta"],
      style: "moderno-tech",
    }
  }

  if (lowerPrompt.includes("portfolio") || lowerPrompt.includes("portfólio")) {
    return {
      theme: "Portfolio",
      colors: ["#000000", "#FFFFFF", "#7C3AED"],
      sections: ["hero", "projetos", "sobre", "skills", "contato"],
      style: "minimalista",
    }
  }

  if (lowerPrompt.includes("loja") || lowerPrompt.includes("ecommerce") || lowerPrompt.includes("e-commerce")) {
    return {
      theme: "E-commerce",
      colors: ["#000000", "#FFFFFF", "#10B981"],
      sections: ["hero", "produtos", "categorias", "promoções", "footer"],
      style: "comercial",
    }
  }

  if (lowerPrompt.includes("restaurante") || lowerPrompt.includes("comida") || lowerPrompt.includes("food")) {
    return {
      theme: "Restaurante",
      colors: ["#DC2626", "#FBBF24", "#1F2937"],
      sections: ["hero", "cardápio", "sobre", "localização", "reservas"],
      style: "gastronômico",
    }
  }

  return {
    theme: "Landing Page",
    colors: ["#7C3AED", "#EC4899", "#030014"],
    sections: ["hero", "features", "about", "cta"],
    style: "moderno",
  }
}

export async function generateCode({ prompt, projectContext, history }: GenerateCodeParams): Promise<{
  code: string
  explanation: string
  remainingRequests: number
}> {
  // Analisar o prompt para contexto adicional
  const analysis = analyzePrompt(prompt)

  // Construir contexto do projeto
  let contextInfo = ""
  if (projectContext && projectContext.length > 0) {
    contextInfo = "\n\nCÓDIGO ANTERIOR DO PROJETO:\n" + projectContext.map((f) => f.content).join("\n\n")
  }

  // Construir histórico
  let historyInfo = ""
  if (history && history.length > 0) {
    historyInfo = "\n\nHISTÓRICO DA CONVERSA:\n" + history.map((m) => `${m.role}: ${m.content}`).join("\n")
  }

  // Prompt enriquecido com análise
  const enrichedPrompt = `PEDIDO DO USUÁRIO: ${prompt}

ANÁLISE DO PEDIDO:
- Tema detectado: ${analysis.theme}
- Cores sugeridas: ${analysis.colors.join(", ")}
- Seções relevantes: ${analysis.sections.join(", ")}
- Estilo: ${analysis.style}
${contextInfo}
${historyInfo}

Gere o código React/JSX completo para este site. Lembre-se: EXATAMENTE o que foi pedido, nada genérico.`

  try {
    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: MASTER_SYSTEM_PROMPT,
      prompt: enrichedPrompt,
      maxTokens: 8000,
      temperature: 0.7,
    })

    // Limpar o código gerado
    let code = text.trim()

    // Remover blocos de markdown se existirem
    code = code.replace(/^```(?:jsx|tsx|javascript|typescript|react)?\n?/gm, "")
    code = code.replace(/```$/gm, "")
    code = code.trim()

    // Garantir que temos um export default
    if (!code.includes("export default")) {
      code = code + "\n\nexport default Component;"
    }

    return {
      code,
      explanation: `Site "${analysis.theme}" gerado com sucesso! O design usa as cores ${analysis.colors.slice(0, 2).join(" e ")} com seções de ${analysis.sections.slice(0, 3).join(", ")}.`,
      remainingRequests: 999,
    }
  } catch (error) {
    console.error("Error generating code:", error)
    throw new Error("Failed to generate code")
  }
}
