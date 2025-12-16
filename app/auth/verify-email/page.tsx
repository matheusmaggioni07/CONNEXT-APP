"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ConnextLogo } from "@/components/ui/connext-logo"
import { Mail, CheckCircle2, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const [isChecking, setIsChecking] = useState(false)
  const [status, setStatus] = useState<"waiting" | "verified" | "error">("waiting")
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
          setTimeout(() => {
            router.push("/dashboard")
          }, 2000)
        }
      } catch (err) {
        console.error("Error checking verification:", err)
      }
      setIsChecking(false)
    }

    const timer = setInterval(checkVerification, 2000)
    checkVerification()

    return () => clearInterval(timer)
  }, [supabase, router])

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-3xl p-8 max-w-md w-full text-center">
        <ConnextLogo className="mx-auto mb-6" />

        {status === "waiting" && (
          <>
            <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Mail className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Confirme seu Email</h1>
            <p className="text-muted-foreground mb-4">Enviamos um link de confirmação para:</p>
            <p className="font-semibold text-foreground mb-6 break-all">{email}</p>
            <p className="text-sm text-muted-foreground">
              Clique no link no email para confirmar sua conta. Esta página atualizará automaticamente.
            </p>
          </>
        )}

        {status === "verified" && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6 animate-bounce">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Email Confirmado!</h1>
            <p className="text-muted-foreground">Sua conta foi verificada com sucesso. Redirecionando...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Erro na Verificação</h1>
            <p className="text-muted-foreground mb-6">Ocorreu um problema ao verificar seu email. Tente novamente.</p>
            <Button onClick={() => router.push("/auth/login")} className="w-full gradient-bg text-primary-foreground">
              Voltar ao Login
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
