// NÃO adicione "use client" aqui pois causa erro de importação

import { FALLBACK_THEMES } from "./constants"

type ThemeType = keyof typeof FALLBACK_THEMES

function detectSiteType(prompt: string): ThemeType {
  const lowerPrompt = prompt.toLowerCase()

  if (
    lowerPrompt.includes("futebol") ||
    lowerPrompt.includes("time") ||
    lowerPrompt.includes("esporte") ||
    lowerPrompt.includes("grêmio") ||
    lowerPrompt.includes("gremio") ||
    lowerPrompt.includes("inter") ||
    lowerPrompt.includes("flamengo") ||
    lowerPrompt.includes("corinthians") ||
    lowerPrompt.includes("palmeiras")
  ) {
    return "sports"
  }

  if (
    lowerPrompt.includes("restaurante") ||
    lowerPrompt.includes("comida") ||
    lowerPrompt.includes("pizza") ||
    lowerPrompt.includes("café") ||
    lowerPrompt.includes("bar")
  ) {
    return "restaurant"
  }

  if (
    lowerPrompt.includes("tech") ||
    lowerPrompt.includes("software") ||
    lowerPrompt.includes("app") ||
    lowerPrompt.includes("startup") ||
    lowerPrompt.includes("ia") ||
    lowerPrompt.includes("tecnologia")
  ) {
    return "technology"
  }

  if (
    lowerPrompt.includes("saúde") ||
    lowerPrompt.includes("médico") ||
    lowerPrompt.includes("clínica") ||
    lowerPrompt.includes("fitness") ||
    lowerPrompt.includes("academia")
  ) {
    return "health"
  }

  if (
    lowerPrompt.includes("escola") ||
    lowerPrompt.includes("curso") ||
    lowerPrompt.includes("educação") ||
    lowerPrompt.includes("história") ||
    lowerPrompt.includes("historia") ||
    lowerPrompt.includes("aprender")
  ) {
    return "education"
  }

  if (
    lowerPrompt.includes("loja") ||
    lowerPrompt.includes("ecommerce") ||
    lowerPrompt.includes("produtos") ||
    lowerPrompt.includes("venda") ||
    lowerPrompt.includes("moda")
  ) {
    return "ecommerce"
  }

  return "default"
}

function getSiteTitle(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase()

  // Times de futebol
  if (lowerPrompt.includes("grêmio") || lowerPrompt.includes("gremio")) return "Grêmio FBPA"
  if (lowerPrompt.includes("inter") && lowerPrompt.includes("porto")) return "Sport Club Internacional"
  if (lowerPrompt.includes("flamengo")) return "Clube de Regatas do Flamengo"
  if (lowerPrompt.includes("corinthians")) return "Sport Club Corinthians Paulista"
  if (lowerPrompt.includes("palmeiras")) return "Sociedade Esportiva Palmeiras"
  if (lowerPrompt.includes("são paulo") || lowerPrompt.includes("sao paulo")) return "São Paulo FC"
  if (lowerPrompt.includes("santos")) return "Santos FC"
  if (lowerPrompt.includes("botafogo")) return "Botafogo FR"
  if (lowerPrompt.includes("fluminense")) return "Fluminense FC"
  if (lowerPrompt.includes("vasco")) return "Club de Regatas Vasco da Gama"
  if (lowerPrompt.includes("cruzeiro")) return "Cruzeiro Esporte Clube"
  if (lowerPrompt.includes("atlético") || lowerPrompt.includes("atletico")) return "Clube Atlético Mineiro"

  // Outros temas
  if (lowerPrompt.includes("história") || lowerPrompt.includes("historia")) return "História do Mundo"
  if (lowerPrompt.includes("restaurante")) return "Restaurante Gourmet"
  if (lowerPrompt.includes("tech") || lowerPrompt.includes("tecnologia")) return "Tech Solutions"

  // Extrai nome do prompt
  const words = prompt.split(" ").filter((w) => w.length > 3)
  if (words.length > 0) {
    return words
      .slice(0, 3)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  }

  return "Meu Site"
}

function getTeamColors(prompt: string): { primary: string; secondary: string; accent: string } {
  const lowerPrompt = prompt.toLowerCase()

  if (lowerPrompt.includes("grêmio") || lowerPrompt.includes("gremio")) {
    return { primary: "#0a5eb0", secondary: "#000000", accent: "#ffffff" }
  }
  if (lowerPrompt.includes("inter") && (lowerPrompt.includes("porto") || lowerPrompt.includes("internacional"))) {
    return { primary: "#e4002b", secondary: "#ffffff", accent: "#000000" }
  }
  if (lowerPrompt.includes("flamengo")) {
    return { primary: "#e4002b", secondary: "#000000", accent: "#ffffff" }
  }
  if (lowerPrompt.includes("corinthians")) {
    return { primary: "#000000", secondary: "#ffffff", accent: "#333333" }
  }
  if (lowerPrompt.includes("palmeiras")) {
    return { primary: "#006437", secondary: "#ffffff", accent: "#004d2a" }
  }
  if (lowerPrompt.includes("são paulo") || lowerPrompt.includes("sao paulo")) {
    return { primary: "#ff0000", secondary: "#ffffff", accent: "#000000" }
  }
  if (lowerPrompt.includes("santos")) {
    return { primary: "#000000", secondary: "#ffffff", accent: "#333333" }
  }
  if (lowerPrompt.includes("botafogo")) {
    return { primary: "#000000", secondary: "#ffffff", accent: "#333333" }
  }
  if (lowerPrompt.includes("fluminense")) {
    return { primary: "#9b0d2a", secondary: "#006633", accent: "#ffffff" }
  }
  if (lowerPrompt.includes("vasco")) {
    return { primary: "#000000", secondary: "#ffffff", accent: "#e4002b" }
  }
  if (lowerPrompt.includes("cruzeiro")) {
    return { primary: "#003da5", secondary: "#ffffff", accent: "#002b75" }
  }
  if (lowerPrompt.includes("atlético") || lowerPrompt.includes("atletico")) {
    return { primary: "#000000", secondary: "#ffffff", accent: "#333333" }
  }

  return FALLBACK_THEMES[detectSiteType(prompt)]
}

