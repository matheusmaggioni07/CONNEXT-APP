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

export interface Match {
  id: string
  users: [string, string]
  createdAt: Date
  status: "pending" | "matched" | "declined"
}

export interface VideoCall {
  id: string
  participants: [string, string]
  startedAt: Date
  endedAt?: Date
  status: "active" | "ended"
}
