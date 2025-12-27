import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  // Verify cron secret token
  const token = req.headers.get("Authorization")?.replace("Bearer ", "")
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()
  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    // Get all pending emails from queue
    const { data: emailQueue, error: fetchError } = await supabase
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .lt("attempts", 5)
      .order("created_at", { ascending: true })
      .limit(100)

    if (fetchError) {
      console.error("[v0] Fetch email queue error:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!emailQueue || emailQueue.length === 0) {
      return NextResponse.json({ processed: 0, message: "No pending emails" })
    }

    let processed = 0
    let failed = 0

    for (const email of emailQueue) {
      try {
        // Send email via Resend
        const result = await resend.emails.send({
          from: "Connext <noreply@connext.app>",
          to: email.to_email,
          subject: email.subject,
          html: email.html_content,
        })

        if (result.error) {
          // Mark as failed and retry later
          await supabase
            .from("email_queue")
            .update({
              attempts: (email.attempts || 0) + 1,
              error_message: result.error.message,
              status: (email.attempts || 0) + 1 >= 5 ? "failed" : "pending",
            })
            .eq("id", email.id)

          failed++
        } else {
          // Mark as sent
          await supabase
            .from("email_queue")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              attempts: (email.attempts || 0) + 1,
            })
            .eq("id", email.id)

          processed++
        }
      } catch (err) {
        console.error("[v0] Send email error:", err)
        failed++
      }
    }

    return NextResponse.json({
      processed,
      failed,
      total: emailQueue.length,
    })
  } catch (err) {
    console.error("[v0] Process email queue error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
