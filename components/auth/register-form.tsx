"use client"

import type React from "react"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
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
  AlertCircle,
  Check,
  Sparkles,
  Camera,
  Upload,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { OAuthButtons } from "./oauth-buttons"

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
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const updateField = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const toggleArrayItem = (field: "interests" | "lookingFor", item: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(item) ? prev[field].filter((i) => i !== item) : [...prev[field], item],
    }))
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("A imagem deve ter no máximo 5MB")
        return
      }
      if (!file.type.startsWith("image/")) {
        setError("Por favor, selecione uma imagem válida")
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

  const validateStep = () => {
    setError("")

    if (step === 1) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        setError("Por favor, insira um email válido.")
        return false
      }

      if (formData.password.length < 8) {
        setError("A senha deve ter pelo menos 8 caracteres.")
        return false
      }

      if (formData.password !== formData.confirmPassword) {
        setError("As senhas não coincidem.")
        return false
      }
    }

    if (step === 2) {
      if (!formData.name || !formData.phone || !formData.company || !formData.position) {
        setError("Preencha todos os campos obrigatórios.")
        return false
      }
    }

    if (step === 3) {
      if (!formData.industry || formData.interests.length === 0) {
        setError("Selecione sua indústria e pelo menos um interesse.")
        return false
      }
    }

    if (step === 4) {
      if (formData.lookingFor.length === 0) {
        setError("Selecione pelo menos um objetivo.")
        return false
      }
    }

    if (step === 5) {
      if (!avatarFile) {
        setError("Por favor, adicione uma foto de perfil.")
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

    if (!validateStep()) return

    if (step < 5) {
      setStep(step + 1)
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
          data: {
            full_name: formData.name,
            phone: formData.phone,
            company: formData.company,
            position: formData.position,
            industry: formData.industry,
            city: formData.city,
            country: formData.country,
            interests: formData.interests,
            looking_for: formData.lookingFor,
            bio: formData.bio,
          },
        },
      })

      if (authError) {
        if (authError.message.includes("already registered")) {
          setError("Este email já está cadastrado. Faça login ou use outro email.")
        } else {
          setError(authError.message)
        }
        setIsLoading(false)
        return
      }

      if (!authData.user) {
        setError("Erro ao criar usuário")
        setIsLoading(false)
        return
      }

      let avatarUrl = null
      if (avatarFile) {
        setIsUploadingAvatar(true)
        const fileExt = avatarFile.name.split(".").pop()
        const fileName = `${authData.user.id}-${Date.now()}.${fileExt}`

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatarFile)

        if (uploadError) {
          console.error("Avatar upload error:", uploadError)
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage.from("avatars").getPublicUrl(fileName)
          avatarUrl = publicUrl
        }
        setIsUploadingAvatar(false)
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.name,
          phone: formData.phone,
          company: formData.company,
          position: formData.position,
          industry: formData.industry,
          city: formData.city,
          country: formData.country,
          interests: formData.interests,
          looking_for: formData.lookingFor,
          bio: formData.bio,
          avatar_url: avatarUrl,
          onboarding_completed: true,
        })
        .eq("id", authData.user.id)

      if (profileError) {
        console.error("Profile update error:", profileError)
      }

      if (!authData.session) {
        router.push("/register/success")
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      setError("Erro ao criar conta. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background futuristic-grid flex">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-secondary/10 rounded-full blur-[100px]" />
      </div>

      {/* Left Side - Visual */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-8 relative">
        <div className="max-w-lg relative z-10">
          <div className="gradient-border rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm p-8">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Junte-se à comunidade</span>
            </div>
            <img
              src="/professional-team-networking-futuristic-neon-colla.jpg"
              alt="Networking"
              className="rounded-2xl mb-6 w-full"
            />
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Junte-se à maior rede de <span className="gradient-text">networking profissional</span>
            </h2>
            <p className="text-muted-foreground">
              Milhares de profissionais já estão fazendo conexões valiosas através de videochamadas no Connext.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md">
          <Link href="/" className="block mb-8">
            <ConnextLogo size="lg" />
          </Link>

          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-colors ${s <= step ? "gradient-bg" : "bg-muted"}`}
              />
            ))}
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">
            {step === 1 && "Crie sua conta"}
            {step === 2 && "Informações profissionais"}
            {step === 3 && "Seus interesses"}
            {step === 4 && "O que você busca?"}
            {step === 5 && "Foto de perfil"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {step === 1 && "Insira seu email para começar."}
            {step === 2 && "Conte-nos mais sobre você."}
            {step === 3 && "Selecione suas áreas de interesse."}
            {step === 4 && "Defina seus objetivos de networking."}
            {step === 5 && "Adicione uma foto para seu perfil."}
          </p>

          {error && (
            <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6 backdrop-blur-sm">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Account */}
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu.email@exemplo.com"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className="pl-10 bg-card/50 border-border/50 text-foreground placeholder:text-muted-foreground backdrop-blur-sm focus:border-primary"
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
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      value={formData.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      className="pl-10 bg-card/50 border-border/50 text-foreground backdrop-blur-sm focus:border-primary"
                      required
                    />
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
                      type="password"
                      placeholder="Confirme sua senha"
                      value={formData.confirmPassword}
                      onChange={(e) => updateField("confirmPassword", e.target.value)}
                      className="pl-10 bg-card/50 border-border/50 text-foreground backdrop-blur-sm focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <OAuthButtons />
                </div>
              </>
            )}

            {/* Step 2: Professional Info */}
            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground">
                    Nome Completo
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
                    WhatsApp
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="phone"
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
                  <Label htmlFor="company" className="text-foreground">
                    Empresa
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="company"
                      placeholder="Nome da empresa"
                      value={formData.company}
                      onChange={(e) => updateField("company", e.target.value)}
                      className="pl-10 bg-card/50 border-border/50 text-foreground placeholder:text-muted-foreground backdrop-blur-sm focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position" className="text-foreground">
                    Cargo
                  </Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="position"
                      placeholder="Seu cargo atual"
                      value={formData.position}
                      onChange={(e) => updateField("position", e.target.value)}
                      className="pl-10 bg-card/50 border-border/50 text-foreground placeholder:text-muted-foreground backdrop-blur-sm focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city" className="text-foreground">
                    Cidade
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
              </>
            )}

            {/* Step 3: Interests */}
            {step === 3 && (
              <>
                <div className="space-y-2">
                  <Label className="text-foreground">Indústria</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {industries.map((ind) => (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => updateField("industry", ind)}
                        className={`px-4 py-2 rounded-lg border text-sm transition-all ${
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
                  <div className="flex flex-wrap gap-2">
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

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-foreground">
                    Bio (opcional)
                  </Label>
                  <Textarea
                    id="bio"
                    placeholder="Conte um pouco sobre você e seus objetivos..."
                    value={formData.bio}
                    onChange={(e) => updateField("bio", e.target.value)}
                    className="bg-card/50 border-border/50 text-foreground placeholder:text-muted-foreground resize-none backdrop-blur-sm focus:border-primary"
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* Step 4: Looking For */}
            {step === 4 && (
              <>
                <div className="space-y-2">
                  <Label className="text-foreground">O que você busca no Connext?</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {lookingForOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleArrayItem("lookingFor", option)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm transition-all ${
                          formData.lookingFor.includes(option)
                            ? "gradient-bg text-primary-foreground border-transparent glow-orange"
                            : "bg-card/50 text-foreground border-border/50 hover:border-primary/50 backdrop-blur-sm"
                        }`}
                      >
                        {formData.lookingFor.includes(option) && <Check className="w-4 h-4" />}
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="gradient-border rounded-lg p-4 bg-card/50 backdrop-blur-sm">
                  <h3 className="font-semibold text-foreground mb-2">Resumo do perfil</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <span className="text-foreground">{formData.name}</span> - {formData.position}
                    </p>
                    <p>{formData.company}</p>
                    <p>
                      {formData.city}, {formData.country}
                    </p>
                    <p className="text-primary">{formData.interests.join(", ")}</p>
                  </div>
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <div className="space-y-4">
                  <Label className="text-foreground">Sua foto de perfil</Label>
                  <p className="text-sm text-muted-foreground">
                    Uma boa foto de perfil aumenta suas chances de conexão em até 80%
                  </p>

                  <div className="flex flex-col items-center gap-6">
                    {/* Avatar Preview */}
                    <div
                      className="relative w-40 h-40 rounded-full border-4 border-dashed border-border/50 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden group"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {avatarPreview ? (
                        <>
                          <img
                            src={avatarPreview || "/placeholder.svg"}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-8 h-8 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                          <span className="text-sm text-muted-foreground">Clique para adicionar</span>
                        </div>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="border-border/50 text-foreground bg-card/50 hover:bg-card/80"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {avatarPreview ? "Trocar foto" : "Escolher foto"}
                    </Button>
                  </div>

                  <div className="gradient-border rounded-lg p-4 bg-card/50 backdrop-blur-sm mt-6">
                    <h3 className="font-semibold text-foreground mb-2">Dicas para uma boa foto</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        Use uma foto profissional ou casual-profissional
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        Mostre seu rosto claramente
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        Boa iluminação faz diferença
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        Sorria! Transmite confiança
                      </li>
                    </ul>
                  </div>
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex gap-4">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="flex-1 border-border/50 text-foreground bg-card/50 hover:bg-card/80"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              )}
              {step < 5 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 gradient-bg text-primary-foreground glow-orange"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="flex-1 gradient-bg text-primary-foreground glow-orange"
                  disabled={isLoading || isUploadingAvatar}
                >
                  {isLoading || isUploadingAvatar ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isUploadingAvatar ? "Enviando foto..." : "Criando conta..."}
                    </>
                  ) : (
                    <>
                      Criar Conta
                      <Sparkles className="w-4 h-4 ml-2" />
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
      </div>
    </div>
  )
}
