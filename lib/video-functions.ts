import { createClient } from "@/lib/supabase/client"

interface JoinVideoQueueResponse {
  success: boolean
  roomId: string
  matched: boolean
  partnerId?: string
  partnerProfile?: {
    id: string
    full_name: string
    avatar_url: string
    city?: string
  }
  error?: string
}

interface CheckRoomStatusResponse {
  status: string
  partnerId?: string
  partnerProfile?: {
    id: string
    full_name: string
    avatar_url: string
    city?: string
  }
}

export async function joinVideoQueue({
  userId,
  roomId,
  userProfile,
}: {
  userId: string
  roomId: string
  userProfile: { full_name: string; avatar_url?: string; city?: string }
}): Promise<JoinVideoQueueResponse> {
  try {
    const response = await fetch("/api/video-queue/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, roomId, userProfile }),
    })

    if (!response.ok) {
      throw new Error("Failed to join queue")
    }

    return await response.json()
  } catch (error) {
    console.error("[v0] Join queue error:", error)
    return {
      success: false,
      roomId: "",
      matched: false,
      error: String(error),
    }
  }
}

export async function checkRoomStatus(roomId: string | null, userId: string): Promise<CheckRoomStatusResponse> {
  if (!roomId) {
    return { status: "error" }
  }

  try {
    const response = await fetch("/api/video-queue/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, userId }),
    })

    if (!response.ok) {
      throw new Error("Failed to check room status")
    }

    return await response.json()
  } catch (error) {
    console.error("[v0] Check room status error:", error)
    return {
      status: "error",
    }
  }
}

export async function leaveVideoQueue(roomId: string, userId: string): Promise<void> {
  try {
    await fetch("/api/video-queue/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, userId }),
    })
  } catch (error) {
    console.error("[v0] Leave queue error:", error)
  }
}

export async function likeUser(partnerId: string): Promise<void> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    await supabase.from("likes").insert({
      from_user_id: user.id,
      to_user_id: partnerId,
    })
  } catch (error) {
    console.error("[v0] Like user error:", error)
  }
}
