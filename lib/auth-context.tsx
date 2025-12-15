"use client"

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface AuthContextType {
  user: SupabaseUser | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const RECENT_LOGIN_KEY = "connext_recent_login"

export function setRecentLogin() {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(RECENT_LOGIN_KEY, Date.now().toString())
  }
}

function getRecentLogin(): boolean {
  if (typeof window === "undefined") return false
  const timestamp = sessionStorage.getItem(RECENT_LOGIN_KEY)
  if (!timestamp) return false
  // Consider "recent" if within 10 seconds
  const isRecent = Date.now() - Number.parseInt(timestamp) < 10000
  return isRecent
}

function clearRecentLogin() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(RECENT_LOGIN_KEY)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    let mounted = true

    const initAuth = async () => {
      try {
        // First, try to get the current session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.log("[v0] Session error:", error.message)
        }

        if (mounted) {
          if (session?.user) {
            setUser(session.user)
          }
          setIsLoading(false)
        }
      } catch (err) {
        console.log("[v0] Auth init error:", err)
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[v0] Auth state change:", event)
      if (mounted) {
        setUser(session?.user ?? null)
        // Only set loading false on sign in/out events, not on initial
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
          setIsLoading(false)
        }
      }
    })

    // Then check initial session
    initAuth()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
    } catch (err) {
      console.log("[v0] Sign out error:", err)
      setUser(null)
    }
  }

  return <AuthContext.Provider value={{ user, isLoading, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
