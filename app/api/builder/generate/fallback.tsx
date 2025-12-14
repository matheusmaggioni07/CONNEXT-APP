"use client"

export function generateFallbackCode(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase()

  // Detect theme from prompt
  let primaryColor = "#8B5CF6" // purple
  let secondaryColor = "#EC4899" // pink
  let siteName = "Meu Site"
  let heroTitle = "Transforme suas ideias em realidade"
  let heroSubtitle = "Soluções inovadoras para o seu negócio"

  if (lowerPrompt.includes("tech") || lowerPrompt.includes("tecnologia") || lowerPrompt.includes("software")) {
    primaryColor = "#3B82F6"
    secondaryColor = "#06B6D4"
    siteName = "TechSolutions"
    heroTitle = "Tecnologia que transforma negócios"
    heroSubtitle = "Desenvolvimento de software sob medida para sua empresa"
  } else if (lowerPrompt.includes("saúde") || lowerPrompt.includes("health") || lowerPrompt.includes("médic")) {
    primaryColor = "#10B981"
    secondaryColor = "#34D399"
    siteName = "VidaSaúde"
    heroTitle = "Cuidando da sua saúde"
    heroSubtitle = "Profissionais dedicados ao seu bem-estar"
  } else if (lowerPrompt.includes("restaurante") || lowerPrompt.includes("comida") || lowerPrompt.includes("food")) {
    primaryColor = "#F59E0B"
    secondaryColor = "#EF4444"
    siteName = "Sabor & Arte"
    heroTitle = "Uma experiência gastronômica única"
    heroSubtitle = "Os melhores pratos preparados com amor"
  } else if (lowerPrompt.includes("fitness") || lowerPrompt.includes("academia") || lowerPrompt.includes("gym")) {
    primaryColor = "#EF4444"
    secondaryColor = "#F97316"
    siteName = "PowerFit"
    heroTitle = "Transforme seu corpo"
    heroSubtitle = "Treinamentos personalizados para você"
  } else if (lowerPrompt.includes("imobiliária") || lowerPrompt.includes("imóveis") || lowerPrompt.includes("casa")) {
    primaryColor = "#0EA5E9"
    secondaryColor = "#6366F1"
    siteName = "ImóveisTop"
    heroTitle = "Encontre o lar dos seus sonhos"
    heroSubtitle = "As melhores opções de imóveis da região"
  } else if (lowerPrompt.includes("marvel") || lowerPrompt.includes("super") || lowerPrompt.includes("hero")) {
    primaryColor = "#DC2626"
    secondaryColor = "#1D4ED8"
    siteName = "Marvel Universe"
    heroTitle = "Bem-vindo ao Universo Marvel"
    heroSubtitle = "Onde heróis se tornam lendas"
  }

  // Extract site name from prompt if present
  const nameMatch = prompt.match(/(?:site|página|landing page)\s+(?:da|do|de|para)?\s*(.+?)(?:\s+com|\s+e|\s*$)/i)
  if (nameMatch) {
    siteName = nameMatch[1].trim().substring(0, 30)
  }

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
    <div style={{ minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0a0a0a', color: '#fff' }}>
      {/* Navbar */}
      <nav style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        padding: '16px 24px', 
        background: 'rgba(10,10,10,0.9)', 
        backdropFilter: 'blur(10px)',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        zIndex: 1000,
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', background: 'linear-gradient(135deg, ${primaryColor}, ${secondaryColor})', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ${siteName}
        </div>
        
        {/* Desktop Menu */}
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <a onClick={() => scrollToSection('hero')} style={{ color: '#fff', cursor: 'pointer', textDecoration: 'none', opacity: 0.8 }}>Início</a>
          <a onClick={() => scrollToSection('sobre')} style={{ color: '#fff', cursor: 'pointer', textDecoration: 'none', opacity: 0.8 }}>Sobre</a>
          <a onClick={() => scrollToSection('servicos')} style={{ color: '#fff', cursor: 'pointer', textDecoration: 'none', opacity: 0.8 }}>Serviços</a>
          <a onClick={() => scrollToSection('contato')} style={{ color: '#fff', cursor: 'pointer', textDecoration: 'none', opacity: 0.8 }}>Contato</a>
          <button style={{ 
            padding: '10px 24px', 
            background: 'linear-gradient(135deg, ${primaryColor}, ${secondaryColor})', 
            border: 'none', 
            borderRadius: '8px', 
            color: '#fff', 
            fontWeight: '600',
            cursor: 'pointer'
          }}>
            Começar
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section id="hero" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        textAlign: 'center',
        padding: '120px 24px 80px',
        background: 'radial-gradient(ellipse at top, ${primaryColor}20 0%, transparent 50%)'
      }}>
        <div style={{ maxWidth: '900px' }}>
          <div style={{ 
            display: 'inline-block',
            padding: '8px 16px', 
            background: '${primaryColor}20', 
            borderRadius: '50px',
            marginBottom: '24px',
            fontSize: '14px',
            color: '${primaryColor}'
          }}>
            ✨ Bem-vindo ao ${siteName}
          </div>
          <h1 style={{ 
            fontSize: 'clamp(36px, 6vw, 72px)', 
            fontWeight: '800', 
            lineHeight: 1.1,
            marginBottom: '24px',
            background: 'linear-gradient(135deg, #fff 0%, #999 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            ${heroTitle}
          </h1>
          <p style={{ 
            fontSize: '20px', 
            opacity: 0.7, 
            marginBottom: '40px',
            maxWidth: '600px',
            margin: '0 auto 40px'
          }}>
            ${heroSubtitle}
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => scrollToSection('contato')} style={{ 
              padding: '16px 32px', 
              background: 'linear-gradient(135deg, ${primaryColor}, ${secondaryColor})', 
              border: 'none', 
              borderRadius: '12px', 
              color: '#fff', 
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 20px ${primaryColor}40'
            }}>
              Fale Conosco
            </button>
            <button onClick={() => scrollToSection('sobre')} style={{ 
              padding: '16px 32px', 
              background: 'rgba(255,255,255,0.1)', 
              border: '1px solid rgba(255,255,255,0.2)', 
              borderRadius: '12px', 
              color: '#fff', 
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}>
              Saiba Mais
            </button>
          </div>
        </div>
      </section>

      {/* Sobre */}
      <section id="sobre" style={{ 
        padding: '100px 24px',
        background: '#111'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '42px', fontWeight: '700', marginBottom: '16px' }}>
              Sobre Nós
            </h2>
            <p style={{ fontSize: '18px', opacity: 0.7, maxWidth: '600px', margin: '0 auto' }}>
              Conheça nossa história e o que nos motiva a entregar o melhor
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '28px', marginBottom: '20px', color: '${primaryColor}' }}>Nossa Missão</h3>
              <p style={{ opacity: 0.8, lineHeight: 1.8, marginBottom: '20px' }}>
                Trabalhamos incansavelmente para oferecer as melhores soluções do mercado, 
                sempre focados em qualidade, inovação e satisfação do cliente.
              </p>
              <p style={{ opacity: 0.8, lineHeight: 1.8 }}>
                Com anos de experiência, nossa equipe está preparada para atender 
                suas necessidades e superar suas expectativas.
              </p>
            </div>
            <div style={{ 
              background: 'linear-gradient(135deg, ${primaryColor}30, ${secondaryColor}30)', 
              borderRadius: '20px', 
              padding: '40px',
              border: '1px solid ${primaryColor}40'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '42px', fontWeight: '700', color: '${primaryColor}' }}>500+</div>
                  <div style={{ opacity: 0.7 }}>Clientes</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '42px', fontWeight: '700', color: '${secondaryColor}' }}>10+</div>
                  <div style={{ opacity: 0.7 }}>Anos</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '42px', fontWeight: '700', color: '${primaryColor}' }}>98%</div>
                  <div style={{ opacity: 0.7 }}>Satisfação</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '42px', fontWeight: '700', color: '${secondaryColor}' }}>24/7</div>
                  <div style={{ opacity: 0.7 }}>Suporte</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section id="servicos" style={{ 
        padding: '100px 24px',
        background: '#0a0a0a'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '42px', fontWeight: '700', marginBottom: '16px' }}>
              Nossos Serviços
            </h2>
            <p style={{ fontSize: '18px', opacity: 0.7, maxWidth: '600px', margin: '0 auto' }}>
              Soluções completas para todas as suas necessidades
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {['Consultoria Especializada', 'Desenvolvimento Personalizado', 'Suporte Premium'].map((service, index) => (
              <div key={index} style={{ 
                background: '#111', 
                borderRadius: '16px', 
                padding: '32px',
                border: '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.3s'
              }}>
                <div style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, ${primaryColor}, ${secondaryColor})',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  fontSize: '24px'
                }}>
                  {['⚡', '🚀', '💎'][index]}
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>{service}</h3>
                <p style={{ opacity: 0.7, lineHeight: 1.7 }}>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contato */}
      <section id="contato" style={{ 
        padding: '100px 24px',
        background: '#111'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '42px', fontWeight: '700', marginBottom: '16px' }}>
              Entre em Contato
            </h2>
            <p style={{ fontSize: '18px', opacity: 0.7 }}>
              Preencha o formulário e entraremos em contato
            </p>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <input
              type="text"
              placeholder="Seu nome"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              style={{ 
                padding: '16px 20px', 
                background: '#1a1a1a', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px',
                color: '#fff',
                fontSize: '16px'
              }}
            />
            <input
              type="email"
              placeholder="Seu email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              style={{ 
                padding: '16px 20px', 
                background: '#1a1a1a', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px',
                color: '#fff',
                fontSize: '16px'
              }}
            />
            <textarea
              placeholder="Sua mensagem"
              rows={5}
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
              required
              style={{ 
                padding: '16px 20px', 
                background: '#1a1a1a', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px',
                color: '#fff',
                fontSize: '16px',
                resize: 'vertical'
              }}
            />
            <button type="submit" style={{ 
              padding: '16px 32px', 
              background: 'linear-gradient(135deg, ${primaryColor}, ${secondaryColor})', 
              border: 'none', 
              borderRadius: '12px', 
              color: '#fff', 
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}>
              Enviar Mensagem
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ 
        padding: '60px 24px 30px',
        background: '#0a0a0a',
        borderTop: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', background: 'linear-gradient(135deg, ${primaryColor}, ${secondaryColor})', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '20px' }}>
            ${siteName}
          </div>
          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginBottom: '30px', flexWrap: 'wrap' }}>
            <a onClick={() => scrollToSection('hero')} style={{ color: '#fff', opacity: 0.7, cursor: 'pointer', textDecoration: 'none' }}>Início</a>
            <a onClick={() => scrollToSection('sobre')} style={{ color: '#fff', opacity: 0.7, cursor: 'pointer', textDecoration: 'none' }}>Sobre</a>
            <a onClick={() => scrollToSection('servicos')} style={{ color: '#fff', opacity: 0.7, cursor: 'pointer', textDecoration: 'none' }}>Serviços</a>
            <a onClick={() => scrollToSection('contato')} style={{ color: '#fff', opacity: 0.7, cursor: 'pointer', textDecoration: 'none' }}>Contato</a>
          </div>
          <p style={{ opacity: 0.5, fontSize: '14px' }}>
            © 2025 ${siteName}. Todos os direitos reservados.
          </p>
          <p style={{ opacity: 0.3, fontSize: '12px', marginTop: '10px' }}>
            Criado com Connext Builder
          </p>
        </div>
      </footer>
    </div>
  )
}`
}
