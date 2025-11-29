import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard") && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const { data: profile } = await supabase.from("profiles").select("onboarding_completed").eq("id", user.id).single()

    // Only redirect to onboarding if explicitly NOT completed
    const isOnboardingComplete = profile?.onboarding_completed === true

    if (!isOnboardingComplete && !request.nextUrl.pathname.startsWith("/dashboard/onboarding")) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard/onboarding"
      return NextResponse.redirect(url)
    }

    // If onboarding is complete and user tries to access onboarding page, redirect to dashboard
    if (isOnboardingComplete && request.nextUrl.pathname.startsWith("/dashboard/onboarding")) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
  }

  // Redirect logged in users away from auth pages
  if ((request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/register") && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
