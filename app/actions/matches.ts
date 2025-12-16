"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function recordMatch(userId: string, partnerId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Não autenticado" }
  }

  if (user.id !== userId && user.id !== partnerId) {
    return { success: false, error: "Usuário não autorizado" }
  }

  const { data: existingMatch } = await supabase
    .from("matches")
    .select("id")
    .or(`and(user1_id.eq.${userId},user2_id.eq.${partnerId}),and(user1_id.eq.${partnerId},user2_id.eq.${userId})`)
    .single()

  if (existingMatch) {
    return { success: true, message: "Match já existe" }
  }

  const [user1, user2] = userId < partnerId ? [userId, partnerId] : [partnerId, userId]

  const { error } = await supabase.from("matches").insert({
    user1_id: user1,
    user2_id: user2,
  })

  if (error) {
    console.error("[v0] Record match error:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/dashboard/matches")
  return { success: true }
}

export async function getMatches() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data: matches, error } = await supabase
    .from("matches")
    .select(
      `
      id,
      user1_id,
      user2_id,
      created_at,
      user1:profiles!user1_id(id, full_name, avatar_url, bio, city, industry, interests, looking_for, position, company, phone),
      user2:profiles!user2_id(id, full_name, avatar_url, bio, city, industry, interests, looking_for, position, company, phone)
    `,
    )
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Get matches error:", error)
    return []
  }

  return (matches || []).map((match: any) => ({
    ...match,
    otherUser: match.user1_id === user.id ? match.user2 : match.user1,
  }))
}

export async function getMatchById(matchId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: match, error } = await supabase
    .from("matches")
    .select(
      `
      id,
      user1_id,
      user2_id,
      created_at,
      user1:profiles!user1_id(id, full_name, avatar_url, bio, city, industry, interests, looking_for, position, company, phone, seniority),
      user2:profiles!user2_id(id, full_name, avatar_url, bio, city, industry, interests, looking_for, position, company, phone, seniority)
    `,
    )
    .eq("id", matchId)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .single()

  if (error) {
    console.error("[v0] Get match by id error:", error)
    return null
  }

  return {
    ...match,
    currentUser: match.user1_id === user.id ? match.user1 : match.user2,
    otherUser: match.user1_id === user.id ? match.user2 : match.user1,
  }
}
