"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  SkipForward,
  Heart,
  Loader2,
  Sparkles,
  Users,
  RefreshCw,
  MapPin,
  MessageCircle,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  Wifi,
  WifiOff,
} from "lucide-react"
import { joinVideoQueue, checkRoomStatus, endVideoRoom, checkCallLimit } from "@/app/actions/video"
import { likeUser } from "@/app/actions/likes"
import { getProfileById } from "@/app/actions/profile"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"

type VideoState = "idle" | "searching" | "connecting" | "connected" | "ended" | "permission_denied"

type LocationFilter = {
  country: string
  state: string
  city: string
}

type ChatMessage = {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: Date
}

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:a.relay.metered.ca:80",
      username: "e8dd65b92c629dca0f516c18",
      credential: "uWdWNmkhvyqTEgQr",
    },
    {
      urls: "turn:a.relay.metered.ca:443",
      username: "e8dd65b92c629dca0f516c18",
      credential: "uWdWNmkhvyqTEgQr",
    },
    {
      urls: "turn:a.relay.metered.ca:443?transport=tcp",
      username: "e8dd65b92c629dca0f516c18",
      credential: "uWdWNmkhvyqTEgQr",
    },
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: "all",
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
}

const brazilianStates = [
  { value: "all", label: "Todos os Estados" },
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
]

function getTimeUntilReset(): string {
  const now = new Date()
  const brazilOffset = -3 * 60
  const brazilTime = new Date(now.getTime() + (brazilOffset + now.getTimezoneOffset()) * 60 * 1000)
  const midnight = new Date(brazilTime)
  midnight.setHours(24, 0, 0, 0)
  const diff = midnight.getTime() - brazilTime.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) {
    return `${hours}h ${minutes}min`
  }
  return `${minutes} minutos`
}

