"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ConnextLogo } from "@/components/ui/connext-logo"
import { createClient } from "@/lib/supabase/client"
import {
  Mail,
  Lock,
  User,
  Building2,
  Briefcase,
  MapPin,
  Phone,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Camera,
  X,
  Eye,
  EyeOff,
} from "lucide-react"

const industries = [
  "Tecnologia",
  "Finanças",
  "Saúde",
  "Marketing",
  "Consultoria",
  "E-commerce",
  "Educação",
  "Jurídico",
  "Imobiliário",
  "Varejo",
  "Alimentação",
  "Moda",
  "Entretenimento",
  "Esportes",
  "Turismo",
  "Agronegócio",
  "Indústria",
  "Logística",
  "Construção Civil",
  "Energia",
  "Meio Ambiente",
  "Arte e Cultura",
  "Comunicação",
  "ONGs e Social",
  "Outro",
]

const interests = [
  "IA & Machine Learning",
  "Startups",
  "Investimentos",
  "SaaS",
  "Growth Hacking",
  "Venture Capital",
  "M&A",
  "Transformação Digital",
  "Fintech",
  "HealthTech",
  "EdTech",
  "E-commerce",
  "Marketing Digital",
  "Vendas B2B",
  "Liderança",
  "Empreendedorismo",
  "Desenvolvimento Pessoal",
  "Networking",
  "Carreira",
  "Freelancing",
  "Criação de Conteúdo",
  "Design",
  "Programação",
  "Gestão de Projetos",
  "Finanças Pessoais",
  "Sustentabilidade",
  "Inovação Social",
  "Mentoria",
  "Negócios Internacionais",
  "Franquias",
]

const lookingForOptions = [
  "Investidores",
  "Co-fundadores",
  "Parcerias",
  "Clientes",
  "Mentores",
  "Talentos",
  "Networking",
  "Fornecedores",
  "Oportunidades de Trabalho",
  "Freelances",
  "Conhecimento",
  "Amizades Profissionais",
]

const situationOptions = [
  "Trabalhando em empresa",
  "Empreendedor(a)",
  "Freelancer/Autônomo",
  "Estudante",
  "Em transição de carreira",
  "Buscando oportunidades",
  "Aposentado(a) ativo",
  "Investidor(a)",
]

