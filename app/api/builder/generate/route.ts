"use client"

import { generateFallbackCode } from "./fallback"
import { generateSiteContent } from "./generate-site-content"

export async function POST(req: Request) {
  const { prompt, projectContext, history } = await req.json()

  console.log("[v0] Builder API called with prompt:", prompt?.substring(0, 100))

  try {
    const { code, explanation, remainingRequests } = await generateSiteContent(prompt, projectContext, history)

    return Response.json({
      code,
      explanation,
      remainingRequests,
    })
  } catch (error) {
    console.error("[v0] Builder Error:", error)

    const fallbackCode = generateFallbackCode(prompt)

    return Response.json({
      code: fallbackCode,
      explanation: "Site gerado! Tente novamente com mais detalhes para um resultado ainda melhor.",
      remainingRequests: 20,
    })
  }
}
