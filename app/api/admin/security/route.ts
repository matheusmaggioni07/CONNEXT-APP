import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAuditLogs, getMetricsRange, getOnlineUsersCount, isIPBlocked, blockIP, unblockIP } from "@/lib/redis"

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.from("profiles").select("email, role").eq("id", userId).single()

  // Check if user has admin role in database
  if (data?.role === "admin") {
    return true
  }

  // Fallback: check env variable if set (optional)
  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || []
  if (adminEmails.length > 0 && adminEmails.includes(data?.email || "")) {
    return true
  }

  // Default admin: first user with specific email patterns (owner)
  const ownerEmails = ["matheusmaggioni07@gmail.com"]
  return ownerEmails.includes(data?.email || "")
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    if (action === "audit") {
      const logs = await getAuditLogs(undefined, 100)
      return NextResponse.json({ logs })
    }

    if (action === "metrics") {
      const [totalRequests, blockedRequests, rateLimitedRequests] = await Promise.all([
        getMetricsRange("total_requests", 7),
        getMetricsRange("blocked_requests", 7),
        getMetricsRange("rate_limited_requests", 7),
      ])

      return NextResponse.json({
        totalRequests,
        blockedRequests,
        rateLimitedRequests,
      })
    }

    if (action === "online") {
      const count = await getOnlineUsersCount()
      return NextResponse.json({ onlineUsers: count })
    }

    // Dashboard geral
    const [onlineUsers, logs, totalRequests] = await Promise.all([
      getOnlineUsersCount(),
      getAuditLogs(undefined, 20),
      getMetricsRange("total_requests", 7),
    ])

    return NextResponse.json({
      onlineUsers,
      recentActivity: logs,
      requestsLast7Days: totalRequests,
    })
  } catch (error) {
    console.error("Security API error:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const body = await request.json()
    const { action, ip, duration, reason } = body

    if (action === "block_ip") {
      if (!ip) {
        return NextResponse.json({ error: "IP é obrigatório" }, { status: 400 })
      }
      await blockIP(ip, duration || 3600, reason || "manual_block")
      return NextResponse.json({ success: true, message: `IP ${ip} bloqueado` })
    }

    if (action === "unblock_ip") {
      if (!ip) {
        return NextResponse.json({ error: "IP é obrigatório" }, { status: 400 })
      }
      await unblockIP(ip)
      return NextResponse.json({ success: true, message: `IP ${ip} desbloqueado` })
    }

    if (action === "check_ip") {
      if (!ip) {
        return NextResponse.json({ error: "IP é obrigatório" }, { status: 400 })
      }
      const blocked = await isIPBlocked(ip)
      return NextResponse.json({ ip, blocked })
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
  } catch (error) {
    console.error("Security API error:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
