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
  MessageCircle,
  Send,
  X,
  ChevronDown,
  ChevronUp,
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
  const [showFilters, setShowFilters] = useState(true) // Show filters by default in idle state
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

    dataChannelRef.current.send(JSON.stringify(message))
    setChatMessages((prev) => [...prev, message])
    setChatInput("")
  }

  const getLocalStream = async () => {
    try {
      console.log("[v0] Getting local stream...")

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: "user",
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      localStreamRef.current = stream
      console.log(
        "[v0] Local stream obtained:",
        stream.getTracks().map((t) => `${t.kind}:${t.enabled}`),
      )

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream

        // Force play the video
        localVideoRef.current.onloadedmetadata = async () => {
          console.log("[v0] Local video metadata loaded, attempting to play")
          try {
            await localVideoRef.current?.play()
            setLocalVideoReady(true)
            console.log("[v0] Local video playing successfully")
          } catch (playError) {
            console.error("[v0] Error playing local video:", playError)
            // Still mark as ready even if autoplay fails
            setLocalVideoReady(true)
          }
        }

        // Also try playing immediately
        try {
          await localVideoRef.current.play()
        } catch (e) {
          console.log("[v0] Initial play attempt (may fail due to metadata not loaded):", e)
        }
      }

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

    // Attach remote stream to video element immediately
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current
    }

    localStream.getTracks().forEach((track) => {
      console.log("[v0] Adding local track to PC:", track.kind)
      pc.addTrack(track, localStream)
    })

    pc.ontrack = async (event) => {
      console.log("[v0] Received remote track:", event.track.kind, "readyState:", event.track.readyState)

      if (remoteStreamRef.current) {
        // Add track to remote stream
        remoteStreamRef.current.addTrack(event.track)
        console.log("[v0] Added track to remote stream. Total tracks:", remoteStreamRef.current.getTracks().length)

        // Make sure video element has the stream
        if (remoteVideoRef.current) {
          if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current
          }

          // Try to play the video
          remoteVideoRef.current.onloadedmetadata = async () => {
            console.log("[v0] Remote video metadata loaded")
            try {
              await remoteVideoRef.current?.play()
              setRemoteVideoReady(true)
              console.log("[v0] Remote video playing")
            } catch (e) {
              console.error("[v0] Error playing remote video:", e)
              setRemoteVideoReady(true)
            }
          }

          // Try immediate play
          try {
            await remoteVideoRef.current.play()
            setRemoteVideoReady(true)
          } catch (e) {
            console.log("[v0] Initial remote play attempt:", e)
          }
        }
      }
    }

    pc.onicecandidate = async (event) => {
      if (event.candidate && roomIdRef.current) {
        console.log("[v0] ICE candidate generated")
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

    pc.onconnectionstatechange = () => {
      console.log("[v0] Connection state:", pc.connectionState)
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
    setShowFilters(false) // Hide filters when call starts

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

            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            })
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
      setShowFilters(true)
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
    setShowFilters(true)
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
      {/* Header with remaining calls */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-border">
        <div className="flex items-center gap-2">
          {remainingCalls !== null && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              <Camera className="w-3 h-3 mr-1" />
              {remainingCalls} restantes
            </Badge>
          )}
        </div>
        {(videoState === "idle" || videoState === "ended") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-muted-foreground"
          >
            <MapPin className="w-4 h-4 mr-1" />
            Filtros
            {showFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
          </Button>
        )}
      </div>

      {showFilters && (videoState === "idle" || videoState === "ended") && (
        <div className="p-3 md:p-4 border-b border-border bg-gradient-to-r from-primary/5 to-pink-500/5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Estado
              </Label>
              <Select
                value={locationFilter.state}
                onValueChange={(value) => setLocationFilter({ ...locationFilter, state: value })}
              >
                <SelectTrigger className="h-10 bg-background">
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
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Cidade (opcional)</Label>
              <Input
                placeholder="Digite a cidade..."
                value={locationFilter.city}
                onChange={(e) => setLocationFilter({ ...locationFilter, city: e.target.value })}
                className="h-10 bg-background"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Filtre por localização para encontrar empreendedores e profissionais perto de você
          </p>
        </div>
      )}

      {/* Main video area */}
      <div className="flex-1 relative bg-black/95 flex items-center justify-center overflow-hidden">
        {/* IDLE STATE */}
        {videoState === "idle" && (
          <div className="text-center space-y-6 p-6 md:p-8">
            <div className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-pink-500/20 flex items-center justify-center animate-pulse">
              <Video className="w-10 h-10 md:w-12 md:h-12 text-primary" />
            </div>
            <h2 className="text-xl md:text-3xl font-bold mb-3">Pronto para conectar?</h2>
            <p className="text-muted-foreground mb-6 text-sm md:text-base">
              Inicie uma videochamada e conheça empreendedores em tempo real
            </p>

            <Button
              onClick={handleStartCall}
              size="lg"
              className="gradient-bg text-white px-6 md:px-8 h-12 md:h-14 text-base md:text-lg"
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
            <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-6 md:mt-8 text-xs md:text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-primary" />
                Video HD
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-primary" />
                Pessoas reais
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-primary" />
                Match e WhatsApp
              </div>
            </div>
          </div>
        )}

        {/* SEARCHING STATE - show local video preview */}
        {videoState === "searching" && (
          <>
            {/* Status badges */}
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

            {/* Center searching UI */}
            <div className="text-center">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
              <p className="text-lg font-medium text-white">Procurando...</p>
              <p className="text-white/70 text-sm mt-1">{connectionStatus}</p>
            </div>

            <div className="absolute bottom-20 right-4 w-28 h-40 md:w-36 md:h-48 rounded-xl overflow-hidden border-2 border-primary shadow-2xl bg-black z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              {!localVideoReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
            </div>
          </>
        )}

        {/* CONNECTING/CONNECTED STATES - Video UI */}
        {(videoState === "connecting" || videoState === "connected") && (
          <div className="w-full h-full relative">
            {/* Remote video area */}
            <div className="absolute inset-0 bg-black">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  remoteVideoReady ? "opacity-100" : "opacity-0"
                }`}
              />

              {/* Placeholder when remote video not ready */}
              {!remoteVideoReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  {currentPartner ? (
                    <div className="text-center">
                      <Avatar className="w-24 h-24 mx-auto mb-4 ring-4 ring-primary/20">
                        <AvatarImage src={currentPartner.avatar_url || ""} />
                        <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-pink-500 text-white">
                          {currentPartner.full_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-lg font-medium text-white">{currentPartner.full_name}</p>
                      <p className="text-white/70">{currentPartner.position}</p>
                      <p className="text-sm text-white/50 mt-2 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {connectionStatus}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
                      <p className="text-lg font-medium text-white">Conectando...</p>
                      <p className="text-white/70 text-sm mt-1">{connectionStatus}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Partner info overlay (when connected) */}
            {currentPartner && remoteVideoReady && (
              <div className="absolute top-4 left-4 z-10 flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-2">
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
              <div className="absolute top-4 right-4 bottom-28 w-72 md:w-80 max-w-[calc(100%-2rem)] bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 flex flex-col z-30">
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
                    placeholder="Digite uma mensagem..."
                    className="flex-1 bg-white/10 border-white/10 text-white placeholder:text-white/40 h-9"
                  />
                  <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={!chatInput.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            )}

            <div className="absolute bottom-28 right-4 w-24 h-32 md:w-36 md:h-48 rounded-xl overflow-hidden border-2 border-primary shadow-2xl bg-black z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              {!localVideoReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
              {isVideoOff && (
                <div className="absolute inset-0 bg-muted/90 flex items-center justify-center">
                  <VideoOff className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-full px-3">
              <div className="flex items-center justify-center gap-2 md:gap-3 bg-black/70 backdrop-blur-xl p-2.5 md:p-3 rounded-full border border-white/10 max-w-sm md:max-w-md mx-auto">
                {/* Mute button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className={`w-10 h-10 md:w-11 md:h-11 rounded-full transition-all ${
                    isMuted
                      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {isMuted ? <MicOff className="w-4 h-4 md:w-5 md:h-5" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />}
                </Button>

                {/* Camera button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleVideo}
                  className={`w-10 h-10 md:w-11 md:h-11 rounded-full transition-all ${
                    isVideoOff
                      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {isVideoOff ? (
                    <VideoOff className="w-4 h-4 md:w-5 md:h-5" />
                  ) : (
                    <Video className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                </Button>

                {/* Chat button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className={`w-10 h-10 md:w-11 md:h-11 rounded-full transition-all ${
                    isChatOpen
                      ? "bg-primary/30 text-primary hover:bg-primary/40"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                </Button>

                {/* NEXT button */}
                <Button
                  onClick={skipToNext}
                  className="h-10 md:h-11 px-3 md:px-4 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-xs md:text-sm border border-white/20"
                >
                  <SkipForward className="w-4 h-4 mr-1" />
                  <span className="hidden xs:inline">Next</span>
                </Button>

                {/* End call button */}
                <Button
                  onClick={endCall}
                  className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-red-500 hover:bg-red-600 text-white"
                >
                  <PhoneOff className="w-4 h-4 md:w-5 md:h-5" />
                </Button>

                {/* CONNECT/Match button */}
                <Button
                  onClick={handleLike}
                  disabled={!currentPartner}
                  className="h-10 md:h-11 px-3 md:px-4 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium text-xs md:text-sm disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  <span className="hidden xs:inline">Connect</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ENDED STATE */}
        {videoState === "ended" && (
          <div className="text-center space-y-6 p-8">
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
