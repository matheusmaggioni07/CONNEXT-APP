"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Profile } from "@/lib/types"

export async function getMyProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (error) {
    console.error("[v0] Get my profile error:", error)
    return null
  }

  return data
}

export async function isOnboardingComplete() {
  const profile = await getMyProfile()
  if (!profile) return false

  // Agora só precisa de: phone, situation, journey_stage, city
  return !!(
    profile.onboarding_completed ||
    (profile.phone && profile.situation && profile.journey_stage && profile.city)
  )
}

export async function updateProfile(data: Partial<Profile>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Não autenticado" }
  }

  const dbData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (data.fullName !== undefined) dbData.full_name = data.fullName
  if (data.phone !== undefined) dbData.phone = data.phone
  if (data.company !== undefined) dbData.company = data.company
  if (data.position !== undefined) dbData.position = data.position
  if (data.seniority !== undefined) dbData.seniority = data.seniority
  if (data.industry !== undefined) dbData.industry = data.industry
  if (data.journey_stage !== undefined) dbData.journey_stage = data.journey_stage
  if (data.city !== undefined) dbData.city = data.city
  if (data.country !== undefined) dbData.country = data.country
  if (data.bio !== undefined) dbData.bio = data.bio
  if (data.interests !== undefined) dbData.interests = data.interests
  if (data.lookingFor !== undefined) dbData.looking_for = data.lookingFor
  if (data.avatarUrl !== undefined) dbData.avatar_url = data.avatarUrl
  if (data.objectives !== undefined) dbData.objectives = data.objectives // Added objectives field for new onboarding flow ETAPA 4

  const { error } = await supabase.from("profiles").update(dbData).eq("id", user.id)

  if (error) {
    console.error("[v0] Update profile error:", error)
    return { error: error.message }
  }

  revalidatePath("/dashboard/profile")
  return { success: true }
}

export async function completeOnboarding(data: {
  phone: string
  situation: string
  company?: string
  position?: string
  objectives?: string[] // Added objectives field for new onboarding flow ETAPA 4
  journey_stage: string
  city: string
  country: string
  bio?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Não autenticado" }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      phone: data.phone,
      situation: data.situation,
      company: data.company || null,
      position: data.position || null,
      objectives: data.objectives || [], // Persist objectives array
      journey_stage: data.journey_stage,
      city: data.city,
      country: data.country,
      bio: data.bio || null,
      interests: [], // Empty array - removed old interests
      looking_for: [], // Empty array - removed old looking_for
      industry: null, // Null - removed old industry
      seniority: null, // Null - removed old seniority
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    console.error("[v0] Complete onboarding error:", error)
    return { error: error.message }
  }

  revalidatePath("/dashboard")
  return { success: true }
}

export async function getProfiles(filters?: {
  city?: string
  industry?: string
  interests?: string[]
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let query = supabase
    .from("profiles")
    .select("*")
    .neq("id", user?.id || "")

  if (filters?.city) {
    query = query.eq("city", filters.city)
  }

  if (filters?.industry) {
    query = query.eq("industry", filters.industry)
  }

  if (filters?.interests && filters.interests.length > 0) {
    query = query.overlaps("interests", filters.interests)
  }

  const { data, error } = await query

  if (error) {
    console.error("[v0] Get profiles error:", error)
    return []
  }

  return data || []
}

export async function getProfileById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single()

  if (error) {
    console.error("[v0] Get profile by id error:", error)
    return null
  }

  return data
}

export async function getProfilesToDiscover() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("[v0] getProfilesToDiscover: No user found")
    return []
  }

  try {
    // Get profiles that the user already liked
    const { data: likes, error: likesError } = await supabase
      .from("likes")
      .select("to_user_id")
      .eq("from_user_id", user.id)

    if (likesError) {
      console.log("[v0] Error getting likes:", likesError)
    }

    const likedUserIds = likes?.map((l) => l.to_user_id) || []

    // Build query - get all profiles except current user
    const query = supabase
      .from("profiles")
      .select("*")
      .neq("id", user.id)
      .order("created_at", { ascending: false })
      .limit(100)

    const { data, error } = await query

    if (error) {
      console.error("[v0] Get profiles to discover error:", error)
      return []
    }

    // Filter out liked users in JavaScript (more reliable across devices)
    const filteredProfiles = (data || []).filter((profile) => !likedUserIds.includes(profile.id))

    console.log("[v0] Profiles found:", filteredProfiles.length)

    return filteredProfiles
  } catch (error) {
    console.error("[v0] getProfilesToDiscover exception:", error)
    return []
  }
}

export async function uploadAvatar(base64Data: string, mimeType: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Não autenticado" }
  }

  try {
    // Extract base64 content (remove data:image/...;base64, prefix)
    const base64Content = base64Data.split(",")[1]
    if (!base64Content) {
      return { error: "Dados da imagem inválidos" }
    }

    // Convert base64 to Uint8Array
    const binaryString = atob(base64Content)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Determine file extension
    const extension = mimeType.split("/")[1] || "jpg"
    const fileName = `${user.id}/avatar-${Date.now()}.${extension}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage.from("avatars").upload(fileName, bytes, {
      contentType: mimeType,
      upsert: true,
    })

    if (uploadError) {
      console.error("[v0] Upload error:", uploadError)
      return { error: "Erro ao fazer upload da imagem" }
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName)

    const publicUrl = urlData.publicUrl

    // Update profile with new avatar URL
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[v0] Update avatar URL error:", updateError)
      return { error: "Erro ao atualizar perfil com a nova foto" }
    }

    revalidatePath("/dashboard/profile")
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/matches")

    return { success: true, url: publicUrl }
  } catch (error) {
    console.error("[v0] Avatar upload error:", error)
    return { error: "Erro ao processar a imagem" }
  }
}
