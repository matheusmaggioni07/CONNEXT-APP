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
  Phone,
  Code2,
  Sparkles,
  Rocket,
  Layers,
  Wand2,
  Eye,
} from "lucide-react"
import Link from "next/link"

export function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false)
  const [builderDemoOpen, setBuilderDemoOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [onlineCount1, setOnlineCount1] = useState(2500)
  const [onlineCount2, setOnlineCount2] = useState(847)
  const [matchCount, setMatchCount] = useState(0)
  const [showNewMatch, setShowNewMatch] = useState(true)

  const [builderTyping, setBuilderTyping] = useState("")
  const [builderStep, setBuilderStep] = useState(0)
  const builderPrompt = "Crie uma landing page para minha startup de IA"

  useEffect(() => {
    const updateCount1 = () => {
      setOnlineCount1((prev) => {
        const change = Math.floor(Math.random() * 80) - 30
        const newValue = prev + change
        return Math.max(2200, Math.min(3100, newValue))
      })
    }

    const updateCount2 = () => {
      setOnlineCount2((prev) => {
        const change = Math.floor(Math.random() * 40) - 15
        const newValue = prev + change
        return Math.max(650, Math.min(1200, newValue))
      })
    }

    const matchInterval = setInterval(() => {
      setShowNewMatch(false)
      setTimeout(() => {
        setMatchCount((prev) => prev + 1)
        setShowNewMatch(true)
      }, 200)
    }, 3000)

    const interval1 = setInterval(updateCount1, 1200)
    const interval2 = setInterval(updateCount2, 800)

    return () => {
      clearInterval(interval1)
      clearInterval(interval2)
      clearInterval(matchInterval)
    }
  }, [])

  useEffect(() => {
    let index = 0
    const typeInterval = setInterval(() => {
      if (index <= builderPrompt.length) {
        setBuilderTyping(builderPrompt.slice(0, index))
        index++
      } else {
        clearInterval(typeInterval)
        setTimeout(() => setBuilderStep(1), 500)
        setTimeout(() => setBuilderStep(2), 1500)
        setTimeout(() => setBuilderStep(3), 2500)
        setTimeout(() => {
          setBuilderStep(0)
          setBuilderTyping("")
          index = 0
        }, 5000)
      }
    }, 80)

    return () => clearInterval(typeInterval)
  }, [builderStep])

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
    {
      name: "Juliana Santos",
      role: "Founder @ StartupHub",
      quote:
        "Usei o Connext Builder para criar a landing page da minha startup em 30 segundos. Impressionante a qualidade! Já publiquei e está convertendo.",
      avatar: "/brazilian-woman-founder-professional-headshot.jpg",
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
            <a href="#builder" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Builder
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
              <a href="#builder" className="text-muted-foreground hover:text-foreground">
                Builder
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
                  +{onlineCount1.toLocaleString("pt-BR")} empreendedores online agora
                </span>
              </div>

              <div className="inline-flex items-center gap-2 bg-primary/15 px-4 py-2 rounded-full mb-6 border border-primary/30">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium bg-gradient-to-r from-primary via-pink-400 to-orange-400 bg-clip-text text-transparent">
                  Primeira plataforma de networking profissional via vídeo
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] mb-6 text-balance">
                Networking profissional via <span className="gradient-text">vídeo em tempo real</span>
              </h1>

              <p className="text-lg lg:text-xl text-muted-foreground mb-4 leading-relaxed max-w-xl">
                Conecte-se instantaneamente com empreendedores da sua área. Match por interesses, filtros de
                localização, videochamadas, integração com WhatsApp e criação de sites com IA.
              </p>

              <p className="text-base text-primary/80 mb-8 leading-relaxed max-w-xl flex items-center gap-2">
                <Code2 className="w-5 h-5" />
                <span>Novo: Crie sites profissionais com o Connext Builder</span>
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

            {/* Right Column - Hero Visual */}
            <div className="relative lg:pl-8">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-transparent to-purple-500/20 rounded-3xl blur-3xl" />
              <div className="relative">
                {/* Main Card - Video Call Interface */}
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-[#0d0d14]">
                  {/* Live indicator */}
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
                    <div className="relative">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping" />
                    </div>
                    <span className="text-white text-sm font-medium">Ao vivo</span>
                  </div>

                  {/* Top bar */}
                  <div className="bg-[#1a1a2e] px-4 py-3 flex items-center justify-between border-b border-white/5">
                    <span className="text-gray-400 text-sm">Video Call</span>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                        A
                      </div>
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                        M
                      </div>
                    </div>
                  </div>

                  {/* Video Grid - 3x3 */}
                  <div className="p-6 bg-[#0d0d14]">
                    <div className="grid grid-cols-3 gap-3">
                      {[...Array(9)].map((_, i) => (
                        <div
                          key={i}
                          className={`aspect-square rounded-xl ${i === 4 ? "bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-500/50 flex items-center justify-center" : "bg-[#1a1a2e]/80"}`}
                        >
                          {i === 4 && (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                              <Phone className="w-6 h-6 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Profile Card */}
                  <div className="px-6 pb-6">
                    <div className="flex items-center justify-between bg-[#1a1a2e]/50 rounded-2xl p-4 border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 p-0.5">
                          <div className="w-full h-full rounded-full bg-[#1a1a2e] flex items-center justify-center text-white font-bold">
                            AR
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold">Ana Rodrigues</p>
                          <p className="text-gray-400 text-sm">CFO @ FinancePlus</p>
                        </div>
                      </div>
                      <button className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-5 py-2 rounded-full text-sm font-medium">
                        Conectar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Floating Badge - Novo Match */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-64">
                  <div className="relative bg-[#1a1a2e] rounded-2xl p-4 border border-purple-500/30 shadow-xl shadow-purple-500/10">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-sm -z-10" />
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 p-0.5">
                          <div className="w-full h-full rounded-full bg-[#1a1a2e] flex items-center justify-center">
                            <Zap className="w-5 h-5 text-orange-400" />
                          </div>
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#1a1a2e]">
                          <span className="text-[8px] text-white font-bold">+</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-white font-semibold text-sm transition-all duration-200 ${showNewMatch ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"}`}
                        >
                          Novo Match!
                        </p>
                        <p className="text-gray-400 text-xs flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          <span className="tabular-nums">{onlineCount2.toLocaleString("pt-BR")}</span> online
                        </p>
                      </div>
                    </div>
                  </div>
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

      <section id="builder" className="py-20 lg:py-28 px-6 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6 border border-primary/20">
              <Wand2 className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Novo Recurso</span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Crie sites profissionais com <span className="gradient-text">IA em segundos</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              O Connext Builder transforma suas ideias em sites reais usando inteligência artificial. Descreva o que
              você quer e veja a mágica acontecer.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Builder Demo Visual */}
            <div className="relative order-2 lg:order-1">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-pink-500/20 rounded-3xl blur-3xl" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-[#0d0d14]">
                {/* Builder Header */}
                <div className="bg-[#1a1a2e] px-4 py-3 flex items-center justify-between border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white font-semibold">Connext Builder</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                      AI Powered
                    </div>
                  </div>
                </div>

                {/* Chat Area */}
                <div className="p-4 min-h-[200px] bg-[#0d0d14]">
                  {/* User Message */}
                  <div className="flex gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      U
                    </div>
                    <div className="bg-[#1a1a2e] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                      <p className="text-white text-sm">
                        {builderTyping}
                        <span className="animate-pulse">|</span>
                      </p>
                    </div>
                  </div>

                  {/* AI Response */}
                  {builderStep >= 1 && (
                    <div className="flex gap-3 justify-end mb-4">
                      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] border border-purple-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          <span className="text-purple-400 text-xs font-medium">Gerando código...</span>
                        </div>
                        {builderStep >= 2 && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-green-400 text-xs">
                              <Check className="w-3 h-3" />
                              <span>Analisando requisitos</span>
                            </div>
                            <div className="flex items-center gap-2 text-green-400 text-xs">
                              <Check className="w-3 h-3" />
                              <span>Criando estrutura</span>
                            </div>
                            {builderStep >= 3 && (
                              <div className="flex items-center gap-2 text-green-400 text-xs">
                                <Check className="w-3 h-3" />
                                <span>Site pronto!</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview Area */}
                {builderStep >= 3 && (
                  <div className="border-t border-white/5 p-4">
                    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-white/5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-400 text-xs">Preview</span>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-[#030014] to-[#1a1a2e] rounded-lg p-4 min-h-[100px]">
                        <div className="text-center">
                          <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500"></div>
                          <div className="h-3 w-32 mx-auto bg-gradient-to-r from-purple-400 to-pink-400 rounded mb-2"></div>
                          <div className="h-2 w-48 mx-auto bg-gray-600 rounded mb-3"></div>
                          <div className="h-6 w-24 mx-auto bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Builder Features */}
            <div className="order-1 lg:order-2">
              <h3 className="text-2xl font-bold mb-6">
                Do prompt ao site publicado em <span className="gradient-text">30 segundos</span>
              </h3>
              <div className="space-y-4">
                {[
                  {
                    icon: Wand2,
                    title: "Descreva sua ideia",
                    description: "Digite o que você quer criar e a IA faz o resto automaticamente.",
                  },
                  {
                    icon: Eye,
                    title: "Preview ao vivo",
                    description: "Veja seu site sendo criado em tempo real com visualização instantânea.",
                  },
                  {
                    icon: Layers,
                    title: "Sites profissionais",
                    description: "Designs modernos com gradientes, animações e layouts responsivos.",
                  },
                  {
                    icon: Rocket,
                    title: "Publique em 1 clique",
                    description: "Exporte o código ou publique diretamente na web.",
                  },
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="flex gap-4 p-4 rounded-xl bg-card/50 border border-border/50 hover:border-primary/30 transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center shrink-0">
                      <feature.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link href="/register">
                  <Button className="gradient-bg text-white hover:opacity-90 px-8 h-12">
                    Experimentar o Builder Grátis
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-primary mb-4 block">RECURSOS</span>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Tudo que você precisa para <span className="gradient-text">conectar e criar</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Encontre empreendedores compatíveis, faça videochamadas e crie sites profissionais com IA.
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
                description:
                  "Algoritmo avançado que conecta você com empreendedores baseado em interesses e objetivos.",
              },
              {
                icon: MessageCircle,
                title: "WhatsApp Integrado",
                description: "Após o match, continue a conversa no WhatsApp para fechar negócios rapidamente.",
              },
              {
                icon: Code2,
                title: "Connext Builder",
                description:
                  "Crie sites profissionais do zero usando IA. Descreva sua ideia e tenha um site em segundos.",
              },
              {
                icon: Globe,
                title: "Filtro Geográfico",
                description: "Encontre empreendedores na sua cidade ou conecte-se globalmente.",
              },
              {
                icon: Shield,
                title: "Segurança Total",
                description: "Criptografia de ponta a ponta em videochamadas e dados protegidos.",
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

      {/* How It Works - Updated with Builder */}
      <section id="how-it-works" className="py-20 lg:py-28 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-primary mb-4 block">COMO FUNCIONA</span>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              Conecte, crie e <span className="gradient-text">execute</span>
            </h2>
            <p className="text-lg text-muted-foreground">Do networking à execução em poucos passos.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 lg:gap-6">
            {[
              {
                step: "01",
                title: "Crie seu perfil",
                description: "Cadastre-se e configure seus interesses e objetivos profissionais.",
                icon: Briefcase,
              },
              {
                step: "02",
                title: "Conecte-se",
                description: "Encontre profissionais compatíveis e inicie videochamadas instantâneas.",
                icon: Users,
              },
              {
                step: "03",
                title: "Crie suas ideias",
                description: "Use o Connext Builder para transformar ideias em sites reais com IA.",
                icon: Code2,
              },
              {
                step: "04",
                title: "Execute projetos",
                description: "Transforme conexões em negócios e publique seus projetos.",
                icon: TrendingUp,
              },
            ].map((item, index) => (
              <div key={index} className="relative text-center">
                {index < 3 && (
                  <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary/50 to-secondary/50" />
                )}
                <div className="relative z-10 w-16 h-16 rounded-2xl gradient-bg mx-auto mb-6 flex items-center justify-center">
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <span className="text-6xl font-bold text-muted/20 absolute -top-4 left-1/2 -translate-x-1/2">
                  {item.step}
                </span>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section - Updated with Builder */}
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
            {/* Free Plan - Updated */}
            <div className="relative rounded-2xl border border-border bg-card p-8">
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">Free</h3>
                <p className="text-muted-foreground text-sm">Perfeito para começar</p>
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
                  "20 créditos/mês no Builder",
                  "Integração WhatsApp",
                  "Filtro por localização",
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

            {/* Pro Plan - Updated */}
            <div className="relative rounded-2xl border-2 border-primary bg-card p-8 shadow-lg shadow-primary/10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 gradient-bg px-4 py-1 rounded-full">
                <span className="text-xs font-semibold text-white">MAIS POPULAR</span>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">Pro</h3>
                <p className="text-muted-foreground text-sm">
                  Para empreendedores que levam networking e criação a sério
                </p>
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
                  "Builder ilimitado",
                  "Publicação de sites",
                  "Prioridade na fila de matching",
                  "Filtros avançados",
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

      {/* Testimonials - Updated with Builder testimonial */}
      <section id="testimonials" className="py-20 lg:py-28 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-primary mb-4 block">DEPOIMENTOS</span>
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">
              O que nossos usuários <span className="gradient-text">dizem</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="rounded-2xl border border-border/50 bg-card p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-foreground mb-6 leading-relaxed text-sm">"{testimonial.quote}"</p>
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
              { value: "50K+", label: "Empreendedores cadastrados" },
              { value: "150K+", label: "Conexões realizadas" },
              { value: "10K+", label: "Sites criados no Builder" },
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

      {/* FAQ Section - Updated with Builder questions */}
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
                q: "O que é o Connext?",
                a: "O Connext é uma plataforma completa de networking profissional via videochamada e criação de sites com IA. Conectamos empreendedores em tempo real através de matches inteligentes, videochamadas HD e oferecemos o Connext Builder para criar sites profissionais em segundos.",
              },
              {
                q: "Como funciona o sistema de matches?",
                a: "Nosso algoritmo analisa seus interesses, área de atuação e objetivos profissionais para sugerir empreendedores compatíveis. Você pode filtrar por localização, setor e tipo de conexão. Quando ambos demonstram interesse, um match acontece!",
              },
              {
                q: "As videochamadas são seguras?",
                a: "Absolutamente! Usamos criptografia de ponta a ponta em todas as videochamadas. Suas conversas são 100% privadas e seguras. A qualidade é HD e não precisa baixar nenhum aplicativo.",
              },
              {
                q: "Como funciona a integração com WhatsApp?",
                a: "Quando você e outro empreendedor dão match, um botão aparece para iniciar conversa no WhatsApp usando o número cadastrado na plataforma. Isso facilita continuar a conversa e fechar negócios.",
              },
              {
                q: "O que é o Connext Builder?",
                a: "O Connext Builder é nossa ferramenta de criação de sites com inteligência artificial. Você descreve o que quer criar e a IA gera um site profissional completo em segundos. Você pode visualizar, editar e publicar diretamente.",
              },
              {
                q: "Quantos sites posso criar no plano Free?",
                a: "No plano Free você recebe 20 créditos por mês para criar sites no Builder. Cada geração consome 1 crédito. No plano Pro, a criação é ilimitada e você pode publicar os sites diretamente.",
              },
              {
                q: "Posso fazer videochamadas ilimitadas?",
                a: "No plano Free você tem 5 videochamadas por dia. No plano Pro, as videochamadas são ilimitadas, com qualidade HD prioritária e sem anúncios.",
              },
              {
                q: "Como cancelar minha assinatura Pro?",
                a: "Você pode cancelar a qualquer momento nas configurações da sua conta. Após o cancelamento, você mantém acesso aos benefícios Pro até o final do período pago.",
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
              <h2 className="text-3xl lg:text-5xl font-bold mb-4 text-white">Pronto para conectar e criar?</h2>
              <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
                Junte-se a milhares de empreendedores que já estão expandindo suas redes e criando projetos incríveis.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <Button size="lg" className="bg-white text-black font-semibold hover:bg-gray-100 px-8 h-12">
                    Criar Conta Grátis
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Updated with motivational phrase */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <ConnextLogo size="lg" className="mb-4" />
              <p className="text-muted-foreground max-w-xs mb-4">
                O lugar onde pessoas se conectam, criam e transformam ideias em realidade. Networking profissional via
                video chamada + matches + criação de sites com IA.
              </p>
              <p className="text-sm text-primary font-medium mb-4">
                "Conecte-se e crie — o lugar onde conexões viram ideias e saiem do papel."
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Contato:{" "}
                <a href="mailto:connextapp.oficial@gmail.com" className="text-primary hover:underline">
                  connextapp.oficial@gmail.com
                </a>
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
                  <a href="#builder" className="hover:text-foreground transition-colors">
                    Builder
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
                  <Link href="/termos" className="hover:text-foreground transition-colors">
                    Termos de Uso
                  </Link>
                </li>
                <li>
                  <Link href="/privacidade" className="hover:text-foreground transition-colors">
                    Privacidade
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Connext. Todos os direitos reservados.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <p className="text-sm text-muted-foreground">Desenvolvido por Matheus Maggioni</p>
              <p className="text-sm text-muted-foreground">Feito com ❤️ no Brasil</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Demo Modal */}
      <DemoModal open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  )
}
