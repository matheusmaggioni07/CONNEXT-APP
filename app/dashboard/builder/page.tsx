import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { BuilderPage } from "@/components/builder/builder-page"

export default async function Builder() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get user profile for credits/plan info
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return <BuilderPage user={user} profile={profile} />
}
