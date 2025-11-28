"use server"

import { setUserOnline, setUserOffline, getOnlineUsers, getOnlineUsersCount, isUserOnline } from "@/lib/redis"
import { createClient } from "@/lib/supabase/server"

export async function updatePresence() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado" }

  await setUserOnline(user.id)
  return { success: true }
}

export async function removePresence() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado" }

  await setUserOffline(user.id)
  return { success: true }
}

export async function getOnlineCount() {
  const count = await getOnlineUsersCount()
  return count
}

export async function getOnlineUserIds() {
  const users = await getOnlineUsers()
  return users
}

export async function checkUserOnline(userId: string) {
  const online = await isUserOnline(userId)
  return online
}
