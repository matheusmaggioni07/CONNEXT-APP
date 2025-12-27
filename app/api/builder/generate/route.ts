import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { createErrorResponse, handleAPIError } from "@/lib/error-handler"
import { generateFallbackCode } from "./fallback"
import { jsxToHTML } from "@/lib/builder/jsx-to-html"

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const { success, remaining, resetAfter } = await checkRateLimit(ip, RATE_LIMITS.apiGeneral)

    if (!success) {
      return NextResponse.json(createErrorResponse(429, "Too many requests", "RATE_LIMIT_EXCEEDED"), {
        status: 429,
        headers: { "Retry-After": resetAfter.toString() },
      })
    }

    // Auth check
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(createErrorResponse(401, "Unauthorized", "UNAUTHORIZED"), { status: 401 })
    }

    // Parse request
    const body = await request.json().catch(() => ({}))
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : ""

    if (!prompt || prompt.length < 3) {
      const fallbackCode = generateFallbackCode("site profissional")
      return NextResponse.json(
        {
          code: fallbackCode,
          previewHTML: jsxToHTML(fallbackCode),
          explanation: "Digite uma descrição maior (mínimo 3 caracteres)",
        },
        { status: 200 },
      )
    }

    // Safety checks
    if (prompt.length > 5000) {
      return NextResponse.json(createErrorResponse(400, "Prompt is too long (max 5000 characters)", "INVALID_PROMPT"), {
        status: 400,
      })
    }

    // Generate code
    const code = generateFallbackCode(prompt)
    const previewHTML = jsxToHTML(code)

    return NextResponse.json(
      {
        code,
        previewHTML,
        explanation: `Site criado com sucesso para: "${prompt.substring(0, 50)}${prompt.length > 50 ? "..." : ""}"`,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-cache",
          "X-RateLimit-Remaining": remaining.toString(),
        },
      },
    )
  } catch (error) {
    const { statusCode, body } = handleAPIError(error, "Failed to generate site")
    return NextResponse.json(body, { status: statusCode })
  }
}
