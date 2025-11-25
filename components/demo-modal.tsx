"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Play, Pause, SkipForward, SkipBack } from "lucide-react"
import Link from "next/link"

interface DemoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DemoModal({ open, onOpenChange }: DemoModalProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const demoSteps = [
    {
      title: "Crie sua conta",
      description:
        "Use seu email profissional para garantir uma rede de qualidade. Emails como Gmail ou Hotmail não são aceitos.",
      image: "/professional-signup-form-dark-theme-orange-purple.jpg",
    },
    {
      title: "Configure seu perfil",
      description: "Adicione suas habilidades, interesses e objetivos de networking para matches mais precisos.",
      image: "/professional-profile-setup-dark-theme-orange-purpl.jpg",
    },
    {
      title: "Descubra profissionais",
      description:
        "Navegue por cards de profissionais compatíveis com seus interesses. Deslize para a direita para curtir.",
      image: "/tinder-style-professional-cards-dark-theme-orange-.jpg",
    },
    {
      title: "Inicie videochamadas",
      description:
        "Conecte-se instantaneamente através de vídeo em alta qualidade. Conheça profissionais em tempo real.",
      image: "/video-call-interface-dark-theme-orange-purple-futu.jpg",
    },
    {
      title: "Faça match e conecte",
      description: "Após interesse mútuo, continue a conversa no WhatsApp para fechar negócios e parcerias.",
      image: "/match-celebration-screen-dark-theme-orange-purple-.jpg",
    },
  ]

  const nextStep = () => {
    setCurrentStep((prev) => (prev + 1) % demoSteps.length)
  }

  const prevStep = () => {
    setCurrentStep((prev) => (prev - 1 + demoSteps.length) % demoSteps.length)
  }

  // Auto-play functionality
  const toggleAutoPlay = () => {
    setIsPlaying(!isPlaying)
  }

  // Auto advance when playing
  useState(() => {
    if (isPlaying) {
      const interval = setInterval(nextStep, 3000)
      return () => clearInterval(interval)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 bg-card border-border/50 overflow-hidden">
        <DialogTitle className="sr-only">Demonstração do Connext App</DialogTitle>

        {/* Demo Area */}
        <div className="relative aspect-video bg-background">
          <img
            src={demoSteps[currentStep].image || "/placeholder.svg"}
            alt={demoSteps[currentStep].title}
            className="w-full h-full object-cover"
          />

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

          {/* Step indicator dots */}
          <div className="absolute top-4 left-4 flex gap-2">
            {demoSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentStep
                    ? "w-8 bg-primary"
                    : index < currentStep
                      ? "w-4 bg-primary/50"
                      : "w-4 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>

          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Navigation arrows */}
          <button
            onClick={prevStep}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors group"
          >
            <SkipBack className="w-5 h-5 group-hover:text-primary transition-colors" />
          </button>
          <button
            onClick={nextStep}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors group"
          >
            <SkipForward className="w-5 h-5 group-hover:text-primary transition-colors" />
          </button>

          {/* Play/Pause button */}
          <button
            onClick={toggleAutoPlay}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full gradient-bg flex items-center justify-center hover:opacity-90 transition-opacity glow-orange"
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
