"use client"

import { FALLBACK_THEMES } from "./constants"

function detectSiteType(prompt: string): keyof typeof FALLBACK_THEMES {
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
    lowerPrompt.includes("hamburger") ||
    lowerPrompt.includes("café") ||
    lowerPrompt.includes("bar")
  ) {
    return "restaurant"
  }

  if (
    lowerPrompt.includes("tech") ||
    lowerPrompt.includes("tecnologia") ||
    lowerPrompt.includes("software") ||
    lowerPrompt.includes("app") ||
    lowerPrompt.includes("startup") ||
    lowerPrompt.includes("saas")
  ) {
    return "technology"
  }

  if (
    lowerPrompt.includes("saúde") ||
    lowerPrompt.includes("saude") ||
    lowerPrompt.includes("médico") ||
    lowerPrompt.includes("clinica") ||
    lowerPrompt.includes("hospital") ||
    lowerPrompt.includes("farmácia")
  ) {
    return "health"
  }

  if (
    lowerPrompt.includes("moda") ||
    lowerPrompt.includes("roupa") ||
    lowerPrompt.includes("fashion") ||
    lowerPrompt.includes("loja") ||
    lowerPrompt.includes("boutique")
  ) {
    return "fashion"
  }

  if (
    lowerPrompt.includes("natureza") ||
    lowerPrompt.includes("eco") ||
    lowerPrompt.includes("sustentável") ||
    lowerPrompt.includes("orgânico") ||
    lowerPrompt.includes("fazenda")
  ) {
    return "nature"
  }

  return "default"
}

function extractSiteName(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase()

  if (lowerPrompt.includes("grêmio") || lowerPrompt.includes("gremio")) return "Grêmio"
  if (lowerPrompt.includes("inter") || lowerPrompt.includes("internacional")) return "Internacional"
  if (lowerPrompt.includes("flamengo")) return "Flamengo"
  if (lowerPrompt.includes("corinthians")) return "Corinthians"
  if (lowerPrompt.includes("palmeiras")) return "Palmeiras"
  if (lowerPrompt.includes("são paulo") || lowerPrompt.includes("sao paulo")) return "São Paulo"
  if (lowerPrompt.includes("santos")) return "Santos"
  if (lowerPrompt.includes("fluminense")) return "Fluminense"
  if (lowerPrompt.includes("vasco")) return "Vasco"
  if (lowerPrompt.includes("botafogo")) return "Botafogo"
  if (lowerPrompt.includes("cruzeiro")) return "Cruzeiro"
  if (lowerPrompt.includes("atlético") || lowerPrompt.includes("atletico")) return "Atlético"

  const words = prompt.split(" ")
  for (const word of words) {
    if (word.length > 3 && !["site", "para", "criar", "crie", "faça", "faca", "quero"].includes(word.toLowerCase())) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    }
  }

  return "Meu Site"
}

function getTeamColors(prompt: string): { primary: string; secondary: string; gradient: string } {
  const lowerPrompt = prompt.toLowerCase()

  if (lowerPrompt.includes("grêmio") || lowerPrompt.includes("gremio")) {
    return { primary: "#0066CC", secondary: "#000000", gradient: "from-blue-600 to-black" }
  }
  if (lowerPrompt.includes("inter") || lowerPrompt.includes("internacional")) {
    return { primary: "#DC2626", secondary: "#FFFFFF", gradient: "from-red-600 to-red-800" }
  }
  if (lowerPrompt.includes("flamengo")) {
    return { primary: "#DC2626", secondary: "#000000", gradient: "from-red-600 to-black" }
  }
  if (lowerPrompt.includes("corinthians")) {
    return { primary: "#000000", secondary: "#FFFFFF", gradient: "from-gray-900 to-black" }
  }
  if (lowerPrompt.includes("palmeiras")) {
    return { primary: "#006437", secondary: "#FFFFFF", gradient: "from-green-700 to-green-900" }
  }
  if (lowerPrompt.includes("são paulo") || lowerPrompt.includes("sao paulo")) {
    return { primary: "#DC2626", secondary: "#FFFFFF", gradient: "from-red-600 to-white" }
  }
  if (lowerPrompt.includes("santos")) {
    return { primary: "#000000", secondary: "#FFFFFF", gradient: "from-gray-800 to-white" }
  }
  if (lowerPrompt.includes("cruzeiro")) {
    return { primary: "#0052CC", secondary: "#FFFFFF", gradient: "from-blue-700 to-blue-900" }
  }

  return { primary: "#6366F1", secondary: "#8B5CF6", gradient: "from-indigo-600 to-purple-600" }
}

