"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { Sidebar, MobileHeader, MobileBottomNav } from "@/components/dashboard/sidebar"
import { TermsModal } from "@/components/terms-modal"
import { createClient } from "@/lib/supabase/client"

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [termsChecked, setTermsChecked] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function checkTerms() {
      if (!user) return

      const { data: profile } = await supabase.from("profiles").select("terms_accepted").eq("id", user.id).single()

      if (profile && !profile.terms_accepted) {
        setShowTermsModal(true)
      }
      setTermsChecked(true)
    }

    if (user) {
      checkTerms()
    }
  }, [user, supabase])

  if (isLoading || !termsChecked) {
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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Terms acceptance modal */}
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
