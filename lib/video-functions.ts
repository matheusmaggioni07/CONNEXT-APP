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

export async function joinVideoQueue(userId: string): Promise<JoinVideoQueueResponse> {
  try {
    const response = await fetch("/api/video-queue/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
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

export async function checkRoomStatus(roomId: string, userId: string): Promise<CheckRoomStatusResponse> {
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

export async function likeUser(userId: string, partnerId: string): Promise<void> {
  try {
    const supabase = createClient()

    // Record the like
    await supabase.from("likes").insert({
      user_id: userId,
      liked_user_id: partnerId,
    })
  } catch (error) {
    console.error("[v0] Like user error:", error)
  }
}
