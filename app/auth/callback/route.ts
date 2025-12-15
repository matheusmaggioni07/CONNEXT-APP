import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")
  const next = requestUrl.searchParams.get("next") ?? "/dashboard"

  const productionOrigin = "https://www.connextapp.com.br"
  const origin = requestUrl.hostname.includes("connextapp.com.br") ? productionOrigin : requestUrl.origin

  // Handle OAuth errors
  if (error) {
    console.error("Auth callback error:", error, errorDescription)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription || error)}`)
  }

  if (code) {
    const cookieStore = await cookies()

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error("Code exchange error:", exchangeError)
      return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
    }

    if (data?.session) {
      const response = NextResponse.redirect(`${origin}${next}`)

      response.cookies.set("sb-access-token", data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      })
      response.cookies.set("sb-refresh-token", data.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      })

      // Check if user has completed onboarding
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", data.user.id)
        .single()

      // Redirect to onboarding if not completed
      if (!profile?.onboarding_completed) {
        response.headers.set("Location", `${origin}/dashboard/onboarding`)
      }

      return response
    }

    return NextResponse.redirect(`${origin}${next}`)
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=no_code_provided`)
}
