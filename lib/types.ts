export interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  company: string | null
  position: string | null
  seniority: string | null
  industry: string | null
  city: string | null
  country: string
  bio: string | null
  interests: string[]
  looking_for: string[]
  avatar_url: string | null
  plan: "free" | "pro"
  daily_likes_count: number
  daily_calls_count: number
  last_activity_reset: string
  created_at: string
  updated_at: string
  is_online?: boolean
}

export interface Like {
  id: string
  from_user_id: string
  to_user_id: string
  created_at: string
}

export interface Match {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
  matched_profile?: Profile
}

export interface VideoRoom {
  id: string
  user1_id: string
  user2_id: string | null
  status: "waiting" | "active" | "ended"
  created_at: string
  ended_at: string | null
}

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: string
  current_period_end: string | null
  created_at: string
  updated_at: string
}

// Legacy User type for compatibility
export interface User {
  id: string
  email: string
  name: string
  phone: string
  company: string
  position: string
  industry: string
  interests: string[]
  bio: string
  avatar: string
  location: {
    city: string
    country: string
    lat?: number
    lng?: number
  }
  lookingFor: string[]
  isOnline: boolean
  lastActive: Date
}

// Convert Profile to User format
export function profileToUser(profile: Profile, isOnline = false): User {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.full_name,
    phone: profile.phone || "",
    company: profile.company || "",
    position: profile.position || "",
    industry: profile.industry || "",
    interests: profile.interests || [],
    bio: profile.bio || "",
    avatar: profile.avatar_url || "/placeholder.svg?height=200&width=200",
    location: {
      city: profile.city || "",
      country: profile.country || "Brasil",
    },
    lookingFor: profile.looking_for || [],
    isOnline,
    lastActive: new Date(profile.updated_at),
  }
}
