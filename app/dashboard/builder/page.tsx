"use client"

import BuilderPage from "@/components/builder/builder-page"
import { useAuth } from "@/lib/auth-context"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function Builder() {
  const { user, isLoading } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      if (!user) return

      const supabase = createClient()
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      setProfile(data)
      setLoadingProfile(false)
    }

    if (user) {
      loadProfile()
    } else if (!isLoading) {
      setLoadingProfile(false)
    }
  }, [user, isLoading])

  if (isLoading || loadingProfile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Layout will handle redirect
  }

  return <BuilderPage user={user} profile={profile} />
}
