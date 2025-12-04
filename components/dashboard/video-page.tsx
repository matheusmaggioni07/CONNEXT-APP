"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  SkipForward,
  Heart,
  MessageCircle,
  X,
  AlertCircle,
  Loader2,
  Send,
  Users,
  Filter,
  Wifi,
  WifiOff,
  Signal,
  Clock,
  Sparkles,
  SwitchCamera,
  Flag,
} from "lucide-react"
import { joinVideoQueue, leaveVideoQueue, checkRoomStatus, getRemainingCalls } from "@/app/actions/video"
import { likeUser } from "@/app/actions/likes"
import { brazilianStates } from "@/lib/brazilian-states"

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

    console.log("[v0] Cleaning up...")

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

    if (currentRoomIdRef.current) {
      await leaveVideoQueue(currentRoomIdRef.current)
      currentRoomIdRef.current = null
    }

    hasRemoteDescriptionRef.current = false
    iceCandidatesQueueRef.current = []
    setLocalVideoReady(false)
    setRemoteVideoReady(false)

    isCleaningUpRef.current = false
  }, [])

  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingModeRef.current, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      })

      localStreamRef.current = stream

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        setLocalVideoReady(true)
      }

      return stream
    } catch (error: unknown) {
      console.error("[v0] Error getting media:", error)
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
      console.log("[v0] Setting up WebRTC, isInitiator:", isInitiator)

      // Get ICE servers
      let iceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }]

      try {
        const response = await fetch("/api/turn-credentials")
        if (response.ok) {
          const data = await response.json()
          if (data.iceServers) {
            iceServers = data.iceServers
            console.log("[v0] ICE servers loaded:", iceServers.length)
          }
        }
      } catch (error) {
        console.error("[v0] Error fetching TURN credentials:", error)
      }

      const pc = new RTCPeerConnection({
        iceServers,
        iceCandidatePoolSize: 10,
      })

      peerConnectionRef.current = pc
      const supabase = createClient()

      // Add local stream tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!)
        })
      }

      // Setup data channel for chat
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

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log("[v0] Received remote track")
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0]
          setRemoteVideoReady(true)
        }
      }

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log("[v0] Connection state:", pc.connectionState)
        if (pc.connectionState === "connected") {
          setVideoState("connected")
          setConnectionStatus("Conectado!")
          setConnectionQuality("good")
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setConnectionQuality("disconnected")
          if (pc.connectionState === "failed") {
            setConnectionStatus("Conexão falhou, tentando reconectar...")
            // Try ICE restart
            if (isInitiator && pc.signalingState !== "closed") {
              pc.restartIce()
            }
          }
        }
      }

      pc.oniceconnectionstatechange = () => {
        console.log("[v0] ICE connection state:", pc.iceConnectionState)
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          setConnectionQuality("good")
        } else if (pc.iceConnectionState === "failed") {
          setConnectionQuality("disconnected")
        }
      }

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log("[v0] Sending ICE candidate")
          await supabase.from("ice_candidates").insert({
            room_id: roomId,
            sender_id: userId,
            candidate: JSON.stringify(event.candidate.toJSON()),
          })
        }
      }

      // Subscribe to signaling changes
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
            const record = payload.new as { sender_id: string; type: string; sdp: string }
            if (record.sender_id === userId) return

            console.log("[v0] Received signal:", record.type)

            if (record.type === "offer" && !isInitiator) {
              await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: record.sdp }))
              hasRemoteDescriptionRef.current = true

              // Process queued ICE candidates
              while (iceCandidatesQueueRef.current.length > 0) {
                const candidate = iceCandidatesQueueRef.current.shift()
                if (candidate) await pc.addIceCandidate(candidate)
              }

              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)

              await supabase.from("signaling").insert({
                room_id: roomId,
                sender_id: userId,
                type: "answer",
                sdp: answer.sdp,
              })
              console.log("[v0] Answer sent")
            } else if (record.type === "answer" && isInitiator) {
              await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: record.sdp }))
              hasRemoteDescriptionRef.current = true

              // Process queued ICE candidates
              while (iceCandidatesQueueRef.current.length > 0) {
                const candidate = iceCandidatesQueueRef.current.shift()
                if (candidate) await pc.addIceCandidate(candidate)
              }
              console.log("[v0] Answer received and set")
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
            const record = payload.new as { sender_id: string; candidate: string }
            if (record.sender_id === userId) return

            const candidate = new RTCIceCandidate(JSON.parse(record.candidate))

            if (hasRemoteDescriptionRef.current) {
              await pc.addIceCandidate(candidate)
              console.log("[v0] Added ICE candidate")
            } else {
              iceCandidatesQueueRef.current.push(candidate)
              console.log("[v0] Queued ICE candidate")
            }
          },
        )
        .subscribe()

      realtimeChannelRef.current = channel

      // If initiator, create and send offer
      if (isInitiator) {
        console.log("[v0] Creating offer...")
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        await supabase.from("signaling").insert({
          room_id: roomId,
          sender_id: userId,
          type: "offer",
          sdp: offer.sdp,
        })
        console.log("[v0] Offer sent")
      }
    },
    [userId],
  )

  const handleMatch = useCallback(
    async (partnerId: string, roomId: string, isInitiator: boolean, partnerProfile: PartnerProfile) => {
      console.log("[v0] handleMatch called with isInitiator:", isInitiator)

      setCurrentPartner(partnerProfile)
      setVideoState("connecting")
      setConnectionStatus("Conectando...")

      currentRoomIdRef.current = roomId

      // Small delay to ensure both sides are ready
      await new Promise((resolve) => setTimeout(resolve, 1000))

      await setupWebRTC(roomId, isInitiator)
    },
    [setupWebRTC],
  )

  const startSearching = useCallback(async () => {
    if (limitReached) return

    console.log("[v0] Starting search...")
    setIsLoading(true)
    setVideoState("searching")
    setConnectionStatus("Preparando câmera...")

    // Get local stream first
    const stream = await getLocalStream()
    if (!stream) {
      setIsLoading(false)
      return
    }

    setConnectionStatus("Buscando profissional...")

    try {
      // Join video queue
      const result = await joinVideoQueue(locationFilter.state || undefined, locationFilter.city || undefined)

      if (!result.success) {
        console.error("[v0] Failed to join queue:", result.error)
        setConnectionStatus("Erro ao entrar na fila")
        setVideoState("idle")
        setIsLoading(false)
        return
      }

      currentRoomIdRef.current = result.roomId!

      // Check if matched immediately
      if (result.matched && result.partnerId && result.partnerProfile) {
        console.log("[v0] Matched immediately - I joined an existing room, NOT initiator")
        await handleMatch(
          result.partnerId,
          result.roomId!,
          false, // I joined existing room, so I'm NOT initiator
          {
            id: result.partnerId,
            full_name: result.partnerProfile.full_name || "Usuário",
            avatar_url: result.partnerProfile.avatar_url,
            bio: result.partnerProfile.bio,
            city: result.partnerProfile.city,
          },
        )
        setIsLoading(false)
        return
      }

      // Poll for match
      console.log("[v0] Waiting for partner...")
      pollingRef.current = setInterval(async () => {
        if (!currentRoomIdRef.current) return

        const status = await checkRoomStatus(currentRoomIdRef.current)

        if (status.matched && status.partnerId && status.partnerProfile) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }

          console.log("[v0] Partner joined my room - I am initiator")
          await handleMatch(
            status.partnerId,
            currentRoomIdRef.current!,
            true, // Someone joined MY room, so I am the initiator
            {
              id: status.partnerId,
              full_name: status.partnerProfile.full_name || "Usuário",
              avatar_url: status.partnerProfile.avatar_url,
              bio: status.partnerProfile.bio,
              city: status.partnerProfile.city,
            },
          )
        }
      }, 1500)

      setIsLoading(false)
    } catch (error) {
      console.error("[v0] Error starting search:", error)
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
      console.error("[v0] Error flipping camera:", error)
    }
  }, [])

  const endCall = useCallback(async () => {
    console.log("[v0] Ending call")
    await cleanup()
    setVideoState("ended")
    setCurrentPartner(null)
    setChatMessages([])
  }, [cleanup])

  const skipToNext = useCallback(async () => {
    console.log("[v0] Skipping to next")
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
      console.log("[v0] Liked partner:", currentPartner.id)
    } catch (error) {
      console.error("[v0] Error liking partner:", error)
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

  const getQualityIcon = () => {
    switch (connectionQuality) {
      case "excellent":
        return <Wifi className="h-4 w-4 text-green-500" />
      case "good":
        return <Signal className="h-4 w-4 text-green-400" />
      case "poor":
        return <Signal className="h-4 w-4 text-yellow-500" />
      case "disconnected":
        return <WifiOff className="h-4 w-4 text-red-500" />
    }
  }

  const getQualityLabel = () => {
    switch (connectionQuality) {
      case "excellent":
        return "Excelente"
      case "good":
        return "Boa"
      case "poor":
        return "Fraca"
      case "disconnected":
        return "Desconectado"
    }
  }

  const formatWaitTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // RENDER
  if (videoState === "permission_denied") {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="max-w-md rounded-3xl bg-card/80 backdrop-blur-xl p-8 text-center shadow-2xl border border-primary/20">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-foreground">Permissão Necessária</h2>
          <p className="mb-8 text-muted-foreground">{permissionError}</p>
          <Button
            onClick={() => {
              setVideoState("idle")
              setPermissionError(null)
            }}
            className="px-8 py-6 text-lg rounded-full bg-gradient-to-r from-primary via-purple-500 to-secondary hover:opacity-90 shadow-lg shadow-primary/25"
          >
            Tentar Novamente
          </Button>
        </div>
      </div>
    )
  }

  if (limitReached) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="max-w-md rounded-3xl bg-card/80 backdrop-blur-xl p-8 text-center shadow-2xl border border-primary/20">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-secondary/20">
            <Clock className="h-10 w-10 text-primary" />
          </div>
          <h2 className="mb-3 text-2xl font-bold text-foreground">Limite Diário Atingido</h2>
          <p className="mb-8 text-muted-foreground">
            Você usou todas as suas videochamadas gratuitas de hoje. Renova em {timeUntilReset}.
          </p>
          <Button
            className="w-full px-8 py-6 text-lg rounded-full bg-gradient-to-r from-primary via-purple-500 to-secondary hover:opacity-90 shadow-lg shadow-primary/25"
            asChild
          >
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
    <div className="flex h-[calc(100vh-80px)] flex-col bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header with partner info - restored beautiful design */}
      {currentPartner && (videoState === "connecting" || videoState === "connected") && (
        <div className="flex items-center justify-between border-b border-primary/10 bg-card/30 backdrop-blur-xl px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-12 w-12 ring-2 ring-primary/50 ring-offset-2 ring-offset-background">
                <AvatarImage src={currentPartner.avatar_url || "/placeholder.svg"} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-bold">
                  {currentPartner.full_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {videoState === "connected" && (
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-500 ring-2 ring-background" />
              )}
            </div>
            <div>
              <p className="font-bold text-lg text-foreground">{currentPartner.full_name}</p>
              <p className="text-sm text-muted-foreground">
                {currentPartner.profession || currentPartner.city || "Profissional"}
              </p>
            </div>
          </div>
          {videoState === "connected" && (
            <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
              {getQualityIcon()}
              <span className="text-sm font-medium text-foreground">{getQualityLabel()}</span>
            </div>
          )}
        </div>
      )}

      {/* Main video area - restored beautiful design */}
      <div className="relative flex-1 overflow-hidden">
        {/* Remote video (full screen) */}
        <div className="absolute inset-0">
          {videoState === "connected" && remoteVideoReady ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-background via-card/50 to-primary/10">
              {videoState === "idle" && (
                <div className="text-center px-6">
                  <div className="mb-8 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-full blur-2xl scale-150" />
                    <div className="relative h-32 w-32 mx-auto flex items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30">
                      <Users className="h-16 w-16 text-primary" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-3">Pronto para conectar?</h2>
                  <p className="text-lg text-muted-foreground mb-2">
                    Conheça profissionais incríveis em videochamadas ao vivo
                  </p>
                  {remainingCalls !== null && remainingCalls > 0 && (
                    <p className="text-sm text-primary font-medium">{remainingCalls} chamadas restantes hoje</p>
                  )}
                  {remainingCalls === -1 && <p className="text-sm text-primary font-medium">Chamadas ilimitadas</p>}
                </div>
              )}

              {videoState === "searching" && (
                <div className="text-center px-6">
                  <div className="mb-8 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-full blur-2xl scale-150 animate-pulse" />
                    <div className="relative h-32 w-32 mx-auto flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping" />
                      <div className="absolute inset-2 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">{connectionStatus}</h2>
                  <p className="text-muted-foreground flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4" />
                    Tempo de espera: {formatWaitTime(waitTime)}
                  </p>
                </div>
              )}

              {videoState === "connecting" && (
                <div className="text-center px-6">
                  <div className="mb-8 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-full blur-2xl scale-150" />
                    <Avatar className="relative h-32 w-32 mx-auto ring-4 ring-primary/50 ring-offset-4 ring-offset-background">
                      <AvatarImage src={currentPartner?.avatar_url || "/placeholder.svg"} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-4xl font-bold">
                        {currentPartner?.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-lg font-medium text-foreground">{connectionStatus}</span>
                  </div>
                  <p className="text-muted-foreground">Conectando com {currentPartner?.full_name}...</p>
                </div>
              )}

              {videoState === "ended" && (
                <div className="text-center px-6">
                  <div className="mb-8 relative">
                    <div className="h-32 w-32 mx-auto flex items-center justify-center rounded-full bg-muted/50 border border-border">
                      <PhoneOff className="h-16 w-16 text-muted-foreground" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-3">Chamada encerrada</h2>
                  <p className="text-muted-foreground">Clique em "Iniciar Videochamada" para conectar novamente</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Remaining calls badge */}
        {videoState === "connected" && remainingCalls !== null && remainingCalls !== -1 && (
          <div className="absolute top-4 right-4 rounded-full bg-black/60 backdrop-blur-md px-4 py-2 flex items-center gap-2 border border-white/10">
            <Video className="h-4 w-4 text-white" />
            <span className="text-sm font-medium text-white">{remainingCalls} restantes</span>
          </div>
        )}

        {/* Local video (picture-in-picture) - restored beautiful design */}
        <div className="absolute bottom-28 right-4 h-40 w-28 overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-card to-muted shadow-2xl shadow-primary/20 sm:h-48 sm:w-36">
          {localVideoReady ? (
            <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-card to-muted">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          <button
            onClick={flipCamera}
            className="absolute bottom-2 right-2 rounded-full bg-black/70 backdrop-blur-sm p-2 text-white hover:bg-black/90 transition-all hover:scale-105"
          >
            <SwitchCamera className="h-4 w-4" />
          </button>
        </div>

        {/* Chat panel - restored beautiful design */}
        {isChatOpen && videoState === "connected" && (
          <div className="absolute bottom-28 left-4 right-20 max-h-80 overflow-hidden rounded-2xl bg-card/95 backdrop-blur-xl border border-primary/20 shadow-2xl sm:left-4 sm:right-auto sm:w-96">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-primary/10 p-4 bg-gradient-to-r from-primary/5 to-transparent">
                <span className="font-bold text-foreground flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Chat
                </span>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors rounded-full p-1 hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4 max-h-44">
                {chatMessages.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">
                    Envie uma mensagem para iniciar o chat
                  </p>
                )}
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-2xl p-3 ${
                      msg.senderId === userId
                        ? "ml-8 bg-gradient-to-r from-primary to-secondary text-white"
                        : "mr-8 bg-muted text-foreground"
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="border-t border-primary/10 p-4">
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                    placeholder="Digite uma mensagem..."
                    className="flex-1 bg-muted/50 border-primary/20 focus:border-primary rounded-full px-4"
                  />
                  <Button
                    size="icon"
                    onClick={sendChatMessage}
                    className="rounded-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls - restored beautiful design with gradient buttons */}
      <div className="flex items-center justify-center gap-3 border-t border-primary/10 bg-card/50 backdrop-blur-xl p-5 sm:gap-4">
        {videoState === "idle" || videoState === "ended" ? (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="h-14 w-14 rounded-full border-primary/30 bg-card/80 hover:bg-primary/10 hover:border-primary/50 transition-all"
            >
              <Filter className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              onClick={startSearching}
              disabled={isLoading}
              className="gap-3 px-10 h-14 rounded-full bg-gradient-to-r from-primary via-purple-500 to-secondary text-white font-bold shadow-lg shadow-primary/30 hover:opacity-90 hover:shadow-xl hover:shadow-primary/40 transition-all"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Video className="h-5 w-5" />}
              Iniciar Videochamada
            </Button>
          </>
        ) : (
          <>
            <Button
              variant={isMuted ? "destructive" : "outline"}
              size="icon"
              onClick={toggleMute}
              className={`h-14 w-14 rounded-full transition-all ${!isMuted && "border-primary/30 bg-card/80 hover:bg-primary/10"}`}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            <Button
              variant={isVideoOff ? "destructive" : "outline"}
              size="icon"
              onClick={toggleVideo}
              className={`h-14 w-14 rounded-full transition-all ${!isVideoOff && "border-primary/30 bg-card/80 hover:bg-primary/10"}`}
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>

            {videoState === "connected" && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`h-14 w-14 rounded-full border-primary/30 transition-all ${isChatOpen ? "bg-primary/20 border-primary" : "bg-card/80 hover:bg-primary/10"}`}
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={skipToNext}
              className="h-14 w-14 rounded-full border-primary/30 bg-card/80 hover:bg-primary/10 hover:border-primary/50 transition-all"
            >
              <SkipForward className="h-5 w-5" />
            </Button>

            <Button
              variant="destructive"
              size="icon"
              onClick={endCall}
              className="h-14 w-14 rounded-full shadow-lg shadow-red-500/30"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>

            {videoState === "connected" && currentPartner && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={likeCurrentPartner}
                  className="h-14 w-14 rounded-full border-pink-500/30 bg-card/80 hover:bg-pink-500/20 hover:border-pink-500 text-pink-500 transition-all"
                >
                  <Heart className="h-5 w-5" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-14 w-14 rounded-full border-orange-500/30 bg-card/80 hover:bg-orange-500/20 hover:border-orange-500 text-orange-500 transition-all"
                >
                  <Flag className="h-5 w-5" />
                </Button>
              </>
            )}
          </>
        )}
      </div>

      {/* Filters modal - restored beautiful design */}
      {showFilters && (
        <div className="absolute bottom-28 left-4 right-4 z-50 rounded-2xl border border-primary/20 bg-card/95 backdrop-blur-xl p-6 shadow-2xl sm:left-auto sm:right-4 sm:w-80">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Filtros
            </h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-muted-foreground hover:text-foreground rounded-full p-1 hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-5">
            <div>
              <Label className="text-foreground font-medium">Estado</Label>
              <Select
                value={locationFilter.state}
                onValueChange={(value) => setLocationFilter((prev) => ({ ...prev, state: value, city: "" }))}
              >
                <SelectTrigger className="mt-2 border-primary/20 focus:border-primary">
                  <SelectValue placeholder="Todos os Estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Estados</SelectItem>
                  {brazilianStates.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-foreground font-medium">Cidade</Label>
              <Input
                value={locationFilter.city}
                onChange={(e) => setLocationFilter((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="Digite a cidade..."
                className="mt-2 border-primary/20 focus:border-primary"
              />
            </div>
            <Button
              onClick={() => setShowFilters(false)}
              className="w-full rounded-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              Aplicar Filtros
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
