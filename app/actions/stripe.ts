"use server"

import { stripe, PLANS } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"

export async function createCheckoutSession() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Não autenticado" }
  }

  // Get profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  let customerId = profile?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile?.full_name,
      metadata: {
        supabase_user_id: user.id,
      },
    })
    customerId = customer.id

    // Save customer ID to profile
    await supabase
      .from("profiles")
      .update({
        stripe_customer_id: customerId,
      })
      .eq("id", user.id)
  }

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    customer: customerId,
    line_items: [
      {
        price: PLANS.pro.priceId!, // Use the real Price ID
        quantity: 1,
      },
    ],
    mode: "subscription",
    subscription_data: {
      trial_period_days: 7,
    },
    redirect_on_completion: "never",
  })

  return { clientSecret: session.client_secret }
}

export async function getSubscriptionStatus() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single()

  return profile?.plan || "free"
}

export async function cancelSubscription() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Não autenticado" }
  }

  const { data: profile } = await supabase.from("profiles").select("stripe_subscription_id").eq("id", user.id).single()

  if (!profile?.stripe_subscription_id) {
    return { error: "Nenhuma assinatura ativa" }
  }

  try {
    await stripe.subscriptions.cancel(profile.stripe_subscription_id)

    await supabase
      .from("profiles")
      .update({
        plan: "free",
        stripe_subscription_id: null,
      })
      .eq("id", user.id)

    return { success: true }
  } catch (error) {
    return { error: "Erro ao cancelar assinatura" }
  }
}
