"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signUp } from "@/app/actions/auth"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { OnboardingWizard, type OnboardingData } from "@/components/onboarding/onboarding-wizard"

export function SignUpForm() {
  const router = useRouter()
  const [step, setStep] = useState<"signup" | "onboarding">("signup")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!fullName.trim()) {
      setError("Por favor, insira seu nome completo")
      return
    }

    if (!email.trim()) {
      setError("Por favor, insira seu email")
      return
    }

    if (password.length < 6) {
      setError("Senha deve ter pelo menos 6 caracteres")
      return
    }

    if (password !== confirmPassword) {
      setError("As senhas não conferem")
      return
    }

    setIsLoading(true)

    const result = await signUp(email, password, fullName)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      setStep("onboarding")
      setIsLoading(false)
    }
  }

  const handleOnboardingComplete = async (data: OnboardingData) => {
    setIsLoading(true)
    try {
      // TODO: Save onboarding data to profile
      router.push("/dashboard")
    } catch (err) {
      setError("Erro ao completar onboarding")
      setIsLoading(false)
    }
  }

  if (step === "onboarding") {
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Complète seu Perfil</h1>
          <p className="text-muted-foreground mt-2">Responda algumas perguntas para começar</p>
        </div>

        <OnboardingWizard onComplete={handleOnboardingComplete} isLoading={isLoading} />
      </div>
    )
  }

  return (
    <form onSubmit={handleSignUp} className="w-full max-w-md space-y-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Crie sua Conta</h1>
        <p className="text-muted-foreground">Junte-se à comunidade de jovens empreendedores</p>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex gap-2">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="fullName">Nome Completo</Label>
        <Input
          id="fullName"
          type="text"
          placeholder="Seu nome"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar Senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <Button type="submit" disabled={isLoading} className="gradient-bg text-primary-foreground w-full">
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Criar Conta
      </Button>

      <div className="text-center text-sm text-muted-foreground">
        Já tem uma conta?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Faça login
        </Link>
      </div>
    </form>
  )
}
