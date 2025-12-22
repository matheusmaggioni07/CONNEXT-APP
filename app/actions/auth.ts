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
  industry: string
  city: string
  country: string
  interests: string[]
  lookingFor: string[]
  bio?: string
  avatarUrl?: string | null
}) {
  const supabase = await createClient()

  // Validate professional email
  const isValid = await validateProfessionalEmail(formData.email)
  if (!isValid) {
    return { error: "Por favor, use seu email profissional (corporativo). Emails pessoais não são aceitos." }
  }

  const confirmationBaseUrl = "https://www.connextapp.com.br/auth/callback"

  // Sign up user with metadata
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: formData.email,
    password: formData.password,
    options: {
      emailRedirectTo: confirmationBaseUrl,
      data: {
        full_name: formData.fullName,
      },
    },
  })

  if (authError) {
    console.error("[v0] Auth error:", authError)
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: "Erro ao criar usuário" }
  }

  await new Promise((resolve) => setTimeout(resolve, 1000))

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      phone: formData.phone,
      company: formData.company,
      position: formData.position,
      industry: formData.industry,
      city: formData.city,
      country: formData.country,
      interests: formData.interests,
      looking_for: formData.lookingFor,
      bio: formData.bio || "",
      avatar_url: formData.avatarUrl || null,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", authData.user.id)

  if (profileError) {
    console.error("[v0] Profile update error:", profileError)
  }

  try {
    await sendConfirmationEmail(formData.email, formData.fullName, confirmationBaseUrl)
  } catch (emailError) {
    console.log("[v0] Custom email failed, Supabase email will be used:", emailError)
  }

  return { success: true, needsEmailConfirmation: !authData.session }
}

export async function signIn(email: string, password: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error("[v0] Sign in error:", error)
    return { error: error.message }
  }

  revalidatePath("/", "layout")
  return { success: true, user: data.user }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
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

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (error) {
    console.error("[v0] Get profile error:", error)
    return null
  }

  return profile
}
