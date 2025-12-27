"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConnextLogo } from "@/components/ui/connext-logo"
import { createClient } from "@/lib/supabase/client"
import { Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff, Upload } from "lucide-react"

const situationOptions = ["Estudante Universitário", "Fundador/Criador", "Estagiário", "Investidor Anjo"]
const journeyStageOptions = [
  "Ainda estou buscando uma ideia ou propósito",
  "Já tenho uma ideia, mas não sei como tirar do papel",
  "Estou desenvolvendo um MVP ou projeto inicial",
  "Já tenho um site ou startup em funcionamento",
  "Já tenho uma empresa estruturada",
  "Trabalho em uma empresa e quero criar algo novo",
]
const businessAreaOptions = ["Tech", "Saúde", "Educação", "FinTech", "E-commerce", "AgriTech", "Outro"]

export function RegisterForm() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
    situation: "",
    journeyStage: "",
    businessArea: "",
    city: "",
    country: "",
    bio: "",
    photoFile: null as File | null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const router = useRouter()

  const totalSteps = 6

  const updateField = (field: string, value: string | File | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      updateField("photoFile", file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const validateStep = (): boolean => {
    setError("")

    if (step === 1) {
      if (!formData.email || !formData.password || !formData.confirmPassword || !formData.name) {
        setError("Por favor, preencha todos os campos")
        return false
      }
      if (formData.password !== formData.confirmPassword) {
        setError("As senhas não correspondem")
        return false
      }
      if (formData.password.length < 8) {
        setError("A senha deve ter no mínimo 8 caracteres")
        return false
      }
      if (!formData.email.includes("@")) {
        setError("Email inválido")
        return false
      }
    } else if (step === 2) {
      if (!formData.photoFile) {
        setError("Foto de perfil é obrigatória")
        return false
      }
    } else if (step === 3) {
      if (!formData.phone) {
        setError("WhatsApp é obrigatório")
        return false
      }
    } else if (step === 4) {
      if (!formData.situation) {
        setError("Selecione sua situação profissional")
        return false
      }
    } else if (step === 5) {
      if (!formData.journeyStage) {
        setError("Selecione seu estágio de startup")
        return false
      }
    } else if (step === 6) {
      if (!formData.businessArea || !formData.city || !formData.country) {
        setError("Por favor, preencha todos os campos obrigatórios")
        return false
      }
    }

    return true
  }

  const nextStep = () => {
    if (validateStep()) {
      setStep((prev) => prev + 1)
    }
  }

  const prevStep = () => {
    setError("")
    setStep((prev) => prev - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (!validateStep()) {
      setIsLoading(false)
      return
    }

    if (step < totalSteps) {
      nextStep()
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.connextapp.com.br"}/auth/callback`

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: formData.name,
          },
        },
      })

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("Este email já está cadastrado. Faça login ou use outro email.")
        } else {
          setError(signUpError.message)
        }
        setIsLoading(false)
        return
      }

      if (!authData.user) {
        setError("Erro ao criar conta. Tente novamente.")
        setIsLoading(false)
        return
      }

      sessionStorage.setItem(
        "pendingOnboarding",
        JSON.stringify({
          phone: formData.phone,
          situation: formData.situation,
          journeyStage: formData.journeyStage,
          businessArea: formData.businessArea,
          city: formData.city,
          country: formData.country,
          bio: formData.bio,
        }),
      )

      setIsLoading(false)
      router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`)
    } catch (error) {
      console.error("Signup error:", error)
      setError("Erro ao criar conta. Tente novamente.")
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <ConnextLogo className="mx-auto mb-4" />
      </div>

      {/* Progress Bar */}
      <div className="flex gap-1 mb-6">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? "bg-gradient-to-r from-pink-500 to-orange-500" : "bg-secondary"}`}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Account */}
        {step === 1 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">Crie sua conta</h1>
              <p className="text-muted-foreground text-sm mt-1">Insira seu email para começar.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="pl-10 bg-card/50 border-border/50 text-foreground backdrop-blur-sm focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    className="pl-10 pr-10 bg-card/50 border-border/50 text-foreground placeholder:text-muted-foreground backdrop-blur-sm focus:border-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">
                  Confirmar Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirme sua senha"
                    value={formData.confirmPassword}
                    onChange={(e) => updateField("confirmPassword", e.target.value)}
                    className="pl-10 pr-10 bg-card/50 border-border/50 text-foreground placeholder:text-muted-foreground backdrop-blur-sm focus:border-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">
                  Nome Completo *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Seu nome completo"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className="pl-10 bg-card/50 border-border/50 text-foreground placeholder:text-muted-foreground backdrop-blur-sm focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <span className="relative bg-background px-4 text-xs text-muted-foreground uppercase">
                  ou continue com
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-card/50 border-border/50 backdrop-blur-sm hover:bg-card"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="bg-card/50 border-border/50 backdrop-blur-sm hover:bg-card"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  GitHub
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Photo */}
        {step === 2 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">Foto de Perfil</h1>
              <p className="text-muted-foreground text-sm mt-1">Obrigatória</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-center">
                {photoPreview ? (
                  <img
                    src={photoPreview || "/placeholder.svg"}
                    alt="Preview"
                    className="w-32 h-32 rounded-full object-cover border-2 border-primary"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-card/50">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="w-full" />
            </div>
          </>
        )}

        {/* Step 3: WhatsApp */}
        {step === 3 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">WhatsApp</h1>
              <p className="text-muted-foreground text-sm mt-1">Usado para conexões pós-match</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground">
                  Número do WhatsApp
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(XX) XXXXX-XXXX"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="bg-card/50 border-border/50 text-foreground placeholder:text-muted-foreground backdrop-blur-sm focus:border-primary"
                />
              </div>
            </div>
          </>
        )}

        {/* Step 4: Situation */}
        {step === 4 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">Situação Profissional</h1>
              <p className="text-muted-foreground text-sm mt-1">Selecione a sua</p>
            </div>

            <div className="space-y-4">
              {situationOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => updateField("situation", option)}
                  className={`w-full p-3 rounded-lg border transition-colors ${
                    formData.situation === option
                      ? "bg-primary/10 border-primary"
                      : "bg-card/50 border-border/50 hover:border-border"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 5: Journey Stage */}
        {step === 5 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">Em que momento você se encontra?</h1>
              <p className="text-muted-foreground text-sm mt-1">Selecione seu estágio de startup</p>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {journeyStageOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => updateField("journeyStage", option)}
                  className={`w-full p-3 rounded-lg border transition-colors text-left ${
                    formData.journeyStage === option
                      ? "bg-primary/10 border-primary"
                      : "bg-card/50 border-border/50 hover:border-border"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 6: Business Area and Location */}
        {step === 6 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">Finalize seu perfil</h1>
              <p className="text-muted-foreground text-sm mt-1">Área de negócio, localização e bio</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessArea" className="text-foreground">
                  Área de Negócio
                </Label>
                <select
                  id="businessArea"
                  value={formData.businessArea}
                  onChange={(e) => updateField("businessArea", e.target.value)}
                  className="w-full p-2 rounded-lg bg-card/50 border border-border/50 text-foreground focus:border-primary outline-none"
                >
                  <option value="">Selecione uma área</option>
                  {businessAreaOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-foreground">
                    Cidade
                  </Label>
                  <Input
                    id="city"
                    placeholder="São Paulo"
                    value={formData.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    className="bg-card/50 border-border/50 text-foreground placeholder:text-muted-foreground backdrop-blur-sm focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-foreground">
                    País
                  </Label>
                  <Input
                    id="country"
                    placeholder="Brasil"
                    value={formData.country}
                    onChange={(e) => updateField("country", e.target.value)}
                    className="bg-card/50 border-border/50 text-foreground placeholder:text-muted-foreground backdrop-blur-sm focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-foreground">
                  Bio (Opcional)
                </Label>
                <textarea
                  id="bio"
                  placeholder="Conte sobre sua ideia de negócio..."
                  value={formData.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                  className="w-full p-2 rounded-lg bg-card/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary outline-none resize-none h-24"
                />
              </div>
            </div>
          </>
        )}

        {/* Error Message */}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          {step > 1 && (
            <Button type="button" onClick={prevStep} variant="outline" className="flex-1 bg-transparent">
              Voltar
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            className={`flex-1 ${step === totalSteps ? "bg-gradient-to-r from-pink-500 to-orange-500" : "bg-gradient-to-r from-pink-500 to-orange-500"}`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : step === totalSteps ? (
              "Finalizar"
            ) : (
              <>
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        <p className="text-center text-muted-foreground text-sm">
          Já tem uma conta?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Faça login
          </Link>
        </p>
      </form>
    </div>
  )
}
