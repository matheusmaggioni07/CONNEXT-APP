"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Profile } from "@/lib/types"

const PLAN_LIMITS = {
  free: { dailyLikes: 5, dailyCalls: 5 },
  pro: { dailyLikes: Number.POSITIVE_INFINITY, dailyCalls: Number.POSITIVE_INFINITY },
}

const ADMIN_EMAILS = ["matheus.maggioni@edu.pucrs.br", "matheus.maggioni07@gmail.com"]

function isAdmin(email: string | undefined): boolean {
  return email ? ADMIN_EMAILS.includes(email.toLowerCase()) : false
}

export async function checkCallLimit() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { canCall: false, error: "Não autenticado" }

  if (isAdmin(user.email)) {
    return { canCall: true, remaining: Number.POSITIVE_INFINITY, isPro: true, isAdmin: true }
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan, daily_calls_count, last_activity_reset")
    .eq("id", user.id)
    .single()

  if (error || !profile) {
    console.error("[v0] Check call limit error:", error)
    return { canCall: false, error: "Perfil não encontrado" }
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

    return { canCall: true, remaining: PLAN_LIMITS[plan].dailyCalls }
  }

  const limit = PLAN_LIMITS[plan].dailyCalls
  const currentCount = profile.daily_calls_count || 0
  const remaining = limit === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : limit - currentCount

  return {
    canCall: remaining > 0,
    remaining,
    isPro: plan === "pro",
  }
}

export async function joinVideoQueue(stateFilter?: string, cityFilter?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: "Não autenticado" }

  if (!isAdmin(user.email)) {
    const limitCheck = await checkCallLimit()
    if (!limitCheck.canCall) {
      return { success: false, error: "Você atingiu o limite diário de chamadas. Faça upgrade para o Pro!" }
    }
  }

  // Clean up old waiting rooms from this user
  await supabase
    .from("video_rooms")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("user1_id", user.id)
    .eq("status", "waiting")

  // Also clean up any stale signaling/ice_candidates from old sessions
  await supabase.from("signaling").delete().eq("from_user_id", user.id)
  await supabase.from("ice_candidates").delete().eq("from_user_id", user.id)

  // Look for someone waiting
  const { data: waitingRooms } = await supabase
    .from("video_rooms")
    .select("id, user1_id, created_at")
    .eq("status", "waiting")
    .is("user2_id", null)
    .neq("user1_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)

  if (waitingRooms && waitingRooms.length > 0) {
    const roomToJoin = waitingRooms[0]
    console.log("[v0] Found waiting room:", roomToJoin.id)

    // Get partner profile BEFORE joining
    const { data: partnerProfile } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, bio, city, position, company")
      .eq("id", roomToJoin.user1_id)
      .single()

    const { error: joinError } = await supabase
      .from("video_rooms")
      .update({ user2_id: user.id, status: "active" })
      .eq("id", roomToJoin.id)
      .eq("status", "waiting")

    if (!joinError) {
      if (!isAdmin(user.email)) {
        await supabase.rpc("increment_daily_calls", { p_user_id: user.id })
      }

      console.log("[v0] Joined room successfully, partner:", partnerProfile?.full_name)

      return {
        success: true,
        roomId: roomToJoin.id,
        partnerId: roomToJoin.user1_id,
        matched: true,
        partnerProfile: partnerProfile || { full_name: "Usuário" },
      }
    }
  }

  // Create new waiting room
  const { data: room, error: createError } = await supabase
    .from("video_rooms")
    .insert({ user1_id: user.id, status: "waiting" })
    .select()
    .single()

  if (createError) {
    console.error("[v0] Create room error:", createError)
    return { success: false, error: "Erro ao criar sala" }
  }

  if (!isAdmin(user.email)) {
    await supabase.rpc("increment_daily_calls", { p_user_id: user.id })
  }

  console.log("[v0] Created new room:", room.id)
  return { success: true, roomId: room.id, waiting: true, matched: false }
}

export async function checkRoomStatus(roomId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { status: "error", error: "Não autenticado" }

  const { data: room } = await supabase
    .from("video_rooms")
    .select("id, user1_id, user2_id, status")
    .eq("id", roomId)
    .single()

  if (!room) return { status: "error", error: "Sala não encontrada" }

  // Room is now active with partner
  if (room.status === "active" && room.user2_id) {
    const partnerId = room.user1_id === user.id ? room.user2_id : room.user1_id

    // Get partner profile
    const { data: partnerProfile } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, bio, city, position, company")
      .eq("id", partnerId)
      .single()

    console.log("[v0] Room active, partner:", partnerProfile?.full_name)

    return {
      status: "active",
      partnerId,
      roomId: room.id,
      partnerProfile: partnerProfile || { full_name: "Usuário" },
    }
  }

  // Still waiting
  return { status: "waiting" }
}

