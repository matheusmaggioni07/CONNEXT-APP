"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ConnextLogo } from "@/components/ui/connext-logo"
import { completeOnboarding } from "@/app/actions/profile"
import {
  User,
  Building2,
  Briefcase,
  MapPin,
  Phone,
  Target,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react"

const INDUSTRIES = [
  "Tecnologia",
  "Finanças",
  "Saúde",
  "Educação",
  "Marketing",
  "Varejo",
  "Indústria",
  "Serviços",
  "Consultoria",
  "Startups",
  "E-commerce",
  "Imobiliário",
]

const SENIORITIES = [
  "Estagiário",
  "Junior",
  "Pleno",
  "Senior",
  "Especialista",
  "Coordenador",
  "Gerente",
  "Diretor",
  "VP",
  "C-Level",
  "Fundador/CEO",
]

const INTERESTS = [
  "Empreendedorismo",
  "Investimentos",
  "Inovação",
  "Liderança",
  "Vendas",
  "Marketing Digital",
  "Produto",
  "Engenharia",
  "Design",
  "Gestão de Pessoas",
  "Finanças",
  "Estratégia",
]

const LOOKING_FOR = [
  "Networking",
  "Mentoria",
  "Parcerias",
  "Investimento",
  "Clientes",
  "Fornecedores",
  "Co-fundador",
  "Talentos",
  "Conhecimento",
  "Oportunidades",
]

export function OnboardingForm() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    phone: "",
    company: "",
    position: "",
    seniority: "",
    industry: "",
    city: "",
    country: "Brasil",
    interests: [] as string[],
    lookingFor: [] as string[],
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

  const toggleInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }))
  }

  const toggleLookingFor = (item: string) => {
    setFormData((prev) => ({
      ...prev,
      lookingFor: prev.lookingFor.includes(item)
        ? prev.lookingFor.filter((i) => i !== item)
        : [...prev.lookingFor, item],
    }))
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
        return formData.phone && formData.company && formData.position
      case 2:
        return formData.industry && formData.city
      case 3:
        return formData.interests.length > 0
      case 4:
        return formData.lookingFor.length > 0
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
        <p className="text-muted-foreground">
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
        {/* Step 1: Professional Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Informações Profissionais</h2>
                <p className="text-sm text-muted-foreground">Conte-nos sobre sua carreira</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  WhatsApp
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
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Building2 className="w-4 h-4 inline mr-2" />
                  Empresa
                </label>
                <Input
                  placeholder="Nome da sua empresa"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Cargo
                </label>
                <Input
                  placeholder="Seu cargo atual"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="bg-secondary border-border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Senioridade</label>
                <div className="grid grid-cols-3 gap-2">
                  {SENIORITIES.map((seniority) => (
                    <button
                      key={seniority}
                      type="button"
                      onClick={() => setFormData({ ...formData, seniority })}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        formData.seniority === seniority
                          ? "gradient-bg text-primary-foreground"
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {seniority}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Location & Industry */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Localização e Indústria</h2>
                <p className="text-sm text-muted-foreground">Onde você está e qual seu setor</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Cidade</label>
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

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Indústria</label>
                <div className="grid grid-cols-3 gap-2">
                  {INDUSTRIES.map((industry) => (
                    <button
                      key={industry}
                      type="button"
                      onClick={() => setFormData({ ...formData, industry })}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        formData.industry === industry
                          ? "gradient-bg text-primary-foreground"
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {industry}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Interests */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Seus Interesses</h2>
                <p className="text-sm text-muted-foreground">Selecione pelo menos 1 interesse</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`px-4 py-2 rounded-full text-sm transition-colors ${
                    formData.interests.includes(interest)
                      ? "gradient-bg text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {formData.interests.includes(interest) && <Check className="w-4 h-4 inline mr-1" />}
                  {interest}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Looking For */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                <Target className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">O que você busca?</h2>
                <p className="text-sm text-muted-foreground">Selecione seus objetivos de networking</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {LOOKING_FOR.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleLookingFor(item)}
                  className={`px-4 py-2 rounded-full text-sm transition-colors ${
                    formData.lookingFor.includes(item)
                      ? "gradient-bg text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {formData.lookingFor.includes(item) && <Check className="w-4 h-4 inline mr-1" />}
                  {item}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Bio (opcional)</label>
              <Textarea
                placeholder="Conte um pouco sobre você e seus objetivos..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="bg-secondary border-border min-h-[100px]"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {step > 1 ? (
            <Button variant="outline" onClick={handleBack} className="border-border bg-transparent">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <Button onClick={handleNext} disabled={!canProceed()} className="gradient-bg text-primary-foreground">
              Próximo
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isLoading}
              className="gradient-bg text-primary-foreground"
            >
              {isLoading ? "Salvando..." : "Começar a Conectar"}
              <Sparkles className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
