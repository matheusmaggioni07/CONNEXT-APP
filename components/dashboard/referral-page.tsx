"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Gift, Copy, Check, Users, Coins, Share2, Mail, MessageCircle, Sparkles, Trophy } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export function ReferralPage() {
  const [copied, setCopied] = useState(false)
  const [referralCode, setReferralCode] = useState("")
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    pendingReferrals: 0,
    totalEarnings: 0,
    monthlyEarnings: 0,
  })

  const supabase = createClient()

  useEffect(() => {
    const loadReferralData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        // Generate referral code from user ID
        const code = user.id.substring(0, 8).toUpperCase()
        setReferralCode(code)

        // Load referral stats (would come from database in production)
        // For now, using placeholder values
        setReferralStats({
          totalReferrals: 0,
          pendingReferrals: 0,
          totalEarnings: 0,
          monthlyEarnings: 0,
        })
      }
    }
    loadReferralData()
  }, [])

  const referralLink = `https://connextapp.com.br/register?ref=${referralCode}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const shareViaWhatsApp = () => {
    const message = encodeURIComponent(
      `Conheça o Connext - a primeira plataforma de networking profissional via vídeo! Use meu link para se cadastrar: ${referralLink}`,
    )
    window.open(`https://wa.me/?text=${message}`, "_blank")
  }

  const shareViaEmail = () => {
    const subject = encodeURIComponent("Convite para o Connext - Networking via Vídeo")
    const body = encodeURIComponent(
      `Olá!\n\nQuero te convidar para conhecer o Connext, a primeira plataforma de networking profissional via videochamada.\n\nUse meu link para se cadastrar e ambos ganhamos R$20 em créditos:\n${referralLink}\n\nAté lá!`,
    )
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank")
  }

  const monthlyGoal = 200
  const progressPercent = (referralStats.monthlyEarnings / monthlyGoal) * 100

  return (
    <div className="h-full overflow-auto p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#ff6b35] to-[#ec4899] flex items-center justify-center">
            <Gift className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Convide amigos e ganhe <span className="gradient-text">R$200</span> por mês
          </h1>
          <p className="text-muted-foreground">Compartilhe o Connext e ganhe créditos para usar na plataforma</p>
        </div>

        {/* Progress Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Acompanhe seu progresso mensal</span>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                <Trophy className="w-3 h-3 mr-1" />
                Meta mensal
              </Badge>
            </div>
            <Progress value={progressPercent} className="h-3 mb-3" />
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">R${referralStats.monthlyEarnings}</span>
              <span className="text-muted-foreground">R${monthlyGoal}</span>
            </div>
          </CardContent>
        </Card>

        {/* Share Link Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              Compartilhe seu link
            </CardTitle>
            <CardDescription>
              Cada pessoa que se cadastrar usando seu link dá direito a R$10 em créditos para você
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Link input */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-sm truncate border border-border">
                {referralLink}
              </div>
              <Button onClick={copyToClipboard} className="shrink-0">
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar
                  </>
                )}
              </Button>
            </div>

            {/* Share buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20"
                onClick={shareViaWhatsApp}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              <Button variant="outline" className="flex-1 bg-transparent" onClick={shareViaEmail}>
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle>Como funciona</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  icon: Share2,
                  title: "Copie o link",
                  description: "e convide seus amigos.",
                },
                {
                  icon: Mail,
                  title: "Cada inscrição",
                  description: "dá direito a R$10 em créditos.",
                },
                {
                  icon: Users,
                  title: "Ao se inscreverem",
                  description: ", ambos ganham R$20 em créditos.",
                },
                {
                  icon: Coins,
                  title: "Os créditos",
                  description: "se aplicam ao seu plano pessoal.",
                },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {step.title}
                      <span className="font-normal text-muted-foreground"> {step.description}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{referralStats.totalReferrals}</p>
              <p className="text-sm text-muted-foreground">Indicações</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Coins className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">R${referralStats.totalEarnings}</p>
              <p className="text-sm text-muted-foreground">Total ganho</p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            Faça as contas: 20 indicações = R$200/mês
            <Sparkles className="w-4 h-4" />
          </p>
        </div>
      </div>
    </div>
  )
}
