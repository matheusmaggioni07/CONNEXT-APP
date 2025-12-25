"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ConnextLogo } from "@/components/ui/connext-logo"
import { Mail, CheckCircle2, AlertCircle, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const [isChecking, setIsChecking] = useState(false)
  const [status, setStatus] = useState<"waiting" | "verified" | "error">("waiting")
  const [checkCount, setCheckCount] = useState(0)
  const supabase = createClient()

  // Check if email is already verified
  useEffect(() => {
    const checkVerification = async () => {
      setIsChecking(true)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user?.email_confirmed_at) {
          setStatus("verified")
          // Give user time to see the success message
          setTimeout(() => {
            router.push("/dashboard")
          }, 2500)
        }

        setCheckCount((prev) => prev + 1)
      } catch (err) {
        console.error("[v0] Error checking verification:", err)
      }
      setIsChecking(false)
    }

    // Start checking immediately and then every 2 seconds
    checkVerification()
    const timer = setInterval(checkVerification, 2000)

    return () => clearInterval(timer)
  }, [supabase, router])

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-3xl p-8 max-w-md w-full text-center space-y-6">
        <ConnextLogo className="mx-auto" />

        {status === "waiting" && (
          <>
            <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center mx-auto animate-pulse">
              <Mail className="w-8 h-8 text-primary-foreground" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Confirme seu Email</h1>
              <p className="text-muted-foreground mb-2">Enviamos um link de confirmação para:</p>
              <p className="font-semibold text-foreground break-all text-sm">{email}</p>
            </div>

            <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
              <p className="text-sm text-foreground font-medium flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                Aguardando confirmação...
              </p>
              <p className="text-xs text-muted-foreground">
                Clique no link no seu email para confirmar a conta. Esta página atualizará automaticamente.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-xs text-muted-foreground">Não recebeu o email?</p>
              <Button variant="outline" className="w-full bg-transparent" onClick={() => router.push("/login")}>
                Voltar ao Login
              </Button>
            </div>
          </>
        )}

        {status === "verified" && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Email Confirmado!</h1>
              <p className="text-muted-foreground">
                Sua conta foi verificada com sucesso. Redirecionando para o dashboard...
              </p>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Erro na Verificação</h1>
              <p className="text-muted-foreground mb-4">
                Ocorreu um problema ao verificar seu email. O link pode ter expirado.
              </p>
            </div>
            <Button onClick={() => router.push("/login")} className="w-full gradient-bg text-primary-foreground">
              Voltar ao Login
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
