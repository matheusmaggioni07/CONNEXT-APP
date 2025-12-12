import { Redis } from "@upstash/redis"

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// Keys
const ONLINE_USERS_KEY = "online_users"
const USER_PRESENCE_PREFIX = "user_presence:"
const RATE_LIMIT_PREFIX = "rate_limit:"
const BLOCKED_IP_PREFIX = "blocked_ip:"
const SESSION_PREFIX = "session:"
const CACHE_PREFIX = "cache:"
const AUDIT_LOG_PREFIX = "audit:"
const FAILED_LOGIN_PREFIX = "failed_login:"
const SUSPICIOUS_ACTIVITY_PREFIX = "suspicious:"

// ==================== PRESENÇA ====================

export async function setUserOnline(userId: string) {
  const key = `${USER_PRESENCE_PREFIX}${userId}`
  await redis.set(key, Date.now(), { ex: 60 })
  await redis.sadd(ONLINE_USERS_KEY, userId)
}

export async function setUserOffline(userId: string) {
  const key = `${USER_PRESENCE_PREFIX}${userId}`
  await redis.del(key)
  await redis.srem(ONLINE_USERS_KEY, userId)
}

export async function isUserOnline(userId: string): Promise<boolean> {
  const key = `${USER_PRESENCE_PREFIX}${userId}`
  const presence = await redis.get(key)
  return presence !== null
}

export async function getOnlineUsers(): Promise<string[]> {
  const users = await redis.smembers(ONLINE_USERS_KEY)
  const onlineUsers: string[] = []
  for (const userId of users) {
    if (await isUserOnline(userId as string)) {
      onlineUsers.push(userId as string)
    } else {
      await redis.srem(ONLINE_USERS_KEY, userId)
    }
  }
  return onlineUsers
}

export async function getOnlineUsersCount(): Promise<number> {
  const users = await getOnlineUsers()
  return users.length
}

// ==================== RATE LIMITING DISTRIBUÍDO ====================

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter?: number
}

export async function checkRateLimit(
  identifier: string,
  maxRequests = 100,
  windowSeconds = 60,
): Promise<RateLimitResult> {
  const key = `${RATE_LIMIT_PREFIX}${identifier}`
  const now = Math.floor(Date.now() / 1000)
  const windowStart = now - windowSeconds

  // Remove requisições antigas e adiciona a nova
  await redis.zremrangebyscore(key, 0, windowStart)
  const currentCount = await redis.zcard(key)

  if (currentCount >= maxRequests) {
    const oldestRequest = await redis.zrange(key, 0, 0, { withScores: true })
    const resetAt = oldestRequest.length > 0 ? (oldestRequest[0].score as number) + windowSeconds : now + windowSeconds
    return {
      allowed: false,
      remaining: 0,
      resetAt: resetAt * 1000,
      retryAfter: Math.max(1, resetAt - now),
    }
  }

  // Adiciona a requisição atual
  await redis.zadd(key, { score: now, member: `${now}:${Math.random()}` })
  await redis.expire(key, windowSeconds + 1)

  return {
    allowed: true,
    remaining: maxRequests - currentCount - 1,
    resetAt: (now + windowSeconds) * 1000,
  }
}

// Rate limits específicos por tipo
export const RATE_LIMITS = {
  API_GENERAL: { maxRequests: 100, windowSeconds: 60 },
  API_AUTH: { maxRequests: 10, windowSeconds: 60 },
  API_LOGIN: { maxRequests: 5, windowSeconds: 300 },
  API_REGISTER: { maxRequests: 3, windowSeconds: 600 },
  API_BUILDER: { maxRequests: 20, windowSeconds: 60 },
  API_UPLOAD: { maxRequests: 10, windowSeconds: 60 },
  API_VIDEO: { maxRequests: 30, windowSeconds: 60 },
  API_LIKES: { maxRequests: 50, windowSeconds: 60 },
  WEBSOCKET: { maxRequests: 200, windowSeconds: 60 },
} as const

// ==================== BLOQUEIO DE IP ====================

