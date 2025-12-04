"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConnextLogo } from "@/components/ui/connext-logo"
import { createClient } from "@/lib/supabase/client"
import { Mail, Lock, AlertCircle, Eye, EyeOff, Users, Zap, Phone } from "lucide-react"
import Link from "next/link"
import { OAuthButtons } from "./oauth-buttons"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const [onlineCount, setOnlineCount] = useState(847)
  const [showMatch, setShowMatch] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineCount((prev) => {
        const change = Math.floor(Math.random() * 11) - 5
        const newCount = prev + change
        return Math.max(800, Math.min(950, newCount))
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setShowMatch(false)
      setTimeout(() => setShowMatch(true), 200)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

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
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-card/50 border-border/50 text-foreground backdrop-blur-sm focus:border-primary focus:ring-primary/20"
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

      {/* Right Side - Video Call Mockup */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-8 relative">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-purple-500/10" />

        <div className="relative w-full max-w-md">
          {/* Main Card - Video Call Interface */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-[#0d0d14]">
            {/* Live indicator */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
              <div className="relative">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping" />
              </div>
              <span className="text-white text-sm font-medium">Ao vivo</span>
            </div>

            {/* Top bar */}
            <div className="bg-[#1a1a2e] px-4 py-3 flex items-center justify-between border-b border-white/5">
              <span className="text-gray-400 text-sm">Video Call</span>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                  A
                </div>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                  M
                </div>
              </div>
            </div>

            {/* Video Grid - 3x3 hexagonal style */}
            <div className="p-6 bg-[#0d0d14]">
              <div className="grid grid-cols-3 gap-3">
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded-xl ${i === 4 ? "bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-500/50 flex items-center justify-center" : "bg-[#1a1a2e]/80"}`}
                  >
                    {i === 4 && (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Phone className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Card */}
            <div className="px-6 pb-6">
              <div className="flex items-center justify-between bg-[#1a1a2e]/50 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 p-0.5">
                    <div className="w-full h-full rounded-full bg-[#1a1a2e] flex items-center justify-center text-white font-bold">
                      AR
                    </div>
                  </div>
                  <div>
                    <p className="text-white font-semibold">Ana Rodrigues</p>
                    <p className="text-gray-400 text-sm">CFO @ FinancePlus</p>
                  </div>
                </div>
                <button className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-5 py-2 rounded-full text-sm font-medium">
                  Conectar
                </button>
              </div>
            </div>
          </div>

          {/* Floating Badge - Novo Match */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-64">
            <div className="relative bg-[#1a1a2e] rounded-2xl p-4 border border-purple-500/30 shadow-xl shadow-purple-500/10">
              {/* Gradient glow */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-sm -z-10" />

              <div className="flex items-center gap-3">
                {/* Avatar with notification */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 p-0.5">
                    <div className="w-full h-full rounded-full bg-[#1a1a2e] flex items-center justify-center">
                      <Zap className="w-5 h-5 text-orange-400" />
                    </div>
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#1a1a2e]">
                    <span className="text-[8px] text-white font-bold">+</span>
                  </div>
                </div>

                <div className="flex-1">
                  <p
                    className={`text-white font-semibold text-sm transition-all duration-200 ${showMatch ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"}`}
                  >
                    Novo Match!
                  </p>
                  <p className="text-gray-400 text-xs flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span className="tabular-nums">{onlineCount}</span> online
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
