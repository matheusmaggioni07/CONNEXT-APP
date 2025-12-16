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
    lowerPrompt.includes("médico") ||
    lowerPrompt.includes("clínica") ||
    lowerPrompt.includes("hospital") ||
    lowerPrompt.includes("bem-estar")
  ) {
    return "health"
  }

  if (
    lowerPrompt.includes("curso") ||
    lowerPrompt.includes("escola") ||
    lowerPrompt.includes("educação") ||
    lowerPrompt.includes("ensino") ||
    lowerPrompt.includes("universidade")
  ) {
    return "education"
  }

  if (
    lowerPrompt.includes("loja") ||
    lowerPrompt.includes("ecommerce") ||
    lowerPrompt.includes("venda") ||
    lowerPrompt.includes("produto")
  ) {
    return "ecommerce"
  }

  return "default"
}

function extractName(prompt: string): string {
  const patterns = [
    /(?:para|do|da|de)\s+(?:o\s+|a\s+)?(.+?)(?:\s+de|\s+em|\s+com|$)/i,
    /site\s+(?:do|da|de)\s+(.+?)(?:\s+de|\s+em|\s+com|$)/i,
    /(.+?)(?:\s+site|\s+página)/i,
  ]

  for (const pattern of patterns) {
    const match = prompt.match(pattern)
    if (match && match[1]) {
      return match[1].trim().substring(0, 50)
    }
  }

  return prompt.substring(0, 30)
}

