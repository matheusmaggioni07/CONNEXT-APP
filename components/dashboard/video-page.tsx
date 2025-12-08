"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  SkipForward,
  Heart,
  AlertCircle,
  Loader2,
  Clock,
  Sparkles,
  SwitchCamera,
  Flag,
} from "lucide-react"
import { joinVideoQueue, leaveVideoQueue, checkRoomStatus, getRemainingCalls } from "@/app/actions/video"
import { likeUser } from "@/app/actions/likes"

interface VideoPageProps {
  userId: string
  userProfile: {
    full_name: string
    avatar_url?: string
    city?: string
    interests?: string[]
  }
}

interface PartnerProfile {
  id: string
  full_name: string
  avatar_url: string
  profession?: string
  bio?: string
  city?: string
}

interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: Date
}

type VideoState = "idle" | "searching" | "connecting" | "connected" | "ended" | "permission_denied"
type ConnectionQuality = "excellent" | "good" | "poor" | "disconnected"

export function VideoPage({ userId, userProfile }: VideoPageProps) {
  // State
  const [videoState, setVideoState] = useState<VideoState>("idle")
  const [currentPartner, setCurrentPartner] = useState<PartnerProfile | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [connectionStatus, setConnectionStatus] = useState("")
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>("good")
  const [isLoading, setIsLoading] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [locationFilter, setLocationFilter] = useState({ state: "", city: "" })
  const [localVideoReady, setLocalVideoReady] = useState(false)
  const [remoteVideoReady, setRemoteVideoReady] = useState(false)
  const [waitTime, setWaitTime] = useState(0)
  const [remainingCalls, setRemainingCalls] = useState<number | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [timeUntilReset, setTimeUntilReset] = useState("")

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const currentRoomIdRef = useRef<string | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const waitTimeRef = useRef<NodeJS.Timeout | null>(null)
  const isCleaningUpRef = useRef(false)
  const iceCandidatesQueueRef = useRef<RTCIceCandidate[]>([])
  const hasRemoteDescriptionRef = useRef(false)
  const realtimeChannelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)
  const facingModeRef = useRef<"user" | "environment">("user")
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  // Check remaining calls on mount
  useEffect(() => {
    const checkCalls = async () => {
      const result = await getRemainingCalls()
      if (result.success) {
        setRemainingCalls(result.remaining)
        if (result.remaining === 0) {
          setLimitReached(true)
          setTimeUntilReset(result.resetIn || "24 horas")
        }
      }
    }
    checkCalls()
  }, [])

  // Wait time counter
  useEffect(() => {
    if (videoState === "searching") {
      waitTimeRef.current = setInterval(() => {
        setWaitTime((prev) => prev + 1)
      }, 1000)
    } else {
      if (waitTimeRef.current) {
        clearInterval(waitTimeRef.current)
      }
      setWaitTime(0)
    }
    return () => {
      if (waitTimeRef.current) clearInterval(waitTimeRef.current)
    }
  }, [videoState])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  const cleanup = useCallback(async () => {
    if (isCleaningUpRef.current) return
    isCleaningUpRef.current = true

    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }

    if (realtimeChannelRef.current) {
      const supabase = createClient()
      supabase.removeChannel(realtimeChannelRef.current)
      realtimeChannelRef.current = null
    }

    if (dataChannelRef.current) {
      dataChannelRef.current.close()
      dataChannelRef.current = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    const roomId = currentRoomIdRef.current
    if (roomId && roomId !== "undefined") {
      await leaveVideoQueue(roomId)
    }
    currentRoomIdRef.current = null

    hasRemoteDescriptionRef.current = false
    iceCandidatesQueueRef.current = []
    setLocalVideoReady(false)
    setRemoteVideoReady(false)

    isCleaningUpRef.current = false
  }, [])

  const getLocalStream = useCallback(async () => {
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

      const constraints = {
        video: {
          facingMode: facingModeRef.current,
          width: { ideal: isMobile ? 640 : 1280 },
          height: { ideal: isMobile ? 480 : 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      localStreamRef.current = stream
      setLocalVideoReady(true)

      // Use setTimeout to ensure the video element is rendered
      setTimeout(() => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
          localVideoRef.current.play().catch((e) => console.error("Video play error:", e))
        }
      }, 100)

      return stream
    } catch (error: unknown) {
      const err = error as Error
      if (err.name === "NotAllowedError") {
        setPermissionError("Você precisa permitir o acesso à câmera e microfone para usar a videochamada.")
        setVideoState("permission_denied")
      } else if (err.name === "NotFoundError") {
        setPermissionError("Nenhuma câmera ou microfone encontrado no dispositivo.")
        setVideoState("permission_denied")
      } else {
        setPermissionError("Erro ao acessar câmera/microfone: " + err.message)
        setVideoState("permission_denied")
      }
      return null
    }
  }, [])

  const setupWebRTC = useCallback(
    async (roomId: string, isInitiator: boolean) => {
      let iceServers: RTCIceServer[] = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ]

      try {
        const response = await fetch("/api/turn-credentials")
        if (response.ok) {
          const data = await response.json()
          if (data.iceServers) {
            iceServers = data.iceServers
          }
        }
      } catch (error) {
        console.error("Error fetching TURN credentials:", error)
      }

      const pc = new RTCPeerConnection({
        iceServers,
        iceCandidatePoolSize: 10,
      })

      peerConnectionRef.current = pc
      const supabase = createClient()

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!)
        })
      }

      if (isInitiator) {
        const dc = pc.createDataChannel("chat")
        dataChannelRef.current = dc
        dc.onmessage = (e) => {
          const msg = JSON.parse(e.data) as ChatMessage
          setChatMessages((prev) => [...prev, msg])
        }
      } else {
        pc.ondatachannel = (e) => {
          dataChannelRef.current = e.channel
          e.channel.onmessage = (ev) => {
            const msg = JSON.parse(ev.data) as ChatMessage
            setChatMessages((prev) => [...prev, msg])
          }
        }
      }

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0]
          setRemoteVideoReady(true)
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setVideoState("connected")
          setConnectionStatus("Conectado!")
          setConnectionQuality("good")
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setConnectionQuality("disconnected")
          if (pc.connectionState === "failed") {
            setConnectionStatus("Conexão falhou, tentando reconectar...")
            if (isInitiator && pc.signalingState !== "closed") {
              pc.restartIce()
            }
          }
        }
      }

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          setConnectionQuality("good")
        } else if (pc.iceConnectionState === "failed") {
          setConnectionQuality("disconnected")
        }
      }

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await supabase.from("ice_candidates").insert({
            room_id: roomId,
            from_user_id: userId,
            to_user_id: currentPartner?.id || null,
            candidate: JSON.stringify(event.candidate.toJSON()),
          })
        }
      }

      const channel = supabase
        .channel(`room-${roomId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "signaling",
            filter: `room_id=eq.${roomId}`,
          },
          async (payload) => {
            const record = payload.new as { from_user_id: string; type: string; sdp: string }
            if (record.from_user_id === userId) return

            if (record.type === "offer" && !isInitiator) {
              await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: record.sdp }))
              hasRemoteDescriptionRef.current = true

              while (iceCandidatesQueueRef.current.length > 0) {
                const candidate = iceCandidatesQueueRef.current.shift()
                if (candidate) await pc.addIceCandidate(candidate)
              }

              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)

              await supabase.from("signaling").insert({
                room_id: roomId,
                from_user_id: userId,
                type: "answer",
                sdp: answer.sdp,
              })
            } else if (record.type === "answer" && isInitiator) {
              await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: record.sdp }))
              hasRemoteDescriptionRef.current = true

              while (iceCandidatesQueueRef.current.length > 0) {
                const candidate = iceCandidatesQueueRef.current.shift()
                if (candidate) await pc.addIceCandidate(candidate)
              }
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "ice_candidates",
            filter: `room_id=eq.${roomId}`,
          },
          async (payload) => {
            const record = payload.new as { from_user_id: string; candidate: string }
            if (record.from_user_id === userId) return

            const candidate = new RTCIceCandidate(JSON.parse(record.candidate))

            if (hasRemoteDescriptionRef.current) {
              await pc.addIceCandidate(candidate)
            } else {
              iceCandidatesQueueRef.current.push(candidate)
            }
          },
        )
        .subscribe()

      realtimeChannelRef.current = channel

      if (isInitiator) {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        await supabase.from("signaling").insert({
          room_id: roomId,
          from_user_id: userId,
          type: "offer",
          sdp: offer.sdp,
        })
      }
    },
    [userId, currentPartner],
  )

  const handleMatch = useCallback(
    async (partnerId: string, roomId: string, isInitiator: boolean, partnerProfile: PartnerProfile) => {
      setCurrentPartner(partnerProfile)
      setVideoState("connecting")
      setConnectionStatus("Conectando...")

      currentRoomIdRef.current = roomId

      await new Promise((resolve) => setTimeout(resolve, 1000))

      await setupWebRTC(roomId, isInitiator)
    },
    [setupWebRTC],
  )

  const startSearching = useCallback(async () => {
    if (limitReached) return

    setIsLoading(true)
    setVideoState("searching")
    setConnectionStatus("Preparando câmera...")

    const stream = await getLocalStream()
    if (!stream) {
      setIsLoading(false)
      return
    }

    setConnectionStatus("Buscando profissional...")

    try {
      const result = await joinVideoQueue(locationFilter.state || undefined, locationFilter.city || undefined)

      if (!result.success) {
        setConnectionStatus("Erro ao entrar na fila")
        setVideoState("idle")
        setIsLoading(false)
        return
      }

      currentRoomIdRef.current = result.roomId!

      if (result.matched && result.partnerId && result.partnerProfile) {
        await handleMatch(result.partnerId, result.roomId!, false, {
          id: result.partnerId,
          full_name: result.partnerProfile.full_name || "Usuário",
          avatar_url: result.partnerProfile.avatar_url,
          bio: result.partnerProfile.bio,
          city: result.partnerProfile.city,
        })
        setIsLoading(false)
        return
      }

      pollingRef.current = setInterval(async () => {
        if (!currentRoomIdRef.current) return

        const status = await checkRoomStatus(currentRoomIdRef.current)

        if (status.matched && status.partnerId && status.partnerProfile) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }

          await handleMatch(status.partnerId, currentRoomIdRef.current!, true, {
            id: status.partnerId,
            full_name: status.partnerProfile.full_name || "Usuário",
            avatar_url: status.partnerProfile.avatar_url,
            bio: status.partnerProfile.bio,
            city: status.partnerProfile.city,
          })
        }
      }, 1500)

      setIsLoading(false)
    } catch (error) {
      setConnectionStatus("Erro ao iniciar busca")
      setVideoState("idle")
      setIsLoading(false)
    }
  }, [locationFilter, getLocalStream, handleMatch, limitReached])

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }, [])

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOff(!videoTrack.enabled)
      }
    }
  }, [])

  const flipCamera = useCallback(async () => {
    facingModeRef.current = facingModeRef.current === "user" ? "environment" : "user"
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => track.stop())
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingModeRef.current },
        audio: true,
      })
      localStreamRef.current = stream

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      if (peerConnectionRef.current) {
        const videoTrack = stream.getVideoTracks()[0]
        const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === "video")
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack)
        }
      }
    } catch (error) {
      console.error("Error flipping camera:", error)
    }
  }, [])

  const endCall = useCallback(async () => {
    await cleanup()
    setVideoState("ended")
    setCurrentPartner(null)
    setChatMessages([])
  }, [cleanup])

  const skipToNext = useCallback(async () => {
    await cleanup()
    setCurrentPartner(null)
    setChatMessages([])
    setVideoState("idle")
    setTimeout(() => {
      startSearching()
    }, 500)
  }, [cleanup, startSearching])

  const likeCurrentPartner = useCallback(async () => {
    if (!currentPartner) return

    try {
      await likeUser(currentPartner.id)
    } catch (error) {
      console.error("Error liking partner:", error)
    }
  }, [currentPartner])

  const sendChatMessage = useCallback(() => {
    if (!chatInput.trim() || !dataChannelRef.current) return

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: userId,
      senderName: userProfile.full_name,
      content: chatInput.trim(),
      timestamp: new Date(),
    }

    if (dataChannelRef.current.readyState === "open") {
      dataChannelRef.current.send(JSON.stringify(message))
    }

    setChatMessages((prev) => [...prev, message])
    setChatInput("")
  }, [chatInput, userId, userProfile.full_name])

  const formatWaitTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleLike = useCallback(async () => {
    if (!currentPartner) return

    const result = await likeUser(currentPartner.id)

    if (result.error) {
      console.error("Like error:", result.error)
      return
    }

    if (result.isMatch) {
      console.log("It's a match!")
    }
  }, [currentPartner])

  // RENDER - Permission Denied
  if (videoState === "permission_denied") {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-2xl bg-card p-8 text-center shadow-xl border border-border">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-foreground">Permissão Necessária</h2>
          <p className="mb-8 text-muted-foreground">{permissionError}</p>
          <Button
            onClick={() => {
              setVideoState("idle")
              setPermissionError(null)
            }}
            className="px-8 py-6 text-lg rounded-xl gradient-bg text-white hover:opacity-90"
          >
            Tentar Novamente
          </Button>
        </div>
      </div>
    )
  }

  // RENDER - Limit Reached
  if (limitReached) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-2xl bg-card p-8 text-center shadow-xl border border-border">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Clock className="h-10 w-10 text-primary" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-foreground">Limite Diário Atingido</h2>
          <p className="mb-8 text-muted-foreground">
            Você usou todas as suas videochamadas gratuitas de hoje. Renova em {timeUntilReset}.
          </p>
          <Button className="w-full px-8 py-6 text-lg rounded-xl gradient-bg text-white hover:opacity-90" asChild>
            <a href="/dashboard/upgrade">
              <Sparkles className="mr-2 h-5 w-5" />
              Fazer Upgrade para Pro
            </a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-60px)] md:h-[calc(100vh-80px)] flex-col bg-background overflow-hidden">
      {/* Header - Hidden on mobile for more space */}
      <div className="hidden md:block px-4 md:px-6 py-4 border-b border-border shrink-0">
        <h1 className="text-xl font-bold text-foreground">Videochamada</h1>
        <p className="text-sm text-muted-foreground">Conecte-se instantaneamente com profissionais</p>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left side - Main video area */}
        <div className="relative flex-1 flex items-center justify-center p-2 md:p-6 min-h-0">
          {videoState === "connected" && remoteVideoReady ? (
            <div className="relative w-full h-full rounded-2xl overflow-hidden border border-border bg-card">
              <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
              <button className="absolute top-4 left-4 flex items-center gap-2 bg-card/90 backdrop-blur-sm hover:bg-card text-foreground px-4 py-2 rounded-xl shadow-lg border border-border">
                <Flag className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Reportar</span>
              </button>

              {/* Partner info overlay */}
              <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-card/90 backdrop-blur-sm px-4 py-3 rounded-xl border border-border">
                <Avatar className="h-10 w-10 ring-2 ring-primary">
                  <AvatarImage src={currentPartner?.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback className="gradient-bg text-white">
                    {currentPartner?.full_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{currentPartner?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{currentPartner?.city || "Brasil"}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-2xl rounded-2xl border border-border bg-card/50 p-6 md:p-12 flex flex-col items-center justify-center text-center">
              {videoState === "idle" && (
                <>
                  <div className="mb-6 h-16 w-16 md:h-24 md:w-24 rounded-full gradient-bg flex items-center justify-center shadow-lg shadow-primary/25">
                    <Video className="h-8 w-8 md:h-12 md:w-12 text-white" />
                  </div>
                  <h2 className="text-lg md:text-2xl font-bold text-foreground mb-3">Pronto para conectar?</h2>
                  <p className="text-muted-foreground mb-6 max-w-md text-sm md:text-base">
                    Clique no botão abaixo para ser conectado com um profissional aleatório baseado nos seus interesses.
                  </p>
                  <Button
                    onClick={startSearching}
                    disabled={isLoading}
                    className="px-6 md:px-8 py-5 md:py-6 text-base md:text-lg rounded-xl gradient-bg text-white hover:opacity-90 shadow-lg shadow-primary/25"
                  >
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Video className="mr-2 h-5 w-5" />}
                    Iniciar Videochamada
                  </Button>
                  {remainingCalls !== null && remainingCalls > 0 && (
                    <p className="mt-4 text-sm text-primary font-medium">Chamadas ilimitadas</p>
                  )}
                  {remainingCalls === -1 && (
                    <p className="mt-4 text-sm text-primary font-medium">Chamadas ilimitadas</p>
                  )}
                </>
              )}

              {videoState === "searching" && (
                <>
                  <div className="mb-6 relative">
                    <div className="h-16 w-16 md:h-24 md:w-24 rounded-full border-4 border-primary/30 flex items-center justify-center bg-card/50 backdrop-blur-sm">
                      <Loader2 className="h-8 w-8 md:h-12 md:w-12 animate-spin text-primary" />
                    </div>
                    <div
                      className="absolute inset-0 rounded-full border-4 border-transparent border-t-secondary animate-spin"
                      style={{ animationDuration: "1.5s" }}
                    />
                  </div>
                  <h2 className="text-lg md:text-2xl font-bold text-foreground mb-3">Buscando profissional...</h2>
                  <p className="text-muted-foreground flex items-center gap-2 mb-6 text-sm">
                    <Clock className="h-4 w-4 text-primary" />
                    Tempo de espera: {formatWaitTime(waitTime)}
                  </p>
                  <Button
                    onClick={endCall}
                    variant="outline"
                    className="px-8 py-3 rounded-xl border-border hover:bg-muted bg-transparent"
                  >
                    Cancelar
                  </Button>
                </>
              )}

              {videoState === "connecting" && (
                <>
                  <Avatar className="h-16 w-16 md:h-24 md:w-24 mb-6 ring-4 ring-primary shadow-lg shadow-primary/25">
                    <AvatarImage src={currentPartner?.avatar_url || "/placeholder.svg"} className="object-cover" />
                    <AvatarFallback className="gradient-bg text-white text-xl md:text-3xl font-bold">
                      {currentPartner?.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2 mb-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-lg font-medium text-foreground">Conectando...</span>
                  </div>
                  <p className="text-muted-foreground">Conectando com {currentPartner?.full_name}</p>
                </>
              )}

              {videoState === "ended" && (
                <>
                  <div className="mb-6 h-16 w-16 md:h-24 md:w-24 rounded-full bg-muted/50 border-2 border-border flex items-center justify-center">
                    <PhoneOff className="h-8 w-8 md:h-12 md:w-12 text-muted-foreground" />
                  </div>
                  <h2 className="text-lg md:text-2xl font-bold text-foreground mb-3">Chamada encerrada</h2>
                  <p className="text-muted-foreground mb-6">Deseja conectar com outro profissional?</p>
                  <Button
                    onClick={startSearching}
                    disabled={isLoading}
                    className="px-6 md:px-8 py-5 md:py-6 text-base md:text-lg rounded-xl gradient-bg text-white hover:opacity-90"
                  >
                    <Video className="mr-2 h-5 w-5" />
                    Iniciar Novamente
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right side - Your video preview */}
        {(videoState === "searching" || videoState === "connecting" || videoState === "connected") && (
          <div className="h-[180px] md:h-auto lg:w-[350px] flex flex-col border-t lg:border-t-0 lg:border-l border-border shrink-0">
            <div className="relative flex-1 bg-gradient-to-br from-card to-background min-h-0">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${localVideoReady ? "block" : "hidden"}`}
              />

              {!localVideoReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <span className="text-sm text-muted-foreground">Carregando câmera...</span>
                </div>
              )}

              {/* Camera controls */}
              {localVideoReady && (
                <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2 md:gap-3 px-2">
                  <Button
                    size="icon"
                    variant={isMuted ? "destructive" : "secondary"}
                    onClick={toggleMute}
                    className="rounded-full h-10 w-10 md:h-12 md:w-12"
                  >
                    {isMuted ? <MicOff className="h-4 w-4 md:h-5 md:w-5" /> : <Mic className="h-4 w-4 md:h-5 md:w-5" />}
                  </Button>
                  <Button
                    size="icon"
                    variant={isVideoOff ? "destructive" : "secondary"}
                    onClick={toggleVideo}
                    className="rounded-full h-10 w-10 md:h-12 md:w-12"
                  >
                    {isVideoOff ? (
                      <VideoOff className="h-4 w-4 md:h-5 md:w-5" />
                    ) : (
                      <Video className="h-4 w-4 md:h-5 md:w-5" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={flipCamera}
                    className="rounded-full h-10 w-10 md:h-12 md:w-12"
                  >
                    <SwitchCamera className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar - Only in connected state */}
      {videoState === "connected" && (
        <div className="shrink-0 border-t border-border bg-card/50 backdrop-blur-sm p-3 md:p-4">
          <div className="flex items-center justify-center gap-3 md:gap-4">
            <Button
              size="lg"
              variant="outline"
              onClick={skipToNext}
              className="rounded-full h-12 md:h-14 px-4 md:px-6 border-border hover:bg-muted bg-transparent"
            >
              <SkipForward className="h-5 w-5 mr-2" />
              <span className="hidden md:inline">Próximo</span>
            </Button>

            <Button
              size="lg"
              onClick={handleLike}
              className="rounded-full h-12 md:h-14 px-4 md:px-6 bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:opacity-90"
            >
              <Heart className="h-5 w-5 mr-2" />
              <span className="hidden md:inline">Match</span>
            </Button>

            <Button
              size="lg"
              variant="destructive"
              onClick={endCall}
              className="rounded-full h-12 md:h-14 px-4 md:px-6"
            >
              <PhoneOff className="h-5 w-5 mr-2" />
              <span className="hidden md:inline">Encerrar</span>
            </Button>
          </div>
        </div>
      )}

      {/* Tips - Only in idle state on mobile */}
      {videoState === "idle" && (
        <div className="shrink-0 p-4 border-t border-border">
          <div className="grid grid-cols-3 gap-2 md:gap-4 max-w-4xl mx-auto">
            <div className="bg-card/50 rounded-xl p-3 md:p-4 border border-border">
              <div className="flex items-center gap-2 mb-1 md:mb-2">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Video className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                </div>
                <span className="text-xs md:text-sm font-medium text-foreground">Câmera ligada</span>
              </div>
              <p className="text-xs text-muted-foreground hidden md:block">
                Mantenha sua câmera ligada para melhor conexão
              </p>
            </div>
            <div className="bg-card/50 rounded-xl p-3 md:p-4 border border-border">
              <div className="flex items-center gap-2 mb-1 md:mb-2">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-secondary-foreground" />
                </div>
                <span className="text-xs md:text-sm font-medium text-foreground">Seja profissional</span>
              </div>
              <p className="text-xs text-muted-foreground hidden md:block">Apresente-se e fale sobre seus objetivos</p>
            </div>
            <div className="bg-card/50 rounded-xl p-3 md:p-4 border border-border">
              <div className="flex items-center gap-2 mb-1 md:mb-2">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                  <Heart className="w-3 h-3 md:w-4 md:h-4 text-pink-500" />
                </div>
                <span className="text-xs md:text-sm font-medium text-foreground">Match mútuo</span>
              </div>
              <p className="text-xs text-muted-foreground hidden md:block">
                Curta para conectar no WhatsApp após a chamada
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
