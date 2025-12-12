import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { checkRateLimit, isIPBlocked, recordSuspiciousActivity, blockIP, incrementMetric, auditLog } from "@/lib/redis"

const ATTACK_PATTERNS = [
  // SQL Injection
  /(\b(union|select|insert|update|delete|drop|create|alter|truncate)\b.*\b(from|into|table|database)\b)/i,
  /('|")\s*(or|and)\s*('|"|\d)/i,
  /(\b(exec|execute|xp_|sp_)\b)/i,
  /\b(benchmark|sleep|waitfor|delay)\b/i,

  // XSS
  /<script\b[^>]*>[\s\S]*?<\/script>/i,
  /javascript\s*:/i,
  /on\w+\s*=\s*["']?[^"']*["']?/i,
  /data\s*:\s*text\/html/i,

  // Path Traversal
  /\.\.\//,
  /%2e%2e%2f/i,
  /%252e%252e%252f/i,
  /\.\.%2f/i,
  /%2e%2e\//i,

  // Command Injection
  /[;&|`$]/,
  /\$\{.*\}/,
  /\$$$.*$$/,
  /`.*`/,

  // LDAP Injection
  /[()\\*]/,

  // XXE
  /<!ENTITY/i,
  /<!DOCTYPE.*SYSTEM/i,

  // SSRF
  /localhost/i,
  /127\.0\.0\.1/,
  /0\.0\.0\.0/,
  /\[::1\]/,

  // Template Injection
  /\{\{.*\}\}/,
  /\$\{.*\}/,
  /<%= .* %>/,
]

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
  /havij/i,
  /w3af/i,
  /skipfish/i,
  /arachni/i,
  /commix/i,
  /joomscan/i,
  /drupalgeddon/i,
  /metasploit/i,
  /hydra/i,
  /medusa/i,
]

const BLOCKED_PATHS = [
  // Config files
  "/.env",
  "/.env.local",
  "/.env.production",
  "/.env.development",
  "/.git",
  "/.gitignore",
  "/.htaccess",
  "/.htpasswd",
  "/web.config",
  "/config.php",
  "/config.json",
  "/settings.json",

  // Source code
  "/.next",
  "/node_modules",
  "/src",
  "/lib",
  "/components",
  "/scripts",
  "/package.json",
  "/package-lock.json",
  "/tsconfig.json",
  "/next.config",

  // Admin panels
  "/wp-admin",
  "/wp-login",
  "/wp-content",
  "/phpmyadmin",
  "/adminer",
  "/admin/config",
  "/administrator",
  "/cpanel",
  "/plesk",

  // System files
  "/server-status",
  "/server-info",
  "/.aws",
  "/.ssh",
  "/etc/passwd",
  "/etc/shadow",
  "/proc/self",
  "/var/log",

  // API keys and secrets
  "/api/keys",
  "/api/secrets",
  "/api/config",
  "/.credentials",
  "/secrets",

  // Debug
  "/debug",
  "/phpinfo",
  "/test.php",
  "/info.php",

  // Backup files
  "/.bak",
  "/.backup",
  "/.old",
  "/.orig",
  "/.save",
  "/backup",
  "/db.sql",
  "/dump.sql",
]

const PROTECTED_API_ROUTES = [
  "/api/admin",
  "/api/builder/projects",
  "/api/builder/generate",
  "/api/security",
  "/api/upload",
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

  const pathLower = request.nextUrl.pathname.toLowerCase()
  for (const blockedPath of BLOCKED_PATHS) {
    if (pathLower.includes(blockedPath.toLowerCase())) {
      return { isAttack: true, type: "blocked_path_access" }
    }
  }

  // Verifica extensões de arquivo sensíveis
  const sensitiveExtensions = [".env", ".git", ".sql", ".bak", ".log", ".conf", ".ini", ".yaml", ".yml", ".toml"]
  for (const ext of sensitiveExtensions) {
    if (pathLower.endsWith(ext)) {
      return { isAttack: true, type: "sensitive_file_access" }
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

  if (/:\d{4,5}/.test(url) || /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(url)) {
    return { isAttack: true, type: "ssrf_attempt" }
  }

  return { isAttack: false }
}

function requiresAuth(path: string): boolean {
  return PROTECTED_API_ROUTES.some((route) => path.startsWith(route))
}

export async function middleware(request: NextRequest) {
  const ip = getClientIP(request)
  const userAgent = request.headers.get("user-agent") || ""
  const path = request.nextUrl.pathname

  // Arquivos estáticos que devem ser ignorados
  if (
    path.startsWith("/_next/static") ||
    path.startsWith("/_next/image") ||
    path === "/favicon.ico" ||
    path === "/robots.txt" ||
    path === "/sitemap.xml" ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot|map)$/.test(path)
  ) {
    return NextResponse.next()
  }

  if (path.endsWith(".map")) {
    return new NextResponse(null, { status: 404 })
  }

  // 1. Verifica se IP está bloqueado
  try {
    if (await isIPBlocked(ip)) {
      await incrementMetric("blocked_requests")
      return new NextResponse(JSON.stringify({ error: "Access denied" }), {
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
        userAgent: userAgent.slice(0, 200),
        timestamp: new Date().toISOString(),
      })

      // Bloqueia IP imediatamente para ataques graves
      if (
        ["malicious_user_agent", "attack_pattern", "ssrf_attempt", "path_traversal"].includes(attackCheck.type || "")
      ) {
        await blockIP(ip, 7200, attackCheck.type) // 2 horas de bloqueio
      }
    } catch {
      // Se Redis falhar, continua
    }

    return new NextResponse(null, { status: 404 })
  }

  // 3. Rate limiting por IP
  try {
    const rateLimit = await checkRateLimit(`global:${ip}`, 300, 60)
    if (!rateLimit.allowed) {
      await recordSuspiciousActivity(ip, "global_rate_limit")
      await incrementMetric("rate_limited_requests")

      return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rateLimit.retryAfter || 60),
        },
      })
    }
  } catch {
    // Se Redis falhar, continua
  }

  // 4. Incrementa métrica
  try {
    await incrementMetric("total_requests")
  } catch {
    // Ignora erro
  }

  // 5. Processa a sessão do Supabase
  const response = await updateSession(request)

  const securityHeaders = {
    // Previne MIME sniffing
    "X-Content-Type-Options": "nosniff",

    // Previne clickjacking
    "X-Frame-Options": "DENY",

    // Filtro XSS legado
    "X-XSS-Protection": "1; mode=block",

    // Controle de referrer
    "Referrer-Policy": "strict-origin-when-cross-origin",

    // Permissões restritas
    "Permissions-Policy":
      "camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), bluetooth=(), serial=(), accelerometer=(), gyroscope=(), magnetometer=()",

    // HSTS - força HTTPS por 2 anos
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",

    // Previne download sem prompt
    "X-Download-Options": "noopen",

    // DNS Prefetch
    "X-DNS-Prefetch-Control": "on",

    // Cross-Origin policies rígidas
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "credentialless",

    "X-Powered-By": "",
    Server: "",
  }

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://vercel.live",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://vitals.vercel-insights.com https://*.upstash.io wss://*.upstash.io",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
    "block-all-mixed-content",
  ].join("; ")

  // Aplica headers
  for (const [key, value] of Object.entries(securityHeaders)) {
    if (value) {
      response.headers.set(key, value)
    } else {
      response.headers.delete(key)
    }
  }
  response.headers.set("Content-Security-Policy", csp)

  response.headers.delete("X-Powered-By")
  response.headers.delete("Server")

  return response
}

export const config = {
  matcher: ["/", "/(api|dashboard|login|register|share)/:path*"],
}
