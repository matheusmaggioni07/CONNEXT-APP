import { generateCode } from "./actions"

export async function POST(req: Request) {
  const { prompt, projectContext, history } = await req.json()

  try {
    const result = await generateCode({ prompt, projectContext, history })
    return Response.json(result)
  } catch (error) {
    console.error("Error generating code:", error)
    return Response.json(
      {
        code: "",
        explanation: "An error occurred while generating code. Please try again.",
        remainingRequests: -1,
      },
      { status: 500 },
    )
  }
}
