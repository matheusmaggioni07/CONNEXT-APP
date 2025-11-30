"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ConnextLogo } from "@/components/ui/connext-logo"
import { DemoModal } from "@/components/demo-modal"
import {
  ArrowRight,
  Video,
  Users,
  MessageCircle,
  Shield,
  Zap,
  Globe,
  Check,
  Star,
  Building2,
  Briefcase,
  TrendingUp,
  ChevronRight,
  Play,
  Menu,
  X,
  Instagram,
  Linkedin,
} from "lucide-react"
import Link from "next/link"

export function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [onlineCount1, setOnlineCount1] = useState(2500)
  const [onlineCount2, setOnlineCount2] = useState(847)

  useEffect(() => {
    const updateCount1 = () => {
      setOnlineCount1((prev) => {
        const change = Math.floor(Math.random() * 80) - 30 // -30 to +50
        const newValue = prev + change
        return Math.max(2200, Math.min(3100, newValue))
      })
    }

    const updateCount2 = () => {
      setOnlineCount2((prev) => {
        const change = Math.floor(Math.random() * 40) - 15 // -15 to +25
        const newValue = prev + change
        return Math.max(650, Math.min(1200, newValue))
      })
    }

    // Initial faster intervals
    const interval1 = setInterval(updateCount1, 1200) // Every 1.2 seconds
    const interval2 = setInterval(updateCount2, 800) // Every 0.8 seconds

    return () => {
      clearInterval(interval1)
      clearInterval(interval2)
    }
  }, [])

  const socialProofAvatars = [
    "/professional-man-smiling-headshot.png",
    "/testimonial-person-3.png",
    "/young-professional-man-tech-headshot.jpg",
    "/professional-woman-executive-headshot.png",
    "/professional-man-entrepreneur-headshot.jpg",
  ]

  const testimonials = [
    {
      name: "Ricardo Silva",
      role: "CEO @ TechStart",
      quote:
        "Encontrei meu co-founder pelo Connext. Em 2 semanas de uso, fiz mais conexões valiosas do que em 2 anos no LinkedIn.",
      avatar: "/brazilian-man-ceo-tech-professional-headshot-smili.jpg",
    },
    {
      name: "Mariana Costa",
      role: "Head of Sales @ SaaS Corp",
      quote: "A integração com WhatsApp é genial. Fechei 3 deals no primeiro mês usando a plataforma. ROI absurdo.",
      avatar: "/brazilian-woman-sales-professional-headshot-smilin.jpg",
    },
    {
      name: "Fernando Lima",
      role: "Investor @ Venture Capital",
      quote:
        "Como investidor, uso o Connext para descobrir startups promissoras. A qualidade dos profissionais é impressionante.",
      avatar: "/brazilian-man-investor-suit-professional-headshot.jpg",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <ConnextLogo size="md" />

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Recursos
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Como Funciona
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Planos
            </a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Depoimentos
            </a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </a>
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Entrar
              </Button>
            </Link>
            <Link href="/register">
              <Button className="gradient-bg text-white hover:opacity-90">Começar Grátis</Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button className="lg:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-background border-t border-border/50 px-6 py-4">
            <nav className="flex flex-col gap-4">
              <a href="#features" className="text-muted-foreground hover:text-foreground">
                Recursos
              </a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground">
                Como Funciona
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground">
                Planos
              </a>
              <a href="#testimonials" className="text-muted-foreground hover:text-foreground">
                Depoimentos
              </a>
              <a href="#faq" className="text-muted-foreground hover:text-foreground">
                FAQ
              </a>
              <div className="flex gap-3 pt-4 border-t border-border/50">
                <Link href="/login" className="flex-1">
                  <Button variant="outline" className="w-full bg-transparent">
                    Entrar
                  </Button>
                </Link>
                <Link href="/register" className="flex-1">
                  <Button className="w-full gradient-bg text-white">Começar</Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-28 lg:pt-36 pb-20 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="relative z-10">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6 border border-primary/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-sm text-primary font-medium">
                  +{onlineCount1.toLocaleString("pt-BR")} profissionais online agora
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] mb-6 text-balance">
                Networking profissional via <span className="gradient-text">vídeo em tempo real</span>
              </h1>

              <p className="text-lg lg:text-xl text-muted-foreground mb-8 leading-relaxed max-w-xl">
                Conecte-se instantaneamente com profissionais da sua área. Match por interesses, videochamadas 1v1 e
                integração direta com WhatsApp.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="gradient-bg text-white hover:opacity-90 px-8 h-12 text-base w-full sm:w-auto"
                  >
                    Criar Conta Grátis
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted h-12 text-base bg-transparent"
                  onClick={() => setDemoOpen(true)}
                >
                  <Play className="mr-2 w-5 h-5" />
                  Ver Demonstração
                </Button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex -space-x-3">
                  {socialProofAvatars.map((src, i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-muted overflow-hidden">
                      <img src={src || "/placeholder.svg"} alt="User" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-foreground font-semibold">4.9/5</span> de +15.000 usuários
                  </p>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative lg:pl-8">
              <div className="absolute inset-0 gradient-bg rounded-3xl blur-3xl opacity-20" />
              <div className="relative gradient-border rounded-3xl overflow-hidden bg-card/80 backdrop-blur-sm shadow-2xl">
                <div className="aspect-[4/3] relative">
                  <img
                    src="/professional-video-call-interface-dark-theme-futur.jpg"
                    alt="Connext App Interface"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

                  {/* Live indicator */}
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs font-medium">Ao vivo</span>
                  </div>

                  {/* Bottom overlay info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-muted overflow-hidden ring-2 ring-primary">
                          <img src="/professional-woman-tech.jpg" alt="User" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">Ana Rodrigues</p>
                          <p className="text-sm text-muted-foreground">CFO @ FinancePlus</p>
                        </div>
                      </div>
                      <Button size="sm" className="gradient-bg text-white">
                        Conectar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Cards */}
              <div className="absolute -bottom-4 -left-4 gradient-border rounded-xl bg-card/95 backdrop-blur-sm p-4 shadow-xl animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">Novo Match!</p>
                    <p className="text-xs text-muted-foreground">Interesses: IA, Startups</p>
                  </div>
                </div>
              </div>

              <div
                className="absolute -top-4 -right-4 gradient-border rounded-xl bg-card/95 backdrop-blur-sm p-3 shadow-xl animate-float"
                style={{ animationDelay: "1s" }}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-secondary" />
                  <span className="text-sm font-semibold">{onlineCount2.toLocaleString("pt-BR")} online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-12 px-6 border-y border-border/50 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-sm text-muted-foreground mb-8">
            Profissionais de empresas líderes confiam no Connext
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16 opacity-60">
            {["Google", "Microsoft", "Meta", "Amazon", "Nubank", "iFood"].map((company) => (
              <div key={company} className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                <span className="font-semibold text-lg">{company}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-primary mb-4 block">RECURSOS</span>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Tudo que você precisa para fazer <span className="gradient-text">networking</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ferramentas poderosas para conectar profissionais e criar oportunidades de negócio.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Video,
                title: "Videochamadas HD",
                description: "Conexões em vídeo de alta qualidade com apenas um clique. Sem downloads necessários.",
              },
              {
                icon: Users,
                title: "Match Inteligente",
                description: "Algoritmo avançado que conecta você com profissionais baseado em interesses e objetivos.",
              },
              {
                icon: MessageCircle,
                title: "WhatsApp Direto",
                description: "Após o match, continue a conversa no WhatsApp para fechar negócios rapidamente.",
              },
              {
                icon: Shield,
                title: "Email Verificado",
                description: "Apenas emails corporativos são aceitos, garantindo uma rede de profissionais reais.",
              },
              {
                icon: Globe,
                title: "Filtro Geográfico",
                description: "Encontre profissionais na sua cidade ou conecte-se globalmente.",
              },
              {
                icon: Zap,
                title: "Setup em 2 Minutos",
                description: "Perfil rápido de configurar. Comece a fazer networking em minutos.",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group relative rounded-2xl border border-border/50 bg-card/50 p-6 hover:bg-card hover:border-primary/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 lg:py-28 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-primary mb-4 block">COMO FUNCIONA</span>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Comece em <span className="gradient-text">3 passos</span>
            </h2>
            <p className="text-lg text-muted-foreground">Simples, rápido e eficiente.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                step: "01",
                title: "Crie seu perfil",
                description: "Cadastre-se com seu email profissional e configure seus interesses e objetivos.",
                icon: Briefcase,
              },
              {
                step: "02",
                title: "Encontre matches",
                description: "Navegue por profissionais compatíveis e inicie videochamadas instantâneas.",
                icon: Users,
              },
              {
                step: "03",
                title: "Conecte e negocie",
                description: "Após match mútuo, continue no WhatsApp e transforme conexões em negócios.",
                icon: TrendingUp,
              },
            ].map((item, index) => (
              <div key={index} className="relative text-center">
                {/* Connector line */}
                {index < 2 && (
                  <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary/50 to-secondary/50" />
                )}

                <div className="relative z-10 w-16 h-16 rounded-2xl gradient-bg mx-auto mb-6 flex items-center justify-center">
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <span className="text-6xl font-bold text-muted/20 absolute -top-4 left-1/2 -translate-x-1/2">
                  {item.step}
                </span>
                <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 lg:py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-primary mb-4 block">PLANOS</span>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Escolha o plano <span className="gradient-text">ideal</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Comece gratuitamente e faça upgrade quando precisar de mais recursos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="relative rounded-2xl border border-border bg-card p-8">
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">Free</h3>
                <p className="text-muted-foreground text-sm">Perfeito para começar a fazer networking</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">R$ 0</span>
                <span className="text-muted-foreground">/mês</span>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  "5 videochamadas por dia",
                  "10 matches por dia",
                  "Perfil básico",
                  "Filtro por localização",
                  "Chat durante videochamada",
                  "Integração WhatsApp",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href="/register">
                <Button variant="outline" className="w-full h-12 bg-transparent">
                  Começar Grátis
                </Button>
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="relative rounded-2xl border-2 border-primary bg-card p-8 shadow-lg shadow-primary/10">
              {/* Popular badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 gradient-bg px-4 py-1 rounded-full">
                <span className="text-xs font-semibold text-white">MAIS POPULAR</span>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">Pro</h3>
                <p className="text-muted-foreground text-sm">Para profissionais que levam networking a sério</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">R$ 49</span>
                <span className="text-muted-foreground">/mês</span>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  "Videochamadas ilimitadas",
                  "Matches ilimitados",
                  "Perfil verificado com selo",
                  "Filtros avançados (cargo, empresa, setor)",
                  "Prioridade na fila de matching",
                  "Estatísticas de conexões",
                  "Modo invisível",
                  "Suporte prioritário 24/7",
                  "Sem anúncios",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href="/register">
                <Button className="w-full h-12 gradient-bg text-white hover:opacity-90">
                  Começar Teste Grátis de 7 Dias
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 lg:py-28 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-primary mb-4 block">DEPOIMENTOS</span>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              O que nossos usuários <span className="gradient-text">dizem</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="rounded-2xl border border-border/50 bg-card p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-foreground mb-6 leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                    <img
                      src={testimonial.avatar || "/placeholder.svg"}
                      alt={testimonial.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { value: "50K+", label: "Profissionais cadastrados" },
              { value: "150K+", label: "Conexões realizadas" },
              { value: "98%", label: "Taxa de satisfação" },
              { value: "45+", label: "Países" },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-3xl lg:text-4xl font-bold gradient-text mb-2">{stat.value}</div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 lg:py-28 px-6 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-primary mb-4 block">FAQ</span>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Perguntas <span className="gradient-text">frequentes</span>
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Por que preciso de um email profissional?",
                a: "Exigimos email corporativo para garantir que todos os usuários são profissionais verificados. Isso mantém a qualidade da rede e evita perfis falsos.",
              },
              {
                q: "O plano Free é realmente gratuito?",
                a: "Sim! O plano Free é 100% gratuito e não pedimos cartão de crédito. Você pode fazer networking sem pagar nada.",
              },
              {
                q: "Como funciona a integração com WhatsApp?",
                a: "Quando você e outro profissional dão match, um botão aparece para iniciar conversa no WhatsApp usando o número cadastrado na plataforma.",
              },
              {
                q: "Posso cancelar o plano Pro a qualquer momento?",
                a: "Sim, você pode cancelar quando quiser. Não há multas ou taxas de cancelamento. Seu acesso Pro continua até o fim do período pago.",
              },
              {
                q: "A videochamada é segura?",
                a: "Absolutamente. Usamos criptografia de ponta a ponta em todas as videochamadas. Suas conversas são privadas e seguras.",
              },
            ].map((faq, i) => (
              <details key={i} className="group rounded-xl border border-border/50 bg-card">
                <summary className="flex items-center justify-between cursor-pointer p-6">
                  <span className="font-medium">{faq.q}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-6 pb-6 text-muted-foreground">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 gradient-bg opacity-90" />
            <div className="relative z-10 p-12 lg:p-16 text-center">
              <h2 className="text-3xl lg:text-5xl font-bold mb-4 text-white">
                Pronto para transformar seu networking?
              </h2>
              <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
                Junte-se a milhares de profissionais que já estão expandindo suas redes e fechando negócios.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <Button size="lg" className="bg-white text-foreground hover:bg-white/90 px-8 h-12">
                    Criar Conta Grátis
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <ConnextLogo size="lg" className="mb-4" />
              <p className="text-muted-foreground max-w-xs mb-4">
                A plataforma de networking profissional via vídeo. Conecte-se, faça match e feche negócios.
              </p>
              <div className="flex gap-4">
                <a
                  href="https://www.instagram.com/matheusmaggioni_/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <span className="sr-only">Instagram</span>
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href="https://www.linkedin.com/in/matheus-maggioni-2592b5333"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <span className="sr-only">LinkedIn</span>
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#features" className="hover:text-foreground transition-colors">
                    Recursos
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-foreground transition-colors">
                    Preços
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Segurança
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Empresas
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#faq" className="hover:text-foreground transition-colors">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Central de Ajuda
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Contato
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Status
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 Connext App. Todos os direitos reservados. Desenvolvido por{" "}
              <span className="text-foreground font-medium">Matheus Maggioni</span>
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/termos" className="hover:text-foreground transition-colors">
                Termos de Uso
              </Link>
              <Link href="/privacidade" className="hover:text-foreground transition-colors">
                Privacidade
              </Link>
              <Link href="/cookies" className="hover:text-foreground transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Demo Modal */}
      <DemoModal open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  )
}