export function generateFallbackCode(prompt: string): string {
  const title = getSiteTitle(prompt)
  const colors = getTeamColors(prompt)

  const lowerPrompt = prompt.toLowerCase()
  const isTeam =
    /grêmio|gremio|inter|flamengo|corinthians|palmeiras|são paulo|sao paulo|santos|botafogo|fluminense|vasco|cruzeiro|atlético|atletico/.test(
      lowerPrompt,
    )
  const isHistory = lowerPrompt.includes("história") || lowerPrompt.includes("historia")

  let heroSubtitle = "Descubra tudo sobre nós"
  let section1Title = "Sobre"
  let section1Text = "Conheça nossa história e valores"
  let section2Title = "Serviços"
  let section3Title = "Contato"

  if (isTeam) {
    heroSubtitle = "Tradição, Glória e Paixão"
    section1Title = "História"
    section1Text = "Décadas de tradição e conquistas"
    section2Title = "Títulos"
    section3Title = "Torcida"
  } else if (isHistory) {
    heroSubtitle = "Uma jornada através do tempo"
    section1Title = "Antiguidade"
    section1Text = "Das primeiras civilizações ao Império Romano"
    section2Title = "Era Moderna"
    section3Title = "Atualidade"
  }

  const currentYear = new Date().getFullYear()

  return `export default function Site() {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({ nome: "", email: "", mensagem: "" })

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
    setMenuOpen(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    alert("Mensagem enviada com sucesso!")
    setFormData({ nome: "", email: "", mensagem: "" })
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: "system-ui, sans-serif" }}>
      <nav className="fixed top-0 left-0 right-0 z-50 shadow-lg" style={{ backgroundColor: "${colors.primary}" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <span className="text-xl font-bold text-white">${title}</span>
            <div className="hidden md:flex space-x-8">
              <button onClick={() => scrollToSection("inicio")} className="text-white hover:opacity-80 transition">Início</button>
              <button onClick={() => scrollToSection("sobre")} className="text-white hover:opacity-80 transition">Sobre</button>
              <button onClick={() => scrollToSection("servicos")} className="text-white hover:opacity-80 transition">Serviços</button>
              <button onClick={() => scrollToSection("contato")} className="text-white hover:opacity-80 transition">Contato</button>
            </div>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-white/20 px-4 py-3 space-y-2">
            <button onClick={() => scrollToSection("inicio")} className="block w-full text-left text-white py-2">Início</button>
            <button onClick={() => scrollToSection("sobre")} className="block w-full text-left text-white py-2">Sobre</button>
            <button onClick={() => scrollToSection("servicos")} className="block w-full text-left text-white py-2">Serviços</button>
            <button onClick={() => scrollToSection("contato")} className="block w-full text-left text-white py-2">Contato</button>
          </div>
        )}
      </nav>

      <section id="inicio" className="pt-16 min-h-screen flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)" }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">${title}</h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">${heroSubtitle}</p>
          <button onClick={() => scrollToSection("sobre")} className="px-8 py-4 rounded-full text-lg font-semibold transition transform hover:scale-105" style={{ backgroundColor: "${colors.accent}", color: "${colors.primary}" }}>
            Saiba Mais
          </button>
        </div>
      </section>

      <section id="sobre" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ color: "${colors.primary}" }}>${section1Title}</h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-lg text-gray-600 mb-6">${section1Text}</p>
              <p className="text-gray-600">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.</p>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-xl p-12 text-center text-white" style={{ backgroundColor: "${colors.primary}" }}>
              <div className="text-6xl mb-4">★</div>
              <h3 className="text-2xl font-bold">Excelência</h3>
              <p className="opacity-80 mt-2">Compromisso com a qualidade</p>
            </div>
          </div>
        </div>
      </section>

      <section id="servicos" className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ color: "${colors.primary}" }}>${section2Title}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: "⚡", title: "Rápido", desc: "Resultados em tempo recorde" },
              { icon: "🎯", title: "Preciso", desc: "Foco no que realmente importa" },
              { icon: "💎", title: "Premium", desc: "Qualidade incomparável" }
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition transform hover:-translate-y-1 text-center">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: "${colors.primary}" }}>{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contato" className="py-20" style={{ backgroundColor: "${colors.primary}" }}>
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-white">${section3Title}</h2>
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-xl">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:border-transparent transition" placeholder="Seu nome" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:border-transparent transition" placeholder="seu@email.com" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem</label>
                <textarea value={formData.mensagem} onChange={(e) => setFormData({...formData, mensagem: e.target.value})} rows={4} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:border-transparent transition" placeholder="Sua mensagem..." required />
              </div>
              <button type="submit" className="w-full py-4 rounded-lg text-white font-semibold transition transform hover:scale-[1.02]" style={{ backgroundColor: "${colors.primary}" }}>
                Enviar Mensagem
              </button>
            </div>
          </form>
        </div>
      </section>

      <footer className="py-8 text-center text-white" style={{ backgroundColor: "${colors.secondary}" }}>
        <p>© ${currentYear} ${title}. Todos os direitos reservados.</p>
        <p className="text-sm opacity-70 mt-2">Feito com Connext Builder</p>
      </footer>
    </div>
  )
}`
}
