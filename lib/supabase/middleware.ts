import { NextResponse, type NextRequest } from "next/server"

// The dashboard layout handles auth protection client-side
export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  // Don't do auth checks in middleware - let client-side handle it
  // This prevents the redirect loop issue
  return supabaseResponse
}
