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
  Camera,
  MapPin,
  Filter,
  MessageCircle,
  Send,
  X,
} from "lucide-react"
import { joinVideoQueue, checkRoomStatus, endVideoRoom, checkCallLimit } from "@/app/actions/video"
import { likeUser } from "@/app/actions/likes"
import { getProfileById } from "@/app/actions/profile"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"

type VideoState = "idle" | "searching" | "connecting" | "connected" | "ended"

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
    { urls: "stun:stun.stunprotocol.org:3478" },
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
  const [showFilters, setShowFilters] = useState(false)
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
  const isInitiatorRef = useRef(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const waitTimeIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  // Get current user on mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        const profile = await getProfileById(user.id)
        if (profile) {
          setCurrentUserName(profile.full_name || "Você")
        }
        const limitResult = await checkCallLimit(user.id)
        if (limitResult.success) {
          setRemainingCalls(limitResult.remaining ?? null)
        }
      }
    }
    getCurrentUser()
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const cleanup = useCallback(async () => {
    console.log("[v0] Cleanup called")

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    if (waitTimeIntervalRef.current) {
      clearInterval(waitTimeIntervalRef.current)
      waitTimeIntervalRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop()
        console.log("[v0] Stopped local track:", track.kind)
      })
      localStreamRef.current = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
      console.log("[v0] Closed peer connection")
    }

    // Close data channel
    if (dataChannelRef.current) {
      dataChannelRef.current.close()
      dataChannelRef.current = null
    }

    if (roomIdRef.current && currentUserId) {
      try {
        await endVideoRoom(roomIdRef.current, currentUserId)
      } catch (e) {
        console.error("[v0] Error ending room:", e)
      }
    }

    roomIdRef.current = null
    isInitiatorRef.current = false
    setLocalVideoReady(false)
    setRemoteVideoReady(false)
    setCurrentPartner(null)
    setConnectionStatus("")
    setChatMessages([])
    setIsChatOpen(false)

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
  }, [currentUserId])

  // Setup data channel for chat
  const setupDataChannel = (channel: RTCDataChannel) => {
    dataChannelRef.current = channel

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

    channel.onclose = () => {
      console.log("[v0] Data channel closed")
    }
  }

  // Send chat message
  const sendChatMessage = () => {
    if (!chatInput.trim() || !dataChannelRef.current || dataChannelRef.current.readyState !== "open") return

    const message: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentUserId || "",
      senderName: currentUserName || "Você",
      content: chatInput.trim(),
      timestamp: new Date(),
    }

    // Send to peer
    dataChannelRef.current.send(JSON.stringify(message))

    // Add to local messages
    setChatMessages((prev) => [...prev, message])
    setChatInput("")
  }

  const getLocalStream = async () => {
    try {
      console.log("[v0] Getting local stream...")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      localStreamRef.current = stream

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.onloadedmetadata = () => {
          console.log("[v0] Local video metadata loaded")
          setLocalVideoReady(true)
        }
      }

      console.log(
        "[v0] Local stream obtained:",
        stream.getTracks().map((t) => t.kind),
      )
      return stream
    } catch (error) {
      console.error("[v0] Error getting local stream:", error)
      throw error
    }
  }

  const createPeerConnection = (localStream: MediaStream) => {
    console.log("[v0] Creating peer connection...")
    const pc = new RTCPeerConnection(rtcConfig)

    // Create data channel for chat (only initiator creates it)
    if (isInitiatorRef.current) {
      const channel = pc.createDataChannel("chat", { ordered: true })
      setupDataChannel(channel)
    }

    // Receive data channel
    pc.ondatachannel = (event) => {
      console.log("[v0] Received data channel")
      setupDataChannel(event.channel)
    }

    remoteStreamRef.current = new MediaStream()

    localStream.getTracks().forEach((track) => {
      console.log("[v0] Adding local track to PC:", track.kind)
      pc.addTrack(track, localStream)
    })

    pc.ontrack = (event) => {
      console.log("[v0] Received remote track:", event.track.kind)
      if (remoteStreamRef.current) {
        remoteStreamRef.current.addTrack(event.track)

        if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current
          remoteVideoRef.current.onloadedmetadata = () => {
            console.log("[v0] Remote video metadata loaded")
            setRemoteVideoReady(true)
          }
        }
      }
    }

    pc.onicecandidate = async (event) => {
      if (event.candidate && roomIdRef.current) {
        console.log("[v0] ICE candidate:", event.candidate.candidate.substring(0, 50))
        const supabase = createClient()
        await supabase.from("ice_candidates").insert({
          room_id: roomIdRef.current,
          candidate: JSON.stringify(event.candidate),
          sender_id: currentUserId,
        })
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log("[v0] ICE connection state:", pc.iceConnectionState)
      setConnectionStatus(`ICE: ${pc.iceConnectionState}`)

      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setVideoState("connected")
        setConnectionStatus("Conectado!")
      } else if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        setConnectionStatus("Conexão perdida")
      }
    }

    peerConnectionRef.current = pc
    return pc
  }

  const handleStartCall = async () => {
    if (!currentUserId) {
      alert("Você precisa estar logado para iniciar uma videochamada.")
      return
    }

    setIsLoading(true)
    setVideoState("searching")
    setWaitTime(0)

    waitTimeIntervalRef.current = setInterval(() => {
      setWaitTime((prev) => prev + 1)
    }, 1000)

    try {
      const stream = await getLocalStream()
      setConnectionStatus("Procurando parceiro...")

      const result = await joinVideoQueue(
        currentUserId,
        locationFilter.state !== "all" ? locationFilter.state : undefined,
        locationFilter.city || undefined,
      )

      if (!result.success) {
        throw new Error(result.error)
      }

      roomIdRef.current = result.roomId!
      isInitiatorRef.current = result.isInitiator!

      console.log("[v0] Joined room:", result.roomId, "Initiator:", result.isInitiator)

      if (result.partnerId) {
        const partner = await getProfileById(result.partnerId)
        setCurrentPartner(partner)
        console.log("[v0] Partner found:", partner?.full_name)
      }

      const pc = createPeerConnection(stream)
      const supabase = createClient()

      if (result.isInitiator) {
        setConnectionStatus("Aguardando outro participante...")

        pollingIntervalRef.current = setInterval(async () => {
          const status = await checkRoomStatus(roomIdRef.current!)
          console.log("[v0] Room status:", status)

          if (status.partnerId && !currentPartner) {
            const partner = await getProfileById(status.partnerId)
            setCurrentPartner(partner)
            console.log("[v0] Partner joined:", partner?.full_name)

            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current)
              pollingIntervalRef.current = null
            }

            if (waitTimeIntervalRef.current) {
              clearInterval(waitTimeIntervalRef.current)
              waitTimeIntervalRef.current = null
            }

            setVideoState("connecting")
            setConnectionStatus("Criando oferta...")

            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            console.log("[v0] Created and set local offer")

            await supabase
              .from("video_rooms")
              .update({ offer: JSON.stringify(offer) })
              .eq("id", roomIdRef.current)

            pollForAnswer(pc)
          }
        }, 2000)
      } else {
        setVideoState("connecting")
        setConnectionStatus("Conectando à chamada...")

        if (waitTimeIntervalRef.current) {
          clearInterval(waitTimeIntervalRef.current)
          waitTimeIntervalRef.current = null
        }

        pollForOffer(pc)
      }
    } catch (error) {
      console.error("[v0] Error starting call:", error)
      await cleanup()
      setVideoState("idle")
      alert("Erro ao iniciar videochamada. Verifique permissões de câmera/microfone.")
    } finally {
      setIsLoading(false)
    }
  }

  const pollForOffer = async (pc: RTCPeerConnection) => {
    const supabase = createClient()

    const poll = async () => {
      if (!roomIdRef.current) return

      const { data: room } = await supabase.from("video_rooms").select("offer").eq("id", roomIdRef.current).single()

      if (room?.offer) {
        console.log("[v0] Received offer, setting remote description")
        setConnectionStatus("Respondendo...")

        await pc.setRemoteDescription(JSON.parse(room.offer))

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        console.log("[v0] Created and set local answer")

        await supabase
          .from("video_rooms")
          .update({ answer: JSON.stringify(answer) })
          .eq("id", roomIdRef.current)

        startIceCandidateListener(pc)
      } else {
        setTimeout(poll, 1000)
      }
    }

    poll()
  }

  const pollForAnswer = async (pc: RTCPeerConnection) => {
    const supabase = createClient()

    const poll = async () => {
      if (!roomIdRef.current) return

      const { data: room } = await supabase.from("video_rooms").select("answer").eq("id", roomIdRef.current).single()

      if (room?.answer) {
        console.log("[v0] Received answer, setting remote description")
        setConnectionStatus("Finalizando conexão...")

        await pc.setRemoteDescription(JSON.parse(room.answer))
        startIceCandidateListener(pc)
      } else {
        setTimeout(poll, 1000)
      }
    }

    poll()
  }

  const startIceCandidateListener = (pc: RTCPeerConnection) => {
    const supabase = createClient()

    const processExistingCandidates = async () => {
      const { data: candidates } = await supabase
        .from("ice_candidates")
        .select("*")
        .eq("room_id", roomIdRef.current)
        .neq("sender_id", currentUserId)

      if (candidates) {
        for (const c of candidates) {
          try {
            const candidate = JSON.parse(c.candidate)
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
            console.log("[v0] Added existing ICE candidate")
          } catch (e) {
            console.error("[v0] Error adding ICE candidate:", e)
          }
        }
      }
    }

    processExistingCandidates()

    const channel = supabase
      .channel(`ice-${roomIdRef.current}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ice_candidates",
          filter: `room_id=eq.${roomIdRef.current}`,
        },
        async (payload) => {
          if (payload.new.sender_id !== currentUserId) {
            try {
              const candidate = JSON.parse(payload.new.candidate)
              await pc.addIceCandidate(new RTCIceCandidate(candidate))
              console.log("[v0] Added new ICE candidate from realtime")
            } catch (e) {
              console.error("[v0] Error adding ICE candidate:", e)
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOff(!videoTrack.enabled)
      }
    }
  }

  const skipToNext = async () => {
    await cleanup()
    setVideoState("idle")
    setTimeout(() => {
      handleStartCall()
    }, 500)
  }

  const endCall = async () => {
    await cleanup()
    setVideoState("ended")
  }

  const handleLike = async () => {
    if (!currentUserId || !currentPartner) return

    try {
      const result = await likeUser(currentUserId, currentPartner.id)
      if (result.isMatch) {
        alert(`Match com ${currentPartner.full_name}! Agora vocês podem trocar WhatsApp.`)
      } else {
        alert(`Você deu like em ${currentPartner.full_name}!`)
      }
    } catch (error) {
      console.error("Error liking user:", error)
    }
  }

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return (
    <div className="h-full flex flex-col">
      {/* Header with remaining calls and filters */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          {remainingCalls !== null && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              <Camera className="w-3 h-3 mr-1" />
              {remainingCalls} restantes
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="text-muted-foreground"
        >
          <Filter className="w-4 h-4 mr-1" />
          Filtros
        </Button>
      </div>

      {/* Location filters */}
      {showFilters && videoState === "idle" && (
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[150px]">
              <Label className="text-xs text-muted-foreground mb-1 block">Estado</Label>
              <Select
                value={locationFilter.state}
                onValueChange={(value) => setLocationFilter({ ...locationFilter, state: value })}
              >
                <SelectTrigger className="h-9">
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
            <div className="flex-1 min-w-[150px]">
              <Label className="text-xs text-muted-foreground mb-1 block">Cidade (opcional)</Label>
              <Input
                placeholder="Digite a cidade..."
                value={locationFilter.city}
                onChange={(e) => setLocationFilter({ ...locationFilter, city: e.target.value })}
                className="h-9"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Filtre por localização para encontrar empreendedores perto de você
          </p>
        </div>
      )}

      {/* Main video area */}
      <div className="flex-1 relative bg-black/95 flex items-center justify-center overflow-hidden">
        {/* IDLE STATE */}
        {videoState === "idle" && (
          <div className="text-center space-y-6 p-8">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-pink-500/20 flex items-center justify-center animate-pulse">
              <Video className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Pronto para conectar?</h2>
            <p className="text-muted-foreground mb-6">Inicie uma videochamada e conheça empreendedores em tempo real</p>

            <Button
              onClick={handleStartCall}
              size="lg"
              className="gradient-bg text-white px-8 h-14 text-lg"
              disabled={isLoading || !currentUserId}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Video className="w-5 h-5 mr-2" />
                  Iniciar Videochamada
                </>
              )}
            </Button>

            {/* Features */}
            <div className="flex flex-wrap justify-center gap-4 mt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-primary" />
                Video HD
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-primary" />
                Empreendedores reais
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-primary" />
                Match e WhatsApp
              </div>
            </div>
          </div>
        )}

        {/* SEARCHING STATE */}
        {videoState === "searching" && (
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/20 text-primary animate-pulse">
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              procurando
            </Badge>
            <Badge variant="outline" className="bg-destructive/20 text-destructive">
              <span className="w-2 h-2 rounded-full bg-destructive mr-1 animate-pulse" />
              {formatTime(waitTime)}
            </Badge>
          </div>
        )}

        {/* CONNECTING/CONNECTED STATES - Video UI */}
        {(videoState === "connecting" || videoState === "connected") && (
          <div className="w-full h-full relative">
            {/* Remote video area */}
            <div className="absolute inset-0 bg-black rounded-lg overflow-hidden">
              {/* Remote video element - always rendered */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${remoteVideoReady ? "opacity-100" : "opacity-0"}`}
              />

              {/* Placeholder when remote video not ready */}
              {!remoteVideoReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  {currentPartner ? (
                    <div className="text-center">
                      <Avatar className="w-24 h-24 mx-auto mb-4">
                        <AvatarImage src={currentPartner.avatar_url || ""} />
                        <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-pink-500 text-white">
                          {currentPartner.full_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-lg font-medium text-white">{currentPartner.full_name}</p>
                      <p className="text-white/70">{currentPartner.position}</p>
                      <p className="text-sm text-white/50 mt-2">{connectionStatus}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
                      <p className="text-lg font-medium text-white">
                        {videoState === "searching" ? "Procurando..." : "Conectando..."}
                      </p>
                      <p className="text-white/70 text-sm mt-1">{connectionStatus}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Partner info overlay (when connected) */}
            {currentPartner && remoteVideoReady && (
              <div className="absolute top-4 left-4 z-10 flex items-center gap-3 bg-black/50 backdrop-blur rounded-full px-3 py-2">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={currentPartner.avatar_url || ""} />
                  <AvatarFallback>{currentPartner.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-white text-sm">{currentPartner.full_name}</p>
                  <p className="text-white/70 text-xs">{currentPartner.position}</p>
                </div>
              </div>
            )}

            {/* Chat panel */}
            {isChatOpen && (
              <div className="absolute top-4 right-4 bottom-24 w-80 max-w-[calc(100%-2rem)] bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 flex flex-col z-30">
                <div className="flex items-center justify-between p-3 border-b border-white/10">
                  <span className="font-medium text-white text-sm">Chat</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-white/70 hover:text-white"
                    onClick={() => setIsChatOpen(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {chatMessages.length === 0 ? (
                    <p className="text-white/50 text-xs text-center py-4">
                      Envie uma mensagem para começar a conversar
                    </p>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.senderId === currentUserId ? "items-end" : "items-start"}`}
                      >
                        <span className="text-white/50 text-[10px] mb-0.5">{msg.senderName}</span>
                        <div
                          className={`max-w-[80%] rounded-xl px-3 py-1.5 text-sm ${
                            msg.senderId === currentUserId
                              ? "bg-primary text-white rounded-br-none"
                              : "bg-white/10 text-white rounded-bl-none"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    sendChatMessage()
                  }}
                  className="p-3 border-t border-white/10 flex gap-2"
                >
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Digite..."
                    className="flex-1 bg-white/10 border-white/10 text-white placeholder:text-white/40 h-9"
                  />
                  <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={!chatInput.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            )}

            {/* Local video (bottom right) - ALWAYS VISIBLE */}
            <div className="absolute bottom-24 right-4 w-28 h-40 md:w-40 md:h-56 rounded-lg overflow-hidden border-2 border-primary shadow-xl bg-black z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              {!localVideoReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
              {isVideoOff && (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <VideoOff className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Controls - Redesigned for mobile */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-full px-3">
              <div className="flex items-center justify-center gap-2 bg-black/60 backdrop-blur-xl p-3 rounded-full border border-white/10 max-w-md mx-auto">
                {/* Mute button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className={`w-11 h-11 rounded-full transition-all ${
                    isMuted
                      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>

                {/* Camera button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleVideo}
                  className={`w-11 h-11 rounded-full transition-all ${
                    isVideoOff
                      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </Button>

                {/* Chat button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className={`w-11 h-11 rounded-full transition-all ${
                    isChatOpen
                      ? "bg-primary/30 text-primary hover:bg-primary/40"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <MessageCircle className="w-5 h-5" />
                </Button>

                {/* NEXT button */}
                <Button
                  onClick={skipToNext}
                  className="h-11 px-4 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-sm border border-white/20"
                >
                  <SkipForward className="w-5 h-5 mr-1" />
                  Next
                </Button>

                {/* End call button */}
                <Button onClick={endCall} className="w-11 h-11 rounded-full bg-red-500 hover:bg-red-600 text-white">
                  <PhoneOff className="w-5 h-5" />
                </Button>

                {/* CONNECT/Match button */}
                <Button
                  onClick={handleLike}
                  disabled={!currentPartner}
                  className="h-11 px-4 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium text-sm disabled:opacity-50"
                >
                  <Sparkles className="w-5 h-5 mr-1" />
                  Connect
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ENDED STATE */}
        {videoState === "ended" && (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-pink-500/20 flex items-center justify-center">
              <Heart className="w-12 h-12 text-primary" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground">Chamada encerrada</h2>
              <p className="text-muted-foreground mt-2">Deseja iniciar uma nova conversa?</p>
            </div>

            <Button
              onClick={handleStartCall}
              size="lg"
              className="gradient-bg text-white px-8 h-14 text-lg"
              disabled={isLoading || !currentUserId}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Video className="w-5 h-5 mr-2" />
                  Nova Videochamada
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoPage
