"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Check, Crown, Sparkles, Heart, Video, Star, Shield, Zap } from "lucide-react"
import { createCheckoutSession } from "@/app/actions/stripe"
import { loadStripe } from "@stripe/stripe-js"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import Link from "next/link"

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

  const fetchClientSecret = useCallback(async () => {
    const result = await createCheckoutSession()
    if (result.error) {
      alert(result.error)
      return ""
    }
    return result.clientSecret || ""
  }, [])

  if (showCheckout) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Checkout</h1>
              <p className="text-muted-foreground">Complete sua assinatura Pro</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowCheckout(false)}
              className="border-border text-foreground bg-transparent"
            >
              Voltar
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
