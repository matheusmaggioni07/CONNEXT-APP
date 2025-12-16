import { generatePIXQRCode } from "@/lib/pix-generator"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const PIX_KEY = "51991822757" // Sua chave PIX cadastrada

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const { amount } = await req.json()

    if (!amount || amount < 100) {
      // Mínimo R$1.00
      return NextResponse.json({ error: "Valor inválido (mínimo R$1.00)" }, { status: 400 })
    }

    const result = await generatePIXQRCode(
      PIX_KEY,
      amount, // já em centavos
      "Connext Plataforma",
      "Sao Paulo",
      `CONNEXT_${user.id}_${Date.now()}`,
    )

    return NextResponse.json({
      qrCode: result.qrCode,
      copyPasteKey: result.copyPasteKey,
      expiresAt: result.expiresAt,
      amount: (amount / 100).toFixed(2),
      pixKey: PIX_KEY,
    })
  } catch (error) {
    console.error("[PIX API] Erro:", error)
    return NextResponse.json({ error: "Erro ao gerar QR code PIX" }, { status: 500 })
  }
}
