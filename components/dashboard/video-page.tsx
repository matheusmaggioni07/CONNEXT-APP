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
  const [isLiked, setIsLiked] = useState(false)

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
  const currentPartnerIdRef = useRef<string | null>(null)

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
    currentPartnerIdRef.current = null

    hasRemoteDescriptionRef.current = false
    iceCandidatesQueueRef.current = []
    setLocalVideoReady(false)
    setRemoteVideoReady(false)
    setIsLiked(false)

    isCleaningUpRef.current = false
  }, [])

  const getLocalStream = useCallback(async () => {
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingModeRef.current,
          width: { ideal: isMobile ? 640 : 1280, max: 1920 },
          height: { ideal: isMobile ? 480 : 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      }

      console.log("[v0] Requesting media with constraints:", JSON.stringify(constraints))
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log(
        "[v0] Got local stream with tracks:",
        stream.getTracks().map((t) => `${t.kind}:${t.enabled}`),
      )

      localStreamRef.current = stream

      // Immediately try to attach to video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.onloadedmetadata = () => {
          console.log("[v0] Local video metadata loaded")
          localVideoRef.current?.play().catch((e) => console.log("[v0] Video autoplay blocked:", e))
        }
      }

      setLocalVideoReady(true)
      return stream
    } catch (error: unknown) {
      const err = error as Error
      console.error("[v0] getUserMedia error:", err.name, err.message)

      if (err.name === "NotAllowedError") {
        setPermissionError("Você precisa permitir o acesso à câmera e microfone para usar a videochamada.")
        setVideoState("permission_denied")
      } else if (err.name === "NotFoundError") {
        setPermissionError("Nenhuma câmera ou microfone encontrado no dispositivo.")
        setVideoState("permission_denied")
      } else if (err.name === "NotReadableError") {
        setPermissionError("Câmera ou microfone já está sendo usado por outro aplicativo.")
        setVideoState("permission_denied")
      } else {
        setPermissionError("Erro ao acessar câmera/microfone: " + err.message)
        setVideoState("permission_denied")
      }
      return null
    }
  }, [])

  const setupWebRTC = useCallback(
    async (roomId: string, isInitiator: boolean, partnerId: string) => {
      console.log("[v0] Setting up WebRTC - Room:", roomId, "Initiator:", isInitiator, "Partner:", partnerId)

      // Fetch ICE servers
      let iceServers: RTCIceServer[] = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ]

      try {
        const response = await fetch("/api/turn-credentials")
        if (response.ok) {
          const data = await response.json()
          if (data.iceServers && data.iceServers.length > 0) {
            iceServers = data.iceServers
            console.log("[v0] Got", iceServers.length, "ICE servers")
          }
        }
      } catch (error) {
        console.error("[v0] Error fetching TURN credentials:", error)
      }

      // Create peer connection with robust config
      const pc = new RTCPeerConnection({
        iceServers,
        iceCandidatePoolSize: 10,
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
      })

      peerConnectionRef.current = pc
      const supabase = createClient()

      // Add local tracks to connection
      if (localStreamRef.current) {
        const tracks = localStreamRef.current.getTracks()
        console.log("[v0] Adding", tracks.length, "local tracks to peer connection")
        tracks.forEach((track) => {
          pc.addTrack(track, localStreamRef.current!)
        })
      } else {
        console.error("[v0] No local stream available!")
      }

      // Setup data channel
      if (isInitiator) {
        const dc = pc.createDataChannel("chat", { ordered: true })
        dataChannelRef.current = dc
        dc.onopen = () => console.log("[v0] Data channel opened")
        dc.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data) as ChatMessage
            setChatMessages((prev) => [...prev, msg])
          } catch (err) {
            console.error("[v0] Error parsing chat message:", err)
          }
        }
      } else {
        pc.ondatachannel = (e) => {
          console.log("[v0] Received data channel")
          dataChannelRef.current = e.channel
          e.channel.onmessage = (ev) => {
            try {
              const msg = JSON.parse(ev.data) as ChatMessage
              setChatMessages((prev) => [...prev, msg])
            } catch (err) {
              console.error("[v0] Error parsing chat message:", err)
            }
          }
        }
      }

      // Handle remote track
      pc.ontrack = (event) => {
        console.log("[v0] Received remote track:", event.track.kind, "streams:", event.streams.length)
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0]
          remoteVideoRef.current.onloadedmetadata = () => {
            console.log("[v0] Remote video metadata loaded")
            remoteVideoRef.current?.play().catch((e) => console.log("[v0] Remote video autoplay blocked:", e))
          }
          setRemoteVideoReady(true)
          setVideoState("connected")
          setConnectionStatus("Conectado!")
        }
      }

      // Connection state monitoring
      pc.onconnectionstatechange = () => {
        console.log("[v0] Connection state:", pc.connectionState)
        switch (pc.connectionState) {
          case "connected":
            setVideoState("connected")
            setConnectionStatus("Conectado!")
            setConnectionQuality("good")
            break
          case "disconnected":
            setConnectionQuality("poor")
            setConnectionStatus("Reconectando...")
            break
          case "failed":
            setConnectionQuality("disconnected")
            setConnectionStatus("Conexão falhou")
            // Try to restart ICE
            if (isInitiator && pc.signalingState !== "closed") {
              console.log("[v0] Attempting ICE restart...")
              pc.restartIce()
            }
            break
          case "closed":
            setConnectionQuality("disconnected")
            break
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

      pc.onicegatheringstatechange = () => {
        console.log("[v0] ICE gathering state:", pc.iceGatheringState)
      }

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log("[v0] New ICE candidate:", event.candidate.type, event.candidate.protocol)
          try {
            await supabase.from("ice_candidates").insert({
              room_id: roomId,
              from_user_id: userId,
              to_user_id: partnerId,
              candidate: JSON.stringify(event.candidate.toJSON()),
            })
          } catch (err) {
            console.error("[v0] Error sending ICE candidate:", err)
          }
        }
      }

      // Subscribe to signaling channel
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
            if (!record || record.from_user_id === userId) return

            console.log("[v0] Received signaling:", record.type)

            try {
              if (record.type === "offer" && !isInitiator) {
                console.log("[v0] Processing offer...")
                await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: record.sdp }))
                hasRemoteDescriptionRef.current = true

                // Process queued ICE candidates
                console.log("[v0] Processing", iceCandidatesQueueRef.current.length, "queued candidates")
                while (iceCandidatesQueueRef.current.length > 0) {
                  const candidate = iceCandidatesQueueRef.current.shift()
                  if (candidate) {
                    await pc
                      .addIceCandidate(candidate)
                      .catch((e) => console.error("[v0] Error adding queued candidate:", e))
                  }
                }

                // Create and send answer
                const answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)

                await supabase.from("signaling").insert({
                  room_id: roomId,
                  from_user_id: userId,
                  type: "answer",
                  sdp: answer.sdp,
                })
                console.log("[v0] Answer sent")
              } else if (record.type === "answer" && isInitiator) {
                console.log("[v0] Processing answer...")
                await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: record.sdp }))
                hasRemoteDescriptionRef.current = true

                // Process queued ICE candidates
                console.log("[v0] Processing", iceCandidatesQueueRef.current.length, "queued candidates")
                while (iceCandidatesQueueRef.current.length > 0) {
                  const candidate = iceCandidatesQueueRef.current.shift()
                  if (candidate) {
                    await pc
                      .addIceCandidate(candidate)
                      .catch((e) => console.error("[v0] Error adding queued candidate:", e))
                  }
                }
              }
            } catch (err) {
              console.error("[v0] Error processing signaling:", err)
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
            if (!record || record.from_user_id === userId) return

            try {
              const candidate = new RTCIceCandidate(JSON.parse(record.candidate))
              console.log("[v0] Received ICE candidate")

              if (hasRemoteDescriptionRef.current && pc.remoteDescription) {
                await pc.addIceCandidate(candidate)
                console.log("[v0] Added ICE candidate directly")
              } else {
                iceCandidatesQueueRef.current.push(candidate)
                console.log("[v0] Queued ICE candidate")
              }
            } catch (err) {
              console.error("[v0] Error processing ICE candidate:", err)
            }
          },
        )
        .subscribe((status) => {
          console.log("[v0] Realtime subscription status:", status)
        })

      realtimeChannelRef.current = channel

      // If initiator, create and send offer
      if (isInitiator) {
        console.log("[v0] Creating offer...")
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          })
          await pc.setLocalDescription(offer)

          await supabase.from("signaling").insert({
            room_id: roomId,
            from_user_id: userId,
            type: "offer",
            sdp: offer.sdp,
          })
          console.log("[v0] Offer sent")
        } catch (err) {
          console.error("[v0] Error creating offer:", err)
        }
      }
    },
    [userId],
  )

  const handleMatch = useCallback(
    async (partnerId: string, roomId: string, isInitiator: boolean, partnerProfile: PartnerProfile) => {
      console.log("[v0] Match found! Partner:", partnerProfile.full_name, "Initiator:", isInitiator)

      // Set partner info for UI
      setCurrentPartner(partnerProfile)
      currentPartnerIdRef.current = partnerId
      setVideoState("connecting")
      setConnectionStatus(`Conectando com ${partnerProfile.full_name}...`)

      currentRoomIdRef.current = roomId

      // Small delay for UI to update
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Setup WebRTC connection
      await setupWebRTC(roomId, isInitiator, partnerId)
    },
    [setupWebRTC],
  )

  const startSearching = useCallback(async () => {
    if (limitReached) return

    setIsLoading(true)
    setVideoState("searching")
    setConnectionStatus("Preparando câmera...")

    setCurrentPartner(null)
    currentPartnerIdRef.current = null
    setIsLiked(false)

    const stream = await getLocalStream()
    if (!stream) {
      setIsLoading(false)
      return
    }

    setConnectionStatus("Buscando profissional...")

    try {
      const result = await joinVideoQueue(locationFilter.state || undefined, locationFilter.city || undefined)

      if (!result.success) {
        setConnectionStatus(result.error || "Erro ao entrar na fila")
        setVideoState("idle")
        setIsLoading(false)
        return
      }

      currentRoomIdRef.current = result.roomId!

      // Immediate match found
      if (result.matched && result.partnerId && result.partnerProfile) {
        await handleMatch(result.partnerId, result.roomId!, false, {
          id: result.partnerId,
          full_name: result.partnerProfile.full_name || "Usuário",
          avatar_url: result.partnerProfile.avatar_url || "",
          bio: result.partnerProfile.bio,
          city: result.partnerProfile.city,
        })
        setIsLoading(false)
        return
      }

      // Poll for partner
      pollingRef.current = setInterval(async () => {
        if (!currentRoomIdRef.current) return

        const status = await checkRoomStatus(currentRoomIdRef.current)

        if (status.status === "active" && status.partnerId && status.partnerProfile) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }

          await handleMatch(status.partnerId, currentRoomIdRef.current!, true, {
            id: status.partnerId,
            full_name: status.partnerProfile.full_name || "Usuário",
            avatar_url: status.partnerProfile.avatar_url || "",
            bio: status.partnerProfile.bio,
            city: status.partnerProfile.city,
          })
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
          await sender.replaceTrack(videoTrack)
        }
      }
    } catch (error) {
      console.error("[v0] Error flipping camera:", error)
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

  const handleLike = useCallback(async () => {
    if (!currentPartner || isLiked) return

    const result = await likeUser(currentPartner.id)
    setIsLiked(true)

    if (result.error) {
      console.error("[v0] Like error:", result.error)
      return
    }

    if (result.isMatch) {
      console.log("[v0] It's a match!")
    }
  }, [currentPartner, isLiked])

  const formatWaitTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

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
    <div className="flex h-[calc(100dvh-60px)] md:h-[calc(100vh-80px)] flex-col bg-background overflow-hidden">
      {/* Header - Hidden on mobile for more space */}
      <div className="hidden md:block px-4 md:px-6 py-4 border-b border-border shrink-0">
        <h1 className="text-xl font-bold text-foreground">Videochamada</h1>
        <p className="text-sm text-muted-foreground">Conecte-se instantaneamente com profissionais</p>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {videoState === "connected" && remoteVideoReady ? (
          <div className="flex-1 flex flex-col md:flex-row min-h-0">
            {/* Remote video - 50% height on mobile */}
            <div className="relative h-1/2 md:h-full md:flex-1 min-h-0 bg-black">
              <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />

              {/* Report button */}
              <button className="absolute top-2 left-2 md:top-4 md:left-4 flex items-center gap-2 bg-card/80 backdrop-blur-sm hover:bg-card text-foreground px-3 py-1.5 md:px-4 md:py-2 rounded-xl shadow-lg border border-border">
                <Flag className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                <span className="font-medium text-xs md:text-sm">Reportar</span>
              </button>

              {/* Partner info overlay */}
              <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 flex items-center gap-2 md:gap-3 bg-card/80 backdrop-blur-sm px-3 py-2 md:px-4 md:py-3 rounded-xl border border-border">
                <Avatar className="h-8 w-8 md:h-10 md:w-10 ring-2 ring-primary">
                  <AvatarImage src={currentPartner?.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback className="gradient-bg text-white text-sm">
                    {currentPartner?.full_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground text-sm md:text-base">
                    {currentPartner?.full_name || "Conectando..."}
                  </p>
                  <p className="text-xs text-muted-foreground">{currentPartner?.city || "Brasil"}</p>
                </div>
              </div>

              {/* Match + Skip buttons - bottom right of remote video */}
              <div className="absolute bottom-2 right-2 md:bottom-4 md:right-4 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={skipToNext}
                  className="rounded-full h-12 w-12 md:h-14 md:w-14 border-border hover:bg-muted bg-card/80 backdrop-blur-sm p-0"
                >
                  <SkipForward className="h-5 w-5 md:h-6 md:w-6" />
                </Button>

                <Button
                  size="sm"
                  onClick={handleLike}
                  disabled={isLiked}
                  className={`rounded-full h-12 w-12 md:h-14 md:w-14 p-0 shadow-lg ${
                    isLiked
                      ? "bg-pink-500 text-white"
                      : "bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:opacity-90"
                  }`}
                >
                  <Heart className={`h-5 w-5 md:h-6 md:w-6 ${isLiked ? "fill-current" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Local video - 50% height on mobile */}
            <div className="relative h-1/2 md:h-full md:w-[300px] lg:w-[350px] min-h-0 bg-black border-t md:border-t-0 md:border-l border-border">
              <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />

              {!localVideoReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-card">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <span className="text-sm text-muted-foreground">Carregando câmera...</span>
                </div>
              )}

              {/* End call button - top left */}
              <Button
                size="icon"
                variant="destructive"
                onClick={endCall}
                className="absolute top-2 left-2 rounded-full h-10 w-10 md:h-12 md:w-12"
              >
                <PhoneOff className="h-4 w-4 md:h-5 md:w-5" />
              </Button>

              {/* Flip camera - top right */}
              <Button
                size="icon"
                variant="secondary"
                onClick={flipCamera}
                className="absolute top-2 right-2 rounded-full h-10 w-10 md:h-12 md:w-12"
              >
                <SwitchCamera className="h-4 w-4 md:h-5 md:w-5" />
              </Button>

              {/* Mic and Camera controls - bottom center */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2">
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
              </div>
            </div>
          </div>
        ) : (
          // Not connected - show search/idle/connecting states
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
            {/* Left side - Main content area */}
            <div className="relative flex-1 flex items-center justify-center p-4 md:p-6 min-h-0">
              <div className="w-full max-w-2xl rounded-2xl border border-border bg-card/50 p-6 md:p-12 flex flex-col items-center justify-center text-center">
                {videoState === "idle" && (
                  <>
                    <div className="mb-6 h-16 w-16 md:h-24 md:w-24 rounded-full gradient-bg flex items-center justify-center shadow-lg shadow-primary/25">
                      <Video className="h-8 w-8 md:h-12 md:w-12 text-white" />
                    </div>
                    <h2 className="text-lg md:text-2xl font-bold text-foreground mb-3">Pronto para conectar?</h2>
                    <p className="text-muted-foreground mb-6 max-w-md text-sm md:text-base">
                      Clique no botão abaixo para ser conectado com um profissional aleatório baseado nos seus
                      interesses.
                    </p>
                    <Button
                      onClick={startSearching}
                      disabled={isLoading}
                      className="px-6 md:px-8 py-5 md:py-6 text-base md:text-lg rounded-xl gradient-bg text-white hover:opacity-90 shadow-lg shadow-primary/25"
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <Video className="mr-2 h-5 w-5" />
                      )}
                      Iniciar Videochamada
                    </Button>
                    {remainingCalls !== null && remainingCalls > 0 && (
                      <p className="mt-4 text-sm text-primary font-medium">Chamadas restantes: {remainingCalls}</p>
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

                {videoState === "connecting" && currentPartner && (
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
            </div>

            {/* Right side - Your video preview (during searching/connecting) */}
            {(videoState === "searching" || videoState === "connecting") && (
              <div className="h-[200px] md:h-auto lg:w-[350px] flex flex-col border-t lg:border-t-0 lg:border-l border-border shrink-0">
                <div className="relative flex-1 bg-gradient-to-br from-card to-background min-h-0">
                  <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />

                  {!localVideoReady && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                      <span className="text-sm text-muted-foreground">Carregando câmera...</span>
                    </div>
                  )}

                  {/* Camera controls during search */}
                  {localVideoReady && (
                    <>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2">
                        <Button
                          size="icon"
                          variant={isMuted ? "destructive" : "secondary"}
                          onClick={toggleMute}
                          className="rounded-full h-10 w-10"
                        >
                          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant={isVideoOff ? "destructive" : "secondary"}
                          onClick={toggleVideo}
                          className="rounded-full h-10 w-10"
                        >
                          {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={flipCamera}
                        className="absolute top-2 right-2 rounded-full h-10 w-10"
                      >
                        <SwitchCamera className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tips - Only in idle state */}
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
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Mic className="w-3 h-3 md:w-4 md:h-4 text-secondary" />
                </div>
                <span className="text-xs md:text-sm font-medium text-foreground">Som claro</span>
              </div>
              <p className="text-xs text-muted-foreground hidden md:block">Use fones de ouvido para melhor qualidade</p>
            </div>
            <div className="bg-card/50 rounded-xl p-3 md:p-4 border border-border">
              <div className="flex items-center gap-2 mb-1 md:mb-2">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Heart className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
                </div>
                <span className="text-xs md:text-sm font-medium text-foreground">Seja gentil</span>
              </div>
              <p className="text-xs text-muted-foreground hidden md:block">Respeite os outros profissionais</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
