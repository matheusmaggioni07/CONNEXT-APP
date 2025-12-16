"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Check, Crown, Sparkles, Heart, Video, Star, Shield, Zap, Copy, QrCode, X } from "lucide-react"
import { createCheckoutSession } from "@/app/actions/stripe"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import Link from "next/link"
import Image from "next/image"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const plans = {
  free: {
    name: "Free",
    price: "R$0",
    period: "/mês",
    description: "Perfeito para começar",
    features: [
      { text: "5 likes por dia", icon: Heart },
      { text: "5 videochamadas por dia", icon: Video },
      { text: "Perfil básico", icon: Star },
      { text: "Matches ilimitados", icon: Sparkles },
    ],
    cta: "Plano Atual",
    highlighted: false,
  },
  pro: {
    name: "Pro",
    price: "R$49",
    period: "/mês",
    description: "Para networking sério",
    trial: "7 dias grátis",
    features: [
      { text: "Likes ilimitados", icon: Heart },
      { text: "Videochamadas ilimitadas", icon: Video },
      { text: "Perfil destacado", icon: Star },
      { text: "Filtros avançados", icon: Zap },
      { text: "Suporte prioritário", icon: Shield },
      { text: "Badge Pro exclusivo", icon: Crown },
    ],
    cta: "Começar 7 dias grátis",
    highlighted: true,
  },
}

export default function UpgradePage() {
  const [showCheckout, setShowCheckout] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "pix" | null>(null)
  const [pixData, setPixData] = useState<any>(null)
  const [pixLoading, setPixLoading] = useState(false)
  const [pixCopied, setPixCopied] = useState(false)

  const fetchClientSecret = useCallback(async () => {
    const result = await createCheckoutSession()
    if (result.error) {
      alert(result.error)
      return ""
    }
    return result.clientSecret || ""
  }, [])

  const generatePixQR = async () => {
    setPixLoading(true)
    try {
      const response = await fetch("/api/pix/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 4990 }), // R$49.90 em centavos
      })

      if (!response.ok) throw new Error("Erro ao gerar PIX")

      const data = await response.json()
      setPixData(data)
      setPaymentMethod("pix")
    } catch (error) {
      alert("Erro ao gerar QR code PIX. Tente novamente.")
      console.error(error)
    } finally {
      setPixLoading(false)
    }
  }

  const copyPixKey = () => {
    if (pixData?.copyPasteKey) {
      navigator.clipboard.writeText(pixData.copyPasteKey)
      setPixCopied(true)
      setTimeout(() => setPixCopied(false), 2000)
    }
  }

  if (paymentMethod === "pix" && pixData) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Pagamento com PIX</h1>
              <p className="text-muted-foreground">Escaneie o QR code ou copie a chave</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setPaymentMethod(null)
                setPixData(null)
              }}
              className="border-border text-foreground bg-transparent"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="bg-card rounded-2xl border border-border p-8">
            <div className="space-y-6">
              {/* QR Code */}
              <div className="flex flex-col items-center justify-center p-6 bg-background rounded-lg border border-border">
                {pixData.qrCode && (
                  <Image
                    src={pixData.qrCode || "/placeholder.svg"}
                    alt="QR Code PIX"
                    width={280}
                    height={280}
                    className="rounded-lg"
                    priority
                  />
                )}
                <p className="text-sm text-muted-foreground mt-4">Escaneie para pagar R$ {pixData.amount}</p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground uppercase">Ou copie a chave</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Copy Key */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Chave PIX para copiar e colar:</p>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-background rounded-lg border border-border text-xs font-mono break-all text-foreground max-h-24 overflow-y-auto">
                    {pixData.copyPasteKey}
                  </div>
                  <Button onClick={copyPixKey} className="shrink-0" variant={pixCopied ? "default" : "outline"}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                {pixCopied && <p className="text-xs text-green-600 mt-2">Copiado!</p>}
              </div>

              {/* Info */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm font-semibold text-foreground mb-2">Informações do pagamento:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Valor: R$ {pixData.amount}</li>
                  <li>• Válido por 30 minutos</li>
                  <li>• Confirmação automática após pagamento</li>
                  <li>• Seu plano será ativado imediatamente</li>
                </ul>
              </div>

              {/* Status */}
              <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  ⏳ Aguardando confirmação do pagamento...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (showCheckout && !paymentMethod) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Escolha o método de pagamento</h1>
              <p className="text-muted-foreground">Stripe (Cartão) ou PIX (Instantâneo)</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setShowCheckout(false)
                setPaymentMethod(null)
              }}
              className="border-border text-foreground bg-transparent"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stripe Option */}
            <button
              onClick={() => setPaymentMethod("stripe")}
              className="p-6 border border-border rounded-2xl hover:border-primary transition-colors bg-card hover:bg-card/80 text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Cartão de Crédito</h3>
                  <p className="text-xs text-muted-foreground">via Stripe</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Pague de forma segura com seu cartão de crédito. Aceita parcelamento.
              </p>
              <Button className="w-full gradient-bg text-primary-foreground">Continuar com Stripe</Button>
            </button>

            {/* PIX Option */}
            <button
              onClick={generatePixQR}
              disabled={pixLoading}
              className="p-6 border border-border rounded-2xl hover:border-green-500 transition-colors bg-card hover:bg-card/80 text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">PIX Instantâneo</h3>
                  <p className="text-xs text-muted-foreground">100% seguro e rápido</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {pixLoading ? "Gerando QR code..." : "Pague na hora com PIX. Dinheiro entra em segundos."}
              </p>
              <Button className="w-full bg-transparent" variant="outline" disabled={pixLoading}>
                {pixLoading ? "Gerando..." : "Pagar com PIX"}
              </Button>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (paymentMethod === "stripe") {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Checkout com Cartão</h1>
              <p className="text-muted-foreground">Complete sua assinatura Pro</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setShowCheckout(true)
                setPaymentMethod(null)
              }}
              className="border-border text-foreground bg-transparent"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6">
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <Crown className="w-4 h-4" />
            <span className="text-sm font-medium">Upgrade para Pro</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Desbloqueie todo o potencial do <span className="gradient-text">Connext</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Conecte-se com profissionais ilimitados, destaque seu perfil e acelere seu networking.
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-6">
          {Object.entries(plans).map(([key, plan]) => (
            <div
              key={key}
              className={`relative rounded-2xl border p-6 ${
                plan.highlighted ? "bg-card border-primary shadow-lg shadow-primary/10" : "bg-card/50 border-border"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-bg px-4 py-1 rounded-full text-sm font-medium text-primary-foreground">
                  Mais Popular
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-1">{plan.name}</h2>
                <p className="text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
                {plan.trial && <p className="text-sm text-primary mt-1">{plan.trial}</p>}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        plan.highlighted ? "bg-primary/10" : "bg-secondary"
                      }`}
                    >
                      <feature.icon
                        className={`w-4 h-4 ${plan.highlighted ? "text-primary" : "text-muted-foreground"}`}
                      />
                    </div>
                    <span className="text-foreground">{feature.text}</span>
                  </li>
                ))}
              </ul>

              {plan.highlighted ? (
                <Button
                  className="w-full gradient-bg text-primary-foreground glow-orange"
                  onClick={() => setShowCheckout(true)}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  {plan.cta}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full border-border text-muted-foreground bg-transparent"
                  disabled
                >
                  <Check className="w-4 h-4 mr-2" />
                  {plan.cta}
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* FAQ or Benefits */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Cancele a qualquer momento. Sem compromisso.{" "}
            <Link href="/dashboard" className="gradient-text hover:underline">
              Voltar ao Dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
