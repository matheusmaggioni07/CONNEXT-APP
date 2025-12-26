"use server"

import { createClient } from "@/lib/supabase/server"

export async function likeUser(likedUserId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    // Record the like
    const { error: likeError } = await supabase.from("likes").insert({
      from_user_id: user.id,
      to_user_id: likedUserId,
    })

    if (likeError) {
      console.error("[v0] Like error:", likeError)
      return { success: false, error: "Failed to record like" }
    }

    // Check if there's a mutual like (match)
    const { data: mutualLike } = await supabase
      .from("likes")
      .select("id")
      .eq("from_user_id", likedUserId)
      .eq("to_user_id", user.id)
      .single()

    if (mutualLike) {
      // Create a match
      const { error: matchError } = await supabase.from("matches").insert({
        user1_id: user.id < likedUserId ? user.id : likedUserId,
        user2_id: user.id < likedUserId ? likedUserId : user.id,
      })

      if (!matchError) {
        return { success: true, isMatch: true }
      }
    }

    return { success: true, isMatch: false }
  } catch (error) {
    console.error("[v0] Error in likeUser:", error)
    return { success: false, error: "An error occurred" }
  }
}
