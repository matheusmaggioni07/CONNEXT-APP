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
    lowerPrompt.includes("palmeiras") ||
    lowerPrompt.includes("agro") ||
    lowerPrompt.includes("fazenda") ||
    lowerPrompt.includes("campo")
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
    lowerPrompt.includes("saas") ||
    lowerPrompt.includes("inteligência artificial") ||
    lowerPrompt.includes("ia") ||
    lowerPrompt.includes("ai")
  ) {
    return "technology"
  }

  if (
    lowerPrompt.includes("saúde") ||
    lowerPrompt.includes("saude") ||
    lowerPrompt.includes("médico") ||
    lowerPrompt.includes("medico") ||
    lowerPrompt.includes("hospital") ||
    lowerPrompt.includes("clínica") ||
    lowerPrompt.includes("clinica") ||
    lowerPrompt.includes("farmácia") ||
    lowerPrompt.includes("farmacia")
  ) {
    return "health"
  }

  if (
    lowerPrompt.includes("escola") ||
    lowerPrompt.includes("curso") ||
    lowerPrompt.includes("educação") ||
    lowerPrompt.includes("educacao") ||
    lowerPrompt.includes("universidade") ||
    lowerPrompt.includes("faculdade") ||
    lowerPrompt.includes("história") ||
    lowerPrompt.includes("historia") ||
    lowerPrompt.includes("mundo")
  ) {
    return "education"
  }

  if (
    lowerPrompt.includes("loja") ||
    lowerPrompt.includes("ecommerce") ||
    lowerPrompt.includes("e-commerce") ||
    lowerPrompt.includes("venda") ||
    lowerPrompt.includes("produto") ||
    lowerPrompt.includes("shop")
  ) {
    return "ecommerce"
  }

  return "default"
}

function extractTitle(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase()

  if (lowerPrompt.includes("história") || lowerPrompt.includes("historia")) {
    if (lowerPrompt.includes("mundo")) return "História do Mundo"
    if (lowerPrompt.includes("brasil")) return "História do Brasil"
    return "Portal da História"
  }

  if (lowerPrompt.includes("grêmio") || lowerPrompt.includes("gremio")) return "Grêmio FBPA"
  if (lowerPrompt.includes("inter")) return "Sport Club Internacional"
  if (lowerPrompt.includes("flamengo")) return "Clube de Regatas do Flamengo"
  if (lowerPrompt.includes("corinthians")) return "Sport Club Corinthians"
  if (lowerPrompt.includes("palmeiras")) return "Sociedade Esportiva Palmeiras"

  const words = prompt.split(" ").filter((w) => w.length > 3)
  if (words.length > 0) {
    return words
      .slice(0, 3)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  }

  return "Meu Site"
}

