"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { sendConfirmationEmail } from "@/lib/email/sender"

const FREE_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "live.com",
  "msn.com",
  "yahoo.com.br",
  "bol.com.br",
  "uol.com.br",
]

export async function validateProfessionalEmail(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.toLowerCase()
  return domain ? !FREE_EMAIL_DOMAINS.includes(domain) : false
}

export async function signUp(formData: {
  email: string
  password: string
  fullName: string
  phone: string
  company: string
  position: string
  situation: string
  objectives?: string[]
  journeyStage: string
  city: string
  country: string
  bio?: string
  avatarUrl?: string | null
}) {
  try {
    const supabase = await createClient()

    const isValid = await validateProfessionalEmail(formData.email)
    if (!isValid) {
      return { error: "Por favor, use seu email profissional (corporativo). Emails pessoais não são aceitos." }
    }

    const confirmationBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.connextapp.com.br"
    const redirectUrl = `${confirmationBaseUrl}/auth/callback`

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: formData.fullName,
        },
      },
    })

    if (authError) {
      return { error: authError.message || "Erro ao criar usuário" }
    }

    if (!authData.user) {
      return { error: "Erro ao criar usuário" }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        phone: formData.phone,
        company: formData.company || null,
        position: formData.position || null,
        situation: formData.situation,
        objectives: formData.objectives || [],
        journey_stage: formData.journeyStage,
        city: formData.city,
        country: formData.country,
        bio: formData.bio || "",
        avatar_url: formData.avatarUrl || null,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", authData.user.id)

    if (profileError) {
    }

    try {
      await sendConfirmationEmail(formData.email, formData.fullName, redirectUrl)
    } catch (_emailError) {
      // Supabase will send default email if custom fails
    }

    return { success: true, needsEmailConfirmation: !authData.session }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao registrar"
    return { error: message }
  }
}

export async function signIn(email: string, password: string) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { error: error.message }
    }

    revalidatePath("/", "layout")
    return { success: true, user: data.user }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao fazer login"
    return { error: message }
  }
}

export async function signOut() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath("/", "layout")
    return { success: true }
  } catch (err) {
    return { error: "Erro ao fazer logout" }
  }
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  try {
    const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    if (error) {
      return null
    }

    return profile
  } catch {
    return null
  }
}
