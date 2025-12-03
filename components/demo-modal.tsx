"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  X,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Mail,
  Lock,
  Heart,
  Video,
  MessageCircle,
  Check,
  Phone,
} from "lucide-react"
import Link from "next/link"

interface DemoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function SignupDemo() {
  const [step, setStep] = useState(0)
  const [email, setEmail] = useState("")
  const [typing, setTyping] = useState(true)

  const targetEmail = "ana.silva@gmail.com"

  useEffect(() => {
    if (step === 0 && typing) {
      const timer = setTimeout(() => {
        if (email.length < targetEmail.length) {
          setEmail(targetEmail.slice(0, email.length + 1))
        } else {
          setTyping(false)
          setTimeout(() => setStep(1), 500)
        }
      }, 80)
      return () => clearTimeout(timer)
    }
  }, [email, step, typing])

  useEffect(() => {
    if (step === 1) {
      const timer = setTimeout(() => setStep(2), 1000)
      return () => clearTimeout(timer)
    }
    if (step === 2) {
      const timer = setTimeout(() => setStep(3), 800)
      return () => clearTimeout(timer)
    }
  }, [step])

  return (
    <div className="w-full h-full bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-8">
      <div className="w-full max-w-sm bg-card border border-border/50 rounded-2xl p-6 shadow-2xl">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold mb-1">Criar Conta</h3>
          <p className="text-sm text-muted-foreground">Cadastre-se gratuitamente</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-4 h-4" /> Email
            </label>
            <div
              className={`h-11 px-4 rounded-lg border bg-muted/50 flex items-center ${step >= 1 ? "border-green-500" : "border-border"}`}
            >
              <span className="text-foreground">{email}</span>
              {typing && <span className="animate-pulse">|</span>}
              {step >= 1 && <Check className="w-4 h-4 text-green-500 ml-auto" />}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Lock className="w-4 h-4" /> Senha
            </label>
            <div
              className={`h-11 px-4 rounded-lg border bg-muted/50 flex items-center ${step >= 2 ? "border-green-500" : "border-border"}`}
            >
              {step >= 2 && (
                <>
                  <span className="text-foreground">••••••••••</span>
                  <Check className="w-4 h-4 text-green-500 ml-auto" />
                </>
              )}
            </div>
          </div>

          <Button
            className={`w-full h-11 transition-all duration-300 ${step >= 3 ? "gradient-bg text-white scale-105" : "bg-muted text-muted-foreground"}`}
            disabled={step < 3}
          >
            {step >= 3 ? "Continuar →" : "Continuar"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ProfileDemo() {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const interests = ["Tecnologia", "Startups", "Marketing", "Investimentos", "IA", "Vendas"]

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    interests.forEach((interest, i) => {
      if (i < 4) {
        timers.push(
          setTimeout(
            () => {
              setSelectedInterests((prev) => [...prev, interest])
            },
            600 * (i + 1),
          ),
        )
      }
    })
    return () => timers.forEach((t) => clearTimeout(t))
  }, [])

  return (
    <div className="w-full h-full bg-gradient-to-br from-background via-background to-secondary/5 flex items-center justify-center p-8">
      <div className="w-full max-w-sm bg-card border border-border/50 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full overflow-hidden">
            <img src="/professional-woman-smiling-headshot.png" alt="Ana Silva" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="font-bold">Ana Silva</h3>
            <p className="text-sm text-muted-foreground">CFO @ TechCorp</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Seus interesses</label>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <span
                  key={interest}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                    selectedInterests.includes(interest)
                      ? "gradient-bg text-white scale-105"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DiscoverDemo() {
  const [cardPosition, setCardPosition] = useState(0)
  const [showHeart, setShowHeart] = useState(false)

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setCardPosition(100)
      setShowHeart(true)
    }, 1500)

    const timer2 = setTimeout(() => {
      setCardPosition(0)
      setShowHeart(false)
    }, 3000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  return (
    <div className="w-full h-full bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-8 relative overflow-hidden">
      {/* Heart animation */}
      {showHeart && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <Heart className="w-24 h-24 text-pink-500 fill-pink-500 animate-ping" />
        </div>
      )}

      {/* Card stack */}
      <div className="relative w-72">
        {/* Background card */}
        <div className="absolute inset-0 bg-card border border-border/50 rounded-2xl transform rotate-3 scale-95 opacity-50" />

        {/* Main card */}
        <div
          className="relative bg-card border border-border/50 rounded-2xl overflow-hidden shadow-2xl transition-transform duration-500"
          style={{ transform: `translateX(${cardPosition}px) rotate(${cardPosition > 0 ? 15 : 0}deg)` }}
        >
          <div className="aspect-[3/4] bg-gradient-to-br from-primary/20 to-secondary/20 relative">
            <img src="/professional-man-smiling-business-headshot.jpg" alt="Ricardo Lima" className="w-full h-full object-cover" />
          </div>
          <div className="p-4">
            <h3 className="font-bold text-lg">Ricardo Lima</h3>
            <p className="text-sm text-muted-foreground">CEO @ StartupXYZ</p>
            <div className="flex gap-2 mt-3">
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">Startups</span>
              <span className="px-2 py-1 bg-secondary/10 text-secondary text-xs rounded-full">IA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center">
            <X className="w-6 h-6 text-muted-foreground" />
          </div>
          <span className="text-xs text-muted-foreground mt-1">Next</span>
        </div>
        <div className="flex flex-col items-center">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${showHeart ? "gradient-bg scale-110" : "bg-card border border-border"}`}
          >
            <Heart className={`w-6 h-6 ${showHeart ? "text-white fill-white" : "text-pink-500"}`} />
          </div>
          <span className="text-xs text-muted-foreground mt-1">Connect</span>
        </div>
      </div>
    </div>
  )
}

function VideoCallDemo() {
  const [connected, setConnected] = useState(false)
  const [timer, setTimer] = useState(0)

  useEffect(() => {
    const connectTimer = setTimeout(() => setConnected(true), 1000)
    return () => clearTimeout(connectTimer)
  }, [])

  useEffect(() => {
    if (connected) {
      const interval = setInterval(() => {
        setTimer((t) => t + 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [connected])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="w-full h-full bg-black flex flex-col relative">
      {/* Main video area */}
      <div className="flex-1 relative">
        {/* Remote video (simulated) */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center overflow-hidden">
          {!connected ? (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/80">Conectando...</p>
            </div>
          ) : (
            <img src="/professional-man-video-call-webcam-smiling.jpg" alt="Video call" className="w-full h-full object-cover" />
          )}
        </div>

        {/* Local video (small) */}
        <div className="absolute bottom-4 right-4 w-24 h-32 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl border-2 border-white/20 overflow-hidden">
          <img src="/professional-woman-video-call-webcam.jpg" alt="You" className="w-full h-full object-cover" />
        </div>

        {/* Status bar */}
        {connected && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-white text-sm font-medium">{formatTime(timer)}</span>
          </div>
        )}

        {/* User info */}
        {connected && (
          <div className="absolute bottom-20 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-xl">
            <p className="text-white font-semibold">Ricardo Lima</p>
            <p className="text-white/70 text-sm">CEO @ StartupXYZ</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="h-20 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
          <Video className="w-5 h-5 text-white" />
        </div>
        <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center">
          <Phone className="w-6 h-6 text-white rotate-[135deg]" />
        </div>
        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}

function MatchDemo() {
  const [showMatch, setShowMatch] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setShowMatch(true)
      setShowConfetti(true)
    }, 500)

    const timer2 = setTimeout(() => setShowConfetti(false), 2000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  return (
    <div className="w-full h-full bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-8 relative overflow-hidden">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                backgroundColor: ["#ec4899", "#8b5cf6", "#f97316", "#10b981"][i % 4],
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${0.5 + Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      <div
        className={`text-center transition-all duration-500 ${showMatch ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}
      >
        {/* Avatars */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white/20">
            <img src="/professional-woman-smiling-headshot.png" alt="Você" className="w-full h-full object-cover" />
          </div>
          <Heart className="w-12 h-12 text-pink-500 fill-pink-500 animate-pulse" />
          <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white/20">
            <img src="/professional-man-smiling-business-headshot.jpg" alt="Ricardo" className="w-full h-full object-cover" />
          </div>
        </div>

        <h2 className="text-3xl font-bold gradient-text mb-2">É um Match!</h2>
        <p className="text-muted-foreground mb-6">Você e Ricardo têm interesses em comum</p>

        <div className="flex gap-3 justify-center">
          <Button variant="outline" className="bg-transparent">
            Continuar explorando
          </Button>
          <Button className="gradient-bg text-white">
            <MessageCircle className="w-4 h-4 mr-2" />
            Enviar mensagem
          </Button>
        </div>
      </div>
    </div>
  )
}

export function DemoModal({ open, onOpenChange }: DemoModalProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const demoSteps = [
    {
      title: "Crie sua conta",
      description: "Cadastre-se com seu email e crie sua conta em segundos. Comece gratuitamente.",
      component: SignupDemo,
    },
    {
      title: "Configure seu perfil",
      description: "Adicione suas habilidades, interesses e objetivos de networking para matches mais precisos.",
      component: ProfileDemo,
    },
    {
      title: "Descubra profissionais",
      description:
        "Navegue por cards de profissionais compatíveis com seus interesses. Clique em Connect para curtir ou Next para passar.",
      component: DiscoverDemo,
    },
    {
      title: "Inicie videochamadas",
      description:
        "Conecte-se instantaneamente através de vídeo em alta qualidade. Conheça profissionais em tempo real.",
      component: VideoCallDemo,
    },
    {
      title: "Faça match e conecte",
      description: "Após interesse mútuo, continue a conversa no WhatsApp para fechar negócios e parcerias.",
      component: MatchDemo,
    },
  ]

  const nextStep = () => {
    setCurrentStep((prev) => (prev + 1) % demoSteps.length)
  }

  const prevStep = () => {
    setCurrentStep((prev) => (prev - 1 + demoSteps.length) % demoSteps.length)
  }

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(nextStep, 4000)
      return () => clearInterval(interval)
    }
  }, [isPlaying, currentStep])

  // Reset when opening
  useEffect(() => {
    if (open) {
      setCurrentStep(0)
      setIsPlaying(false)
    }
  }, [open])

  const CurrentDemo = demoSteps[currentStep].component

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 bg-card border-border/50 overflow-hidden">
        <DialogTitle className="sr-only">Demonstração do Connext App</DialogTitle>

        {/* Demo Area */}
        <div className="relative aspect-video bg-background overflow-hidden">
          <CurrentDemo key={currentStep} />

          {/* Step indicator dots */}
          <div className="absolute top-4 left-4 flex gap-2 z-10">
            {demoSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentStep
                    ? "w-8 bg-primary"
                    : index < currentStep
                      ? "w-4 bg-primary/50"
                      : "w-4 bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>

          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Navigation arrows */}
          <button
            onClick={prevStep}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors group z-10"
          >
            <SkipBack className="w-5 h-5 group-hover:text-primary transition-colors" />
          </button>
          <button
            onClick={nextStep}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors group z-10"
          >
            <SkipForward className="w-5 h-5 group-hover:text-primary transition-colors" />
          </button>

          {/* Play/Pause button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full gradient-bg flex items-center justify-center hover:opacity-90 transition-opacity z-10 opacity-0 hover:opacity-100"
          >
            {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-1" />}
          </button>
        </div>

        {/* Info bar */}
        <div className="p-6 border-t border-border/50">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full gradient-bg text-xs font-bold text-white">
                  {currentStep + 1}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  Passo {currentStep + 1} de {demoSteps.length}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-1">{demoSteps[currentStep].title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{demoSteps[currentStep].description}</p>
            </div>
            <Link href="/register" onClick={() => onOpenChange(false)}>
              <Button className="gradient-bg text-white shrink-0 h-11 px-6">Começar Agora</Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
