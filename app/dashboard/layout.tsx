"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { Sidebar, MobileHeader, MobileBottomNav } from "@/components/dashboard/sidebar"
import { TermsModal } from "@/components/terms-modal"
import { createClient } from "@/lib/supabase/client"

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [termsChecked, setTermsChecked] = useState(false)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  useEffect(() => {
    let mounted = true

    async function checkTerms() {
      if (!user) return

      try {
        const { data: profile } = await supabase.from("profiles").select("terms_accepted").eq("id", user.id).single()

        if (mounted) {
          if (profile && !profile.terms_accepted) {
            setShowTermsModal(true)
          }
          setTermsChecked(true)
        }
      } catch (err) {
        console.log("[v0] Error checking terms:", err)
        if (mounted) {
          setTermsChecked(true)
        }
      }
    }

    if (user) {
      checkTerms()
    } else if (!isLoading) {
      setTermsChecked(true)
    }

    return () => {
      mounted = false
    }
  }, [user, isLoading])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [isLoading, user, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!termsChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex">
      {showTermsModal && <TermsModal userId={user.id} onAccept={() => setShowTermsModal(false)} />}
      <MobileHeader />
      <Sidebar />
      <main className="flex-1 overflow-auto pt-14 pb-20 md:pt-0 md:pb-0">{children}</main>
      <MobileBottomNav />
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </AuthProvider>
  )
}