export async function leaveVideoQueue(userId: string, roomId: string) {
  if (!roomId || roomId === "undefined") {
    console.log("[v0] leaveVideoQueue called with invalid roomId, skipping cleanup")
    return { success: true }
  }

  if (!userId || userId === "undefined") {
    console.log("[v0] leaveVideoQueue called with invalid userId, skipping cleanup")
    return { success: true }
  }

  const supabase = await createClient()

  // End the room
  await supabase.from("video_rooms").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", roomId)

  // Clean up signaling
  await supabase.from("signaling").delete().eq("room_id", roomId)
  await supabase.from("ice_candidates").delete().eq("room_id", roomId)

  return { success: true }
}

export async function endVideoRoom(roomId: string) {
  if (!roomId || roomId === "undefined") {
    console.log("[v0] endVideoRoom called with invalid roomId, skipping")
    return { success: true }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado" }

  await supabase
    .from("video_rooms")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", roomId)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

  // Clean up signaling
  await supabase.from("signaling").delete().eq("room_id", roomId)
  await supabase.from("ice_candidates").delete().eq("room_id", roomId)

  return { success: true }
}

export async function createVideoRoom() {
  return joinVideoQueue()
}

export async function findVideoPartner(roomId: string) {
  return checkRoomStatus(roomId)
}

export async function findAvailablePartner(): Promise<{ partner?: Profile; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado" }

  if (!isAdmin(user.email)) {
    const limitCheck = await checkCallLimit()
    if (!limitCheck.canCall) {
      return { error: "Você atingiu o limite diário de chamadas. Faça upgrade para o Pro!" }
    }
  }

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .neq("id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Find available partner error:", error)
    return { error: "Erro ao buscar profissionais disponíveis" }
  }

  if (!profiles || profiles.length === 0) {
    return { error: "Nenhum profissional disponível no momento. Convide amigos para usar o Connext!" }
  }

  const randomIndex = Math.floor(Math.random() * profiles.length)
  const partner = profiles[randomIndex] as Profile

  return { partner }
}

export async function createVideoRoomWithPartner(partnerId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado" }

  if (!partnerId) {
    console.error("No partner ID provided")
    return { error: "Nenhum parceiro especificado" }
  }

  const { data: partnerExists, error: partnerError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", partnerId)
    .single()

  if (partnerError || !partnerExists) {
    console.error("Partner not found:", partnerId, partnerError)
    return { error: "Parceiro não encontrado" }
  }

  const { data: room, error } = await supabase
    .from("video_rooms")
    .insert({
      user1_id: user.id,
      user2_id: partnerId,
      status: "active",
    })
    .select()
    .single()

  if (error) {
    console.error("Create video room with partner error:", error)
    return { error: error.message }
  }

  if (!isAdmin(user.email)) {
    await supabase.rpc("increment_daily_calls", { p_user_id: user.id })
  }

  revalidatePath("/dashboard/video")
  return { success: true, room }
}

export async function getVideoRoom(roomId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: room, error } = await supabase
    .from("video_rooms")
    .select("*")
    .eq("id", roomId)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .single()

  if (error) {
    console.error("[v0] Get video room error:", error)
    return null
  }

  if (room) {
    const [user1Profile, user2Profile] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", room.user1_id).single(),
      room.user2_id ? supabase.from("profiles").select("*").eq("id", room.user2_id).single() : null,
    ])

    return {
      ...room,
      user1: user1Profile?.data,
      user2: user2Profile?.data,
    }
  }

  return room
}

export async function getActiveVideoRoom() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: room } = await supabase
    .from("video_rooms")
    .select("*")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .in("status", ["waiting", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  return room
}

export async function getAvailableUsersForVideo() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, position, company, avatar_url")
    .neq("id", user.id)
    .limit(10)

  if (error) {
    console.error("[v0] Get available users error:", error)
    return []
  }

  return profiles || []
}

export async function getRemainingCalls(userId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: "Não autenticado" }

  if (isAdmin(user.email)) {
    return { success: true, remaining: -1, isPro: true, isAdmin: true }
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan, daily_calls_count, last_activity_reset")
    .eq("id", user.id)
    .single()

  if (error || !profile) {
    return { success: false, error: "Perfil não encontrado" }
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

    return {
      success: true,
      remaining: plan === "pro" ? -1 : PLAN_LIMITS[plan].dailyCalls,
      isPro: plan === "pro",
    }
  }

  const limit = PLAN_LIMITS[plan].dailyCalls
  const currentCount = profile.daily_calls_count || 0

  if (plan === "pro") {
    return { success: true, remaining: -1, isPro: true }
  }

  const remaining = limit - currentCount

  if (remaining <= 0) {
    const tomorrow = new Date(brazilTime)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    return {
      success: true,
      remaining: 0,
      resetTime: tomorrow.toISOString(),
      isPro: false,
    }
  }

  return {
    success: true,
    remaining,
    isPro: false,
  }
}
