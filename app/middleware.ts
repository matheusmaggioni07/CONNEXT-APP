import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function middleware(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
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
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    return NextResponse.redirect(redirectUrl)
  }

  if (user && request.nextUrl.pathname.startsWith("/dashboard") && !user.email_confirmed_at) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = `/auth/verify-email?email=${encodeURIComponent(user.email || "")}`
    return NextResponse.redirect(redirectUrl)
  }

  if (
    user &&
    user.email_confirmed_at &&
    (request.nextUrl.pathname.startsWith("/login") ||
      request.nextUrl.pathname.startsWith("/register") ||
      request.nextUrl.pathname.startsWith("/signup") ||
      request.nextUrl.pathname === "/")
  ) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/dashboard"
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
}