export function generateFallbackCode(prompt: string): string {
  const siteType = detectSiteType(prompt)
  const theme = FALLBACK_THEMES[siteType]
  const siteName = extractName(prompt)

  const lowerPrompt = prompt.toLowerCase()
  let primaryColor = theme.primary
  let secondaryColor = theme.secondary
  let displayName = siteName

  if (lowerPrompt.includes("inter") || lowerPrompt.includes("internacional")) {
    primaryColor = "#E41B23"
    secondaryColor = "#FFFFFF"
    displayName = "Sport Club Internacional"
  } else if (lowerPrompt.includes("grêmio") || lowerPrompt.includes("gremio")) {
    primaryColor = "#0A6AB4"
    secondaryColor = "#000000"
    displayName = "Grêmio FBPA"
  } else if (lowerPrompt.includes("flamengo")) {
    primaryColor = "#9F1D21"
    secondaryColor = "#000000"
    displayName = "Clube de Regatas do Flamengo"
  } else if (lowerPrompt.includes("corinthians")) {
    primaryColor = "#000000"
    secondaryColor = "#FFFFFF"
    displayName = "Sport Club Corinthians Paulista"
  } else if (lowerPrompt.includes("palmeiras")) {
    primaryColor = "#006437"
    secondaryColor = "#FFFFFF"
    displayName = "Sociedade Esportiva Palmeiras"
  }

  const code = `export default function Site() {
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
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '${primaryColor}' }}>
                <span className="text-xl font-bold" style={{ color: '${secondaryColor}' }}>${displayName.charAt(0)}</span>
              </div>
              <span className="text-xl font-bold">${displayName}</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('inicio')} className="text-gray-300 hover:text-white transition-colors">Início</button>
              <button onClick={() => scrollToSection('sobre')} className="text-gray-300 hover:text-white transition-colors">Sobre</button>
              <button onClick={() => scrollToSection('features')} className="text-gray-300 hover:text-white transition-colors">Destaques</button>
              <button onClick={() => scrollToSection('contato')} className="text-gray-300 hover:text-white transition-colors">Contato</button>
            </div>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-gray-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-gray-900 border-t border-gray-800 px-4 py-4 space-y-4">
            <button onClick={() => scrollToSection('inicio')} className="block w-full text-left text-gray-300 hover:text-white">Início</button>
            <button onClick={() => scrollToSection('sobre')} className="block w-full text-left text-gray-300 hover:text-white">Sobre</button>
            <button onClick={() => scrollToSection('features')} className="block w-full text-left text-gray-300 hover:text-white">Destaques</button>
            <button onClick={() => scrollToSection('contato')} className="block w-full text-left text-gray-300 hover:text-white">Contato</button>
          </div>
        )}
      </nav>

      <section id="inicio" className="min-h-screen flex items-center justify-center relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"></div>
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: '${primaryColor}' }}></div>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="w-32 h-32 mx-auto rounded-full flex items-center justify-center shadow-2xl" style={{ backgroundColor: '${primaryColor}' }}>
              <span className="text-6xl font-bold" style={{ color: '${secondaryColor}' }}>${displayName.charAt(0)}</span>
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6">${displayName}</h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-10">Bem-vindo ao site oficial. Conheça nossa história e novidades.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => scrollToSection('sobre')} className="px-8 py-4 rounded-full font-semibold text-lg transition-all hover:scale-105" style={{ backgroundColor: '${primaryColor}', color: '${secondaryColor}' }}>Saiba Mais</button>
            <button onClick={() => scrollToSection('contato')} className="px-8 py-4 rounded-full font-semibold text-lg border-2 transition-all hover:bg-white hover:text-gray-900" style={{ borderColor: '${primaryColor}', color: '${primaryColor}' }}>Entre em Contato</button>
          </div>
        </div>
      </section>

      <section id="sobre" className="py-24 px-4 bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">Sobre <span style={{ color: '${primaryColor}' }}>${displayName}</span></h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <p className="text-lg text-gray-300 leading-relaxed">Com uma história rica e tradição de excelência, ${displayName} representa o melhor em sua área.</p>
              <p className="text-lg text-gray-300 leading-relaxed">Nossa missão é oferecer o melhor para nossa comunidade.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900/50 rounded-2xl p-6 text-center border border-gray-700">
                <div className="text-4xl font-bold mb-2" style={{ color: '${primaryColor}' }}>100+</div>
                <div className="text-gray-400">Anos de História</div>
              </div>
              <div className="bg-gray-900/50 rounded-2xl p-6 text-center border border-gray-700">
                <div className="text-4xl font-bold mb-2" style={{ color: '${primaryColor}' }}>1M+</div>
                <div className="text-gray-400">Seguidores</div>
              </div>
              <div className="bg-gray-900/50 rounded-2xl p-6 text-center border border-gray-700">
                <div className="text-4xl font-bold mb-2" style={{ color: '${primaryColor}' }}>50+</div>
                <div className="text-gray-400">Conquistas</div>
              </div>
              <div className="bg-gray-900/50 rounded-2xl p-6 text-center border border-gray-700">
                <div className="text-4xl font-bold mb-2" style={{ color: '${primaryColor}' }}>#1</div>
                <div className="text-gray-400">Na Região</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">Nossos <span style={{ color: '${primaryColor}' }}>Destaques</span></h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[{ title: 'Tradição', desc: 'Uma história rica e cheia de conquistas.' }, { title: 'Comunidade', desc: 'Milhões de pessoas compartilham a mesma paixão.' }, { title: 'Excelência', desc: 'Compromisso com qualidade em tudo que fazemos.' }].map((item, i) => (
              <div key={i} className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700 hover:border-opacity-50 transition-all hover:-translate-y-2">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: '${primaryColor}20' }}>
                  <svg className="w-7 h-7" style={{ color: '${primaryColor}' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contato" className="py-24 px-4 bg-gray-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">Entre em <span style={{ color: '${primaryColor}' }}>Contato</span></h2>
          <form onSubmit={handleSubmit} className="bg-gray-900/50 rounded-2xl p-8 border border-gray-700">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Nome</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none" placeholder="Seu nome" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none" placeholder="seu@email.com" required />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">Mensagem</label>
              <textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} rows={5} className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none resize-none" placeholder="Sua mensagem..." required></textarea>
            </div>
            <button type="submit" className="w-full py-4 rounded-xl font-semibold text-lg transition-all hover:scale-[1.02]" style={{ backgroundColor: '${primaryColor}', color: '${secondaryColor}' }}>Enviar Mensagem</button>
          </form>
        </div>
      </section>

      <footer className="py-12 px-4 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '${primaryColor}' }}>
                <span className="text-xl font-bold" style={{ color: '${secondaryColor}' }}>${displayName.charAt(0)}</span>
              </div>
              <span className="text-xl font-bold">${displayName}</span>
            </div>
            <div className="flex gap-6">
              <button onClick={() => scrollToSection('inicio')} className="text-gray-400 hover:text-white transition-colors">Início</button>
              <button onClick={() => scrollToSection('sobre')} className="text-gray-400 hover:text-white transition-colors">Sobre</button>
              <button onClick={() => scrollToSection('contato')} className="text-gray-400 hover:text-white transition-colors">Contato</button>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-500">
            <p>© 2025 ${displayName}. Todos os direitos reservados.</p>
            <p className="mt-2 text-sm">Criado com Connext Builder</p>
          </div>
        </div>
      </footer>
    </div>
  )
}`

  return code
}
