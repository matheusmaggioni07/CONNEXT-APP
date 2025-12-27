"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

const PLAN_LIMITS = {
  free: { dailyLikes: 5, dailyCalls: 5 },
  pro: { dailyLikes: Number.POSITIVE_INFINITY, dailyCalls: Number.POSITIVE_INFINITY },
}

const ADMIN_EMAILS = ["matheus.maggioni@edu.pucrs.br"]

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

  const { data: profile, error } = await supabase.from("profiles").select("plan").eq("id", user.id).single()

  if (error || !profile) {
    console.error("[v0] Check call limit error:", error)
    return { canCall: false, error: "Perfil não encontrado" }
  }

  const plan = (profile.plan || "free") as keyof typeof PLAN_LIMITS
  const limit = PLAN_LIMITS[plan].dailyCalls

  if (limit === Number.POSITIVE_INFINITY) {
    return { canCall: true, remaining: Number.POSITIVE_INFINITY, isPro: true }
  }

  const today = new Date().toISOString().split("T")[0]
  const { data: usage, error: usageError } = await supabase
    .from("usage_limits")
    .select("video_calls_count")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle()

  const currentCount = usage?.video_calls_count || 0
  const remaining = Math.max(0, limit - currentCount)

  return {
    canCall: remaining > 0,
    remaining,
    isPro: plan === "pro",
  }
}

export async function joinVideoQueue() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: "Not authenticated" }

  try {
    console.log("[v0] User joining video queue:", user.id)

    const { data: waitingUser, error: searchError } = await supabase
      .from("video_queue")
      .select("user_id")
      .eq("status", "waiting")
      .neq("user_id", user.id)
      .limit(1)
      .order("created_at", { ascending: true })
      .maybeSingle()

    let roomId: string | null = null
    let matchedUserId: string | null = null

    if (waitingUser && waitingUser.user_id) {
      // Create video room with matched user
      const { data: room, error: roomError } = await supabase
        .from("video_rooms")
        .insert([
          {
            user1_id: user.id,
            user2_id: waitingUser.user_id,
            status: "active",
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (room && !roomError) {
        roomId = room.id
        matchedUserId = waitingUser.user_id

        // Delete matched user from queue
        await supabase.from("video_queue").delete().eq("user_id", waitingUser.user_id)

        console.log("[v0] Successfully matched! Room ID:", roomId)

        // Increment daily calls for both users
        await Promise.all([
          supabase.rpc("increment_daily_calls", { p_user_id: user.id }).catch(() => {}),
          supabase.rpc("increment_daily_calls", { p_user_id: waitingUser.user_id }).catch(() => {}),
        ])

        return {
          success: true,
          roomId,
          matched: true,
          partnerId: matchedUserId,
        }
      }
    }

    // No match found - add user to waiting queue
    const { data: queueEntry, error: queueError } = await supabase
      .from("video_queue")
      .insert({
        user_id: user.id,
        status: "waiting",
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle()

    if (queueError) {
      console.error("[v0] Queue insert error:", queueError.message)
      return { success: false, error: queueError.message }
    }

    console.log("[v0] User now waiting in queue")

    return {
      success: true,
      matched: false,
      waiting: true,
    }
  } catch (err) {
    console.error("[v0] joinVideoQueue error:", err)
    return { success: false, error: "Failed to join queue" }
  }
}

export async function getRoomStatus(roomId: string) {
  const supabase = await createClient()

  const { data: room } = await supabase.from("video_rooms").select("*").eq("id", roomId).maybeSingle()

  return room
}

export async function leaveVideoRoom(roomId: string) {
  if (!roomId) return { success: true }

  const supabase = await createClient()

  await supabase.from("video_rooms").update({ status: "ended" }).eq("id", roomId)
  await supabase.from("signaling").delete().eq("room_id", roomId)
  await supabase.from("ice_candidates").delete().eq("room_id", roomId)

  return { success: true }
}

export async function saveSignaling(
  roomId: string,
  fromUserId: string,
  toUserId: string,
  type: "offer" | "answer",
  sdp: any,
) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from("signaling")
      .insert({
        room_id: roomId,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        type,
        sdp: typeof sdp === "string" ? sdp : JSON.stringify(sdp),
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle()

    return data
  } catch (err) {
    console.error("[v0] saveSignaling error:", err)
    return null
  }
}

export async function getSignaling(roomId: string, userId: string) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from("signaling")
      .select("*")
      .eq("room_id", roomId)
      .eq("to_user_id", userId)
      .order("created_at", { ascending: true })

    return data || []
  } catch (err) {
    console.error("[v0] getSignaling error:", err)
    return []
  }
}

export async function saveIceCandidate(roomId: string, fromUserId: string, toUserId: string, candidate: any) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from("ice_candidates")
      .insert({
        room_id: roomId,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        candidate: typeof candidate === "string" ? candidate : JSON.stringify(candidate),
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle()

    return data
  } catch (err) {
    console.error("[v0] saveIceCandidate error:", err)
    return null
  }
}

export async function getIceCandidates(roomId: string, userId: string) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from("ice_candidates")
      .select("*")
      .eq("room_id", roomId)
      .eq("to_user_id", userId)
      .order("created_at", { ascending: true })

    return data || []
  } catch (err) {
    console.error("[v0] getIceCandidates error:", err)
    return []
  }
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
    .maybeSingle()

  if (partnerError || !partnerExists) {
    console.error("Partner not found:", partnerId, partnerError)
    return { error: "Parceiro não encontrado" }
  }

  const { data: room, error } = await supabase
    .from("video_rooms")
    .insert([
      {
        user1_id: user.id,
        user2_id: partnerId,
        status: "active",
      },
    ])
    .select()
    .single()

  if (error) {
    console.error("Create video room with partner error:", error)
    return { error: error.message }
  }

  if (!isAdmin(user.email)) {
    try {
      await supabase.rpc("increment_daily_calls", { p_user_id: user.id })
    } catch (err) {
      console.error("[v0] RPC error:", err)
    }
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
    .maybeSingle()

  if (error) {
    console.error("[v0] Get video room error:", error)
    return null
  }

  if (room) {
    const [user1Profile, user2Profile] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", room.user1_id).maybeSingle(),
      room.user2_id ? supabase.from("profiles").select("*").eq("id", room.user2_id).maybeSingle() : null,
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
    .maybeSingle()

  return room
}

export async function getAvailableUsersForVideo() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, position, company, avatar_url")
    .neq("id", user.id)
    .limit(10)

  return profiles || []
}

export async function getRemainingCalls() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: "Não autenticado" }

  if (isAdmin(user.email)) {
    return { success: true, remaining: -1, isPro: true, isAdmin: true }
  }

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle()

  return { canCall: true, remaining: Number.POSITIVE_INFINITY, isPro: profile?.plan === "pro" }
}

export async function createVideoRoom() {
  return joinVideoQueue()
}

export async function findVideoPartner(roomId: string) {
  const room = await getRoomStatus(roomId)
  if (room && room.status === "active" && room.user2_id) {
    return {
      status: "active",
      partnerId: room.user1_id,
      roomId: room.id,
    }
  }
  return { status: "waiting" }
}