export function generateFallbackCode(prompt: string): string {
  const siteType = detectSiteType(prompt)
  const theme = FALLBACK_THEMES[siteType]
  const title = extractTitle(prompt)

  const isEducation = siteType === "education"
  const isSports = siteType === "sports"
  const isTechnology = siteType === "technology"
  const isRestaurant = siteType === "restaurant"
  const isHealth = siteType === "health"
  const isEcommerce = siteType === "ecommerce"

  const heroTitle = title
  let heroSubtitle = "Descubra uma experiência única e profissional"
  let features = [
    { title: "Qualidade", desc: "Excelência em cada detalhe" },
    { title: "Inovação", desc: "Sempre à frente do tempo" },
    { title: "Confiança", desc: "Compromisso com você" },
  ]
  let ctaText = "Saiba Mais"

  if (isEducation) {
    heroSubtitle = "Explore o conhecimento e descubra histórias fascinantes"
    features = [
      { title: "Conhecimento", desc: "Artigos detalhados e pesquisados" },
      { title: "Timeline Interativa", desc: "Navegue pela história cronologicamente" },
      { title: "Recursos Educacionais", desc: "Material para estudantes e curiosos" },
    ]
    ctaText = "Explorar Conteúdo"
  } else if (isSports) {
    heroSubtitle = "Paixão, história e conquistas que marcam gerações"
    features = [
      { title: "História", desc: "Conheça a trajetória do clube" },
      { title: "Títulos", desc: "Conquistas que nos orgulham" },
      { title: "Torcida", desc: "A maior força do time" },
    ]
    ctaText = "Ver Mais"
  } else if (isTechnology) {
    heroSubtitle = "Soluções inovadoras para transformar seu negócio"
    features = [
      { title: "Tecnologia", desc: "Stack moderna e escalável" },
      { title: "Segurança", desc: "Proteção de dados garantida" },
      { title: "Suporte", desc: "Equipe especializada 24/7" },
    ]
    ctaText = "Começar Agora"
  } else if (isRestaurant) {
    heroSubtitle = "Sabores únicos que encantam o paladar"
    features = [
      { title: "Cardápio", desc: "Pratos exclusivos e saborosos" },
      { title: "Ambiente", desc: "Atmosfera acolhedora" },
      { title: "Delivery", desc: "Entregamos na sua casa" },
    ]
    ctaText = "Ver Cardápio"
  } else if (isHealth) {
    heroSubtitle = "Cuidando da sua saúde com carinho e profissionalismo"
    features = [
      { title: "Profissionais", desc: "Equipe qualificada" },
      { title: "Estrutura", desc: "Equipamentos modernos" },
      { title: "Atendimento", desc: "Humanizado e dedicado" },
    ]
    ctaText = "Agendar Consulta"
  } else if (isEcommerce) {
    heroSubtitle = "Os melhores produtos com os melhores preços"
    features = [
      { title: "Produtos", desc: "Variedade e qualidade" },
      { title: "Entrega", desc: "Rápida e segura" },
      { title: "Pagamento", desc: "Formas facilitadas" },
    ]
    ctaText = "Ver Produtos"
  }

  return `export default function Site() {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({ nome: "", email: "", mensagem: "" })
  const [formSent, setFormSent] = React.useState(false)

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
    setMenuOpen(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setFormSent(true)
    setTimeout(() => setFormSent(false), 3000)
    setFormData({ nome: "", email: "", mensagem: "" })
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0">
              <span className="text-2xl font-bold" style={{ color: "${theme.primary}" }}>${title}</span>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollToSection("inicio")} className="text-gray-700 hover:text-gray-900 transition-colors">Início</button>
              <button onClick={() => scrollToSection("sobre")} className="text-gray-700 hover:text-gray-900 transition-colors">Sobre</button>
              <button onClick={() => scrollToSection("recursos")} className="text-gray-700 hover:text-gray-900 transition-colors">Recursos</button>
              <button onClick={() => scrollToSection("contato")} className="px-4 py-2 rounded-lg text-white transition-all hover:opacity-90" style={{ backgroundColor: "${theme.primary}" }}>Contato</button>
            </div>
            
            {/* Mobile Menu Button */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
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
        
        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t shadow-lg">
            <div className="px-4 py-3 space-y-2">
              <button onClick={() => scrollToSection("inicio")} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100">Início</button>
              <button onClick={() => scrollToSection("sobre")} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100">Sobre</button>
              <button onClick={() => scrollToSection("recursos")} className="block w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100">Recursos</button>
              <button onClick={() => scrollToSection("contato")} className="block w-full text-left px-3 py-2 rounded-lg text-white" style={{ backgroundColor: "${theme.primary}" }}>Contato</button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="inicio" className="pt-16 min-h-screen flex items-center" style={{ background: "linear-gradient(135deg, ${theme.secondary} 0%, ${theme.primary} 100%)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">${heroTitle}</h1>
            <p className="text-xl sm:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">${heroSubtitle}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => scrollToSection("sobre")} className="px-8 py-3 bg-white rounded-lg font-semibold transition-all hover:scale-105 hover:shadow-lg" style={{ color: "${theme.primary}" }}>${ctaText}</button>
              <button onClick={() => scrollToSection("contato")} className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold transition-all hover:bg-white/10">Entre em Contato</button>
            </div>
          </div>
        </div>
      </section>

      {/* Sobre Section */}
      <section id="sobre" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Sobre Nós</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Conheça mais sobre nossa história, missão e valores que nos guiam todos os dias.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Nossa História</h3>
              <p className="text-gray-600 mb-4">Desde o início, nossa missão tem sido proporcionar experiências excepcionais. Com dedicação e paixão, construímos uma trajetória de sucesso e confiança.</p>
              <p className="text-gray-600">Continuamos evoluindo e inovando para atender às necessidades de nossos clientes e parceiros, sempre com excelência e comprometimento.</p>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-xl" style={{ backgroundColor: "${theme.accent}" }}>
              <div className="p-8 text-center">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "${theme.primary}" }}>
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-gray-900">Excelência</h4>
                <p className="text-gray-600 mt-2">Comprometidos com a qualidade em tudo que fazemos</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recursos Section */}
      <section id="recursos" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Nossos Recursos</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Descubra o que nos torna únicos e por que somos a melhor escolha para você.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            ${features
              .map(
                (f, i) => `
            <div className="p-6 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: "${theme.accent}" }}>
                <svg className="w-6 h-6" style={{ color: "${theme.primary}" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="${i === 0 ? "M5 13l4 4L19 7" : i === 1 ? "M13 10V3L4 14h7v7l9-11h-7z" : "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"}" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">${f.title}</h3>
              <p className="text-gray-600">${f.desc}</p>
            </div>
            `,
              )
              .join("")}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20" style={{ backgroundColor: "${theme.secondary}" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Pronto para Começar?</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">Junte-se a nós e descubra uma experiência única. Estamos prontos para ajudá-lo.</p>
          <button onClick={() => scrollToSection("contato")} className="px-8 py-3 bg-white rounded-lg font-semibold transition-all hover:scale-105 hover:shadow-lg" style={{ color: "${theme.primary}" }}>Fale Conosco</button>
        </div>
      </section>

      {/* Contato Section */}
      <section id="contato" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Entre em Contato</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Estamos aqui para ajudar. Envie sua mensagem e retornaremos em breve.</p>
          </div>
          <div className="max-w-xl mx-auto">
            {formSent && (
              <div className="mb-6 p-4 rounded-lg bg-green-100 text-green-700 text-center">Mensagem enviada com sucesso!</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                <input type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:border-transparent transition-all" style={{ focusRing: "${theme.primary}" }} placeholder="Seu nome" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:border-transparent transition-all" placeholder="seu@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem</label>
                <textarea value={formData.mensagem} onChange={(e) => setFormData({...formData, mensagem: e.target.value})} required rows={4} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:border-transparent transition-all resize-none" placeholder="Sua mensagem..." />
              </div>
              <button type="submit" className="w-full py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90 hover:scale-[1.02]" style={{ backgroundColor: "${theme.primary}" }}>Enviar Mensagem</button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: "${theme.secondary}" }} className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <span className="text-2xl font-bold text-white">${title}</span>
              <p className="text-white/70 mt-4 max-w-md">Comprometidos em oferecer a melhor experiência para nossos clientes e parceiros.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Links Rápidos</h4>
              <div className="space-y-2">
                <button onClick={() => scrollToSection("inicio")} className="block text-white/70 hover:text-white transition-colors">Início</button>
                <button onClick={() => scrollToSection("sobre")} className="block text-white/70 hover:text-white transition-colors">Sobre</button>
                <button onClick={() => scrollToSection("recursos")} className="block text-white/70 hover:text-white transition-colors">Recursos</button>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contato</h4>
              <div className="space-y-2 text-white/70">
                <p>contato@exemplo.com</p>
                <p>(00) 0000-0000</p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/20 mt-8 pt-8 text-center">
            <p className="text-white/60">© 2025 ${title}. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}`
}
