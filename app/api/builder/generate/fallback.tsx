"use client"

export function generateFallbackCode(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase()

  let theme = {
    primary: "from-purple-600 to-pink-600",
    bg: "from-gray-900 via-purple-900/20 to-gray-900",
    accent: "purple",
    title: prompt.substring(0, 50),
  }

  if (lowerPrompt.includes("brasil") || lowerPrompt.includes("brazil")) {
    theme = {
      primary: "from-green-500 to-yellow-500",
      bg: "from-green-900 via-blue-900 to-green-900",
      accent: "yellow",
      title: "Brasil",
    }
  } else if (lowerPrompt.includes("grêmio") || lowerPrompt.includes("gremio")) {
    theme = {
      primary: "from-blue-600 to-blue-800",
      bg: "from-blue-900 via-black to-blue-900",
      accent: "blue",
      title: "Grêmio FBPA",
    }
  } else if (lowerPrompt.includes("inter") || lowerPrompt.includes("colorado")) {
    theme = {
      primary: "from-red-600 to-red-800",
      bg: "from-red-900 via-black to-red-900",
      accent: "red",
      title: "Sport Club Internacional",
    }
  }

  return `export default function Site() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [formData, setFormData] = React.useState({ nome: '', email: '', mensagem: '' })

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    alert('Mensagem enviada com sucesso! Entraremos em contato em breve.')
    setFormData({ nome: '', email: '', mensagem: '' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br ${theme.bg} text-white scroll-smooth">
      <nav className="fixed w-full z-50 bg-black/50 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <span className="text-2xl font-bold bg-gradient-to-r ${theme.primary} bg-clip-text text-transparent">${theme.title}</span>
          <div className="hidden md:flex gap-8">
            <a href="#inicio" className="hover:text-${theme.accent}-400 transition">Início</a>
            <a href="#sobre" className="hover:text-${theme.accent}-400 transition">Sobre</a>
            <a href="#servicos" className="hover:text-${theme.accent}-400 transition">Serviços</a>
            <a href="#contato" className="hover:text-${theme.accent}-400 transition">Contato</a>
          </div>
          <button onClick={() => scrollToSection('contato')} className="bg-gradient-to-r ${theme.primary} px-6 py-2 rounded-full font-semibold hover:scale-105 transition">
            Fale Conosco
          </button>
        </div>
      </nav>

      <section id="inicio" className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center px-6">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r ${theme.primary} bg-clip-text text-transparent">${theme.title}</h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">Bem-vindo ao nosso site. Descubra tudo sobre nós e nossos serviços.</p>
          <button onClick={() => scrollToSection('sobre')} className="bg-gradient-to-r ${theme.primary} px-8 py-4 rounded-full font-semibold hover:scale-105 transition">
            Saiba Mais
          </button>
        </div>
      </section>

      <section id="sobre" className="py-20 px-6">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Sobre Nós</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {['Missão', 'Visão', 'Valores'].map((item, i) => (
              <div key={i} className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-${theme.accent}-500/50 transition-all duration-300">
                <h3 className="text-2xl font-bold mb-4 text-${theme.accent}-400">{item}</h3>
                <p className="text-gray-300">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="servicos" className="py-20 px-6 bg-black/30">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Nossos Serviços</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {['Consultoria', 'Desenvolvimento', 'Design', 'Suporte'].map((servico, i) => (
              <div key={i} className="p-6 rounded-xl bg-gradient-to-br from-white/10 to-white/5 hover:scale-105 transition-all duration-300 cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r ${theme.primary} flex items-center justify-center mb-4">
                  <span className="text-xl font-bold">{i + 1}</span>
                </div>
                <h3 className="text-xl font-bold mb-2">{servico}</h3>
                <p className="text-gray-400 text-sm">Serviço profissional de alta qualidade.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contato" className="py-20 px-6">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-4xl font-bold text-center mb-12">Entre em Contato</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              type="text"
              placeholder="Seu Nome"
              required
              value={formData.nome}
              onChange={(e) => setFormData({...formData, nome: e.target.value})}
              className="w-full px-6 py-4 rounded-xl bg-white/10 border border-white/20 focus:border-${theme.accent}-500 outline-none transition"
            />
            <input
              type="email"
              placeholder="Seu Email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-6 py-4 rounded-xl bg-white/10 border border-white/20 focus:border-${theme.accent}-500 outline-none transition"
            />
            <textarea
              placeholder="Sua Mensagem"
              required
              rows={5}
              value={formData.mensagem}
              onChange={(e) => setFormData({...formData, mensagem: e.target.value})}
              className="w-full px-6 py-4 rounded-xl bg-white/10 border border-white/20 focus:border-${theme.accent}-500 outline-none transition resize-none"
            />
            <button type="submit" className="w-full bg-gradient-to-r ${theme.primary} py-4 rounded-xl font-semibold hover:scale-[1.02] transition">
              Enviar Mensagem
            </button>
          </form>
        </div>
      </section>

      <footer className="py-8 border-t border-white/10 text-center text-gray-400">
        <p>© 2025 ${theme.title}. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}`
}
