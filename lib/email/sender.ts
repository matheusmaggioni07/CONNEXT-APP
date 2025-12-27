import {
  getConfirmationEmailTemplate,
  getNewMatchEmailTemplate,
  getSomeoneLikedYouEmailTemplate,
  getWelcomeEmailTemplate,
  getPasswordResetEmailTemplate,
} from "./templates"
import { queueEmailWithRetry } from "./queue"

const CONNEXT_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.connextapp.com.br"

// Função para enviar email via Supabase Edge Functions ou API externa
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const resendKey = process.env.RESEND_API_KEY

    if (resendKey && resendKey.length > 10) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "Connext <noreply@connextapp.com.br>",
            to: [to],
            subject,
            html,
          }),
        })

        if (response.ok) {
          console.log("[Connext] Email sent via Resend to:", to)
          return true
        }

        console.warn("[Connext] Resend API error, queuing for retry")
      } catch (resendError) {
        console.warn("[Connext] Resend fetch error, queuing for retry:", resendError)
      }
    }

    // Queue for retry if Resend failed or not configured
    await queueEmailWithRetry(to, subject, html)
    return true
  } catch (error) {
    console.error("[Connext] Failed to queue email:", error)
    // Don't throw - emails are optional
    return true
  }
}

async function queueEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    await queueEmailWithRetry(to, subject, html)
    console.log("[Connext] Email queued for:", to)
    return true
  } catch (error) {
    console.log("[Connext] Email notification:", { to, subject })
    return true
  }
}

// Enviar email de confirmação
export async function sendConfirmationEmail(
  email: string,
  userName: string,
  confirmationUrl: string,
): Promise<boolean> {
  const html = getConfirmationEmailTemplate({
    userName,
    confirmationUrl,
  })

  return sendEmail(email, "Confirme seu email - Connext", html)
}

// Enviar email de novo match
export async function sendMatchNotificationEmail(
  toEmail: string,
  toUserName: string,
  matchedUser: {
    name: string
    role?: string
    company?: string
    avatar?: string
  },
): Promise<boolean> {
  const html = getNewMatchEmailTemplate({
    userName: toUserName,
    matchName: matchedUser.name,
    matchRole: matchedUser.role,
    matchCompany: matchedUser.company,
    matchAvatar: matchedUser.avatar,
    matchUrl: `${CONNEXT_URL}/dashboard/matches`,
  })

  return sendEmail(toEmail, `Novo Match com ${matchedUser.name}! - Connext`, html)
}

// Enviar email de alguém curtiu você
export async function sendLikeNotificationEmail(
  toEmail: string,
  toUserName: string,
  likerUser: {
    name: string
    role?: string
    avatar?: string
  },
): Promise<boolean> {
  const html = getSomeoneLikedYouEmailTemplate({
    userName: toUserName,
    likerName: likerUser.name,
    likerRole: likerUser.role,
    likerAvatar: likerUser.avatar,
    discoverUrl: `${CONNEXT_URL}/dashboard`,
  })

  return sendEmail(toEmail, `${likerUser.name} curtiu seu perfil! - Connext`, html)
}

// Enviar email de boas-vindas
export async function sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
  const html = getWelcomeEmailTemplate({ userName })

  return sendEmail(email, "Bem-vindo ao Connext! 🎉", html)
}

// Enviar email de reset de senha
export async function sendPasswordResetEmail(email: string, userName: string, resetUrl: string): Promise<boolean> {
  const html = getPasswordResetEmailTemplate({
    userName,
    resetUrl,
  })

  return sendEmail(email, "Redefinir sua senha - Connext", html)
}
