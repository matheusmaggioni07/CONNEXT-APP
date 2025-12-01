"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/lib/supabase/client"
import { Loader2, FileText, Shield, Cookie } from "lucide-react"
import Link from "next/link"

interface TermsModalProps {
  userId: string
  onAccept: () => void
}

export function TermsModal({ userId, onAccept }: TermsModalProps) {
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleAccept = async () => {
    if (!accepted) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
        })
        .eq("id", userId)

      if (!error) {
        onAccept()
      }
    } catch (error) {
      console.error("Error accepting terms:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="text-center mb-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 rounded-full bg-gradient-to-r from-primary to-pink-500 flex items-center justify-center">
            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Bem-vindo ao Connext!</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Antes de começar, precisamos que você aceite nossos termos e políticas.
          </p>
        </div>

        <div className="space-y-2 sm:space-y-3 mb-4 flex-shrink-0">
          <Link
            href="/termos"
            target="_blank"
            className="flex items-center gap-3 p-2.5 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <FileText className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-medium text-sm sm:text-base text-foreground">Termos de Uso</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Regras de utilização da plataforma</p>
            </div>
          </Link>

          <Link
            href="/privacidade"
            target="_blank"
            className="flex items-center gap-3 p-2.5 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <Shield className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-medium text-sm sm:text-base text-foreground">Política de Privacidade</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Como protegemos seus dados</p>
            </div>
          </Link>

          <Link
            href="/cookies"
            target="_blank"
            className="flex items-center gap-3 p-2.5 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <Cookie className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-medium text-sm sm:text-base text-foreground">Política de Cookies</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Uso de cookies no site</p>
            </div>
          </Link>
        </div>

        <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg bg-primary/10 border border-primary/20 mb-4 flex-shrink-0">
          <Checkbox
            id="terms"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked as boolean)}
            className="mt-0.5"
          />
          <label htmlFor="terms" className="text-xs sm:text-sm text-foreground cursor-pointer">
            Li e aceito os <strong>Termos de Uso</strong>, a <strong>Política de Privacidade</strong> e a{" "}
            <strong>Política de Cookies</strong> do Connext App.
          </label>
        </div>

        <Button
          onClick={handleAccept}
          disabled={!accepted || loading}
          className="w-full bg-gradient-to-r from-primary to-pink-500 hover:opacity-90 flex-shrink-0 py-3"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            "Aceitar e Continuar"
          )}
        </Button>
      </div>
    </div>
  )
}
