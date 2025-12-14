import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const ATTACK_PATTERNS = [
  /(\bUNION\s+ALL\s+SELECT\b)/i,
  /(\bSELECT\s+.*\s+FROM\s+.*\s+WHERE\b)/i,
  /(\bINSERT\s+INTO\s+.*\s+VALUES\b)/i,
  /(\bDROP\s+TABLE\b)/i,
  /(\bDELETE\s+FROM\b)/i,
  /(--|#|\/\*).*(SELECT|INSERT|UPDATE|DELETE|DROP)/i,
  /<script[^>]*>[\s\S]*?<\/script>/i,
  /javascript\s*:\s*[a-z]/i,
  /\.\.\//,
  /%2e%2e%2f/i,
]

const MALICIOUS_USER_AGENTS = [/sqlmap/i, /nikto/i, /nmap/i, /masscan/i, /acunetix/i, /havij/i]

const BLOCKED_PATHS = ["/.env", "/.git", "/wp-admin", "/wp-login", "/phpmyadmin", "/.aws", "/.ssh"]

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  const realIP = request.headers.get("x-real-ip")
  if (realIP) {
    return realIP
  }
  return "127.0.0.1"
}

function checkForAttacks(request: NextRequest): { isAttack: boolean; type?: string } {
  const url = decodeURIComponent(request.nextUrl.pathname)
  const userAgent = request.headers.get("user-agent") || ""

  for (const pattern of MALICIOUS_USER_AGENTS) {
    if (pattern.test(userAgent)) {
      return { isAttack: true, type: "malicious_user_agent" }
    }
  }

  const pathLower = request.nextUrl.pathname.toLowerCase()
  for (const blockedPath of BLOCKED_PATHS) {
    if (pathLower === blockedPath || pathLower.startsWith(blockedPath + "/")) {
      return { isAttack: true, type: "blocked_path_access" }
    }
  }

  for (const pattern of ATTACK_PATTERNS) {
    if (pattern.test(url)) {
      return { isAttack: true, type: "attack_pattern" }
    }
  }

  return { isAttack: false }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  if (path.startsWith("/auth/")) {
    return updateSession(request)
  }

  if (
    path.startsWith("/_next") ||
    path.startsWith("/static") ||
    path === "/favicon.ico" ||
    path === "/robots.txt" ||
    path === "/sitemap.xml" ||
    path.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot|map|mp3|mp4|webm|glb|gltf)$/i)
  ) {
    return NextResponse.next()
  }

  if (path.startsWith("/api/webhooks")) {
    return NextResponse.next()
  }

  const attackCheck = checkForAttacks(request)
  if (attackCheck.isAttack) {
    console.log(`[Security] Attack blocked: ${attackCheck.type} from ${getClientIP(request)}`)
    return new NextResponse(null, { status: 404 })
  }

  const response = await updateSession(request)

  const securityHeaders = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(self), microphone=(self), geolocation=()",
  }

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://vercel.live https://cdn.tailwindcss.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: http:",
    "connect-src 'self' https: wss:",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "media-src 'self' blob: https:",
    "worker-src 'self' blob:",
  ].join("; ")

  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value)
  }
  response.headers.set("Content-Security-Policy", csp)
  response.headers.delete("X-Powered-By")

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
