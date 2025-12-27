"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ConnextLogo } from "@/components/ui/connext-logo"
import { completeOnboarding } from "@/app/actions/profile"
import { Phone, Rocket, Target, MapPin, ChevronRight, ChevronLeft, Check, Zap } from "lucide-react"
import Image from "next/image"
import { FileInput } from "@/components/ui/file-input"

const PROFESSIONAL_SITUATIONS = ["Estudante Universitário", "Fundador/Criador", "Estagiário", "Investidor Anjo"]

const STARTUP_STAGES = [
  "Ainda estou buscando uma ideia ou propósito",
  "Já tenho uma ideia, mas não sei como tirar do papel",
  "Estou desenvolvendo um MVP ou projeto inicial",
  "Já tenho um site ou startup em funcionamento",
  "Já tenho uma empresa estruturada",
  "Trabalho em uma empresa e quero criar algo novo",
]

const BUSINESS_AREAS = ["Tecnologia", "Saúde", "Educação", "FinTech", "E-commerce", "AgriTech"]

export function OnboardingForm() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    phone: "",
    situation: "",
    startup_stage: "",
    business_area: "",
    city: "",
    country: "Brasil",
    bio: "",
    photo_url: "",
    company: "",
    position: "",
    objectives: [] as string[],
    journey_stage: "",
  })

  const totalSteps = 6

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError("")

    const result = await completeOnboarding({
      phone: formData.phone,
      situation: formData.situation,
      journey_stage: formData.startup_stage,
      city: formData.city,
      country: formData.country,
      bio: formData.bio,
      photo_url: formData.photo_url,
      business_area: formData.business_area,
    })

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    router.push("/dashboard")
  }

  const canProceed = () => {
    switch (step) {
      case 0:
        return formData.photo_url.length > 0
      case 1:
        return formData.phone.length > 0
      case 2:
        return formData.situation.length > 0
      case 3:
        return formData.startup_stage.length > 0
      case 4:
        return formData.business_area.length > 0
      case 5:
        return formData.city.length > 0
      default:
        return true
    }
  }

  return (
    <div className="w-full max-w-2xl">
      {/* Header */}
      <div className="text-center mb-8">
        <ConnextLogo className="mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-foreground mb-2">Complete seu Perfil</h1>
        <p className="text-sm text-muted-foreground">
          Passo {step + 1} de {totalSteps}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-colors ${i <= step ? "progress-gradient" : "bg-secondary"}`}
          />
        ))}
      </div>

      {/* Form Card */}
      <div className="bg-card border border-border rounded-2xl p-8">
        {step === 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                <Image src="/photo-icon.svg" alt="Photo" width={24} height={24} className="text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Upload de Foto</h2>
                <p className="text-sm text-muted-foreground">Obrigatório para completar o perfil</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Foto de Perfil *</label>
                <FileInput
                  value={formData.photo_url}
                  onChange={(url) => setFormData({ ...formData, photo_url: url })}
                  className="bg-secondary border-border"
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                <Phone className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Seu WhatsApp</h2>
                <p className="text-sm text-muted-foreground">Usado para conexões após match</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  WhatsApp *
                </label>
                <Input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Situação Profissional</h2>
                <p className="text-sm text-muted-foreground">Selecione sua situação atual</p>
              </div>
            </div>

            <div className="space-y-2">
              {PROFESSIONAL_SITUATIONS.map((situation) => (
                <button
                  key={situation}
                  type="button"
                  onClick={() => setFormData({ ...formData, situation })}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all border ${
                    formData.situation === situation
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-secondary text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {situation}
                    {formData.situation === situation && <Check className="w-4 h-4" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                <Rocket className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Em que momento você se encontra?</h2>
                <p className="text-sm text-muted-foreground">Qual é seu estágio atual de empreendedorismo</p>
              </div>
            </div>

            <div className="space-y-2">
              {STARTUP_STAGES.map((stage) => (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setFormData({ ...formData, startup_stage: stage })}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all border ${
                    formData.startup_stage === stage
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-secondary text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {stage}
                    {formData.startup_stage === stage && <Check className="w-4 h-4" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                <Target className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Área de Negócio</h2>
                <p className="text-sm text-muted-foreground">Qual é sua principal indústria?</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {BUSINESS_AREAS.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => setFormData({ ...formData, business_area: area })}
                  className={`px-4 py-3 rounded-xl text-sm transition-all border ${
                    formData.business_area === area
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-secondary text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {area}
                    {formData.business_area === area && <Check className="w-4 h-4" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Localização e Bio</h2>
                <p className="text-sm text-muted-foreground">Onde você está localizado?</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Cidade *
                  </label>
                  <Input
                    placeholder="São Paulo"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="bg-secondary border-border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">País</label>
                  <Input
                    placeholder="Brasil"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Sobre você e sua ideia de negócio (opcional)
                </label>
                <Textarea
                  placeholder="Conte sobre você, seus objetivos empreendedores e a ideia de negócio que está desenvolvendo..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="bg-secondary border-border min-h-[120px]"
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
            {error}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <Button onClick={handleBack} variant="outline" className="flex-1 bg-transparent" disabled={isLoading}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}

          {step < totalSteps - 1 ? (
            <Button onClick={handleNext} className="flex-1 gradient-bg" disabled={!canProceed() || isLoading}>
              Próximo
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="flex-1 gradient-bg" disabled={!canProceed() || isLoading}>
              {isLoading ? "Salvando..." : "Finalizar"}
              <Check className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
