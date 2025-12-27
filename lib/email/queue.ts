import { kv } from "@vercel/kv"
import { neon } from "@neondatabase/serverless"

export interface EmailQueueItem {
  id: string
  to_email: string
  subject: string
  html_content: string
  status: "pending" | "sent" | "failed"
  attempts: number
  created_at: string
  next_retry_at?: string
  error_message?: string
}

const MAX_RETRIES = 5
const RETRY_DELAYS = [60, 300, 900, 3600, 7200] // 1m, 5m, 15m, 1h, 2h

export async function queueEmailWithRetry(to: string, subject: string, html: string): Promise<string> {
  try {
    const emailId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const emailItem: EmailQueueItem = {
      id: emailId,
      to_email: to,
      subject,
      html_content: html,
      status: "pending",
      attempts: 0,
      created_at: new Date().toISOString(),
    }

    // Store in Redis with TTL of 30 days
    await kv.setex(`email:${emailId}`, 30 * 24 * 60 * 60, JSON.stringify(emailItem))

    // Also store in database for persistence
    const sql = neon(process.env.POSTGRES_URL_NON_POOLING!)
    await sql`
      INSERT INTO email_queue (id, to_email, subject, html_content, status, attempts, created_at)
      VALUES (${emailId}, ${to}, ${subject}, ${html}, 'pending', 0, NOW())
      ON CONFLICT (id) DO NOTHING
    `

    // Add to processing queue
    await kv.lpush("email_queue:pending", emailId)

    console.log("[Email Queue] Email queued:", emailId, "for:", to)
    return emailId
  } catch (error) {
    console.error("[Email Queue] Failed to queue email:", error)
    throw error
  }
}

export async function getNextEmailToSend(): Promise<EmailQueueItem | null> {
  try {
    const emailId = await kv.rpop("email_queue:pending")
    if (!emailId) return null

    const emailData = await kv.get(`email:${emailId}`)
    return emailData ? JSON.parse(emailData as string) : null
  } catch (error) {
    console.error("[Email Queue] Failed to get next email:", error)
    return null
  }
}

export async function markEmailAsSent(emailId: string): Promise<void> {
  try {
    const emailData = await kv.get(`email:${emailId}`)
    if (!emailData) return

    const email: EmailQueueItem = JSON.parse(emailData as string)
    email.status = "sent"
    email.attempts += 1

    await kv.setex(`email:${emailId}`, 30 * 24 * 60 * 60, JSON.stringify(email))

    // Update database
    const sql = neon(process.env.POSTGRES_URL_NON_POOLING!)
    await sql`
      UPDATE email_queue 
      SET status = 'sent', attempts = ${email.attempts}, sent_at = NOW()
      WHERE id = ${emailId}
    `

    console.log("[Email Queue] Email marked as sent:", emailId)
  } catch (error) {
    console.error("[Email Queue] Failed to mark email as sent:", error)
  }
}

export async function scheduleEmailRetry(emailId: string, error: string): Promise<void> {
  try {
    const emailData = await kv.get(`email:${emailId}`)
    if (!emailData) return

    const email: EmailQueueItem = JSON.parse(emailData as string)

    if (email.attempts >= MAX_RETRIES) {
      email.status = "failed"
      email.error_message = error
      await kv.setex(`email:${emailId}`, 30 * 24 * 60 * 60, JSON.stringify(email))

      const sql = neon(process.env.POSTGRES_URL_NON_POOLING!)
      await sql`
        UPDATE email_queue 
        SET status = 'failed', attempts = ${email.attempts}, error_message = ${error}
        WHERE id = ${emailId}
      `

      console.error("[Email Queue] Email permanently failed after 5 retries:", emailId, error)
      return
    }

    const delaySeconds = RETRY_DELAYS[email.attempts] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
    const nextRetryTime = new Date(Date.now() + delaySeconds * 1000)

    email.attempts += 1
    email.next_retry_at = nextRetryTime.toISOString()

    // Store in retry set with timestamp score
    await kv.zadd("email_queue:retry", {
      score: nextRetryTime.getTime(),
      member: emailId,
    })

    await kv.setex(`email:${emailId}`, 30 * 24 * 60 * 60, JSON.stringify(email))

    const sql = neon(process.env.POSTGRES_URL_NON_POOLING!)
    await sql`
      UPDATE email_queue 
      SET status = 'pending', attempts = ${email.attempts}, next_retry_at = ${nextRetryTime.toISOString()}
      WHERE id = ${emailId}
    `

    console.log("[Email Queue] Email scheduled for retry:", emailId, "in", delaySeconds, "seconds")
  } catch (error) {
    console.error("[Email Queue] Failed to schedule retry:", error)
  }
}

export async function processRetryQueue(): Promise<void> {
  try {
    const now = Date.now()
    const readyEmails = await kv.zrange("email_queue:retry", 0, -1, {
      byScore: true,
      rev: false,
      gte: 0,
      lte: now,
    })

    if (!readyEmails || readyEmails.length === 0) {
      console.log("[Email Queue] No emails ready for retry")
      return
    }

    console.log("[Email Queue] Found", readyEmails.length, "emails ready for retry")

    for (const emailId of readyEmails) {
      // Move to pending queue
      await kv.zrem("email_queue:retry", emailId as string)
      await kv.lpush("email_queue:pending", emailId)
    }
  } catch (error) {
    console.error("[Email Queue] Failed to process retry queue:", error)
  }
}
