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
  AlertCircle,
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
  const [showFilters, setShowFilters] = useState(true)
  const [permissionError, setPermissionError] = useState<string | null>(null)
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

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
      })
      localStreamRef.current = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
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
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Seu navegador não suporta videochamadas. Tente usar Chrome ou Safari atualizado.")
      }

      // First, try to get both video and audio
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, min: 320 },
            height: { ideal: 720, min: 240 },
            facingMode: "user",
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })

        localStreamRef.current = stream

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
          // Use event listener instead of property
          const playVideo = async () => {
            try {
              await localVideoRef.current?.play()
              setLocalVideoReady(true)
            } catch (e) {
              console.log("[v0] Autoplay blocked, user needs to interact:", e)
              setLocalVideoReady(true)
            }
          }

          localVideoRef.current.onloadedmetadata = playVideo
          // Also try immediate play
          playVideo()
        }

        return stream
      } catch (initialError: any) {
        console.log("[v0] Initial getUserMedia failed:", initialError.name, initialError.message)

        // If NotAllowedError, the user denied permission
        if (initialError.name === "NotAllowedError" || initialError.name === "PermissionDeniedError") {
          throw new Error("Você precisa permitir acesso à câmera e microfone para usar videochamadas.")
        }

        // If NotFoundError, try with just audio or just video
        if (initialError.name === "NotFoundError" || initialError.name === "DevicesNotFoundError") {
          // Try video only
          try {
            const videoOnlyStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "user" },
              audio: false,
            })
            localStreamRef.current = videoOnlyStream
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = videoOnlyStream
              localVideoRef.current.onloadedmetadata = async () => {
                try {
                  await localVideoRef.current?.play()
                  setLocalVideoReady(true)
                } catch (e) {
                  setLocalVideoReady(true)
                }
              }
            }
            setPermissionError("Microfone não encontrado. Você está apenas com vídeo.")
            return videoOnlyStream
          } catch {
            // Try audio only
            try {
              const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: true,
              })
              localStreamRef.current = audioOnlyStream
              setLocalVideoReady(true)
              setPermissionError("Câmera não encontrada. Você está apenas com áudio.")
              return audioOnlyStream
            } catch {
              throw new Error("Nenhuma câmera ou microfone foi encontrado.")
            }
          }
        }

        // If OverconstrainedError, try with simpler constraints
        if (initialError.name === "OverconstrainedError" || initialError.name === "ConstraintNotSatisfiedError") {
          const simpleStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          })
          localStreamRef.current = simpleStream
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = simpleStream
            localVideoRef.current.onloadedmetadata = async () => {
              try {
                await localVideoRef.current?.play()
                setLocalVideoReady(true)
              } catch (e) {
                setLocalVideoReady(true)
              }
            }
          }
          return simpleStream
        }

        throw initialError
      }
    } catch (error: any) {
      console.error("[v0] Error getting local stream:", error)
      throw error
    }
  }

  const createPeerConnection = (localStream: MediaStream) => {
    const pc = new RTCPeerConnection(rtcConfig)

    if (isInitiatorRef.current) {
      const channel = pc.createDataChannel("chat", { ordered: true })
      setupDataChannel(channel)
    }

    pc.ondatachannel = (event) => {
      setupDataChannel(event.channel)
    }

    remoteStreamRef.current = new MediaStream()

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current
    }

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream)
    })

    pc.ontrack = async (event) => {
      console.log("[v0] Received remote track:", event.track.kind)

      if (remoteStreamRef.current) {
        remoteStreamRef.current.addTrack(event.track)

        if (remoteVideoRef.current) {
          if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current
          }

          const playRemote = async () => {
            try {
              await remoteVideoRef.current?.play()
              setRemoteVideoReady(true)
            } catch (e) {
              console.log("[v0] Remote play error:", e)
              setRemoteVideoReady(true)
            }
          }

          remoteVideoRef.current.onloadedmetadata = playRemote
          playRemote()
        }
      }
    }

    pc.onicecandidate = async (event) => {
      if (event.candidate && roomIdRef.current) {
        const supabase = createClient()
        await supabase.from("ice_candidates").insert({
          room_id: roomIdRef.current,
          candidate: JSON.stringify(event.candidate),
          sender_id: currentUserId,
        })
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log("[v0] ICE state:", pc.iceConnectionState)
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

  const requestPermissions = async () => {
    try {
      // Check if permissions API is available
      if (navigator.permissions) {
        const cameraPermission = await navigator.permissions.query({ name: "camera" as PermissionName })
        const micPermission = await navigator.permissions.query({ name: "microphone" as PermissionName })

        if (cameraPermission.state === "denied" || micPermission.state === "denied") {
          return false
        }
      }
      return true
    } catch {
      // Permissions API not available, proceed with getUserMedia
      return true
    }
  }

  const handleStartCall = async () => {
    if (!currentUserId) {
      alert("Você precisa estar logado para iniciar uma videochamada.")
      return
    }

    setIsLoading(true)
    setPermissionError(null)
    setVideoState("searching")
    setWaitTime(0)
    setShowFilters(false)

    waitTimeIntervalRef.current = setInterval(() => {
      setWaitTime((prev) => prev + 1)
    }, 1000)

    try {
      const stream = await getLocalStream()

      if (!stream) {
        throw new Error("Não foi possível acessar câmera/microfone")
      }

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

      if (result.partnerId) {
        const partner = await getProfileById(result.partnerId)
        setCurrentPartner(partner)
      }

      const pc = createPeerConnection(stream)
      const supabase = createClient()

      if (result.isInitiator) {
        setConnectionStatus("Aguardando outro participante...")

        pollingIntervalRef.current = setInterval(async () => {
          const status = await checkRoomStatus(roomIdRef.current!)

          if (status.partnerId && !currentPartner) {
            const partner = await getProfileById(status.partnerId)
            setCurrentPartner(partner)

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
    } catch (error: any) {
      console.error("[v0] Error starting call:", error)
      await cleanup()

      if (error.message.includes("permitir") || error.message.includes("Você precisa")) {
        setVideoState("permission_denied")
        setPermissionError(error.message)
      } else {
        setVideoState("idle")
        setPermissionError(error.message || "Erro ao iniciar videochamada. Verifique permissões de câmera/microfone.")
      }
      setShowFilters(true)
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
        setConnectionStatus("Respondendo...")

        await pc.setRemoteDescription(JSON.parse(room.offer))

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

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

  const retryPermission = () => {
    setVideoState("idle")
    setPermissionError(null)
    handleStartCall()
  }

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return (
    <div className="h-full flex flex-col">
      {/* Header with remaining calls and filters */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-border">
        <div className="flex items-center gap-2">
          {remainingCalls !== null && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              <Camera className="w-3 h-3 mr-1" />
              {remainingCalls} restantes
            </Badge>
          )}
        </div>
        {(videoState === "idle" || videoState === "ended" || videoState === "permission_denied") && (
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

      {/* Filters section - always visible when idle */}
      {showFilters && (videoState === "idle" || videoState === "ended" || videoState === "permission_denied") && (
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
        {/* Permission error message */}
        {permissionError && videoState !== "searching" && videoState !== "connecting" && videoState !== "connected" && (
          <div className="absolute top-4 left-4 right-4 z-30 bg-destructive/90 text-white p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">{permissionError}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6 text-white hover:bg-white/20"
              onClick={() => setPermissionError(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

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

        {/* PERMISSION DENIED STATE */}
        {videoState === "permission_denied" && (
          <div className="text-center space-y-6 p-6 md:p-8">
            <div className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
              <VideoOff className="w-10 h-10 md:w-12 md:h-12 text-destructive" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold mb-3">Permissão Necessária</h2>
            <p className="text-muted-foreground mb-6 text-sm md:text-base max-w-md mx-auto">
              Para usar a videochamada, você precisa permitir o acesso à câmera e microfone nas configurações do seu
              navegador.
            </p>

            <div className="space-y-3">
              <Button onClick={retryPermission} size="lg" className="gradient-bg text-white px-6 md:px-8 h-12">
                <RefreshCw className="w-5 h-5 mr-2" />
                Tentar Novamente
              </Button>

              <p className="text-xs text-muted-foreground">
                No iOS: Configurações {">"} Safari {">"} Câmera e Microfone {">"} Permitir
              </p>
            </div>
          </div>
        )}

        {/* SEARCHING STATE */}
        {videoState === "searching" && (
          <>
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

        {/* CONNECTING/CONNECTED STATES */}
        {(videoState === "connecting" || videoState === "connected") && (
          <div className="w-full h-full relative">
            <div className="absolute inset-0 bg-black">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  remoteVideoReady ? "opacity-100" : "opacity-0"
                }`}
              />

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

            {/* Local video */}
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

            {/* Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-full px-3">
              <div className="flex items-center justify-center gap-2 md:gap-3 bg-black/70 backdrop-blur-xl p-2.5 md:p-3 rounded-full border border-white/10 max-w-sm md:max-w-md mx-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className={`w-10 h-10 md:w-11 md:h-11 rounded-full transition-all ${
                    isMuted
                      ? "bg-destructive/80 hover:bg-destructive text-white"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleVideo}
                  className={`w-10 h-10 md:w-11 md:h-11 rounded-full transition-all ${
                    isVideoOff
                      ? "bg-destructive/80 hover:bg-destructive text-white"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className={`w-10 h-10 md:w-11 md:h-11 rounded-full transition-all ${
                    isChatOpen ? "bg-primary/80 text-white" : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  <MessageCircle className="w-5 h-5" />
                </Button>

                <Button
                  onClick={skipToNext}
                  className="h-10 md:h-11 px-4 md:px-5 rounded-full bg-white/10 hover:bg-white/20 text-white"
                >
                  <SkipForward className="w-5 h-5 md:mr-1" />
                  <span className="hidden md:inline">Next</span>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={endCall}
                  className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-destructive hover:bg-destructive/90 text-white"
                >
                  <PhoneOff className="w-5 h-5" />
                </Button>

                <Button
                  onClick={handleLike}
                  className="h-10 md:h-11 px-4 md:px-5 rounded-full gradient-bg text-white"
                  disabled={!currentPartner}
                >
                  <Sparkles className="w-5 h-5 md:mr-1" />
                  <span className="hidden md:inline">Connect</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ENDED STATE */}
        {videoState === "ended" && (
          <div className="text-center space-y-6 p-6 md:p-8">
            <div className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-pink-500/20 flex items-center justify-center">
              <Heart className="w-10 h-10 md:w-12 md:h-12 text-primary" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold mb-3">Chamada encerrada</h2>
            <p className="text-muted-foreground mb-6 text-sm md:text-base">Pronto para conhecer mais empreendedores?</p>
            <Button
              onClick={handleStartCall}
              size="lg"
              className="gradient-bg text-white px-6 md:px-8 h-12 md:h-14"
              disabled={isLoading}
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