export async function blockIP(ip: string, durationSeconds = 3600, reason = "suspicious_activity") {
  const key = `${BLOCKED_IP_PREFIX}${ip}`
  await redis.set(key, JSON.stringify({ blockedAt: Date.now(), reason }), { ex: durationSeconds })
  await auditLog("ip_blocked", { ip, reason, duration: durationSeconds })
}

export async function isIPBlocked(ip: string): Promise<boolean> {
  const key = `${BLOCKED_IP_PREFIX}${ip}`
  const blocked = await redis.get(key)
  return blocked !== null
}

export async function unblockIP(ip: string) {
  const key = `${BLOCKED_IP_PREFIX}${ip}`
  await redis.del(key)
  await auditLog("ip_unblocked", { ip })
}

// ==================== PROTEÇÃO CONTRA BRUTE FORCE ====================

export async function recordFailedLogin(identifier: string): Promise<{ blocked: boolean; attempts: number }> {
  const key = `${FAILED_LOGIN_PREFIX}${identifier}`
  const attempts = await redis.incr(key)

  // Primeira tentativa - define TTL de 15 minutos
  if (attempts === 1) {
    await redis.expire(key, 900)
  }

  // Bloqueia após 5 tentativas
  if (attempts >= 5) {
    await blockIP(identifier, 1800, "too_many_failed_logins") // 30 minutos
    return { blocked: true, attempts }
  }

  return { blocked: false, attempts }
}

export async function clearFailedLogins(identifier: string) {
  const key = `${FAILED_LOGIN_PREFIX}${identifier}`
  await redis.del(key)
}

export async function getFailedLoginAttempts(identifier: string): Promise<number> {
  const key = `${FAILED_LOGIN_PREFIX}${identifier}`
  const attempts = await redis.get(key)
  return attempts ? Number(attempts) : 0
}

// ==================== DETECÇÃO DE ATIVIDADE SUSPEITA ====================

export async function recordSuspiciousActivity(identifier: string, activityType: string) {
  const key = `${SUSPICIOUS_ACTIVITY_PREFIX}${identifier}`
  const score = Date.now()
  await redis.zadd(key, { score, member: `${activityType}:${score}` })
  await redis.expire(key, 86400) // 24 horas

  // Verifica se há muitas atividades suspeitas
  const count = await redis.zcard(key)
  if (count >= 10) {
    await blockIP(identifier, 86400, "multiple_suspicious_activities") // 24 horas
  }
}

// ==================== SESSÕES SEGURAS ====================

interface SessionData {
  userId: string
  createdAt: number
  lastActivity: number
  ip: string
  userAgent: string
  isValid: boolean
}

export async function createSession(
  sessionId: string,
  userId: string,
  ip: string,
  userAgent: string,
  ttlSeconds = 86400, // 24 horas
): Promise<void> {
  const key = `${SESSION_PREFIX}${sessionId}`
  const sessionData: SessionData = {
    userId,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    ip,
    userAgent,
    isValid: true,
  }
  await redis.set(key, JSON.stringify(sessionData), { ex: ttlSeconds })

  // Registra sessão do usuário
  await redis.sadd(`user_sessions:${userId}`, sessionId)
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const key = `${SESSION_PREFIX}${sessionId}`
  const data = await redis.get(key)
  if (!data) return null
  return typeof data === "string" ? JSON.parse(data) : (data as SessionData)
}

export async function updateSessionActivity(sessionId: string): Promise<boolean> {
  const session = await getSession(sessionId)
  if (!session || !session.isValid) return false

  const key = `${SESSION_PREFIX}${sessionId}`
  session.lastActivity = Date.now()
  await redis.set(key, JSON.stringify(session), { ex: 86400 })
  return true
}

export async function invalidateSession(sessionId: string): Promise<void> {
  const session = await getSession(sessionId)
  if (session) {
    await redis.srem(`user_sessions:${session.userId}`, sessionId)
  }
  await redis.del(`${SESSION_PREFIX}${sessionId}`)
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
  const sessions = await redis.smembers(`user_sessions:${userId}`)
  for (const sessionId of sessions) {
    await redis.del(`${SESSION_PREFIX}${sessionId}`)
  }
  await redis.del(`user_sessions:${userId}`)
  await auditLog("all_sessions_invalidated", { userId })
}

