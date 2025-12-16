// NÃO adicione "use client" aqui pois causa erro de importação

export const SYSTEM_PROMPT = `Você é um especialista em criar sites modernos e profissionais com React e Tailwind CSS.

REGRAS OBRIGATÓRIAS:
1. Retorne APENAS código JSX válido, começando com "export default function Site()"
2. Use SOMENTE Tailwind CSS para estilização
3. Inclua todos os estados necessários com React.useState
4. Crie sites completos com: navbar, hero, features, CTA e footer
5. Use cores apropriadas para o contexto do site
6. Implemente menu mobile responsivo
7. Adicione animações sutis com hover e transition
8. Use ícones em formato SVG inline
9. NÃO use imports externos
10. NÃO inclua explicações, apenas o código

O código deve seguir esta estrutura:
- Função principal: export default function Site()
- Estados: const [menuOpen, setMenuOpen] = React.useState(false)
- Menu mobile funcional
- Navegação suave com scrollToSection
- Seções: navbar, hero, features, about, contato, footer
- Formulário de contato funcional
- Design moderno com Tailwind CSS`

export const FALLBACK_THEMES = {
  sports: {
    primary: "#e63946",
    secondary: "#1d3557",
    accent: "#f1faee",
  },
  restaurant: {
    primary: "#bc6c25",
    secondary: "#283618",
    accent: "#fefae0",
  },
  technology: {
    primary: "#7c3aed",
    secondary: "#1e1b4b",
    accent: "#c4b5fd",
  },
  health: {
    primary: "#059669",
    secondary: "#064e3b",
    accent: "#d1fae5",
  },
  education: {
    primary: "#2563eb",
    secondary: "#1e3a8a",
    accent: "#dbeafe",
  },
  ecommerce: {
    primary: "#db2777",
    secondary: "#831843",
    accent: "#fce7f3",
  },
  default: {
    primary: "#8b5cf6",
    secondary: "#1e1b4b",
    accent: "#c4b5fd",
  },
}
