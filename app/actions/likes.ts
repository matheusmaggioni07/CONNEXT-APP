"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

const PLAN_LIMITS = {
  free: { dailyLikes: 5, dailyCalls: 5 },
  pro: { dailyLikes: Number.POSITIVE_INFINITY, dailyCalls: Number.POSITIVE_INFINITY },
}

export async function checkLikeLimit() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { canLike: false, error: "Não autenticado" }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan, daily_likes_count, last_activity_reset")
    .eq("id", user.id)
    .single()

  if (error || !profile) {
    console.error("[v0] Check like limit error:", error)
    return { canLike: false, error: "Perfil não encontrado" }
  }

  const plan = (profile.plan || "free") as keyof typeof PLAN_LIMITS
  const today = new Date().toISOString().split("T")[0]

  if (profile.last_activity_reset !== today) {
    await supabase.rpc("reset_daily_limits", { p_user_id: user.id })
    return { canLike: true, remaining: PLAN_LIMITS[plan].dailyLikes }
  }

  const limit = PLAN_LIMITS[plan].dailyLikes
  const currentCount = profile.daily_likes_count || 0
  const remaining = limit === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : limit - currentCount

  return {
    canLike: remaining > 0,
    remaining,
    isPro: plan === "pro",
  }
}

export async function likeUser(toUserId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado" }

  // Check limit
  const limitCheck = await checkLikeLimit()
  if (!limitCheck.canLike) {
    return { error: "Você atingiu o limite diário de likes. Faça upgrade para o Pro!" }
  }

  const { data: existingLike } = await supabase
    .from("likes")
    .select("id")
    .eq("from_user_id", user.id)
    .eq("to_user_id", toUserId)
    .maybeSingle()

  if (existingLike) {
    return { error: "Você já curtiu este perfil" }
  }

  // Create like
  const { error: likeError } = await supabase.from("likes").insert({
    from_user_id: user.id,
    to_user_id: toUserId,
  })

  if (likeError) {
    console.error("[v0] Like error:", likeError)
    return { error: likeError.message }
  }

  await supabase.rpc("increment_daily_likes", { p_user_id: user.id })

  const { data: match } = await supabase
    .from("matches")
    .select("id")
    .or(`and(user1_id.eq.${user.id},user2_id.eq.${toUserId}),and(user1_id.eq.${toUserId},user2_id.eq.${user.id})`)
    .maybeSingle()

  if (match) {
    // Get matched user profile
    const { data: matchedProfile } = await supabase.from("profiles").select("*").eq("id", toUserId).single()

    revalidatePath("/dashboard/matches")
    return { success: true, isMatch: true, matchedProfile }
  }

  revalidatePath("/dashboard")
  return { success: true, isMatch: false }
}

export async function getMatches() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  // Get matches where user is either user1 or user2
  const { data: matches, error } = await supabase
    .from("matches")
    .select("id, user1_id, user2_id, created_at")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Get matches error:", error)
    return []
  }

  if (!matches) return []

  // Get the other user's profile for each match
  const matchesWithProfiles = await Promise.all(
    matches.map(async (match) => {
      const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", otherUserId).single()

      return {
        ...match,
        matched_profile: profile,
      }
    }),
  )

  return matchesWithProfiles
}

export async function getLikedProfiles() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data: likes, error } = await supabase.from("likes").select("to_user_id").eq("from_user_id", user.id)

  if (error) {
    console.error("[v0] Get liked profiles error:", error)
    return []
  }

  return likes?.map((l) => l.to_user_id) || []
}
