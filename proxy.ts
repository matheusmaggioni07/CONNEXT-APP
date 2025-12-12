import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { checkRateLimit, isIPBlocked, recordSuspiciousActivity, blockIP, incrementMetric, auditLog } from "@/lib/redis"

// Padrões de ataque conhecidos
const ATTACK_PATTERNS = [
  // SQL Injection
  /(\b(union|select|insert|update|delete|drop|create|alter|truncate)\b.*\b(from|into|table|database)\b)/i,
  /('|")\s*(or|and)\s*('|"|\d)/i,
  /(\b(exec|execute|xp_|sp_)\b)/i,

  // XSS
  /<script\b[^>]*>[\s\S]*?<\/script>/i,
  /javascript\s*:/i,
  /on\w+\s*=\s*["']?[^"']*["']?/i,

  // Path Traversal
  /\.\.\//,
  /%2e%2e%2f/i,
  /%252e%252e%252f/i,

  // Command Injection
  /[;&|`$]/,
  /\$\{.*\}/,

  // LDAP Injection
  /[()\\*]/,
]

// User agents maliciosos
const MALICIOUS_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /zgrab/i,
  /gobuster/i,
  /dirbuster/i,
  /wpscan/i,
  /burpsuite/i,
  /acunetix/i,
  /nessus/i,
  /openvas/i,
]

// Caminhos sensíveis
const SENSITIVE_PATHS = [
  "/.env",
  "/.git",
  "/wp-admin",
  "/wp-login",
  "/phpmyadmin",
  "/admin/config",
  "/.htaccess",
  "/web.config",
  "/server-status",
  "/server-info",
  "/.aws",
  "/.ssh",
  "/etc/passwd",
]

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
  const url = decodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)
  const userAgent = request.headers.get("user-agent") || ""

  // Verifica user agents maliciosos
  for (const pattern of MALICIOUS_USER_AGENTS) {
    if (pattern.test(userAgent)) {
      return { isAttack: true, type: "malicious_user_agent" }
    }
  }

  // Verifica caminhos sensíveis
  for (const path of SENSITIVE_PATHS) {
    if (request.nextUrl.pathname.toLowerCase().includes(path.toLowerCase())) {
      return { isAttack: true, type: "sensitive_path_access" }
    }
  }

  // Verifica padrões de ataque na URL
  for (const pattern of ATTACK_PATTERNS) {
    if (pattern.test(url)) {
      return { isAttack: true, type: "attack_pattern" }
    }
  }

  // Verifica path traversal
  if (request.nextUrl.pathname.includes("..") || request.nextUrl.pathname.includes("%2e%2e")) {
    return { isAttack: true, type: "path_traversal" }
  }

  return { isAttack: false }
}

export async function proxy(request: NextRequest) {
  const ip = getClientIP(request)
  const userAgent = request.headers.get("user-agent") || ""
  const path = request.nextUrl.pathname

  // 1. Verifica se IP está bloqueado
  try {
    if (await isIPBlocked(ip)) {
      await incrementMetric("blocked_requests")
      return new NextResponse(JSON.stringify({ error: "Acesso bloqueado temporariamente" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }
  } catch {
    // Se Redis falhar, continua sem bloqueio
  }

  // 2. Detecta ataques
  const attackCheck = checkForAttacks(request)
  if (attackCheck.isAttack) {
    try {
      await recordSuspiciousActivity(ip, attackCheck.type || "unknown_attack")
      await auditLog("attack_detected", {
        ip,
        type: attackCheck.type,
        path,
        userAgent,
      })

      // Bloqueia após atividade maliciosa confirmada
      if (attackCheck.type === "malicious_user_agent" || attackCheck.type === "attack_pattern") {
        await blockIP(ip, 3600, attackCheck.type)
      }
    } catch {
      // Se Redis falhar, continua
    }

    return new NextResponse(JSON.stringify({ error: "Requisição bloqueada" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  // 3. Rate limiting global por IP
  try {
    const rateLimit = await checkRateLimit(`global:${ip}`, 500, 60)
    if (!rateLimit.allowed) {
      await recordSuspiciousActivity(ip, "global_rate_limit")
      await incrementMetric("rate_limited_requests")

      return new NextResponse(JSON.stringify({ error: "Muitas requisições. Tente novamente em breve." }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rateLimit.retryAfter || 60),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimit.resetAt),
        },
      })
    }
  } catch {
    // Se Redis falhar, continua sem rate limiting
  }

  // 4. Incrementa métrica de requisições
  try {
    await incrementMetric("total_requests")
  } catch {
    // Ignora erro
  }

  // 5. Processa a sessão do Supabase
  const response = await updateSession(request)

  // 6. Headers de segurança abrangentes
  const securityHeaders = {
    // Previne MIME sniffing
    "X-Content-Type-Options": "nosniff",

    // Previne clickjacking
    "X-Frame-Options": "DENY",

    // Filtro XSS legado
    "X-XSS-Protection": "1; mode=block",

    // Controle de referrer
    "Referrer-Policy": "strict-origin-when-cross-origin",

    // Permissões de features
    "Permissions-Policy":
      "camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), bluetooth=(), serial=()",

    // HSTS - força HTTPS
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",

    // Previne download de arquivos sem prompt
    "X-Download-Options": "noopen",

    // DNS Prefetch
    "X-DNS-Prefetch-Control": "on",

    // Cross-Origin policies
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "credentialless",
  }

  // Content Security Policy robusto
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://vercel.live https://*.vercel.app",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: http:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://vitals.vercel-insights.com https://*.vercel.app https://*.upstash.io wss://*.upstash.io",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ")

  // Aplica headers
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value)
  }
  response.headers.set("Content-Security-Policy", csp)

  // Rate limit info nos headers (se disponível)
  try {
    const rateLimit = await checkRateLimit(`global:${ip}`, 500, 60)
    response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining))
    response.headers.set("X-RateLimit-Reset", String(rateLimit.resetAt))
  } catch {
    // Ignora erro
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)"],
}
