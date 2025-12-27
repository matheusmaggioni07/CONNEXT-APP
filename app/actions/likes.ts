"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { sendMatchNotificationEmail, sendLikeNotificationEmail } from "@/lib/email/sender"

const PLAN_LIMITS = {
  free: { dailyLikes: 5, dailyCalls: 5 },
  pro: { dailyLikes: Number.POSITIVE_INFINITY, dailyCalls: Number.POSITIVE_INFINITY },
}

const ADMIN_EMAILS = ["matheus.maggioni@edu.pucrs.br", "matheus.maggioni07@gmail.com"]

function isAdmin(email: string | undefined): boolean {
  return email ? ADMIN_EMAILS.includes(email.toLowerCase()) : false
}

export async function checkLikeLimit() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { canLike: false, error: "Não autenticado" }

    if (isAdmin(user.email)) {
      return { canLike: true, remaining: Number.POSITIVE_INFINITY, isPro: true, isAdmin: true }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, daily_likes_count, last_activity_reset")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return { canLike: false, error: "Perfil não encontrado" }
    }

    const plan = (profile.plan || "free") as keyof typeof PLAN_LIMITS

    const now = new Date()
    const brazilOffset = -3 * 60
    const brazilTime = new Date(now.getTime() + (brazilOffset + now.getTimezoneOffset()) * 60 * 1000)
    const today = brazilTime.toISOString().split("T")[0]

    if (profile.last_activity_reset !== today) {
      await supabase
        .from("profiles")
        .update({
          daily_calls_count: 0,
          daily_likes_count: 0,
          last_activity_reset: today,
        })
        .eq("id", user.id)

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
  } catch (err) {
    return { canLike: false, error: "Erro ao verificar limite" }
  }
}

export async function likeUser(toUserId: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { error: "Não autenticado" }

    if (!isAdmin(user.email)) {
      const limitCheck = await checkLikeLimit()
      if (!limitCheck.canLike) {
        return { error: "Você atingiu o limite diário de likes. Faça upgrade para o Pro!" }
      }
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

    const { error: likeError } = await supabase.from("likes").insert({
      from_user_id: user.id,
      to_user_id: toUserId,
    })

    if (likeError) {
      return { error: "Erro ao curtir" }
    }

    if (!isAdmin(user.email)) {
      try {
        await supabase.rpc("increment_daily_likes", { p_user_id: user.id })
      } catch {
        // Continue even if RPC fails
      }
    }

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("full_name, role, avatar_url")
      .eq("id", user.id)
      .single()

    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("full_name, email, role, avatar_url, company, email_notifications")
      .eq("id", toUserId)
      .single()

    if (targetProfile?.email && targetProfile?.email_notifications !== false) {
      sendLikeNotificationEmail(targetProfile.email, targetProfile.full_name || "Profissional", {
        name: myProfile?.full_name || "Alguém",
        role: myProfile?.role,
        avatar: myProfile?.avatar_url,
      }).catch(() => {
        // Silently fail
      })
    }

    const { data: mutualLike } = await supabase
      .from("likes")
      .select("id")
      .eq("from_user_id", toUserId)
      .eq("to_user_id", user.id)
      .maybeSingle()

    let isMatch = false
    if (mutualLike) {
      const { data: existingMatch } = await supabase
        .from("matches")
        .select("id")
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${toUserId}),and(user1_id.eq.${toUserId},user2_id.eq.${user.id})`)
        .maybeSingle()

      if (!existingMatch) {
        const { error: matchError } = await supabase.from("matches").insert({
          user1_id: user.id,
          user2_id: toUserId,
          created_at: new Date().toISOString(),
        })

        if (!matchError) {
          isMatch = true
        }
      } else {
        isMatch = true
      }
    }

    if (isMatch) {
      if (targetProfile?.email && targetProfile?.email_notifications !== false) {
        sendMatchNotificationEmail(targetProfile.email, targetProfile.full_name || "Profissional", {
          name: myProfile?.full_name || "Alguém",
          role: myProfile?.role,
          company: undefined,
          avatar: myProfile?.avatar_url,
        }).catch(() => {})
      }

      if (user.email) {
        sendMatchNotificationEmail(user.email, myProfile?.full_name || "Você", {
          name: targetProfile?.full_name || "Alguém",
          role: targetProfile?.role,
          company: targetProfile?.company,
          avatar: targetProfile?.avatar_url,
        }).catch(() => {})
      }

      revalidatePath("/dashboard/matches")
    }

    revalidatePath("/dashboard")
    return { success: true, isMatch, matchedProfile: targetProfile }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao curtir"
    return { error: message }
  }
}

export async function getMatches() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return []

    const { data: matches } = await supabase
      .from("matches")
      .select("id, user1_id, user2_id, created_at")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("created_at", { ascending: false })

    if (!matches) return []

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
  } catch {
    return []
  }
}

export async function getLikedProfiles() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return []

    const { data: likes } = await supabase.from("likes").select("to_user_id").eq("from_user_id", user.id)

    return likes?.map((l) => l.to_user_id) || []
  } catch {
    return []
  }
}
