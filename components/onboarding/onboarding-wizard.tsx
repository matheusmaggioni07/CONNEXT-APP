"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react"

export interface OnboardingData {
  whatsapp: string
  entrepreneur_type: string
  startup_stage: string
  business_area: string
  bio: string
}

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData) => Promise<void>
  isLoading?: boolean
}

export function OnboardingWizard({ onComplete, isLoading = false }: OnboardingWizardProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<OnboardingData>({
    whatsapp: "",
    entrepreneur_type: "",
    startup_stage: "",
    business_area: "",
    bio: "",
  })

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleComplete = async () => {
    await onComplete(formData)
  }

  const totalSteps = 5

  return (
    <div className="flex flex-col gap-8">
      {/* Progress Bar */}
      <div className="flex gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i < step ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      {/* Step Indicator */}
      <div className="text-sm text-muted-foreground text-center">
        Passo {step} de {totalSteps}
      </div>

      {/* Step 1: WhatsApp */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground text-center">Seu WhatsApp</h2>
          <p className="text-muted-foreground text-center">Usado para conexões após match</p>
          <Input
            type="tel"
            placeholder="(11) 99999-9999"
            value={formData.whatsapp}
            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
            className="text-base"
          />
        </div>
      )}

      {/* Step 2: Entrepreneur Type */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground text-center">Situação Profissional</h2>
          <p className="text-muted-foreground text-center">Selecione sua atual</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { value: "estudante", label: "Estudante Universitário" },
              { value: "founder", label: "Fundador/Criador" },
              { value: "estagiario", label: "Estagiário" },
              { value: "investor", label: "Investidor Anjo" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFormData({ ...formData, entrepreneur_type: option.value })}
                className={`px-4 py-3 rounded-lg border-2 transition-colors text-foreground font-medium ${
                  formData.entrepreneur_type === option.value
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Startup Stage */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground text-center">Estágio do Projeto</h2>
          <p className="text-muted-foreground text-center">Qual fase seu projeto está?</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { value: "ideia", label: "Apenas uma Ideia" },
              { value: "mvp", label: "MVP em Desenvolvimento" },
              { value: "validacao", label: "Em Validação" },
              { value: "crescimento", label: "Em Crescimento" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFormData({ ...formData, startup_stage: option.value })}
                className={`px-4 py-3 rounded-lg border-2 transition-colors text-foreground font-medium ${
                  formData.startup_stage === option.value
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Business Area */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground text-center">Área de Negócio</h2>
          <p className="text-muted-foreground text-center">Qual é sua principal indústria?</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { value: "tech", label: "Tecnologia" },
              { value: "saude", label: "Saúde" },
              { value: "educacao", label: "Educação" },
              { value: "fintech", label: "FinTech" },
              { value: "ecommerce", label: "E-commerce" },
              { value: "agritech", label: "AgriTech" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFormData({ ...formData, business_area: option.value })}
                className={`px-4 py-3 rounded-lg border-2 transition-colors text-foreground font-medium ${
                  formData.business_area === option.value
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 5: Bio */}
      {step === 5 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground text-center">Sua Bio</h2>
          <p className="text-muted-foreground text-center">Conte um pouco sobre você</p>
          <textarea
            placeholder="Sou um jovem empreendedor focado em inovação..."
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-border bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none"
            rows={5}
          />
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 justify-between">
        <Button
          onClick={handleBack}
          disabled={step === 1 || isLoading}
          variant="outline"
          className="flex items-center gap-2 bg-transparent"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </Button>

        {step < totalSteps ? (
          <Button
            onClick={handleNext}
            disabled={!formData[Object.keys(formData)[step - 1] as keyof OnboardingData] || isLoading}
            className="gradient-bg text-primary-foreground flex items-center gap-2"
          >
            Próximo
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleComplete}
            disabled={isLoading}
            className="gradient-bg text-primary-foreground flex items-center gap-2"
          >
            {isLoading ? "Salvando..." : "Completar"}
            <CheckCircle2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
