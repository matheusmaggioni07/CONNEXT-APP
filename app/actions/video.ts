"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Profile } from "@/lib/types"

const PLAN_LIMITS = {
  free: { dailyLikes: 5, dailyCalls: 5 },
  pro: { dailyLikes: Number.POSITIVE_INFINITY, dailyCalls: Number.POSITIVE_INFINITY },
}

export async function checkCallLimit() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { canCall: false, error: "Não autenticado" }

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
  const today = new Date().toISOString().split("T")[0]

  if (profile.last_activity_reset !== today) {
    await supabase.rpc("reset_daily_limits", { p_user_id: user.id })
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

export async function findAvailablePartner(): Promise<{ partner?: Profile; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado" }

  // Check limit first
  const limitCheck = await checkCallLimit()
  if (!limitCheck.canCall) {
    return { error: "Você atingiu o limite diário de chamadas. Faça upgrade para o Pro!" }
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

  // Pick a random profile from available ones
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

  // Verify the partner exists
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

  // Increment call count
  await supabase.rpc("increment_daily_calls", { p_user_id: user.id })

  revalidatePath("/dashboard/video")
  return { success: true, room }
}

export async function createVideoRoom() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado" }

  // Check limit
  const limitCheck = await checkCallLimit()
  if (!limitCheck.canCall) {
    return { error: "Você atingiu o limite diário de chamadas. Faça upgrade para o Pro!" }
  }

  // First, look for another user waiting for a partner
  const { data: waitingRooms } = await supabase
    .from("video_rooms")
    .select("id, user1_id")
    .eq("status", "waiting")
    .is("user2_id", null)
    .neq("user1_id", user.id)
    .limit(1)

  if (waitingRooms && waitingRooms.length > 0) {
    // Found a waiting room - join it
    const roomToJoin = waitingRooms[0]

    const { error: joinError } = await supabase
      .from("video_rooms")
      .update({
        user2_id: user.id,
        status: "active",
      })
      .eq("id", roomToJoin.id)
      .eq("status", "waiting") // Extra safety check

    if (joinError) {
      console.error("[v0] Join video room error:", joinError)
      return { error: "Erro ao entrar na sala" }
    }

    await supabase.rpc("increment_daily_calls", { p_user_id: user.id })

    revalidatePath("/dashboard/video")
    return {
      success: true,
      room: { id: roomToJoin.id, status: "active" },
      partnerId: roomToJoin.user1_id,
      joined: true,
    }
  }

  // No waiting rooms - check if there are other users online
  const { data: otherProfiles } = await supabase.from("profiles").select("id").neq("id", user.id).limit(1)

  if (!otherProfiles || otherProfiles.length === 0) {
    return {
      error: "Não há outros usuários disponíveis no momento. Convide amigos para usar o Connext!",
      noUsers: true,
    }
  }

  // Create a new waiting room
  const { data: room, error } = await supabase
    .from("video_rooms")
    .insert({
      user1_id: user.id,
      status: "waiting",
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Create video room error:", error)
    return { error: error.message }
  }

  await supabase.rpc("increment_daily_calls", { p_user_id: user.id })

  revalidatePath("/dashboard/video")
  return { success: true, room, waiting: true }
}

export async function findVideoPartner(roomId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado" }

  // Check if someone joined our room
  const { data: myRoom } = await supabase.from("video_rooms").select("id, user2_id, status").eq("id", roomId).single()

  if (myRoom?.user2_id && myRoom.status === "active") {
    // Someone joined our room!
    return {
      success: true,
      partnerId: myRoom.user2_id,
      roomId: myRoom.id,
    }
  }

  // Look for another waiting room to join
  const { data: waitingRooms } = await supabase
    .from("video_rooms")
    .select("id, user1_id")
    .eq("status", "waiting")
    .is("user2_id", null)
    .neq("user1_id", user.id)
    .neq("id", roomId)
    .limit(1)

  if (waitingRooms && waitingRooms.length > 0) {
    const roomToJoin = waitingRooms[0]

    // Join that room and close our waiting room
    const { error: joinError } = await supabase
      .from("video_rooms")
      .update({
        user2_id: user.id,
        status: "active",
      })
      .eq("id", roomToJoin.id)
      .eq("status", "waiting")

    if (!joinError) {
      // Close our waiting room
      await supabase
        .from("video_rooms")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
        })
        .eq("id", roomId)

      return {
        success: true,
        joinedRoomId: roomToJoin.id,
        partnerId: roomToJoin.user1_id,
      }
    }
  }

  // Still waiting
  return { success: true, waiting: true }
}

export async function endVideoRoom(roomId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado" }

  const { error } = await supabase
    .from("video_rooms")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
    })
    .eq("id", roomId)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

  if (error) {
    console.error("[v0] End video room error:", error)
    return { error: error.message }
  }

  return { success: true }
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

  // Get profiles for both users
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
