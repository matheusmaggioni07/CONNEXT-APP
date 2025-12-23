"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ConnextLogo } from "@/components/ui/connext-logo"
import { completeOnboarding } from "@/app/actions/profile"
import { User, Building2, Briefcase, MapPin, Phone, Rocket, ChevronRight, ChevronLeft, Check } from "lucide-react"

const PROFESSIONAL_SITUATIONS = ["Trabalhando em empresa", "Empreendedor", "Estudante", "Investidor", "Autônomo"]

const JOURNEY_STAGES = [
  "Ainda estou buscando uma ideia ou propósito",
  "Já tenho uma ideia, mas não sei como tirar do papel",
  "Estou desenvolvendo um MVP ou projeto inicial",
  "Já tenho um site ou startup em funcionamento",
  "Já tenho uma empresa estruturada",
  "Trabalho em uma empresa e quero criar algo novo",
]

export function OnboardingForm() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    phone: "",
    situation: "",
    company: "",
    position: "",
    journey_stage: "",
    city: "",
    country: "Brasil",
    bio: "",
  })

  const totalSteps = 4

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError("")

    const result = await completeOnboarding(formData)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }

    router.push("/dashboard")
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.phone && formData.situation
      case 2:
        if (formData.situation === "Trabalhando em empresa") {
          return formData.company && formData.position
        }
        // Para os outros (Empreendedor, Estudante, Investidor, Autônomo), pode prosseguir
        return true
      case 3:
        return formData.journey_stage
      case 4:
        return formData.city
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
          Passo {step} de {totalSteps}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-colors ${i < step ? "gradient-bg" : "bg-secondary"}`}
          />
        ))}
      </div>

      {/* Form Card */}
      <div className="bg-card border border-border rounded-2xl p-8">
        {/* Step 1: Phone & Professional Situation */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Informações de Contato</h2>
                <p className="text-sm text-muted-foreground">Como podemos entrar em contato?</p>
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
                  placeholder="+55 11 99999-9999"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Situação Profissional *</label>
                <div className="grid grid-cols-2 gap-3">
                  {PROFESSIONAL_SITUATIONS.map((situation) => (
                    <button
                      key={situation}
                      type="button"
                      onClick={() => setFormData({ ...formData, situation })}
                      className={`px-4 py-3 rounded-xl text-sm transition-all border ${
                        formData.situation === situation
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border bg-secondary text-foreground hover:border-primary/50"
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
            </div>
          </div>
        )}

        {/* Step 2: Company & Position (condicional baseado na situação) */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Detalhes Profissionais</h2>
                <p className="text-sm text-muted-foreground">
                  {formData.situation === "Trabalhando em empresa"
                    ? "Conte-nos sobre sua empresa e cargo"
                    : formData.situation === "Empreendedor"
                      ? "Conte-nos sobre seu negócio (opcional)"
                      : "Prossiga para o próximo passo"}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {(formData.situation === "Trabalhando em empresa" || formData.situation === "Empreendedor") && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <Building2 className="w-4 h-4 inline mr-2" />
                      {formData.situation === "Trabalhando em empresa" ? "Empresa *" : "Nome da Empresa (opcional)"}
                    </label>
                    <Input
                      placeholder="Nome da empresa"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="bg-secondary border-border"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      {formData.situation === "Trabalhando em empresa" ? "Cargo *" : "Cargo/Função (opcional)"}
                    </label>
                    <Input
                      placeholder={
                        formData.situation === "Trabalhando em empresa" ? "Seu cargo" : "Seu cargo ou função"
                      }
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="bg-secondary border-border"
                    />
                  </div>
                </>
              )}

              {formData.situation !== "Trabalhando em empresa" && formData.situation !== "Empreendedor" && (
                <div className="bg-secondary/50 border border-border rounded-xl p-6 text-center">
                  <p className="text-muted-foreground">
                    Como <strong className="text-foreground">{formData.situation.toLowerCase()}</strong>, você pode
                    prosseguir para o próximo passo.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Journey Stage */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                <Rocket className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Sua Jornada</h2>
                <p className="text-sm text-muted-foreground">Em que momento da sua jornada você está?</p>
              </div>
            </div>

            <div className="space-y-2">
              {JOURNEY_STAGES.map((stage) => (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setFormData({ ...formData, journey_stage: stage })}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all border ${
                    formData.journey_stage === stage
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-secondary text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {stage}
                    {formData.journey_stage === stage && <Check className="w-4 h-4" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Location & Bio */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Localização e Bio</h2>
                <p className="text-sm text-muted-foreground">Onde você está e o que busca no networking?</p>
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
                <label className="block text-sm font-medium text-foreground mb-2">Bio (opcional)</label>
                <Textarea
                  placeholder="Quem quer fazer networking tem interesse em crescimento profissional (novas vagas, parcerias, mentorias), aprendizado (troca de ideias, tendências, habilidades), soluções (encontrar clientes, parceiros, resolver desafios), relacionamentos (aprender com erros, dividir seu trabalho), apoio mútuo e inspiração, focando em conexões de valor, reciprocidade e colaboração mútua."
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
          {step > 1 && (
            <Button onClick={handleBack} variant="outline" className="flex-1 bg-transparent" disabled={isLoading}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}

          {step < totalSteps ? (
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
