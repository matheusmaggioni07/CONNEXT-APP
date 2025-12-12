import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

const ALLOWED_STRIPE_IPS = [
  // Stripe webhook IPs (production)
  "3.18.12.63",
  "3.130.192.231",
  "13.235.14.237",
  "13.235.122.149",
  "18.211.135.69",
  "35.154.171.200",
  "52.15.183.38",
  "54.88.130.119",
  "54.88.130.237",
  "54.187.174.169",
  "54.187.205.235",
  "54.187.216.72",
]

// Use service role for webhook to bypass RLS
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    console.error("[Stripe Webhook] Missing signature")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verifica se o corpo não está vazio
  if (!body || body.length === 0) {
    console.error("[Stripe Webhook] Empty body")
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }

  // Limite de tamanho do payload (1MB)
  if (body.length > 1024 * 1024) {
    console.error("[Stripe Webhook] Payload too large")
    return NextResponse.json({ error: "Payload too large" }, { status: 413 })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err)
    // Não revela detalhes do erro
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  console.log(`[Stripe Webhook] Processing event: ${event.type}`)

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        if (!customerId) {
          console.error("[Stripe Webhook] No customer ID in session")
          break
        }

        // Get user from customer ID in profiles
        const { data: profile, error } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single()

        if (error || !profile) {
          console.error("[Stripe Webhook] Profile not found for customer:", customerId)
          break
        }

        // Update profile with subscription info
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            stripe_subscription_id: subscriptionId,
            plan: "pro",
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id)

        if (updateError) {
          console.error("[Stripe Webhook] Error updating profile:", updateError)
        } else {
          console.log(`[Stripe Webhook] Upgraded user ${profile.id} to pro`)
        }
        break
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object
        const customerId = sub.customer as string
        const status = sub.status

        if (!customerId) break

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single()

        if (profile) {
          const isPro = status === "active" || status === "trialing"

          await supabaseAdmin
            .from("profiles")
            .update({
              plan: isPro ? "pro" : "free",
              stripe_subscription_id: isPro ? sub.id : null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", profile.id)

          console.log(`[Stripe Webhook] Updated user ${profile.id} plan to ${isPro ? "pro" : "free"}`)
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object
        const customerId = invoice.customer as string

        if (!customerId) break

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id, email")
          .eq("stripe_customer_id", customerId)
          .single()

        if (profile) {
          console.log(`[Stripe Webhook] Payment failed for user ${profile.id}`)
          // TODO: Send notification email
        }
        break
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error("[Stripe Webhook] Error processing event:", err)
    // Não retorna erro para o Stripe não reenviar infinitamente
  }

  return NextResponse.json({ received: true })
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
