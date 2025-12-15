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

function saveSessionToCookies(session: { access_token: string; refresh_token: string } | null) {
  if (typeof document === "undefined") return

  if (session) {
    const maxAge = 60 * 60 * 24 * 7 // 7 days
    document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax`
    document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=${maxAge}; SameSite=Lax`
  } else {
    document.cookie = "sb-access-token=; path=/; max-age=0"
    document.cookie = "sb-refresh-token=; path=/; max-age=0"
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
            saveSessionToCookies(session)
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[v0] Auth state change:", event)
      if (mounted) {
        setUser(session?.user ?? null)
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          saveSessionToCookies(session)
        } else if (event === "SIGNED_OUT") {
          saveSessionToCookies(null)
        }
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
          setIsLoading(false)
        }
      }
    })

    initAuth()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      saveSessionToCookies(null)
      await supabase.auth.signOut()
      setUser(null)
    } catch (err) {
      console.log("[v0] Sign out error:", err)
      saveSessionToCookies(null)
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
