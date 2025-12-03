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
import { checkCallLimit } from "@/app/actions/video"
import { likeUser } from "@/app/actions/likes"
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
  ],
  iceCandidatePoolSize: 10,
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
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const waitTimeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const hasRemoteDescRef = useRef(false)
  const isPoliteRef = useRef(false)
  const makingOfferRef = useRef(false)
  const ignoreOfferRef = useRef(false)

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
      cleanup()
    }
  }, [])

  const cleanup = useCallback(() => {
    console.log("[v0] Cleaning up...")
    if (waitTimeIntervalRef.current) clearInterval(waitTimeIntervalRef.current)
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current)

    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    pendingCandidatesRef.current = []
    hasRemoteDescRef.current = false
    makingOfferRef.current = false
    ignoreOfferRef.current = false
  }, [])

  const initLocalMedia = useCallback(async () => {
    try {
      setConnectionStatus("Acessando câmera e microfone...")

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      let stream: MediaStream | null = null

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: { echoCancellation: true, noiseSuppression: true },
        })
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
            audio: true,
          })
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
        }
      }

      if (stream) {
        localStreamRef.current = stream

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
          localVideoRef.current.muted = true
          try {
            await localVideoRef.current.play()
          } catch {
            /* ignore */
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
      } else if (errorMessage.includes("NotFoundError")) {
        setPermissionError("Nenhuma câmera ou microfone encontrado.")
      } else {
        setPermissionError(`Erro ao acessar mídia: ${errorMessage}`)
      }
      setVideoState("permission_denied")
      return null
    }
  }, [])

  const setupPeerConnection = useCallback((partnerId: string) => {
    console.log("[v0] Setting up peer connection with:", partnerId)

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }

    const pc = new RTCPeerConnection(rtcConfig)
    peerConnectionRef.current = pc

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        console.log("[v0] Adding track:", track.kind)
        pc.addTrack(track, localStreamRef.current!)
      })
    }

    // Setup remote stream
    const remoteStream = new MediaStream()
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream
    }

    pc.ontrack = (event) => {
      console.log("[v0] Received track:", event.track.kind)
      remoteStream.addTrack(event.track)

      if (remoteVideoRef.current) {
        remoteVideoRef.current.play().catch(() => {})
      }

      setRemoteVideoReady(true)
      setVideoState("connected")
      setConnectionStatus("")
    }

    pc.oniceconnectionstatechange = () => {
      console.log("[v0] ICE state:", pc.iceConnectionState)
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setVideoState("connected")
        setConnectionStatus("")
        setConnectionQuality("good")
      } else if (pc.iceConnectionState === "failed") {
        setConnectionStatus("Conexão falhou. Tente novamente.")
        setConnectionQuality("poor")
      } else if (pc.iceConnectionState === "disconnected") {
        setConnectionStatus("Conexão perdida...")
        setConnectionQuality("poor")
      }
    }

    // Setup data channel for chat
    const dataChannel = pc.createDataChannel("chat")
    dataChannelRef.current = dataChannel

    dataChannel.onopen = () => console.log("[v0] Data channel open")
    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ChatMessage
        setChatMessages((prev) => [...prev, message])
      } catch {
        /* ignore */
      }
    }

    pc.ondatachannel = (event) => {
      dataChannelRef.current = event.channel
      event.channel.onmessage = (e) => {
        try {
          const message = JSON.parse(e.data) as ChatMessage
          setChatMessages((prev) => [...prev, message])
        } catch {
          /* ignore */
        }
      }
    }

    return pc
  }, [])

  const startVideoCall = useCallback(async () => {
    if (!currentUserId) {
      setConnectionStatus("Erro: usuário não identificado")
      return
    }

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
    hasRemoteDescRef.current = false
    pendingCandidatesRef.current = []

    waitTimeIntervalRef.current = setInterval(() => {
      setWaitTime((prev) => prev + 1)
    }, 1000)

    const stream = await initLocalMedia()
    if (!stream) {
      setIsLoading(false)
      if (waitTimeIntervalRef.current) clearInterval(waitTimeIntervalRef.current)
      return
    }

    setConnectionStatus("Procurando alguém para conectar...")

    const supabase = supabaseRef.current!

    const lobbyChannel = supabase.channel("connext-video-lobby", {
      config: { presence: { key: currentUserId } },
    })

    lobbyChannel
      .on("presence", { event: "sync" }, async () => {
        const state = lobbyChannel.presenceState()
        const users = Object.keys(state).filter((id) => id !== currentUserId)

        console.log("[v0] Lobby users:", users.length)

        if (users.length > 0 && videoState === "searching") {
          // Found someone! Pick the first available user
          const partnerId = users[0]
          console.log("[v0] Found partner:", partnerId)

          // Determine who is "polite" (receiver) based on user ID comparison
          // The user with the "smaller" ID is the polite one
          isPoliteRef.current = currentUserId < partnerId
          console.log("[v0] I am polite:", isPoliteRef.current)

          // Get partner profile
          const { data: partnerProfile } = await supabase.from("profiles").select("*").eq("id", partnerId).single()

          if (partnerProfile) {
            setCurrentPartner(partnerProfile as Profile)
          }

          setVideoState("connecting")
          setConnectionStatus("Conectando...")

          // Setup peer connection
          const pc = setupPeerConnection(partnerId)

          // Create a private room channel for signaling
          const roomId = [currentUserId, partnerId].sort().join("-")
          const roomChannel = supabase.channel(`room-${roomId}`)

          // Handle ICE candidates
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              console.log("[v0] Sending ICE candidate")
              roomChannel.send({
                type: "broadcast",
                event: "ice",
                payload: { from: currentUserId, candidate: event.candidate.toJSON() },
              })
            }
          }

          // Handle negotiation needed (for creating offers)
          pc.onnegotiationneeded = async () => {
            console.log("[v0] Negotiation needed, polite:", isPoliteRef.current)
            try {
              makingOfferRef.current = true
              await pc.setLocalDescription()
              console.log("[v0] Sending offer/answer:", pc.localDescription?.type)
              roomChannel.send({
                type: "broadcast",
                event: "sdp",
                payload: { from: currentUserId, sdp: pc.localDescription },
              })
            } catch (err) {
              console.error("[v0] Error in negotiation:", err)
            } finally {
              makingOfferRef.current = false
            }
          }

          roomChannel
            .on("broadcast", { event: "sdp" }, async ({ payload }) => {
              if (payload.from === currentUserId) return

              console.log("[v0] Received SDP:", payload.sdp.type, "from:", payload.from)

              const description = payload.sdp as RTCSessionDescriptionInit
              const offerCollision =
                description.type === "offer" && (makingOfferRef.current || pc.signalingState !== "stable")

              ignoreOfferRef.current = !isPoliteRef.current && offerCollision

              if (ignoreOfferRef.current) {
                console.log("[v0] Ignoring offer due to collision (impolite)")
                return
              }

              try {
                console.log("[v0] Setting remote description:", description.type)
                await pc.setRemoteDescription(description)
                hasRemoteDescRef.current = true

                // Process pending ICE candidates
                for (const candidate of pendingCandidatesRef.current) {
                  console.log("[v0] Adding pending ICE candidate")
                  await pc.addIceCandidate(candidate)
                }
                pendingCandidatesRef.current = []

                if (description.type === "offer") {
                  console.log("[v0] Creating answer")
                  await pc.setLocalDescription()
                  console.log("[v0] Sending answer")
                  roomChannel.send({
                    type: "broadcast",
                    event: "sdp",
                    payload: { from: currentUserId, sdp: pc.localDescription },
                  })
                }
              } catch (err) {
                console.error("[v0] Error handling SDP:", err)
              }
            })
            .on("broadcast", { event: "ice" }, async ({ payload }) => {
              if (payload.from === currentUserId) return

              console.log("[v0] Received ICE candidate")

              try {
                const candidate = payload.candidate as RTCIceCandidateInit
                if (hasRemoteDescRef.current) {
                  await pc.addIceCandidate(candidate)
                } else {
                  console.log("[v0] Queuing ICE candidate")
                  pendingCandidatesRef.current.push(candidate)
                }
              } catch (err) {
                console.error("[v0] Error adding ICE:", err)
              }
            })
            .subscribe((status) => {
              console.log("[v0] Room channel status:", status)
              if (status === "SUBSCRIBED") {
                channelRef.current = roomChannel

                // The impolite peer creates the offer
                if (!isPoliteRef.current) {
                  console.log("[v0] I am impolite, triggering negotiation")
                  // Force negotiation by adding a transceiver if needed
                  if (pc.getTransceivers().length === 0) {
                    pc.addTransceiver("video", { direction: "sendrecv" })
                    pc.addTransceiver("audio", { direction: "sendrecv" })
                  }
                }
              }
            })

          // Leave lobby after matching
          await lobbyChannel.untrack()
        }
      })
      .subscribe(async (status) => {
        console.log("[v0] Lobby status:", status)
        if (status === "SUBSCRIBED") {
          // Track presence in lobby
          await lobbyChannel.track({
            online_at: new Date().toISOString(),
            state: locationFilter.state,
            city: locationFilter.city,
          })
        }
      })

    setIsLoading(false)
  }, [currentUserId, initLocalMedia, setupPeerConnection, locationFilter, videoState])

  const endCall = useCallback(async () => {
    cleanup()
    setVideoState("ended")
    setCurrentPartner(null)
    setLocalVideoReady(false)
    setRemoteVideoReady(false)
    setChatMessages([])
    setIsChatOpen(false)
    setConnectionQuality(null)

    const limit = await checkCallLimit()
    if (limit.remaining !== undefined) {
      setRemainingCalls(limit.remaining === Number.POSITIVE_INFINITY ? -1 : limit.remaining)
    }
  }, [cleanup])

  const skipPartner = useCallback(async () => {
    await endCall()
    setVideoState("idle")
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
          <h2 className="text-xl font-bold text-foreground mb-2">Permissão Necessária</h2>
          <p className="text-muted-foreground mb-6">{permissionError}</p>
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
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-border">
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
          className="text-muted-foreground hover:text-foreground"
        >
          <MapPin className="w-4 h-4 mr-1" />
          Filtros
          {showFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-3 md:p-4 border-b border-border bg-muted/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
                <MapPin className="w-3 h-3" /> Estado
              </Label>
              <Select
                value={locationFilter.state}
                onValueChange={(value) => setLocationFilter((prev) => ({ ...prev, state: value }))}
              >
                <SelectTrigger className="bg-background border-border">
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
              <Label className="text-xs text-muted-foreground mb-1.5 block">Cidade (opcional)</Label>
              <Input
                placeholder="Digite a cidade..."
                value={locationFilter.city}
                onChange={(e) => setLocationFilter((prev) => ({ ...prev, city: e.target.value }))}
                className="bg-background border-border"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Filtre por localização para encontrar profissionais perto de você
          </p>
        </div>
      )}

      {/* Main video area */}
      <div className="flex-1 relative bg-black/50 min-h-[300px] md:min-h-[400px]">
        {/* Partner info overlay */}
        {currentPartner && (videoState === "connecting" || videoState === "connected") && (
          <div className="absolute top-4 left-4 z-10 flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
            <Avatar className="w-10 h-10 border-2 border-pink-500">
              <AvatarImage src={currentPartner.avatar_url || ""} />
              <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-500 text-white">
                {currentPartner.full_name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-white text-sm">{currentPartner.full_name}</p>
              <p className="text-xs text-gray-300">{currentPartner.position}</p>
            </div>
          </div>
        )}

        {/* Remote video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover ${remoteVideoReady ? "opacity-100" : "opacity-0"}`}
        />

        {/* Status overlay when not connected */}
        {videoState !== "connected" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {(videoState === "searching" || videoState === "connecting") && (
              <>
                <Loader2 className="w-12 h-12 text-pink-500 animate-spin mb-4" />
                <p className="text-foreground font-medium">
                  {connectionStatus || "Procurando alguém para conectar..."}
                </p>
                <p className="text-muted-foreground text-sm mt-1">{waitTime}s</p>
              </>
            )}

            {videoState === "idle" && !limitReached && (
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center mb-4 mx-auto">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Videochamada Aleatória</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  Conecte-se instantaneamente com profissionais de todo o Brasil
                </p>
                <Button
                  onClick={startVideoCall}
                  disabled={isLoading}
                  size="lg"
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Video className="w-5 h-5 mr-2" />}
                  Iniciar Videochamada
                </Button>
              </div>
            )}

            {videoState === "idle" && limitReached && (
              <div className="text-center p-6">
                <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4 mx-auto">
                  <Clock className="w-10 h-10 text-yellow-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Limite Diário Atingido</h3>
                <p className="text-muted-foreground mb-4">
                  Você usou todas as suas chamadas de hoje.
                  <br />
                  Reseta em: <span className="text-pink-500 font-medium">{timeUntilReset}</span>
                </p>
                <Button className="bg-gradient-to-r from-pink-500 to-purple-500">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Fazer Upgrade para Pro
                </Button>
              </div>
            )}

            {videoState === "ended" && (
              <div className="text-center">
                <h3 className="text-xl font-bold text-foreground mb-4">Chamada Encerrada</h3>
                <Button onClick={() => setVideoState("idle")} className="bg-gradient-to-r from-pink-500 to-purple-500">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Nova Chamada
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Local video (picture-in-picture) */}
        <div className="absolute bottom-4 right-4 w-32 h-24 md:w-48 md:h-36 rounded-lg overflow-hidden border-2 border-pink-500/50 shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${localVideoReady ? "opacity-100" : "opacity-50"}`}
          />
          {!localVideoReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
            </div>
          )}
        </div>

        {/* Chat panel */}
        {isChatOpen && videoState === "connected" && (
          <div className="absolute top-0 right-0 w-80 h-full bg-background/95 backdrop-blur-sm border-l border-border flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h4 className="font-medium text-foreground">Chat</h4>
              <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2 rounded-lg ${
                    msg.senderId === currentUserId ? "bg-pink-500/20 ml-auto" : "bg-muted"
                  } max-w-[80%]`}
                >
                  <p className="text-xs text-muted-foreground">{msg.senderName}</p>
                  <p className="text-sm text-foreground">{msg.content}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
                placeholder="Digite uma mensagem..."
                className="flex-1"
              />
              <Button onClick={sendChatMessage} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleMute}
            className={isMuted ? "bg-red-500/20 border-red-500/50" : ""}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleVideo}
            className={isVideoOff ? "bg-red-500/20 border-red-500/50" : ""}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </Button>

          {videoState === "connected" && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={isChatOpen ? "bg-pink-500/20 border-pink-500/50" : ""}
            >
              <MessageCircle className="w-5 h-5" />
            </Button>
          )}

          {(videoState === "connected" || videoState === "connecting" || videoState === "searching") && (
            <>
              <Button variant="outline" onClick={skipPartner} className="gap-2 bg-transparent">
                <SkipForward className="w-5 h-5" />
                <span className="hidden sm:inline">Next</span>
              </Button>

              <Button variant="destructive" size="icon" onClick={endCall} className="bg-red-500 hover:bg-red-600">
                <PhoneOff className="w-5 h-5" />
              </Button>

              <Button
                onClick={connectWithPartner}
                className="bg-gradient-to-r from-pink-500 to-purple-500 gap-2"
                disabled={!currentPartner}
              >
                <Sparkles className="w-5 h-5" />
                <span className="hidden sm:inline">Connect</span>
                <Heart className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
