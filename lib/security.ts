// Utilitários de segurança para o Connext App
import {
  checkRateLimit,
  RATE_LIMITS,
  blockIP,
  isIPBlocked,
  recordSuspiciousActivity,
  recordFailedLogin,
  clearFailedLogins,
  auditLog,
  incrementMetric,
} from "./redis"

// ==================== RATE LIMITING ====================

export async function rateLimitAPI(
  identifier: string,
  type: keyof typeof RATE_LIMITS = "API_GENERAL",
): Promise<{ allowed: boolean; remaining: number; resetAt: number; retryAfter?: number }> {
  const config = RATE_LIMITS[type]
  return checkRateLimit(identifier, config.maxRequests, config.windowSeconds)
}

// ==================== SANITIZAÇÃO ====================

export function sanitizeString(input: string): string {
  if (typeof input !== "string") return ""

  return input
    .trim()
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .slice(0, 10000)
}

export function sanitizeHtml(input: string): string {
  if (typeof input !== "string") return ""

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<meta\b[^>]*>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/vbscript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/expression\s*\(/gi, "")
    .trim()
}

export function sanitizeSQL(input: string): string {
  if (typeof input !== "string") return ""

  return input
    .replace(/'/g, "''")
    .replace(/;/g, "")
    .replace(/--/g, "")
    .replace(/\/\*/g, "")
    .replace(/\*\//g, "")
    .replace(/xp_/gi, "")
    .replace(/union\s+select/gi, "")
    .replace(/insert\s+into/gi, "")
    .replace(/drop\s+table/gi, "")
    .replace(/delete\s+from/gi, "")
    .replace(/update\s+.*\s+set/gi, "")
}

export function sanitizeFilename(filename: string): string {
  if (typeof filename !== "string") return ""

  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .slice(0, 255)
}

// ==================== VALIDAÇÃO ====================

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ["http:", "https:"].includes(parsed.protocol)
  } catch {
    return false
  }
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export function isValidPhone(phone: string): boolean {
  // Aceita formatos brasileiros e internacionais
  const phoneRegex = /^[\d\s\-+$$$$]{8,20}$/
  return phoneRegex.test(phone)
}

// ==================== TOKENS SEGUROS ====================

export function generateSecureToken(length = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  const randomValues = new Uint32Array(length)
  crypto.getRandomValues(randomValues)
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length]
  }
  return result
}

export function generateAPIKey(): string {
  return `cx_${generateSecureToken(40)}`
}

// ==================== SENHA ====================

export function validatePasswordStrength(password: string): {
  valid: boolean
  score: number
  errors: string[]
} {
  const errors: string[] = []
  let score = 0

  if (password.length >= 8) score += 1
  else errors.push("A senha deve ter pelo menos 8 caracteres")

  if (password.length >= 12) score += 1

  if (/[A-Z]/.test(password)) score += 1
  else errors.push("A senha deve conter pelo menos uma letra maiúscula")

  if (/[a-z]/.test(password)) score += 1
  else errors.push("A senha deve conter pelo menos uma letra minúscula")

  if (/[0-9]/.test(password)) score += 1
  else errors.push("A senha deve conter pelo menos um número")

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1
  else errors.push("Recomendado: adicione um caractere especial")

  // Verifica senhas comuns
  const commonPasswords = ["password", "123456", "12345678", "qwerty", "abc123", "senha123"]
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push("Esta senha é muito comum")
    score = 0
  }

  return {
    valid: errors.filter((e) => !e.startsWith("Recomendado")).length === 0,
    score: Math.min(score, 5),
    errors,
  }
}

// ==================== LOGGING SEGURO ====================

export function sanitizeForLogging(obj: Record<string, any>): Record<string, any> {
  const sensitiveKeys = [
    "password",
    "token",
    "secret",
    "key",
    "authorization",
    "cookie",
    "credit_card",
    "cvv",
    "ssn",
    "api_key",
  ]
  const sanitized = { ...obj }

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase()
    if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
      sanitized[key] = "[REDACTED]"
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLogging(sanitized[key])
    }
  }

  return sanitized
}

// ==================== PROTEÇÃO DE ROTAS ====================

