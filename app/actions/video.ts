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

export async function joinVideoQueue() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: "Not authenticated" }

  try {
    console.log("[v0] User joining video queue:", user.id)

    await supabase.from("video_rooms").delete().or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

    const { data: waitingRooms, error: searchError } = await supabase
      .from("video_rooms")
      .select("*")
      .eq("status", "waiting")
      .neq("user1_id", user.id) // Make sure user1 is NOT this user
      .is("user2_id", null) // Make sure no user2 yet
      .order("created_at", { ascending: true })
      .limit(1)

    console.log("[v0] Searching for waiting room:", waitingRooms?.length, "found")

    if (waitingRooms && waitingRooms.length > 0) {
      const existingRoom = waitingRooms[0]
      console.log("[v0] Found waiting room, joining:", existingRoom.id)

      const { data: updatedRoom, error: updateError } = await supabase
        .from("video_rooms")
        .update({
          user2_id: user.id,
          status: "active",
          matched_at: new Date().toISOString(),
        })
        .eq("id", existingRoom.id)
        .select()
        .single()

      if (updateError) {
        console.error("[v0] Failed to update room:", updateError)
        return { success: false, error: "Failed to join room" }
      }

      console.log("[v0] Successfully matched! Room ID:", updatedRoom.id)

      return {
        success: true,
        roomId: updatedRoom.id,
        matched: true,
        partnerId: existingRoom.user1_id, // Return the other user's ID
      }
    }

    console.log("[v0] No waiting room found, creating new one")

    const { data: newRoom, error: createError } = await supabase
      .from("video_rooms")
      .insert([
        {
          user1_id: user.id,
          status: "waiting",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (createError) {
      console.error("[v0] Failed to create room:", createError)
      return { success: false, error: "Failed to create room" }
    }

    console.log("[v0] Created waiting room:", newRoom.id)

    return {
      success: true,
      roomId: newRoom.id,
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

  const { data: room } = await supabase.from("video_rooms").select("*").eq("id", roomId).single()

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
      .single()

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
      .single()

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
    .single()

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

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single()

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
