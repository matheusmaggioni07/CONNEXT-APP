/**
 * CONSTANTES DE VIDEOCHAMADA - BASELINE ESTÁVEL
 *
 * NÃO MODIFICAR SEM NECESSIDADE ABSOLUTA
 * Documentação completa em: docs/VIDEO_CALL_BASELINE.md
 *
 * @version 1.0.0-stable
 * @date 2025-12-14
 */

// Configuração de STUN/TURN servers estáveis
export const STABLE_ICE_SERVERS: RTCIceServer[] = [
  // Google STUN (muito confiáveis)
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },

  // Twilio STUN
  { urls: "stun:global.stun.twilio.com:3478" },
]

// Configuração de RTCPeerConnection estável
export const STABLE_RTC_CONFIG: RTCConfiguration = {
  iceServers: STABLE_ICE_SERVERS,
  iceCandidatePoolSize: 10,
  iceTransportPolicy: "all",
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
}

// Constraints de vídeo estáveis
export const STABLE_VIDEO_CONSTRAINTS = {
  desktop: {
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 30, max: 30 },
    facingMode: "user",
  },
  mobile: {
    width: { ideal: 640, max: 1280 },
    height: { ideal: 480, max: 720 },
    frameRate: { ideal: 30, max: 30 },
    facingMode: "user",
  },
}

// Constraints de áudio estáveis
export const STABLE_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
}

// Intervalos de polling estáveis
export const STABLE_POLLING_INTERVALS = {
  signaling: 500, // ms - troca de SDP
  roomStatus: 1500, // ms - verificação de sala
  iceCandidate: 500, // ms - troca de ICE candidates
}

// Limites de planos
export const STABLE_PLAN_LIMITS = {
  free: { dailyCalls: 5, dailyLikes: 5 },
  pro: { dailyCalls: Number.POSITIVE_INFINITY, dailyLikes: Number.POSITIVE_INFINITY },
}

// Status de salas
export const ROOM_STATUS = {
  WAITING: "waiting",
  ACTIVE: "active",
  ENDED: "ended",
} as const

// Tipos de signaling
export const SIGNALING_TYPES = {
  OFFER: "offer",
  ANSWER: "answer",
} as const