export async function protectRoute(
  ip: string,
  endpoint: string,
  rateLimitType: keyof typeof RATE_LIMITS = "API_GENERAL",
): Promise<{ allowed: boolean; error?: string; statusCode?: number; headers?: Record<string, string> }> {
  // 1. Verifica se IP está bloqueado
  if (await isIPBlocked(ip)) {
    await incrementMetric("blocked_requests")
    return {
      allowed: false,
      error: "Acesso bloqueado temporariamente",
      statusCode: 403,
    }
  }

  // 2. Rate limiting
  const rateLimit = await rateLimitAPI(`${ip}:${endpoint}`, rateLimitType)
  if (!rateLimit.allowed) {
    await recordSuspiciousActivity(ip, `rate_limit_exceeded:${endpoint}`)
    await incrementMetric("rate_limited_requests")
    return {
      allowed: false,
      error: "Muitas requisições. Tente novamente em alguns minutos.",
      statusCode: 429,
      headers: {
        "Retry-After": String(rateLimit.retryAfter || 60),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(rateLimit.resetAt),
      },
    }
  }

  await incrementMetric("total_requests")
  return {
    allowed: true,
    headers: {
      "X-RateLimit-Remaining": String(rateLimit.remaining),
      "X-RateLimit-Reset": String(rateLimit.resetAt),
    },
  }
}

// ==================== HONEYPOT ====================

export function checkHoneypot(formData: Record<string, any>, honeypotField = "_hp"): boolean {
  // Se o campo honeypot estiver preenchido, é um bot
  return !formData[honeypotField] || formData[honeypotField] === ""
}

// ==================== DETECÇÃO DE BOTS ====================

export function detectBot(userAgent: string): { isBot: boolean; botType?: string } {
  const botPatterns = [
    { pattern: /googlebot/i, type: "search_crawler" },
    { pattern: /bingbot/i, type: "search_crawler" },
    { pattern: /yandexbot/i, type: "search_crawler" },
    { pattern: /baiduspider/i, type: "search_crawler" },
    { pattern: /facebookexternalhit/i, type: "social_crawler" },
    { pattern: /twitterbot/i, type: "social_crawler" },
    { pattern: /linkedinbot/i, type: "social_crawler" },
    { pattern: /slackbot/i, type: "social_crawler" },
    { pattern: /curl/i, type: "cli_tool" },
    { pattern: /wget/i, type: "cli_tool" },
    { pattern: /python-requests/i, type: "automation" },
    { pattern: /axios/i, type: "automation" },
    { pattern: /postman/i, type: "testing" },
    { pattern: /insomnia/i, type: "testing" },
    { pattern: /sqlmap/i, type: "malicious" },
    { pattern: /nikto/i, type: "malicious" },
    { pattern: /nmap/i, type: "malicious" },
    { pattern: /masscan/i, type: "malicious" },
    { pattern: /zgrab/i, type: "malicious" },
    { pattern: /gobuster/i, type: "malicious" },
    { pattern: /dirbuster/i, type: "malicious" },
  ]

  for (const { pattern, type } of botPatterns) {
    if (pattern.test(userAgent)) {
      return { isBot: true, botType: type }
    }
  }

  // Detecta user agents vazios ou suspeitos
  if (!userAgent || userAgent.length < 10) {
    return { isBot: true, botType: "suspicious" }
  }

  return { isBot: false }
}

// ==================== VALIDAÇÃO DE ORIGEM ====================

export function validateOrigin(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false
  return allowedOrigins.some((allowed) => {
    if (allowed === "*") return true
    if (allowed.startsWith("*.")) {
      const domain = allowed.slice(2)
      return origin.endsWith(domain) || origin === domain.slice(1)
    }
    return origin === allowed
  })
}

// ==================== CRIPTOGRAFIA ====================

export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export async function verifyHash(data: string, hash: string): Promise<boolean> {
  const computedHash = await hashData(data)
  return computedHash === hash
}

// ==================== EXPORT FUNÇÕES DO REDIS ====================

export { blockIP, isIPBlocked, recordSuspiciousActivity, recordFailedLogin, clearFailedLogins, auditLog }
