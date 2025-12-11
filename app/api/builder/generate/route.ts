import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateCode } from "./actions"

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const MAX_REQUESTS_PER_HOUR = 20

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = Date.now()
    const userRateLimit = rateLimitMap.get(user.id)

    if (userRateLimit) {
      if (now < userRateLimit.resetAt) {
        if (userRateLimit.count >= MAX_REQUESTS_PER_HOUR) {
          return NextResponse.json(
            {
              error: "Limite de requisições atingido. Aguarde 1 hora ou faça upgrade para PRO.",
              remainingTime: Math.ceil((userRateLimit.resetAt - now) / 60000),
            },
            { status: 429 },
          )
        }
        userRateLimit.count++
      } else {
        rateLimitMap.set(user.id, { count: 1, resetAt: now + 3600000 })
      }
    } else {
      rateLimitMap.set(user.id, { count: 1, resetAt: now + 3600000 })
    }

    const { prompt, projectContext, history } = await req.json()

    const { code, explanation, remainingRequests } = await generateCode({
      prompt,
      projectContext,
      history,
    })

    return NextResponse.json({
      code,
      explanation,
      remainingRequests,
    })
  } catch (error: any) {
    console.error("[Builder] Error generating code:", error)

    if (error?.message?.includes("credit") || error?.message?.includes("billing")) {
      return NextResponse.json(
        {
          error: "Créditos insuficientes. Por favor, verifique sua conta Vercel.",
          fallback: true,
        },
        { status: 402 },
      )
    }

    return NextResponse.json(
      {
        error: "Falha ao gerar código. Tente novamente.",
        fallback: true,
      },
      { status: 500 },
    )
  }
}