export function RegisterForm() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
    company: "",
    position: "",
    industry: "",
    interests: [] as string[],
    bio: "",
    city: "",
    country: "Brasil",
    lookingFor: [] as string[],
    situation: "", // New field for professional situation
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false) // Password visibility toggle
  const [showConfirmPassword, setShowConfirmPassword] = useState(false) // Confirm password visibility toggle
  const router = useRouter()

  const totalSteps = 6

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const toggleArrayItem = (field: "interests" | "lookingFor", value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field].filter((i) => i !== value) : [...prev[field], value],
    }))
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("A imagem deve ter no máximo 5MB")
        return
      }
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setError("")
    }
  }

  const removeAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
  }

  const nextStep = () => {
    if (step === 1) {
      if (!formData.email || !formData.password || !formData.confirmPassword) {
        setError("Preencha todos os campos")
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setError("As senhas não conferem")
        return
      }
      if (formData.password.length < 8) {
        setError("A senha deve ter no mínimo 8 caracteres")
        return
      }
    }
    if (step === 2) {
      if (!formData.name || !formData.phone || !formData.city) {
        setError("Preencha os campos obrigatórios")
        return
      }
      if (!formData.situation) {
        setError("Selecione sua situação profissional")
        return
      }
    }
    if (step === 3) {
      if (!formData.industry) {
        setError("Selecione uma área de interesse/atuação")
        return
      }
    }
    if (step === 4) {
      if (formData.lookingFor.length === 0) {
        setError("Selecione pelo menos um objetivo")
        return
      }
    }
    if (step === 5) {
      if (!avatarFile) {
        setError("Adicione uma foto de perfil")
        return
      }
    }
    setError("")
    setStep((prev) => prev + 1)
  }

  const prevStep = () => {
    setError("")
    setStep((prev) => prev - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const supabase = createClient()

      // 1. Create user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin,
          data: {
            full_name: formData.name, // Use full_name instead of name
            phone: formData.phone,
            city: formData.city,
            country: formData.country,
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

      // 2. Upload avatar
      let avatarUrl = null
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop()
        const fileName = `${authData.user.id}-${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, avatarFile, {
          cacheControl: "3600",
          upsert: true,
        })

        if (!uploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("avatars").getPublicUrl(fileName)
          avatarUrl = publicUrl
        }
      }

      // 3. Wait a moment for trigger to create profile, then UPSERT to ensure it's saved
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const profileData = {
        id: authData.user.id,
        email: formData.email,
        full_name: formData.name, // Use full_name (table column name)
        phone: formData.phone,
        company: formData.company || null,
        position: formData.position || null,
        situation: formData.situation,
        industry: formData.industry,
        city: formData.city,
        country: formData.country,
        bio: formData.bio || null,
        interests: formData.interests,
        looking_for: formData.lookingFor,
        avatar_url: avatarUrl,
        onboarding_completed: true,
      }

      const { error: profileError } = await supabase.from("profiles").upsert(profileData, {
        onConflict: "id",
      })

      if (profileError) {
        console.error("[v0] Profile upsert error:", profileError)
        // Try one more time with a longer wait
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const { error: retryError } = await supabase.from("profiles").upsert(profileData, {
          onConflict: "id",
        })
        if (retryError) {
          console.error("[v0] Profile retry error:", retryError)
        }
      }

      // 4. Redirect to dashboard
      router.push("/dashboard")
    } catch (err) {
      console.error(err)
      setError("Ocorreu um erro. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <ConnextLogo className="mx-auto mb-4" />
      </div>

      {/* Progress Bar */}
      <div className="flex gap-1 mb-6">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? "gradient-bg" : "bg-secondary"}`}
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
                    className="pl-10 pr-10 bg-card/50 border-border/50 text-foreground backdrop-blur-sm focus:border-primary"
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
                    className="pl-10 pr-10 bg-card/50 border-border/50 text-foreground backdrop-blur-sm focus:border-primary"
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

        {/* Step 2: Personal Info */}
        {step === 2 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">Informações pessoais</h1>
              <p className="text-muted-foreground text-sm mt-1">Conte-nos mais sobre você.</p>
            </div>

            <div className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground">
                  WhatsApp *
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+55 11 99999-9999"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="pl-10 bg-card/50 border-border/50 text-foreground placeholder:text-muted-foreground backdrop-blur-sm focus:border-primary"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">Usado para conexões após match</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="text-foreground">
                  Cidade *
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="city"
                    placeholder="Sua cidade"
                    value={formData.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    className="pl-10 bg-card/50 border-border/50 text-foreground placeholder:text-muted-foreground backdrop-blur-sm focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Situação Profissional *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {situationOptions.map((situation) => (
                    <button
                      key={situation}
                      type="button"
                      onClick={() => updateField("situation", situation)}
                      className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                        formData.situation === situation
                          ? "gradient-bg text-primary-foreground border-transparent"
                          : "bg-card/50 text-foreground border-border/50 hover:border-primary/50 backdrop-blur-sm"
                      }`}
                    >
                      {situation}
                    </button>
                  ))}
                </div>
              </div>

              {(formData.situation === "Trabalhando em empresa" || formData.situation === "Empreendedor(a)") && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-foreground">
                      Empresa (opcional)
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="company"
                        placeholder="Nome da empresa"
                        value={formData.company}
                        onChange={(e) => updateField("company", e.target.value)}
                        className="pl-10 bg-card/50 border-border/50 text-foreground placeholder:text-muted-foreground backdrop-blur-sm focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position" className="text-foreground">
                      Cargo (opcional)
                    </Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="position"
                        placeholder="Seu cargo"
                        value={formData.position}
                        onChange={(e) => updateField("position", e.target.value)}
                        className="pl-10 bg-card/50 border-border/50 text-foreground placeholder:text-muted-foreground backdrop-blur-sm focus:border-primary"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Step 3: Industry & Interests */}
        {step === 3 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">Área de Interesse</h1>
              <p className="text-muted-foreground text-sm mt-1">Selecione sua área principal.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Área de atuação/interesse *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-2">
                  {industries.map((ind) => (
                    <button
                      key={ind}
                      type="button"
                      onClick={() => updateField("industry", ind)}
                      className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                        formData.industry === ind
                          ? "gradient-bg text-primary-foreground border-transparent glow-orange"
                          : "bg-card/50 text-foreground border-border/50 hover:border-primary/50 backdrop-blur-sm"
                      }`}
                    >
                      {ind}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Interesses (selecione até 5)</Label>
                <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-2">
                  {interests.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => {
                        if (formData.interests.length < 5 || formData.interests.includes(interest)) {
                          toggleArrayItem("interests", interest)
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full border text-sm transition-all ${
                        formData.interests.includes(interest)
                          ? "gradient-bg text-primary-foreground border-transparent"
                          : "bg-card/50 text-foreground border-border/50 hover:border-primary/50 backdrop-blur-sm"
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 4: Looking For */}
        {step === 4 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">O que você busca?</h1>
              <p className="text-muted-foreground text-sm mt-1">Selecione seus objetivos.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Estou buscando (selecione pelo menos 1) *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {lookingForOptions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleArrayItem("lookingFor", item)}
                      className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                        formData.lookingFor.includes(item)
                          ? "gradient-bg text-primary-foreground border-transparent"
                          : "bg-card/50 text-foreground border-border/50 hover:border-primary/50 backdrop-blur-sm"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-foreground">
                  Bio (opcional)
                </Label>
                <Textarea
                  id="bio"
                  placeholder="Conte um pouco sobre você e o que busca..."
                  value={formData.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                  className="bg-card/50 border-border/50 text-foreground placeholder:text-muted-foreground backdrop-blur-sm focus:border-primary min-h-[100px]"
                  maxLength={300}
                />
                <p className="text-xs text-muted-foreground text-right">{formData.bio.length}/300</p>
              </div>
            </div>
          </>
        )}

        {/* Step 5: Photo */}
        {step === 5 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">Sua foto</h1>
              <p className="text-muted-foreground text-sm mt-1">Adicione uma foto profissional.</p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                {avatarPreview ? (
                  <div className="relative">
                    <img
                      src={avatarPreview || "/placeholder.svg"}
                      alt="Preview"
                      className="w-40 h-40 rounded-full object-cover border-4 border-primary/50"
                    />
                    <button
                      type="button"
                      onClick={removeAvatar}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-destructive rounded-full flex items-center justify-center text-white hover:bg-destructive/80 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="w-40 h-40 rounded-full border-2 border-dashed border-border/50 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors bg-card/30 backdrop-blur-sm">
                    <Camera className="w-10 h-10 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Adicionar foto</span>
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                )}
                <p className="text-xs text-muted-foreground text-center">
                  Use uma foto profissional onde seu rosto esteja visível. <br />
                  Máximo 5MB.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Step 6: Confirmation */}
        {step === 6 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">Tudo pronto!</h1>
              <p className="text-muted-foreground text-sm mt-1">Revise suas informações.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-card/50 rounded-xl border border-border/50">
                {avatarPreview && (
                  <img
                    src={avatarPreview || "/placeholder.svg"}
                    alt="Seu avatar"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                )}
                <div>
                  <h3 className="font-semibold text-foreground">{formData.name}</h3>
                  <p className="text-sm text-muted-foreground">{formData.situation}</p>
                  {formData.company && <p className="text-sm text-muted-foreground">{formData.company}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-card/30 rounded-lg">
                  <p className="text-muted-foreground">Cidade</p>
                  <p className="text-foreground font-medium">{formData.city}</p>
                </div>
                <div className="p-3 bg-card/30 rounded-lg">
                  <p className="text-muted-foreground">Área</p>
                  <p className="text-foreground font-medium">{formData.industry}</p>
                </div>
              </div>

              {formData.interests.length > 0 && (
                <div className="p-3 bg-card/30 rounded-lg">
                  <p className="text-muted-foreground text-sm mb-2">Interesses</p>
                  <div className="flex flex-wrap gap-1">
                    {formData.interests.map((i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">
                        {i}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-card/30 rounded-lg">
                <p className="text-muted-foreground text-sm mb-2">Buscando</p>
                <div className="flex flex-wrap gap-1">
                  {formData.lookingFor.map((i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-secondary text-foreground rounded-full">
                      {i}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              className="flex-1 bg-card/50 border-border/50 backdrop-blur-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}

          {step < totalSteps ? (
            <Button type="button" onClick={nextStep} className="flex-1 gradient-bg text-primary-foreground">
              Continuar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 gradient-bg text-primary-foreground glow-orange"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando conta...
                </>
              ) : (
                <>
                  Criar Conta
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>

        {step === 1 && (
          <p className="text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Faça login
            </Link>
          </p>
        )}
      </form>
    </div>
  )
}
