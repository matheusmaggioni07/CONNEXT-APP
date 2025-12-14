"use client"

import { FALLBACK_THEMES } from "./constants"

function detectTheme(prompt: string) {
  const lower = prompt.toLowerCase()

  if (
    lower.includes("tech") ||
    lower.includes("software") ||
    lower.includes("app") ||
    lower.includes("digital") ||
    lower.includes("startup")
  ) {
    return FALLBACK_THEMES.tecnologia
  }
  if (
    lower.includes("saude") ||
    lower.includes("medic") ||
    lower.includes("clinic") ||
    lower.includes("hospital") ||
    lower.includes("bem-estar")
  ) {
    return FALLBACK_THEMES.saude
  }
  if (lower.includes("financ") || lower.includes("banco") || lower.includes("invest") || lower.includes("contabil")) {
    return FALLBACK_THEMES.financas
  }
  if (
    lower.includes("escola") ||
    lower.includes("curso") ||
    lower.includes("educa") ||
    lower.includes("aprend") ||
    lower.includes("ensino")
  ) {
    return FALLBACK_THEMES.educacao
  }
  if (
    lower.includes("restaurante") ||
    lower.includes("comida") ||
    lower.includes("food") ||
    lower.includes("delivery") ||
    lower.includes("gastronomia")
  ) {
    return FALLBACK_THEMES.alimentacao
  }
  if (
    lower.includes("moda") ||
    lower.includes("roupa") ||
    lower.includes("fashion") ||
    lower.includes("loja") ||
    lower.includes("boutique")
  ) {
    return FALLBACK_THEMES.moda
  }
  if (
    lower.includes("imob") ||
    lower.includes("casa") ||
    lower.includes("apartamento") ||
    lower.includes("aluguel") ||
    lower.includes("construtor")
  ) {
    return FALLBACK_THEMES.imoveis
  }

  return FALLBACK_THEMES.padrao
}

