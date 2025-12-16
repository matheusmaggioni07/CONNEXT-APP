import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Use service role para webhook
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  try {
    const { userId, amount, transactionId, status } = await req.json()

    if (!userId || !amount || !transactionId) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }

    if (status !== "confirmed") {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 })
    }

    // Verifica se a transação já foi processada
    const { data: existingPayment } = await supabaseAdmin
      .from("pix_payments")
      .select("id")
      .eq("transaction_id", transactionId)
      .single()

    if (existingPayment) {
      return NextResponse.json({ error: "Transação já processada" }, { status: 409 })
    }

    // Registra o pagamento PIX
    const { error: paymentError } = await supabaseAdmin.from("pix_payments").insert({
      user_id: userId,
      amount: amount,
      transaction_id: transactionId,
      status: "confirmed",
      created_at: new Date().toISOString(),
    })

    if (paymentError) {
      console.error("[PIX Webhook] Erro ao registrar pagamento:", paymentError)
      return NextResponse.json({ error: "Erro ao registrar pagamento" }, { status: 500 })
    }

    // Atualiza o perfil para plano Pro
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        plan: "pro",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    if (updateError) {
      console.error("[PIX Webhook] Erro ao atualizar perfil:", updateError)
      return NextResponse.json({ error: "Erro ao atualizar plano" }, { status: 500 })
    }

    console.log(`[PIX Webhook] Upgrade confirmado para usuário ${userId}`)

    return NextResponse.json({
      success: true,
      message: "Pagamento processado com sucesso",
    })
  } catch (error) {
    console.error("[PIX Webhook] Erro:", error)
    return NextResponse.json({ error: "Erro ao processar webhook" }, { status: 500 })
  }
}
