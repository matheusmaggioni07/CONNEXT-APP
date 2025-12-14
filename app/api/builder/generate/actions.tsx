"use client"

// A lógica real está no route.ts

export async function generateCode({
  prompt,
  projectContext,
  history,
  userId,
}: {
  prompt: string
  projectContext?: Array<{ name: string; content: string }>
  history?: Array<{ role: string; content: string }>
  userId?: string
}): Promise<{
  code: string
  explanation: string
  remainingRequests: number
}> {
  // Esta função NÃO é mais usada - a builder-page chama /api/builder/generate diretamente
  // Mantida apenas para compatibilidade
  throw new Error("Use /api/builder/generate directly")
}
