"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { User } from "./types"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (data: RegisterData) => Promise<boolean>
  logout: () => void
}

interface RegisterData {
  email: string
  password: string
  name: string
  phone: string
  company: string
  position: string
  industry: string
  interests: string[]
  bio: string
  city: string
  country: string
  lookingFor: string[]
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem("proconnect_user")
    if (stored) {
      setUser(JSON.parse(stored))
    }
    setIsLoading(false)
  }, [])

  const validateProfessionalEmail = (email: string): boolean => {
    const freeEmails = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "icloud.com"]
    const domain = email.split("@")[1]?.toLowerCase()
    return domain ? !freeEmails.includes(domain) : false
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!validateProfessionalEmail(email)) {
      return false
    }

    const users = JSON.parse(localStorage.getItem("proconnect_users") || "[]")
    const found = users.find((u: User & { password: string }) => u.email === email && u.password === password)

    if (found) {
      const { password: _, ...userData } = found
      setUser(userData)
      localStorage.setItem("proconnect_user", JSON.stringify(userData))
      return true
    }
    return false
  }

  const register = async (data: RegisterData): Promise<boolean> => {
    if (!validateProfessionalEmail(data.email)) {
      return false
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      email: data.email,
      name: data.name,
      phone: data.phone,
      company: data.company,
      position: data.position,
      industry: data.industry,
      interests: data.interests,
      bio: data.bio,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${data.name}`,
      location: {
        city: data.city,
        country: data.country,
      },
      lookingFor: data.lookingFor,
      isOnline: true,
      lastActive: new Date(),
    }

    const users = JSON.parse(localStorage.getItem("proconnect_users") || "[]")
    users.push({ ...newUser, password: data.password })
    localStorage.setItem("proconnect_users", JSON.stringify(users))

    setUser(newUser)
    localStorage.setItem("proconnect_user", JSON.stringify(newUser))
    return true
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("proconnect_user")
  }

  return <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