export function VideoPage() {
  const [videoState, setVideoState] = useState<VideoState>("idle")
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [currentPartner, setCurrentPartner] = useState<Profile | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState("")
  const [localVideoReady, setLocalVideoReady] = useState(false)
  const [remoteVideoReady, setRemoteVideoReady] = useState(false)
  const [remainingCalls, setRemainingCalls] = useState<number | null>(null)
  const [waitTime, setWaitTime] = useState(0)
  const [showFilters, setShowFilters] = useState(true)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [timeUntilReset, setTimeUntilReset] = useState("")
  const [connectionQuality, setConnectionQuality] = useState<"good" | "medium" | "poor" | null>(null)
  const [locationFilter, setLocationFilter] = useState<LocationFilter>({
    country: "BR",
    state: "all",
    city: "",
  })

  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const roomIdRef = useRef<string | null>(null)
  const partnerIdRef = useRef<string | null>(null)
  const isInitiatorRef = useRef(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const waitTimeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 3
  const broadcastChannelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)
  const pendingIceCandidatesRef = useRef<RTCIceCandidate[]>([])
  const hasRemoteDescriptionRef = useRef(false)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  useEffect(() => {
    if (limitReached) {
      setTimeUntilReset(getTimeUntilReset())
      const interval = setInterval(() => {
        setTimeUntilReset(getTimeUntilReset())
      }, 60000)
      return () => clearInterval(interval)
    }
  }, [limitReached])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      supabaseRef.current = supabase
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
        if (profile) {
          setCurrentUserName(profile.full_name || "")
        }
      }
      const limit = await checkCallLimit()
      if (limit.remaining !== undefined) {
        setRemainingCalls(limit.remaining === Number.POSITIVE_INFINITY ? -1 : limit.remaining)
        if (!limit.canCall) {
          setLimitReached(true)
          setTimeUntilReset(getTimeUntilReset())
        }
      }
    }
    init()

    return () => {
      cleanupConnection()
    }
  }, [])

  const cleanupConnection = useCallback(async () => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    if (waitTimeIntervalRef.current) clearInterval(waitTimeIntervalRef.current)
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current)

    if (broadcastChannelRef.current) {
      await broadcastChannelRef.current.unsubscribe()
      broadcastChannelRef.current = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    pendingIceCandidatesRef.current = []
    hasRemoteDescriptionRef.current = false
  }, [])

  const monitorConnectionQuality = useCallback(() => {
    if (!peerConnectionRef.current) return

    statsIntervalRef.current = setInterval(async () => {
      if (!peerConnectionRef.current) return

      try {
        const stats = await peerConnectionRef.current.getStats()
        let packetsLost = 0
        let packetsReceived = 0
        let jitter = 0

        stats.forEach((report) => {
          if (report.type === "inbound-rtp" && report.kind === "video") {
            packetsLost = report.packetsLost || 0
            packetsReceived = report.packetsReceived || 0
            jitter = report.jitter || 0
          }
        })

        const lossRate = packetsReceived > 0 ? packetsLost / packetsReceived : 0

        if (lossRate < 0.02 && jitter < 0.03) {
          setConnectionQuality("good")
        } else if (lossRate < 0.05 && jitter < 0.1) {
          setConnectionQuality("medium")
        } else {
          setConnectionQuality("poor")
        }
      } catch (e) {
        // Stats not available
      }
    }, 2000)
  }, [])

  const initLocalMedia = useCallback(async () => {
    try {
      setConnectionStatus("Acessando câmera e microfone...")

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      let stream: MediaStream | null = null

      const videoConstraints = {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
        facingMode: "user",
      }

      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1,
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: audioConstraints,
        })
      } catch (err) {
        console.log("[v0] Full HD failed, trying standard:", err)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
            audio: audioConstraints,
          })
        } catch (videoErr) {
          console.log("[v0] Video failed, trying audio only:", videoErr)
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: true,
            })
          } catch (audioErr) {
            console.error("[v0] All media attempts failed:", audioErr)
            throw audioErr
          }
        }
      }

      if (stream) {
        localStreamRef.current = stream

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
          localVideoRef.current.muted = true
          try {
            await localVideoRef.current.play()
          } catch (e) {
            // Auto-play blocked
          }
          setLocalVideoReady(true)
        }

        return stream
      }

      throw new Error("No media stream available")
    } catch (error: unknown) {
      console.error("[v0] Error accessing media:", error)
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"

      if (errorMessage.includes("Permission denied") || errorMessage.includes("NotAllowedError")) {
        setPermissionError(
          "Permissão de câmera/microfone negada. Por favor, permita o acesso nas configurações do seu navegador.",
        )
      } else if (errorMessage.includes("NotFoundError") || errorMessage.includes("DevicesNotFoundError")) {
        setPermissionError("Nenhuma câmera ou microfone encontrado. Verifique se seus dispositivos estão conectados.")
      } else if (errorMessage.includes("NotReadableError") || errorMessage.includes("TrackStartError")) {
        setPermissionError(
          "Sua câmera ou microfone está sendo usado por outro aplicativo. Feche outros apps e tente novamente.",
        )
      } else {
        setPermissionError(`Erro ao acessar mídia: ${errorMessage}`)
      }
      setVideoState("permission_denied")
      return null
    }
  }, [])

  const setupWebRTC = useCallback(
    async (partnerId: string, isInitiator: boolean) => {
      try {
        console.log("[v0] Setting up WebRTC. Initiator:", isInitiator, "Partner:", partnerId)
        setConnectionStatus(isInitiator ? "Criando conexão..." : "Aguardando conexão...")

        const supabase = supabaseRef.current
        if (!supabase || !currentUserId) {
          console.error("[v0] Supabase or user not ready")
          return
        }

        partnerIdRef.current = partnerId
        pendingIceCandidatesRef.current = []
        hasRemoteDescriptionRef.current = false

        // Cleanup previous connection
        if (broadcastChannelRef.current) {
          await broadcastChannelRef.current.unsubscribe()
        }
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close()
        }

        // Create new peer connection
        const pc = new RTCPeerConnection(rtcConfig)
        peerConnectionRef.current = pc

        // Setup remote stream
        remoteStreamRef.current = new MediaStream()
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current
        }

        // Add local tracks
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => {
            console.log("[v0] Adding local track:", track.kind)
            pc.addTrack(track, localStreamRef.current!)
          })
        }

        // Setup data channel for chat
        if (isInitiator) {
          const dataChannel = pc.createDataChannel("chat", { ordered: true })
          dataChannelRef.current = dataChannel
          setupDataChannel(dataChannel)
        }

        pc.ondatachannel = (event) => {
          dataChannelRef.current = event.channel
          setupDataChannel(event.channel)
        }

        // Handle remote tracks
        pc.ontrack = (event) => {
          console.log("[v0] Received remote track:", event.track.kind)
          event.streams[0].getTracks().forEach((track) => {
            remoteStreamRef.current?.addTrack(track)
          })

          if (remoteVideoRef.current) {
            remoteVideoRef.current.play().catch(() => {})
          }

          setRemoteVideoReady(true)
          setVideoState("connected")
          setConnectionStatus("")
          monitorConnectionQuality()
        }

        // Handle ICE connection state changes
        pc.oniceconnectionstatechange = () => {
          console.log("[v0] ICE state:", pc.iceConnectionState)

          switch (pc.iceConnectionState) {
            case "connected":
            case "completed":
              setVideoState("connected")
              setConnectionStatus("")
              setConnectionQuality("good")
              reconnectAttemptsRef.current = 0
              break
            case "disconnected":
              setConnectionStatus("Conexão instável. Reconectando...")
              setConnectionQuality("poor")
              break
            case "failed":
              if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                reconnectAttemptsRef.current++
                setConnectionStatus(`Reconectando... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)
                pc.restartIce()
              } else {
                setConnectionStatus("Falha na conexão. Tente novamente.")
                setVideoState("ended")
              }
              break
            case "closed":
              setConnectionStatus("")
              break
          }
        }

        pc.onconnectionstatechange = () => {
          console.log("[v0] Connection state:", pc.connectionState)
          if (pc.connectionState === "connected") {
            setVideoState("connected")
            setConnectionStatus("")
          }
        }

        const roomChannel = roomIdRef.current || `room-${Date.now()}`
        const channelName = `video-${roomChannel}`

        console.log("[v0] Creating broadcast channel:", channelName)

        const channel = supabase.channel(channelName, {
          config: {
            broadcast: { self: false, ack: true },
            presence: { key: currentUserId },
          },
        })

        // Handle incoming signaling messages
        channel
          .on("broadcast", { event: "offer" }, async (payload) => {
            console.log("[v0] Received offer from:", payload.payload.from)
            if (payload.payload.from === partnerId && pc.signalingState === "stable") {
              try {
                const offer = payload.payload.sdp
                await pc.setRemoteDescription(new RTCSessionDescription(offer))
                hasRemoteDescriptionRef.current = true

                // Process pending ICE candidates
                for (const candidate of pendingIceCandidatesRef.current) {
                  await pc.addIceCandidate(candidate)
                }
                pendingIceCandidatesRef.current = []

                // Create and send answer
                const answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)

                console.log("[v0] Sending answer")
                await channel.send({
                  type: "broadcast",
                  event: "answer",
                  payload: { from: currentUserId, sdp: answer },
                })
              } catch (e) {
                console.error("[v0] Error handling offer:", e)
              }
            }
          })
          .on("broadcast", { event: "answer" }, async (payload) => {
            console.log("[v0] Received answer from:", payload.payload.from)
            if (payload.payload.from === partnerId && pc.signalingState === "have-local-offer") {
              try {
                const answer = payload.payload.sdp
                await pc.setRemoteDescription(new RTCSessionDescription(answer))
                hasRemoteDescriptionRef.current = true

                // Process pending ICE candidates
                for (const candidate of pendingIceCandidatesRef.current) {
                  await pc.addIceCandidate(candidate)
                }
                pendingIceCandidatesRef.current = []
              } catch (e) {
                console.error("[v0] Error handling answer:", e)
              }
            }
          })
          .on("broadcast", { event: "ice-candidate" }, async (payload) => {
            if (payload.payload.from === partnerId) {
              try {
                const candidate = new RTCIceCandidate(payload.payload.candidate)
                if (hasRemoteDescriptionRef.current && pc.remoteDescription) {
                  await pc.addIceCandidate(candidate)
                } else {
                  pendingIceCandidatesRef.current.push(candidate)
                }
              } catch (e) {
                console.error("[v0] Error adding ICE candidate:", e)
              }
            }
          })

        // Subscribe to channel
        await channel.subscribe(async (status) => {
          console.log("[v0] Channel status:", status)
          if (status === "SUBSCRIBED") {
            broadcastChannelRef.current = channel

            // Handle ICE candidates
            pc.onicecandidate = async (event) => {
              if (event.candidate) {
                console.log("[v0] Sending ICE candidate")
                await channel.send({
                  type: "broadcast",
                  event: "ice-candidate",
                  payload: { from: currentUserId, candidate: event.candidate.toJSON() },
                })
              }
            }

            // If initiator, create and send offer
            if (isInitiator) {
              // Small delay to ensure both parties are subscribed
              await new Promise((resolve) => setTimeout(resolve, 1000))

              console.log("[v0] Creating offer")
              setConnectionStatus("Enviando oferta de conexão...")

              const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
              })
              await pc.setLocalDescription(offer)

              console.log("[v0] Sending offer to:", partnerId)
              await channel.send({
                type: "broadcast",
                event: "offer",
                payload: { from: currentUserId, sdp: offer },
              })

              setConnectionStatus("Aguardando resposta...")
            } else {
              setConnectionStatus("Aguardando oferta de conexão...")
            }
          }
        })
      } catch (error) {
        console.error("[v0] WebRTC setup error:", error)
        setConnectionStatus("Erro na conexão. Tente novamente.")
        setVideoState("idle")
      }
    },
    [currentUserId, monitorConnectionQuality],
  )

  const startVideoCall = useCallback(async () => {
    const limitCheck = await checkCallLimit()
    if (!limitCheck.canCall) {
      setLimitReached(true)
      setTimeUntilReset(getTimeUntilReset())
      return
    }

    setIsLoading(true)
    setVideoState("searching")
    setWaitTime(0)
    setPermissionError(null)
    reconnectAttemptsRef.current = 0

    waitTimeIntervalRef.current = setInterval(() => {
      setWaitTime((prev) => prev + 1)
    }, 1000)

    const stream = await initLocalMedia()
    if (!stream) {
      setIsLoading(false)
      if (waitTimeIntervalRef.current) {
        clearInterval(waitTimeIntervalRef.current)
      }
      return
    }

    setConnectionStatus("Procurando alguém para conectar...")

    const result = await joinVideoQueue()

    if (result.error) {
      if (result.error.includes("limite diário")) {
        setLimitReached(true)
        setTimeUntilReset(getTimeUntilReset())
      }
      setConnectionStatus(result.error)
      setVideoState("idle")
      setIsLoading(false)
      if (waitTimeIntervalRef.current) {
        clearInterval(waitTimeIntervalRef.current)
      }
      return
    }

    roomIdRef.current = result.roomId!
    console.log("[v0] Room ID:", roomIdRef.current)

    if (result.matched) {
      // Found someone waiting - we are NOT the initiator
      console.log("[v0] Matched with existing room, we receive the offer")
      isInitiatorRef.current = false
      const profile = await getProfileById(result.partnerId!)
      if (profile) {
        setCurrentPartner(profile)
      }
      setVideoState("connecting")
      await setupWebRTC(result.partnerId!, false)
    } else {
      // Created new room - we ARE the initiator
      console.log("[v0] Created new room, we send the offer")
      isInitiatorRef.current = true

      // Poll for a partner
      pollingIntervalRef.current = setInterval(async () => {
        const status = await checkRoomStatus(roomIdRef.current!)

        if (status.matched) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
          }
          if (waitTimeIntervalRef.current) {
            clearInterval(waitTimeIntervalRef.current)
          }

          if (status.switchedRoom) {
            roomIdRef.current = status.roomId!
            isInitiatorRef.current = false
          }

          const profile = await getProfileById(status.partnerId!)
          if (profile) {
            setCurrentPartner(profile)
          }

          setVideoState("connecting")
          await setupWebRTC(status.partnerId!, isInitiatorRef.current)
        }
      }, 2000)
    }

    setIsLoading(false)
  }, [initLocalMedia, setupWebRTC])

  const setupDataChannel = (channel: RTCDataChannel) => {
    channel.onopen = () => {
      console.log("[v0] Data channel opened")
    }
    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ChatMessage
        setChatMessages((prev) => [...prev, message])
      } catch (e) {
        console.error("[v0] Error parsing chat message:", e)
      }
    }
    channel.onerror = (error) => {
      console.error("[v0] Data channel error:", error)
    }
  }

  const endCall = useCallback(async () => {
    await cleanupConnection()

    if (roomIdRef.current) {
      await endVideoRoom(roomIdRef.current)
    }

    setVideoState("ended")
    setCurrentPartner(null)
    setLocalVideoReady(false)
    setRemoteVideoReady(false)
    setChatMessages([])
    setIsChatOpen(false)
    setConnectionQuality(null)
  }, [cleanupConnection])

  const skipPartner = useCallback(async () => {
    await endCall()
    setVideoState("idle")
    const limit = await checkCallLimit()
    if (limit.remaining !== undefined) {
      setRemainingCalls(limit.remaining === Number.POSITIVE_INFINITY ? -1 : limit.remaining)
      if (!limit.canCall) {
        setLimitReached(true)
        setTimeUntilReset(getTimeUntilReset())
      }
    }
  }, [endCall])

  const connectWithPartner = async () => {
    if (!currentPartner) return

    const result = await likeUser(currentPartner.id)
    if (result.isMatch) {
      alert(`Match com ${currentPartner.full_name}! Vocês podem continuar conversando no WhatsApp.`)
    } else if (result.error) {
      alert(result.error)
    } else {
      alert(`Você curtiu ${currentPartner.full_name}!`)
    }
  }

  const sendChatMessage = () => {
    if (!chatInput.trim() || !dataChannelRef.current || !currentUserId) return

    const message: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentUserId,
      senderName: currentUserName || "Você",
      content: chatInput.trim(),
      timestamp: new Date(),
    }

    if (dataChannelRef.current.readyState === "open") {
      dataChannelRef.current.send(JSON.stringify(message))
      setChatMessages((prev) => [...prev, message])
      setChatInput("")
    }
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsVideoOff(!isVideoOff)
    }
  }

  if (videoState === "permission_denied") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Permissão Necessária</h2>
          <p className="text-gray-400 mb-6">{permissionError}</p>
          <div className="text-left bg-black/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-300 font-medium mb-2">No iPhone/Safari:</p>
            <ol className="text-sm text-gray-400 list-decimal list-inside space-y-1">
              <li>Abra Ajustes do iPhone</li>
              <li>Vá em Safari</li>
              <li>Role até Câmera e Microfone</li>
              <li>Ative a permissão para este site</li>
            </ol>
          </div>
          <Button
            onClick={() => {
              setVideoState("idle")
              setPermissionError(null)
            }}
            className="bg-gradient-to-r from-pink-500 to-purple-500"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" data-protected="true">
      {/* Header with filters */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          {remainingCalls !== null && remainingCalls !== -1 && (
            <Badge variant="outline" className="text-xs">
              {remainingCalls} chamadas restantes hoje
            </Badge>
          )}
          {remainingCalls === -1 && (
            <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              Ilimitado
            </Badge>
          )}
          {connectionQuality && videoState === "connected" && (
            <Badge
              variant="outline"
              className={`text-xs ${
                connectionQuality === "good"
                  ? "text-green-500 border-green-500/50"
                  : connectionQuality === "medium"
                    ? "text-yellow-500 border-yellow-500/50"
                    : "text-red-500 border-red-500/50"
              }`}
            >
              {connectionQuality === "good" ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
              {connectionQuality === "good" ? "Ótima" : connectionQuality === "medium" ? "Média" : "Ruim"}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="text-gray-400 hover:text-white"
        >
          <MapPin className="w-4 h-4 mr-1" />
          Filtros
          {showFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-3 md:p-4 border-b border-white/10 bg-black/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-400 flex items-center gap-1 mb-1.5">
                <MapPin className="w-3 h-3" /> Estado
              </Label>
              <Select
                value={locationFilter.state}
                onValueChange={(value) => setLocationFilter((prev) => ({ ...prev, state: value }))}
              >
                <SelectTrigger className="bg-white/5 border-white/10 h-9">
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  {brazilianStates.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-400 mb-1.5 block">Cidade (opcional)</Label>
              <Input
                placeholder="Digite a cidade..."
                value={locationFilter.city}
                onChange={(e) => setLocationFilter((prev) => ({ ...prev, city: e.target.value }))}
                className="bg-white/5 border-white/10 h-9"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Filtre por localização para encontrar profissionais perto de você
          </p>
        </div>
      )}

      {limitReached && (
        <div className="mx-3 md:mx-4 mt-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-white font-medium">Limite diário atingido</p>
              <p className="text-gray-400 text-sm mt-1">
                Suas chamadas gratuitas resetam em <span className="text-white font-medium">{timeUntilReset}</span>
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500">Reset à meia-noite (horário de Brasília)</span>
              </div>
              <Button
                className="mt-3 bg-gradient-to-r from-pink-500 to-purple-500 text-sm"
                size="sm"
                onClick={() => (window.location.href = "/dashboard/settings")}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Upgrade para Pro - Ilimitado
              </Button>
            </div>
            <button onClick={() => setLimitReached(false)} className="text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {videoState === "idle" || videoState === "ended" ? (
          <div className="text-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
              <Video className="w-10 h-10 md:w-12 md:h-12 text-pink-500" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Pronto para conectar?</h2>
            <p className="text-gray-400 mb-6 text-sm md:text-base">
              Inicie uma videochamada e conheça profissionais em tempo real
            </p>
            <Button
              onClick={startVideoCall}
              disabled={isLoading || limitReached}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 px-6 md:px-8 py-5 md:py-6 text-base md:text-lg disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Video className="w-5 h-5 mr-2" />
                  Iniciar Videochamada
                </>
              )}
            </Button>
            <div className="flex items-center justify-center gap-4 md:gap-6 mt-6 text-xs md:text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-pink-500" /> Video HD
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4 text-purple-500" /> Pessoas reais
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-red-500" /> Match e WhatsApp
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-4xl">
            {/* Video grid */}
            <div className="relative aspect-video bg-black/50 rounded-2xl overflow-hidden mb-4">
              {/* Remote video (main) */}
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

              {/* Partner info overlay */}
              {currentPartner && (
                <div className="absolute top-4 left-4 flex items-center gap-3 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={currentPartner.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-500 text-white text-sm">
                      {currentPartner.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white text-sm font-medium">{currentPartner.full_name}</p>
                    <p className="text-gray-400 text-xs">{currentPartner.position}</p>
                  </div>
                </div>
              )}

              {/* Local video (picture-in-picture) */}
              <div className="absolute bottom-4 right-4 w-24 md:w-32 lg:w-40 aspect-video bg-gray-900 rounded-lg overflow-hidden border-2 border-white/20 shadow-xl">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                  style={{ transform: "scaleX(-1)" }}
                />
                {!localVideoReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
                  </div>
                )}
              </div>

              {/* Connection status */}
              {connectionStatus && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-pink-500 mx-auto mb-3" />
                    <p className="text-white">{connectionStatus}</p>
                    {waitTime > 0 && <p className="text-gray-400 text-sm mt-1">{waitTime}s</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2 md:gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleMute}
                className={`w-10 h-10 md:w-11 md:h-11 rounded-full ${isMuted ? "bg-red-500 border-red-500 text-white" : "bg-white/10 border-white/20"}`}
              >
                {isMuted ? <MicOff className="w-4 h-4 md:w-5 md:h-5" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={toggleVideo}
                className={`w-10 h-10 md:w-11 md:h-11 rounded-full ${isVideoOff ? "bg-red-500 border-red-500 text-white" : "bg-white/10 border-white/20"}`}
              >
                {isVideoOff ? (
                  <VideoOff className="w-4 h-4 md:w-5 md:h-5" />
                ) : (
                  <Video className="w-4 h-4 md:w-5 md:h-5" />
                )}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`w-10 h-10 md:w-11 md:h-11 rounded-full ${isChatOpen ? "bg-purple-500 border-purple-500 text-white" : "bg-white/10 border-white/20"}`}
              >
                <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
              </Button>

              <Button
                onClick={skipPartner}
                variant="outline"
                className="h-10 md:h-11 px-3 md:px-4 rounded-full bg-white/10 border-white/20 hover:bg-white/20"
              >
                <SkipForward className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden md:inline ml-2">Next</span>
              </Button>

              <Button onClick={endCall} className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-red-500 hover:bg-red-600">
                <PhoneOff className="w-4 h-4 md:w-5 md:h-5" />
              </Button>

              <Button
                onClick={connectWithPartner}
                className="h-10 md:h-11 px-3 md:px-4 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              >
                <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden md:inline ml-2">Connect</span>
              </Button>
            </div>

            {/* Chat panel */}
            {isChatOpen && (
              <div className="mt-4 bg-black/50 border border-white/10 rounded-xl p-4 max-h-60 flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                  {chatMessages.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center">Envie uma mensagem para iniciar o chat</p>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-2 rounded-lg text-sm ${msg.senderId === currentUserId ? "bg-pink-500/20 ml-auto max-w-[80%]" : "bg-white/10 mr-auto max-w-[80%]"}`}
                      >
                        <p className="text-xs text-gray-400 mb-1">{msg.senderName}</p>
                        <p className="text-white">{msg.content}</p>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 bg-white/5 border-white/10"
                  />
                  <Button onClick={sendChatMessage} size="icon" className="bg-pink-500 hover:bg-pink-600">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
