import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

// Use service role for webhook to bypass RLS
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object
      const customerId = session.customer as string
      const subscriptionId = session.subscription as string

      // Get user from customer ID in profiles
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single()

      if (profile) {
        // Update profile with subscription info and upgrade to pro
        await supabaseAdmin
          .from("profiles")
          .update({
            stripe_subscription_id: subscriptionId,
            plan: "pro",
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id)
      }
      break
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object
      const customerId = sub.customer as string
      const status = sub.status

      // Get user from customer ID in profiles
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
      }
      break
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object
      const customerId = invoice.customer as string

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single()

      if (profile) {
        // Could send email notification here
        console.log(`Payment failed for user ${profile.id}`)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
