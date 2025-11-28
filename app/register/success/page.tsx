import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ConnextLogo } from "@/components/ui/connext-logo"
import { Button } from "@/components/ui/button"
import { Mail, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function RegisterSuccessPage() {
  return (
    <div className="min-h-screen bg-background futuristic-grid flex items-center justify-center p-6">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-secondary/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="block mb-8 text-center">
          <ConnextLogo size="lg" />
        </Link>

        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl text-foreground">Conta criada com sucesso!</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sua conta foi criada. Verifique seu email para confirmar.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Enviamos um link de confirmacao para o seu email. Clique no link para ativar sua conta e comecar a fazer
              conexoes no Connext.
            </p>

            <div className="pt-4 space-y-3">
              <Button asChild className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                <Link href="/login">
                  Ir para o Login
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>

              <p className="text-xs text-muted-foreground">
                Nao recebeu o email? Verifique sua pasta de spam ou{" "}
                <Link href="/register" className="gradient-text hover:underline">
                  tente novamente
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
