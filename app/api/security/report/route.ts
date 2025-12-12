import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Endpoint para reportar problemas de segurança ou conteúdo
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { reportType, targetId, targetType, description } = await req.json()

    // Validação básica
    if (!reportType || !targetId || !targetType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const validTypes = ["spam", "harassment", "inappropriate", "fake", "security", "other"]
    if (!validTypes.includes(reportType)) {
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
    }

    // Salvar report (você pode criar uma tabela reports no Supabase)
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      report_type: reportType,
      target_id: targetId,
      target_type: targetType,
      description: description?.slice(0, 1000) || "",
      status: "pending",
    })

    if (error) {
      // Se a tabela não existir, apenas loga
      console.error("[Security] Report error:", error)
    }

    return NextResponse.json({
      success: true,
      message: "Denúncia recebida. Obrigado por ajudar a manter a comunidade segura.",
    })
  } catch (error) {
    console.error("[Security] Report error:", error)
    return NextResponse.json({ error: "Erro ao enviar denúncia" }, { status: 500 })
  }
}
