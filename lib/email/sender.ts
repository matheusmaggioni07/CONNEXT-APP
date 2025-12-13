// Connext Email Sender - Serviço de envio de emails

import { createClient } from "@/lib/supabase/server"
import {
  getConfirmationEmailTemplate,
  getNewMatchEmailTemplate,
  getSomeoneLikedYouEmailTemplate,
  getWelcomeEmailTemplate,
  getPasswordResetEmailTemplate,
} from "./templates"

const CONNEXT_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.connextapp.com.br"

// Função para enviar email via Supabase Edge Functions ou API externa
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    // Verifica se Resend está configurado (opcional)
    const resendKey = process.env.RESEND_API_KEY

    if (resendKey && resendKey.length > 10) {
      // Usa Resend para envio real
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

      if (!response.ok) {
        console.warn("[Connext] Resend API error, falling back to queue")
        // Fallback para fila se Resend falhar
        return await queueEmail(to, subject, html)
      }

      console.log("[Connext] Email sent via Resend to:", to)
      return true
    }

    // Fallback: armazena no banco para envio posterior (ou apenas log em dev)
    return await queueEmail(to, subject, html)
  } catch (error) {
    console.warn("[Connext] Email error, queuing instead:", error)
    return await queueEmail(to, subject, html)
  }
}

async function queueEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    // Tenta inserir na fila (tabela pode não existir)
    const { error } = await supabase.from("email_queue").insert({
      to_email: to,
      subject,
      html_content: html,
      status: "pending",
      created_at: new Date().toISOString(),
    })

    if (error) {
      // Se a tabela não existir, apenas loga (não é erro crítico)
      console.log("[Connext] Email notification (queue not available):", { to, subject })
      return true
    }

    console.log("[Connext] Email queued for:", to)
    return true
  } catch {
    // Emails são opcionais - não deve quebrar a aplicação
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
