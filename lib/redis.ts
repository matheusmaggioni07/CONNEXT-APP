import { Redis } from "@upstash/redis"

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// Keys
const ONLINE_USERS_KEY = "online_users"
const USER_PRESENCE_PREFIX = "user_presence:"

// Set user online with 60 second TTL
export async function setUserOnline(userId: string) {
  const key = `${USER_PRESENCE_PREFIX}${userId}`
  await redis.set(key, Date.now(), { ex: 60 })
  await redis.sadd(ONLINE_USERS_KEY, userId)
}

// Remove user from online
export async function setUserOffline(userId: string) {
  const key = `${USER_PRESENCE_PREFIX}${userId}`
  await redis.del(key)
  await redis.srem(ONLINE_USERS_KEY, userId)
}

// Check if user is online
export async function isUserOnline(userId: string): Promise<boolean> {
  const key = `${USER_PRESENCE_PREFIX}${userId}`
  const presence = await redis.get(key)
  return presence !== null
}

// Get all online users
export async function getOnlineUsers(): Promise<string[]> {
  const users = await redis.smembers(ONLINE_USERS_KEY)
  // Filter out users whose TTL has expired
  const onlineUsers: string[] = []
  for (const userId of users) {
    if (await isUserOnline(userId as string)) {
      onlineUsers.push(userId as string)
    } else {
      await redis.srem(ONLINE_USERS_KEY, userId)
    }
  }
  return onlineUsers
}

// Get online users count
export async function getOnlineUsersCount(): Promise<number> {
  const users = await getOnlineUsers()
  return users.length
}
