import { VideoPage } from "@/components/dashboard/video-page"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function VideoRoute() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, city, state, interests")
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/dashboard/onboarding")
  }

  return (
    <VideoPage
      userId={user.id}
      userProfile={{
        full_name: profile.full_name || "Usuário",
        avatar_url: profile.avatar_url,
        city: profile.city,
        state: profile.state,
        interests: profile.interests,
      }}
    />
  )
}
