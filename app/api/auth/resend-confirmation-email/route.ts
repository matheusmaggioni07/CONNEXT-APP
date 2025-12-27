import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendConfirmationEmail } from "@/lib/email/sender"
import { kv } from "@vercel/kv"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limit: max 5 resends per email per day
    const rateLimitKey = `resend_email:${user.email}:${new Date().toDateString()}`
    const attempts = await kv.incr(rateLimitKey)

    if (attempts === 1) {
      await kv.expire(rateLimitKey, 24 * 60 * 60)
    }

    if (attempts > 5) {
      return NextResponse.json({ error: "Você atingiu o limite de resends. Tente novamente amanhã." }, { status: 429 })
    }

    const confirmationBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.connextapp.com.br"
    const redirectUrl = `${confirmationBaseUrl}/auth/callback`

    const success = await sendConfirmationEmail(user.email!, user.user_metadata?.full_name || "User", redirectUrl)

    if (success) {
      return NextResponse.json({
        success: true,
        message: "Email de confirmação enviado! Verifique sua caixa de entrada (e spam).",
        attemptsRemaining: 5 - attempts,
      })
    } else {
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
    }
  } catch (error) {
    console.error("[v0] Resend email error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
