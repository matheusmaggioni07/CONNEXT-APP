"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConnextLogo } from "@/components/ui/connext-logo"
import { createClient } from "@/lib/supabase/client"
import { Mail, Lock, AlertCircle, Sparkles } from "lucide-react"
import Link from "next/link"
import { OAuthButtons } from "./oauth-buttons"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    const supabase = createClient()

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message === "Invalid login credentials" ? "Email ou senha incorretos" : authError.message)
      setIsLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background futuristic-grid flex">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-secondary/10 rounded-full blur-[100px]" />
      </div>

      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md">
          <Link href="/" className="block mb-8">
            <ConnextLogo size="lg" />
          </Link>

          <h1 className="text-3xl font-bold text-foreground mb-2">Bem-vindo de volta</h1>
          <p className="text-muted-foreground mb-8">Entre com seu email para continuar.</p>

          {error && (
            <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6 backdrop-blur-sm">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-card/50 border-border/50 text-foreground placeholder:text-muted-foreground backdrop-blur-sm focus:border-primary focus:ring-primary/20"
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-card/50 border-border/50 text-foreground backdrop-blur-sm focus:border-primary focus:ring-primary/20"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gradient-bg text-primary-foreground hover:opacity-90 glow-orange"
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-6">
            <OAuthButtons />
          </div>

          <p className="text-center text-muted-foreground mt-6">
            Não tem uma conta?{" "}
            <Link href="/register" className="gradient-text font-semibold hover:underline">
              Criar conta
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Visual - CHANGE: More realistic image */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-8 relative">
        <div className="max-w-lg relative z-10">
          <div className="gradient-border rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm p-8">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Profissionais verificados</span>
            </div>
            <img src="/professionals-networking-meeting-office-diverse-te.jpg" alt="Networking" className="rounded-2xl mb-6 w-full" />
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Conecte-se com <span className="gradient-text">profissionais verificados</span>
            </h2>
            <p className="text-muted-foreground">
              O Connext conecta você com profissionais reais através de videochamadas e networking inteligente.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
