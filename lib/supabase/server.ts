import "server-only"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  const accessToken = cookieStore.get("sb-access-token")?.value
  const refreshToken = cookieStore.get("sb-refresh-token")?.value

  console.log("[v0] Server createClient - has access token:", !!accessToken)

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : {},
      },
    },
  )

  if (accessToken && refreshToken) {
    try {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (error) {
        console.log("[v0] Server setSession error:", error.message)
      }
    } catch (e) {
      console.log("[v0] Server setSession exception:", e)
    }
  }

  return supabase
}