// ==================== CACHE DISTRIBUÍDO ====================

export async function getCached<T>(key: string): Promise<T | null> {
  const cacheKey = `${CACHE_PREFIX}${key}`
  const cached = await redis.get(cacheKey)
  if (!cached) return null
  return typeof cached === "string" ? JSON.parse(cached) : (cached as T)
}

export async function setCache(key: string, value: any, ttlSeconds = 300): Promise<void> {
  const cacheKey = `${CACHE_PREFIX}${key}`
  await redis.set(cacheKey, JSON.stringify(value), { ex: ttlSeconds })
}

export async function invalidateCache(key: string): Promise<void> {
  const cacheKey = `${CACHE_PREFIX}${key}`
  await redis.del(cacheKey)
}

export async function invalidateCachePattern(pattern: string): Promise<void> {
  // Nota: Em produção com muitas chaves, use SCAN ao invés de KEYS
  const keys = await redis.keys(`${CACHE_PREFIX}${pattern}*`)
  if (keys.length > 0) {
    await Promise.all(keys.map((key) => redis.del(key)))
  }
}

// ==================== AUDIT LOG ====================

interface AuditEntry {
  action: string
  data: Record<string, any>
  timestamp: number
  ip?: string
  userId?: string
}

export async function auditLog(
  action: string,
  data: Record<string, any>,
  options?: { ip?: string; userId?: string },
): Promise<void> {
  const entry: AuditEntry = {
    action,
    data,
    timestamp: Date.now(),
    ...options,
  }

  const key = `${AUDIT_LOG_PREFIX}${Date.now()}:${Math.random().toString(36).slice(2)}`
  await redis.set(key, JSON.stringify(entry), { ex: 604800 }) // 7 dias

  // Adiciona ao índice por ação
  await redis.zadd(`audit_index:${action}`, { score: Date.now(), member: key })
}

export async function getAuditLogs(action?: string, limit = 100): Promise<AuditEntry[]> {
  let keys: string[]

  if (action) {
    const members = await redis.zrange(`audit_index:${action}`, -limit, -1)
    keys = members as string[]
  } else {
    keys = await redis.keys(`${AUDIT_LOG_PREFIX}*`)
    keys = keys.slice(-limit)
  }

  const logs: AuditEntry[] = []
  for (const key of keys) {
    const entry = await redis.get(key)
    if (entry) {
      logs.push(typeof entry === "string" ? JSON.parse(entry) : (entry as AuditEntry))
    }
  }

  return logs.sort((a, b) => b.timestamp - a.timestamp)
}

// ==================== ANTI-DDOS ====================

export async function checkDDoSProtection(ip: string): Promise<{ allowed: boolean; reason?: string }> {
  // Verifica se IP está bloqueado
  if (await isIPBlocked(ip)) {
    return { allowed: false, reason: "IP blocked" }
  }

  // Rate limit agressivo por IP
  const rateResult = await checkRateLimit(`ddos:${ip}`, 1000, 60)
  if (!rateResult.allowed) {
    await recordSuspiciousActivity(ip, "ddos_attempt")
    return { allowed: false, reason: "Rate limit exceeded" }
  }

  return { allowed: true }
}

// ==================== MÉTRICAS ====================

export async function incrementMetric(metric: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0]
  const key = `metrics:${metric}:${today}`
  await redis.incr(key)
  await redis.expire(key, 2592000) // 30 dias
}

export async function getMetric(metric: string, date?: string): Promise<number> {
  const targetDate = date || new Date().toISOString().split("T")[0]
  const key = `metrics:${metric}:${targetDate}`
  const value = await redis.get(key)
  return value ? Number(value) : 0
}

export async function getMetricsRange(metric: string, days = 7): Promise<Record<string, number>> {
  const metrics: Record<string, number> = {}
  const today = new Date()

  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split("T")[0]
    metrics[dateStr] = await getMetric(metric, dateStr)
  }

  return metrics
}
