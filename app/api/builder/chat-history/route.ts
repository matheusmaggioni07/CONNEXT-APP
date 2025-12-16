import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get("projectId")

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get chat history for this project, ordered by created_at
    const { data: messages, error } = await supabase
      .from("builder_chat_history")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })
      .limit(100)

    if (error) {
      console.error("Error fetching chat history:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("Chat history GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, role, content, code } = body

    if (!projectId || !role || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Save message to database
    const { data, error } = await supabase.from("builder_chat_history").insert({
      project_id: projectId,
      user_id: user.id,
      role,
      content,
      code: code || null,
    })

    if (error) {
      console.error("Error saving chat message:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Chat history POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