export function generateFallbackCode(prompt: string): string {
  const siteType = detectSiteType(prompt)
  const siteName = extractSiteName(prompt)
  const theme = FALLBACK_THEMES[siteType]
  const teamColors = getTeamColors(prompt)

  const isSports = siteType === "sports"
  const colors = isSports ? teamColors : theme
  const currentYear = new Date().getFullYear()

  const sportsTitle = isSports ? `A Paixão do ${siteName}` : `Bem-vindo ao ${siteName}`
  const sportsSubtitle = isSports
    ? "O maior time do Brasil. Juntos somos mais fortes!"
    : "Descubra o melhor que temos para oferecer. Qualidade e excelência em cada detalhe."
  const aboutText1 = isSports
    ? `O ${siteName} é mais que um time, é uma paixão que une milhões de torcedores.`
    : "Somos uma empresa dedicada à excelência e à satisfação dos nossos clientes."
  const aboutText2 = isSports
    ? "Cada jogo é uma oportunidade de mostrar nossa grandeza."
    : "Nossa missão é superar suas expectativas."
  const featureLabel = isSports ? "Nosso Time" : "O Que Oferecemos"
  const featureTitle = isSports ? "Destaques" : "Nossos Serviços"
  const contactText = isSports
    ? "Quer fazer parte dessa história? Entre em contato!"
    : "Estamos prontos para ajudar você!"

  return `export default function Site() {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({ name: '', email: '', message: '' })

  const handleSubmit = (e) => {
    e.preventDefault()
    alert('Mensagem enviada com sucesso!')
    setFormData({ name: '', email: '', message: '' })
  }

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br ${colors.gradient} text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center font-bold text-xl">${siteName.charAt(0)}</div>
              <span className="text-xl font-bold">${siteName}</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('hero')} className="text-sm font-medium hover:text-gray-300 transition-colors">Início</button>
              <button onClick={() => scrollToSection('sobre')} className="text-sm font-medium hover:text-gray-300 transition-colors">Sobre</button>
              <button onClick={() => scrollToSection('features')} className="text-sm font-medium hover:text-gray-300 transition-colors">Serviços</button>
              <button onClick={() => scrollToSection('contato')} className="text-sm font-medium hover:text-gray-300 transition-colors">Contato</button>
            </div>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-white/10">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-black/95 border-t border-white/10 px-4 py-4 space-y-3">
            <button onClick={() => scrollToSection('hero')} className="block w-full text-left px-4 py-2 rounded-lg hover:bg-white/10">Início</button>
            <button onClick={() => scrollToSection('sobre')} className="block w-full text-left px-4 py-2 rounded-lg hover:bg-white/10">Sobre</button>
            <button onClick={() => scrollToSection('features')} className="block w-full text-left px-4 py-2 rounded-lg hover:bg-white/10">Serviços</button>
            <button onClick={() => scrollToSection('contato')} className="block w-full text-left px-4 py-2 rounded-lg hover:bg-white/10">Contato</button>
          </div>
        )}
      </nav>

      <section id="hero" className="pt-16 min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920')] bg-cover bg-center opacity-20"></div>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">${sportsTitle}</h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto">${sportsSubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => scrollToSection('sobre')} className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-all">Saiba Mais</button>
            <button onClick={() => scrollToSection('contato')} className="px-8 py-4 bg-transparent border-2 border-white font-semibold rounded-full hover:bg-white hover:text-black transition-all">Contato</button>
          </div>
        </div>
      </section>

      <section id="sobre" className="py-24 bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold">Sobre Nós</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <p className="text-lg text-gray-300">${aboutText1}</p>
              <p className="text-lg text-gray-300">${aboutText2}</p>
            </div>
            <div className="aspect-square rounded-2xl bg-gradient-to-br ${colors.gradient} p-1">
              <div className="w-full h-full rounded-xl bg-black/50 flex items-center justify-center">
                <div className="text-8xl font-bold opacity-50">${siteName.charAt(0)}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold tracking-wider uppercase text-gray-400">${featureLabel}</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-2">${featureTitle}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-white/30 transition-all">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center mb-6">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Agilidade</h3>
              <p className="text-gray-400">Entregamos resultados rápidos sem comprometer a qualidade.</p>
            </div>
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-white/30 transition-all">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center mb-6">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Qualidade</h3>
              <p className="text-gray-400">Comprometimento com excelência em tudo que fazemos.</p>
            </div>
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-white/30 transition-all">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center mb-6">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Suporte</h3>
              <p className="text-gray-400">Equipe sempre disponível para atender você.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="contato" className="py-24 bg-black/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold">Entre em Contato</h2>
            <p className="text-gray-400 mt-4">${contactText}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6 bg-white/5 rounded-2xl p-8 border border-white/10">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-white/40 text-white" placeholder="Seu nome" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-white/40 text-white" placeholder="seu@email.com" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Mensagem</label>
              <textarea value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-white/40 text-white min-h-[150px] resize-none" placeholder="Sua mensagem..." required />
            </div>
            <button type="submit" className="w-full py-4 bg-gradient-to-r ${colors.gradient} font-semibold rounded-xl hover:opacity-90 transition-all">Enviar Mensagem</button>
          </form>
        </div>
      </section>

      <footer className="py-12 bg-black border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center font-bold text-xl">${siteName.charAt(0)}</div>
              <span className="text-xl font-bold">${siteName}</span>
            </div>
            <p className="text-gray-400 text-sm">© ${currentYear} ${siteName}. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}`
}
