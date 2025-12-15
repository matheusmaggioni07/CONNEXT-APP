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

  // Extract team names
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

  // Extract common words
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
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center font-bold text-xl">
                ${siteName.charAt(0)}
              </div>
              <span className="text-xl font-bold">${siteName}</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('hero')} className="text-sm font-medium hover:text-gray-300 transition-colors">Início</button>
              <button onClick={() => scrollToSection('sobre')} className="text-sm font-medium hover:text-gray-300 transition-colors">Sobre</button>
              <button onClick={() => scrollToSection('features')} className="text-sm font-medium hover:text-gray-300 transition-colors">${isSports ? "Time" : "Serviços"}</button>
              <button onClick={() => scrollToSection('contato')} className="text-sm font-medium hover:text-gray-300 transition-colors">Contato</button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMenuOpen(!menuOpen)} 
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
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
          <div className="md:hidden bg-black/95 border-t border-white/10">
            <div className="px-4 py-4 space-y-3">
              <button onClick={() => scrollToSection('hero')} className="block w-full text-left px-4 py-2 rounded-lg hover:bg-white/10 transition-colors">Início</button>
              <button onClick={() => scrollToSection('sobre')} className="block w-full text-left px-4 py-2 rounded-lg hover:bg-white/10 transition-colors">Sobre</button>
              <button onClick={() => scrollToSection('features')} className="block w-full text-left px-4 py-2 rounded-lg hover:bg-white/10 transition-colors">${isSports ? "Time" : "Serviços"}</button>
              <button onClick={() => scrollToSection('contato')} className="block w-full text-left px-4 py-2 rounded-lg hover:bg-white/10 transition-colors">Contato</button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="hero" className="pt-16 min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920')] bg-cover bg-center opacity-20"></div>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-sm">Bem-vindo ao ${siteName}</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            ${isSports ? `A Paixão do <span class="text-transparent bg-clip-text bg-gradient-to-r ${colors.gradient.replace("from-", "from-").replace("to-", "via-white to-")}">${siteName}</span>` : `Bem-vindo ao <span class="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">${siteName}</span>`}
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto">
            ${isSports ? `O maior time do Brasil. Juntos somos mais fortes!` : `Descubra o melhor que temos para oferecer. Qualidade e excelência em cada detalhe.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => scrollToSection('sobre')}
              className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-all transform hover:scale-105 shadow-xl"
            >
              Saiba Mais
            </button>
            <button 
              onClick={() => scrollToSection('contato')}
              className="px-8 py-4 bg-transparent border-2 border-white font-semibold rounded-full hover:bg-white hover:text-black transition-all transform hover:scale-105"
            >
              Entre em Contato
            </button>
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Sobre Section */}
      <section id="sobre" className="py-24 bg-black/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold tracking-wider uppercase text-gray-400">Conheça</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-2">Sobre Nós</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <p className="text-lg text-gray-300 leading-relaxed">
                ${isSports ? `O ${siteName} é mais que um time, é uma paixão que une milhões de torcedores. Nossa história é marcada por conquistas, superação e a força da nossa torcida.` : `Somos uma empresa dedicada à excelência e à satisfação dos nossos clientes. Com anos de experiência, oferecemos soluções inovadoras e de alta qualidade.`}
              </p>
              <p className="text-lg text-gray-300 leading-relaxed">
                ${isSports ? `Cada jogo é uma oportunidade de mostrar nossa grandeza. Juntos, formamos uma família que vibra a cada gol e celebra cada vitória.` : `Nossa missão é superar suas expectativas, oferecendo produtos e serviços que fazem a diferença no seu dia a dia.`}
              </p>
              <div className="grid grid-cols-3 gap-4 pt-6">
                <div className="text-center p-4 rounded-xl bg-white/5 backdrop-blur-sm">
                  <div className="text-3xl font-bold">${isSports ? "100+" : "10+"}</div>
                  <div className="text-sm text-gray-400">${isSports ? "Anos de História" : "Anos de Mercado"}</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-white/5 backdrop-blur-sm">
                  <div className="text-3xl font-bold">${isSports ? "40M+" : "5K+"}</div>
                  <div className="text-sm text-gray-400">${isSports ? "Torcedores" : "Clientes"}</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-white/5 backdrop-blur-sm">
                  <div className="text-3xl font-bold">${isSports ? "30+" : "100+"}</div>
                  <div className="text-sm text-gray-400">${isSports ? "Títulos" : "Projetos"}</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br ${colors.gradient} p-1">
                <div className="w-full h-full rounded-xl bg-black/50 flex items-center justify-center">
                  <div className="text-8xl font-bold opacity-50">${siteName.charAt(0)}</div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-xl bg-white/10 backdrop-blur-sm"></div>
              <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-gradient-to-br ${colors.gradient} opacity-50"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold tracking-wider uppercase text-gray-400">${isSports ? "Nosso Time" : "O Que Oferecemos"}</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-2">${isSports ? "Destaques" : "Nossos Serviços"}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">${isSports ? "Garra e Determinação" : "Agilidade"}</h3>
              <p className="text-gray-400">${isSports ? "Nosso time luta até o último minuto, com a força que só a torcida pode dar." : "Entregamos resultados rápidos sem comprometer a qualidade."}</p>
            </div>
            <div className="group p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">${isSports ? "Tradição e Conquistas" : "Qualidade"}</h3>
              <p className="text-gray-400">${isSports ? "Uma história repleta de títulos e momentos inesquecíveis." : "Comprometimento com excelência em tudo que fazemos."}</p>
            </div>
            <div className="group p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">${isSports ? "Torcida Apaixonada" : "Suporte Dedicado"}</h3>
              <p className="text-gray-400">${isSports ? "Milhões de corações que batem juntos em cada partida." : "Equipe sempre disponível para atender você."}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA / Contact Section */}
      <section id="contato" className="py-24 bg-black/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-sm font-semibold tracking-wider uppercase text-gray-400">Fale Conosco</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-2">Entre em Contato</h2>
            <p className="text-gray-400 mt-4 max-w-xl mx-auto">
              ${isSports ? "Quer fazer parte dessa história? Entre em contato conosco!" : "Estamos prontos para ajudar você. Envie sua mensagem!"}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6 bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-white/40 transition-colors"
                  placeholder="Seu nome"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-white/40 transition-colors"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Mensagem</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                rows={5}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:border-white/40 transition-colors resize-none"
                placeholder="Sua mensagem..."
                required
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r ${colors.gradient} font-semibold rounded-xl hover:opacity-90 transition-opacity transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Enviar Mensagem
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-black border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center font-bold text-xl">
                  ${siteName.charAt(0)}
                </div>
                <span className="text-xl font-bold">${siteName}</span>
              </div>
              <p className="text-gray-400 max-w-md">
                ${isSports ? `A paixão que nos une. O ${siteName} é mais que um clube, é um sentimento!` : `Comprometidos com a excelência e satisfação dos nossos clientes.`}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Links Rápidos</h4>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => scrollToSection('hero')} className="hover:text-white transition-colors">Início</button></li>
                <li><button onClick={() => scrollToSection('sobre')} className="hover:text-white transition-colors">Sobre</button></li>
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">${isSports ? "Time" : "Serviços"}</button></li>
                <li><button onClick={() => scrollToSection('contato')} className="hover:text-white transition-colors">Contato</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Redes Sociais</h4>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg>
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-gray-500">
            <p>&copy; ${new Date().getFullYear()} ${siteName}. Todos os direitos reservados.</p>
            <p className="mt-2 text-sm">Criado com Connext Builder</p>
          </div>
        </div>
      </footer>
    </div>
  )
}`
}
