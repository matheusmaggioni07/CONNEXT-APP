import { NextResponse } from "next/server"
import { processRetryQueue, getNextEmailToSend, markEmailAsSent, scheduleEmailRetry } from "@/lib/email/queue"

export const runtime = "nodejs"

export async function GET() {
  try {
    console.log("[Email Processor] Starting email processing...")

    // Process retry queue first
    await processRetryQueue()

    // Process pending emails
    const maxEmails = 10
    let processed = 0

    while (processed < maxEmails) {
      const email = await getNextEmailToSend()
      if (!email) {
        console.log("[Email Processor] No more emails to process")
        break
      }

      try {
        const resendKey = process.env.RESEND_API_KEY

        if (!resendKey || resendKey.length <= 10) {
          console.warn("[Email Processor] Resend API key not configured")
          await scheduleEmailRetry(email.id, "Resend API key not configured")
          continue
        }

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "Connext <noreply@connextapp.com.br>",
            to: [email.to_email],
            subject: email.subject,
            html: email.html_content,
          }),
        })

        if (response.ok) {
          await markEmailAsSent(email.id)
          console.log("[Email Processor] Email sent:", email.id, "to:", email.to_email)
          processed++
        } else {
          const error = await response.text()
          throw new Error(`Resend error: ${error}`)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        console.error("[Email Processor] Failed to send email:", email.id, errorMsg)
        await scheduleEmailRetry(email.id, errorMsg)
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      message: `Processed ${processed} emails`,
    })
  } catch (error) {
    console.error("[Email Processor] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
