import { createClient as createSupabaseClient } from "@supabase/supabase-js"

let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null

function saveSessionToCookies(session: { access_token: string; refresh_token: string } | null) {
  if (typeof document === "undefined") return

  if (session) {
    // Set cookies with appropriate settings
    const maxAge = 60 * 60 * 24 * 7 // 7 days
    document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax`
    document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=${maxAge}; SameSite=Lax`
  } else {
    // Clear cookies
    document.cookie = "sb-access-token=; path=/; max-age=0"
    document.cookie = "sb-refresh-token=; path=/; max-age=0"
  }
}

export function createClient() {
  if (supabaseClient) {
    return supabaseClient
  }

  supabaseClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
    },
  )

  if (typeof window !== "undefined") {
    supabaseClient.auth.onAuthStateChange((event, session) => {
      console.log("[v0] Auth state changed:", event)
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        saveSessionToCookies(session)
      } else if (event === "SIGNED_OUT") {
        saveSessionToCookies(null)
      }
    })

    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        saveSessionToCookies(session)
      }
    })
  }

  return supabaseClient
}