function extractName(prompt: string): string {
  const patterns = [
    /(?:para|do|da|de)\s+(?:a\s+)?(?:empresa\s+)?["']?([A-Za-zÀ-ÿ\s]+?)["']?(?:\s|$|,|\.)/i,
    /(?:chamad[oa])\s+["']?([A-Za-zÀ-ÿ\s]+?)["']?(?:\s|$|,|\.)/i,
    /["']([A-Za-zÀ-ÿ\s]+?)["']/,
  ]

  for (const pattern of patterns) {
    const match = prompt.match(pattern)
    if (match && match[1] && match[1].trim().length > 2) {
      return match[1].trim().substring(0, 30)
    }
  }

  const words = prompt.split(/\s+/).filter((w) => w.length > 3 && /^[A-Za-zÀ-ÿ]/.test(w))
  if (words.length > 0) {
    return words.slice(0, 2).join(" ")
  }

  return "Meu Site"
}

export function generateFallbackCode(prompt: string): string {
  const theme = detectTheme(prompt)
  const siteName = extractName(prompt)
  const isDark = theme.bg.includes("slate") || theme.bg.includes("gray-9")

  return `export default function Site() {
  const [menuAberto, setMenuAberto] = useState(false)
  const [formData, setFormData] = useState({ nome: '', email: '', telefone: '', mensagem: '' })
  const [enviado, setEnviado] = useState(false)

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuAberto(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setEnviado(true)
    setTimeout(() => setEnviado(false), 3000)
  }

  return (
    <div className="min-h-screen ${isDark ? `bg-${theme.bg} text-${theme.text}` : "bg-white text-gray-900"}">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 ${isDark ? "bg-slate-900/95" : "bg-white/95"} backdrop-blur-md shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r ${theme.primary} bg-clip-text text-transparent">
            ${siteName}
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollTo('inicio')} className="hover:text-${theme.secondary} transition-colors">Início</button>
            <button onClick={() => scrollTo('servicos')} className="hover:text-${theme.secondary} transition-colors">Serviços</button>
            <button onClick={() => scrollTo('sobre')} className="hover:text-${theme.secondary} transition-colors">Sobre</button>
            <button onClick={() => scrollTo('contato')} className="hover:text-${theme.secondary} transition-colors">Contato</button>
            <button onClick={() => scrollTo('contato')} className="px-6 py-2 bg-gradient-to-r ${theme.primary} text-white rounded-full font-semibold hover:shadow-lg hover:scale-105 transition-all">
              Fale Conosco
            </button>
          </div>
          
          <button onClick={() => setMenuAberto(!menuAberto)} className="md:hidden p-2">
            {menuAberto ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
        
        {menuAberto && (
          <div className="md:hidden ${isDark ? "bg-slate-800" : "bg-gray-50"} border-t ${isDark ? "border-slate-700" : "border-gray-200"} py-4">
            <div className="container mx-auto px-4 flex flex-col gap-4">
              <button onClick={() => scrollTo('inicio')} className="text-left py-2 hover:text-${theme.secondary} transition-colors">Início</button>
              <button onClick={() => scrollTo('servicos')} className="text-left py-2 hover:text-${theme.secondary} transition-colors">Serviços</button>
              <button onClick={() => scrollTo('sobre')} className="text-left py-2 hover:text-${theme.secondary} transition-colors">Sobre</button>
              <button onClick={() => scrollTo('contato')} className="text-left py-2 hover:text-${theme.secondary} transition-colors">Contato</button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="inicio" className="pt-24 min-h-screen flex items-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br ${theme.primary} opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block px-4 py-2 ${isDark ? "bg-slate-800" : "bg-gray-100"} rounded-full text-sm font-medium mb-6">
              ✨ Bem-vindo ao futuro
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Transforme sua visão em{' '}
              <span className="bg-gradient-to-r ${theme.primary} bg-clip-text text-transparent">
                realidade
              </span>
            </h1>
            <p className="${isDark ? "text-gray-300" : "text-gray-600"} text-lg md:text-xl mb-8 max-w-2xl mx-auto">
              Soluções inovadoras e personalizadas para impulsionar seu negócio ao próximo nível. Descubra como podemos ajudar você a alcançar seus objetivos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => scrollTo('contato')} className="px-8 py-4 bg-gradient-to-r ${theme.primary} text-white rounded-full font-semibold text-lg hover:shadow-xl hover:scale-105 transition-all">
                Começar Agora
              </button>
              <button onClick={() => scrollTo('servicos')} className="px-8 py-4 border-2 border-${theme.secondary} text-${theme.secondary} rounded-full font-semibold text-lg hover:bg-${theme.secondary} hover:text-white transition-all">
                Saiba Mais
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section id="servicos" className="py-20 ${isDark ? "bg-slate-800/50" : "bg-gray-50"}">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Nossos Serviços</h2>
            <p className="${isDark ? "text-gray-400" : "text-gray-600"} max-w-2xl mx-auto">
              Oferecemos soluções completas para atender todas as suas necessidades
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { titulo: 'Consultoria Especializada', desc: 'Análise profunda do seu negócio com recomendações personalizadas', icon: '💡' },
              { titulo: 'Desenvolvimento', desc: 'Soluções tecnológicas sob medida para sua empresa', icon: '⚡' },
              { titulo: 'Suporte 24/7', desc: 'Equipe dedicada disponível a qualquer momento', icon: '🛡️' },
              { titulo: 'Estratégia Digital', desc: 'Planejamento completo para sua presença online', icon: '🎯' },
              { titulo: 'Otimização', desc: 'Melhoria contínua de processos e resultados', icon: '📈' },
              { titulo: 'Treinamento', desc: 'Capacitação da sua equipe com as melhores práticas', icon: '🎓' },
            ].map((servico, i) => (
              <div key={i} className="${isDark ? "bg-slate-800" : "bg-white"} p-8 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
                <div className="text-4xl mb-4">{servico.icon}</div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-${theme.secondary} transition-colors">{servico.titulo}</h3>
                <p className="${isDark ? "text-gray-400" : "text-gray-600"}">{servico.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sobre */}
      <section id="sobre" className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                Por que escolher a{' '}
                <span className="bg-gradient-to-r ${theme.primary} bg-clip-text text-transparent">${siteName}</span>?
              </h2>
              <p className="${isDark ? "text-gray-300" : "text-gray-600"} text-lg mb-8">
                Com anos de experiência no mercado, nos destacamos pela qualidade, inovação e compromisso com resultados. Nossa equipe de especialistas está pronta para transformar seus desafios em oportunidades.
              </p>
              <div className="space-y-4">
                {[
                  'Mais de 500 clientes satisfeitos',
                  'Equipe altamente qualificada',
                  'Suporte personalizado',
                  'Resultados comprovados'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r ${theme.primary} flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br ${theme.primary} p-1">
                <div className="${isDark ? "bg-slate-900" : "bg-white"} w-full h-full rounded-3xl flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="text-6xl font-bold bg-gradient-to-r ${theme.primary} bg-clip-text text-transparent mb-2">500+</div>
                    <div className="${isDark ? "text-gray-400" : "text-gray-600"}">Clientes Satisfeitos</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contato */}
      <section id="contato" className="py-20 ${isDark ? "bg-slate-800/50" : "bg-gray-50"}">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Entre em Contato</h2>
              <p className="${isDark ? "text-gray-400" : "text-gray-600"}">
                Estamos prontos para ajudar. Preencha o formulário abaixo.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="${isDark ? "bg-slate-800" : "bg-white"} p-8 rounded-2xl shadow-xl">
              {enviado && (
                <div className="mb-6 p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-${isDark ? "400" : "600"} text-center">
                  ✓ Mensagem enviada com sucesso! Entraremos em contato em breve.
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome *</label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg ${isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"} border focus:ring-2 focus:ring-${theme.secondary} focus:border-transparent outline-none transition-all"
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg ${isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"} border focus:ring-2 focus:ring-${theme.secondary} focus:border-transparent outline-none transition-all"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Telefone</label>
                <input
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg ${isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"} border focus:ring-2 focus:ring-${theme.secondary} focus:border-transparent outline-none transition-all"
                  placeholder="(00) 00000-0000"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Mensagem *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.mensagem}
                  onChange={(e) => setFormData({...formData, mensagem: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg ${isDark ? "bg-slate-700 border-slate-600" : "bg-gray-50 border-gray-200"} border focus:ring-2 focus:ring-${theme.secondary} focus:border-transparent outline-none transition-all resize-none"
                  placeholder="Como podemos ajudar?"
                />
              </div>
              
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r ${theme.primary} text-white rounded-lg font-semibold text-lg hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                Enviar Mensagem
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="${isDark ? "bg-slate-900 border-t border-slate-800" : "bg-gray-900 text-white"} py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="text-2xl font-bold bg-gradient-to-r ${theme.primary} bg-clip-text text-transparent mb-4">
                ${siteName}
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                Transformando ideias em realidade. Entre em contato conosco e descubra como podemos ajudar seu negócio a crescer.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 ${isDark ? "text-white" : ""}">Links Rápidos</h4>
              <div className="space-y-2">
                <button onClick={() => scrollTo('inicio')} className="block text-gray-400 hover:text-${theme.accent} transition-colors">Início</button>
                <button onClick={() => scrollTo('servicos')} className="block text-gray-400 hover:text-${theme.accent} transition-colors">Serviços</button>
                <button onClick={() => scrollTo('sobre')} className="block text-gray-400 hover:text-${theme.accent} transition-colors">Sobre</button>
                <button onClick={() => scrollTo('contato')} className="block text-gray-400 hover:text-${theme.accent} transition-colors">Contato</button>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 ${isDark ? "text-white" : ""}">Contato</h4>
              <div className="space-y-2 text-gray-400">
                <p>contato@${siteName.toLowerCase().replace(/\s+/g, "")}.com.br</p>
                <p>(11) 99999-9999</p>
                <p>São Paulo, SP</p>
              </div>
            </div>
          </div>
          
          <div className="border-t ${isDark ? "border-slate-800" : "border-gray-800"} pt-8 text-center text-gray-500">
            <p>© ${new Date().getFullYear()} ${siteName}. Todos os direitos reservados.</p>
            <p className="mt-2 text-sm">Feito com ❤️ pelo Connext Builder</p>
          </div>
        </div>
      </footer>
    </div>
  )
}`
}
