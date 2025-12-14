"use client"

import type { GenerateCodeParams } from "./types"

export async function generateCode({ prompt, projectContext, history, userId }: GenerateCodeParams): Promise<{
  code: string
  explanation: string
  remainingRequests: number
}> {
  const response = await fetch("/api/builder/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, projectContext, history, userId }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Failed to generate code")
  }

  const data = await response.json()

  return {
    code: data.code,
    explanation: data.explanation,
    remainingRequests: data.remainingRequests,
  }
}
