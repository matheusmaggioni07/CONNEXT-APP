"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  SkipForward,
  Heart,
  Flag,
  Loader2,
  Sparkles,
  Users,
  RefreshCw,
  Camera,
} from "lucide-react"
import { joinVideoQueue, checkRoomStatus, endVideoRoom, checkCallLimit } from "@/app/actions/video"
import { likeUser } from "@/app/actions/likes"
import { getProfileById } from "@/app/actions/profile"
import { createClient } from "@/lib/supabase/client"
import { rtcConfig, videoConstraints, audioConstraints } from "@/lib/webrtc-config"
import type { Profile } from "@/lib/types"
import type { RealtimeChannel } from "@supabase/supabase-js"

type VideoState = "idle" | "searching" | "connecting" | "connected" | "ended"

function VideoPage() {
  // State
  const [videoState, setVideoState] = useState<VideoState>("idle")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [currentPartner, setCurrentPartner] = useState<Profile | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [waitTime, setWaitTime] = useState(0)
  const [callsRemaining, setCallsRemaining] = useState<number | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<string>("Iniciando...")
  const [isLoading, setIsLoading] = useState(false)

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const roomChannelRef = useRef<RealtimeChannel | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const waitTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isInitiatorRef = useRef(false)
  const hasRemoteDescriptionRef = useRef(false)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const offerSentRef = useRef(false)

  const supabase = createClient()

  // Get current user
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setCurrentUserId(data.user.id)
        console.log("[v0] Current user:", data.user.id)
      }

      const result = await checkCallLimit()
      console.log("[v0] Call limit check:", result)
      if (result.remaining !== undefined) {
        setCallsRemaining(result.remaining === Number.POSITIVE_INFINITY ? -1 : result.remaining)
      }
    }
    init()
  }, [supabase])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  const cleanup = useCallback(() => {
    console.log("[v0] Cleaning up...")

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (waitTimerRef.current) {
      clearInterval(waitTimerRef.current)
      waitTimerRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    if (roomChannelRef.current) {
      supabase.removeChannel(roomChannelRef.current)
      roomChannelRef.current = null
    }
  }, [supabase])

  // Get local camera/mic stream
  const getLocalStream = async () => {
    try {
      console.log("[v0] Requesting camera and microphone access...")

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints,
      })

      console.log("[v0] Got local stream with", stream.getTracks().length, "tracks")

      localStreamRef.current = stream

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.muted = true
        await localVideoRef.current.play().catch((e) => console.log("[v0] Local video play error:", e))
      }

      return stream
    } catch (err: any) {
      console.error("[v0] Error getting media:", err)

      if (err.name === "NotAllowedError") {
        setErrorMessage("Por favor, permita o acesso à câmera e microfone.")
      } else if (err.name === "NotFoundError") {
        setErrorMessage("Câmera ou microfone não encontrado.")
      } else {
        setErrorMessage("Erro ao acessar câmera/microfone: " + err.message)
      }

      return null
    }
  }

  // Create WebRTC peer connection
  const createPeerConnection = (stream: MediaStream) => {
    console.log("[v0] Creating peer connection...")

    const pc = new RTCPeerConnection(rtcConfig)

    // Add local tracks
    stream.getTracks().forEach((track) => {
      console.log("[v0] Adding track:", track.kind)
      pc.addTrack(track, stream)
    })

    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log("[v0] Received remote track:", event.track.kind)

      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0]
        remoteVideoRef.current.play().catch((e) => console.log("[v0] Remote video play error:", e))
      }
    }

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate && currentRoomId && channelRef.current) {
        console.log("[v0] Sending ICE candidate")
        channelRef.current.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { candidate: event.candidate.toJSON(), from: currentUserId },
        })
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log("[v0] ICE connection state:", pc.iceConnectionState)
      setConnectionStatus(
        pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed"
          ? "Conectado"
          : pc.iceConnectionState === "checking"
            ? "Verificando..."
            : pc.iceConnectionState === "failed"
              ? "Falha na conexão"
              : "Conectando...",
      )

      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setVideoState("connected")
      }

      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        setErrorMessage("Conexão perdida. Tente novamente.")
      }
    }

    peerConnectionRef.current = pc
    return pc
  }

  // Setup signaling channel
  const setupSignalingChannel = (roomId: string, pc: RTCPeerConnection) => {
    console.log("[v0] Setting up signaling channel for room:", roomId)

    const channel = supabase.channel(`video-${roomId}`, {
      config: { broadcast: { self: false } },
    })

    channel
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.from === currentUserId) return
        console.log("[v0] Received offer from:", payload.from)

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
          hasRemoteDescriptionRef.current = true

          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)

          channel.send({
            type: "broadcast",
            event: "answer",
            payload: { answer, from: currentUserId },
          })

          // Process pending candidates
          for (const candidate of pendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          }
          pendingCandidatesRef.current = []
        } catch (err) {
          console.error("[v0] Error handling offer:", err)
        }
      })
      .on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (payload.from === currentUserId) return
        console.log("[v0] Received answer from:", payload.from)

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.answer))
          hasRemoteDescriptionRef.current = true

          for (const candidate of pendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          }
          pendingCandidatesRef.current = []
        } catch (err) {
          console.error("[v0] Error handling answer:", err)
        }
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        if (payload.from === currentUserId) return
        console.log("[v0] Received ICE candidate")

        try {
          if (hasRemoteDescriptionRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
          } else {
            pendingCandidatesRef.current.push(payload.candidate)
          }
        } catch (err) {
          console.error("[v0] Error adding ICE candidate:", err)
        }
      })
      .subscribe()

    channelRef.current = channel
    return channel
  }

  // Connect to partner
  const connectToPartner = async (roomId: string, partnerId: string, stream: MediaStream) => {
    console.log("[v0] Connecting to partner:", partnerId)
    setVideoState("connecting")
    setConnectionStatus("Conectando...")
    setCurrentRoomId(roomId)

    // Get partner profile
    const partnerProfile = await getProfileById(partnerId)
    if (partnerProfile) {
      setCurrentPartner(partnerProfile)
    }

    // Create peer connection
    const pc = createPeerConnection(stream)

    // Setup signaling
    const channel = setupSignalingChannel(roomId, pc)

    // Wait for channel to be ready
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Create and send offer (only if we're the initiator)
    if (isInitiatorRef.current && !offerSentRef.current) {
      console.log("[v0] Creating offer...")
      offerSentRef.current = true

      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        channel.send({
          type: "broadcast",
          event: "offer",
          payload: { offer, from: currentUserId },
        })
        console.log("[v0] Offer sent")
      } catch (err) {
        console.error("[v0] Error creating offer:", err)
      }
    }
  }

  const startVideoCall = async () => {
    console.log("[v0] startVideoCall clicked!")

    if (!currentUserId) {
      console.log("[v0] No current user ID")
      setErrorMessage("Você precisa estar logado para iniciar uma chamada.")
      return
    }

    if (isLoading) {
      console.log("[v0] Already loading, ignoring click")
      return
    }

    setIsLoading(true)
    setErrorMessage(null)
    setVideoState("searching")
    setWaitTime(0)
    setConnectionStatus("Procurando...")
    hasRemoteDescriptionRef.current = false
    pendingCandidatesRef.current = []
    offerSentRef.current = false

    try {
      // Get camera first
      console.log("[v0] Getting local stream...")
      const stream = await getLocalStream()
      if (!stream) {
        console.log("[v0] Failed to get stream")
        setVideoState("idle")
        setIsLoading(false)
        return
      }

      console.log("[v0] Stream acquired, joining queue...")

      // Join queue
      const result = await joinVideoQueue()
      console.log("[v0] joinVideoQueue result:", result)

      if (result.error) {
        console.log("[v0] Error from joinVideoQueue:", result.error)
        setErrorMessage(result.error)
        setVideoState("idle")
        setIsLoading(false)
        return
      }

      setCurrentRoomId(result.roomId!)
      console.log("[v0] Room ID set:", result.roomId)

      if (result.matched && result.partnerId) {
        // Matched immediately!
        console.log("[v0] Matched immediately with:", result.partnerId)
        isInitiatorRef.current = false
        await connectToPartner(result.roomId!, result.partnerId, stream)
      } else {
        // Waiting for partner
        console.log("[v0] Waiting for partner in room:", result.roomId)
        isInitiatorRef.current = true

        waitTimerRef.current = setInterval(() => {
          setWaitTime((prev) => prev + 1)
        }, 1000)

        // Subscribe to room changes
        const roomChannel = supabase
          .channel(`room-${result.roomId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "video_rooms",
              filter: `id=eq.${result.roomId}`,
            },
            async (payload: any) => {
              console.log("[v0] Room updated:", payload.new)

              if (payload.new.status === "active" && payload.new.user2_id) {
                const partnerId = payload.new.user1_id === currentUserId ? payload.new.user2_id : payload.new.user1_id

                console.log("[v0] Partner joined via realtime:", partnerId)

                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
                if (waitTimerRef.current) clearInterval(waitTimerRef.current)

                await connectToPartner(result.roomId!, partnerId, stream)
              }
            },
          )
          .subscribe()

        roomChannelRef.current = roomChannel

        // Also poll as backup
        pollIntervalRef.current = setInterval(async () => {
          console.log("[v0] Polling for partner...")
          const status = await checkRoomStatus(result.roomId!)

          if (status.matched && status.partnerId) {
            console.log("[v0] Partner found via polling:", status.partnerId)

            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
            if (waitTimerRef.current) clearInterval(waitTimerRef.current)

            if (status.switchedRoom) {
              setCurrentRoomId(status.roomId!)
            }

            await connectToPartner(status.roomId!, status.partnerId, stream)
          }
        }, 2000)
      }
    } catch (err: any) {
      console.error("[v0] Error in startVideoCall:", err)
      setErrorMessage("Erro ao iniciar chamada: " + err.message)
      setVideoState("idle")
    } finally {
      setIsLoading(false)
    }
  }

  // End current call
  const endCall = async () => {
    console.log("[v0] Ending call...")

    if (currentRoomId) {
      await endVideoRoom(currentRoomId)
    }

    cleanup()
    setVideoState("ended")
    setCurrentPartner(null)
    setCurrentRoomId(null)
  }

  // Skip to next person
  const skipToNext = async () => {
    console.log("[v0] Skipping to next...")
    await endCall()
    setVideoState("idle")
    setErrorMessage(null)

    // Start new search after short delay
    setTimeout(() => {
      startVideoCall()
    }, 500)
  }

  // Like current partner
  const handleLike = async () => {
    if (!currentPartner) return

    const result = await likeUser(currentPartner.id)
    if (result.isMatch) {
      // Show match notification
      console.log("[v0] It's a match!")
    }
  }

  // Toggle audio
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsVideoOff(!isVideoOff)
    }
  }

  // Format wait time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // New call after ended
  const startNewCall = () => {
    setVideoState("idle")
    setErrorMessage(null)
    setCurrentPartner(null)
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header with call info */}
      {callsRemaining !== null && (
        <div className="absolute top-4 right-4 z-10">
          <Badge variant="outline" className="bg-background/80 backdrop-blur">
            <Video className="w-3 h-3 mr-1" />
            {callsRemaining === -1 ? "Ilimitado" : `${callsRemaining} restantes`}
          </Badge>
        </div>
      )}

      {/* Status indicator when searching */}
      {videoState === "searching" && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <Badge variant="secondary" className="bg-primary/20 text-primary animate-pulse">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            searching
          </Badge>
          <Badge variant="outline" className="bg-destructive/20 text-destructive">
            <span className="w-2 h-2 rounded-full bg-destructive mr-1 animate-pulse" />
            {formatTime(waitTime)}
          </Badge>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center p-4">
        {/* Idle state - show start button */}
        {videoState === "idle" && (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto">
              <Camera className="w-12 h-12 text-primary" />
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-2">Pronto para conectar?</h2>
              <p className="text-muted-foreground">Inicie uma videochamada e conheça profissionais em tempo real</p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-destructive/20 border border-destructive rounded-lg text-destructive text-sm max-w-md mx-auto">
                {errorMessage}
              </div>
            )}

            <Button
              size="lg"
              onClick={startVideoCall}
              disabled={isLoading || !currentUserId}
              className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] hover:opacity-90"
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

            <div className="flex gap-6 mt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[hsl(var(--accent))]" />
                Video HD
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Profissionais reais
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-destructive" />
                Match e WhatsApp
              </div>
            </div>
          </div>
        )}

        {/* Searching state */}
        {videoState === "searching" && (
          <div className="text-center space-y-6">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">{connectionStatus}</h2>
              <p className="text-muted-foreground">Aguarde enquanto estabelecemos a conexão</p>
            </div>

            {/* Local video preview */}
            <div className="absolute bottom-24 right-4 w-32 h-44 md:w-48 md:h-64 rounded-2xl overflow-hidden border-2 border-primary/50 shadow-xl">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
                style={{ transform: "scaleX(-1)" }}
              />
            </div>

            <Button variant="outline" onClick={endCall} className="mt-4 bg-transparent">
              <PhoneOff className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          </div>
        )}

        {/* Connecting state */}
        {videoState === "connecting" && (
          <div className="text-center space-y-6">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Conectando video...</h2>
              <p className="text-muted-foreground">Aguarde enquanto estabelecemos a conexão</p>
            </div>

            {/* Local video preview */}
            <div className="absolute bottom-24 right-4 w-32 h-44 md:w-48 md:h-64 rounded-2xl overflow-hidden border-2 border-primary/50 shadow-xl">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
            </div>
          </div>
        )}

        {/* Connected state - Ome.tv style layout */}
        {videoState === "connected" && (
          <div className="w-full h-full flex flex-col">
            {/* Remote video - takes up most of the screen */}
            <div className="flex-1 relative bg-black rounded-xl overflow-hidden">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

              {/* Partner info overlay */}
              {currentPartner && (
                <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                  <Avatar className="h-10 w-10 border-2 border-white">
                    <AvatarImage src={currentPartner.avatar_url || undefined} />
                    <AvatarFallback>{currentPartner.full_name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="text-white">
                    <p className="font-semibold">{currentPartner.full_name}</p>
                    <p className="text-xs text-white/70">
                      {currentPartner.position} @ {currentPartner.company}
                    </p>
                  </div>
                </div>
              )}

              {/* Connection status */}
              <div className="absolute top-4 left-4">
                <Badge
                  variant="secondary"
                  className={
                    connectionStatus === "Conectado"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }
                >
                  <span
                    className={`w-2 h-2 rounded-full mr-2 ${
                      connectionStatus === "Conectado" ? "bg-green-400" : "bg-yellow-400 animate-pulse"
                    }`}
                  />
                  {connectionStatus}
                </Badge>
              </div>

              {/* Local video - small overlay */}
              <div className="absolute bottom-4 right-4 w-32 h-44 md:w-48 md:h-64 rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />

                {isVideoOff && (
                  <div className="absolute inset-0 bg-background/90 flex items-center justify-center">
                    <VideoOff className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ended state */}
        {videoState === "ended" && (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto">
              <PhoneOff className="w-12 h-12 text-muted-foreground" />
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-2">Chamada encerrada</h2>
              <p className="text-muted-foreground">Gostou da conversa? Conecte-se novamente!</p>
            </div>

            <div className="flex gap-4 justify-center">
              <Button onClick={startNewCall} className="bg-gradient-to-r from-primary to-accent">
                <Video className="w-5 h-5 mr-2" />
                Nova Chamada
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Controls - only show when connected */}
      {videoState === "connected" && (
        <div className="flex justify-center gap-3 p-4 bg-background/80 backdrop-blur border-t">
          <Button
            size="lg"
            variant={isMuted ? "destructive" : "secondary"}
            onClick={toggleMute}
            className="rounded-full w-14 h-14"
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          <Button
            size="lg"
            variant={isVideoOff ? "destructive" : "secondary"}
            onClick={toggleVideo}
            className="rounded-full w-14 h-14"
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </Button>

          <Button size="lg" variant="destructive" onClick={endCall} className="rounded-full w-14 h-14">
            <PhoneOff className="w-6 h-6" />
          </Button>

          <Button
            size="lg"
            variant="secondary"
            onClick={skipToNext}
            className="rounded-full w-14 h-14 bg-accent/20 hover:bg-accent/30"
          >
            <SkipForward className="w-6 h-6" />
          </Button>

          <Button
            size="lg"
            variant="secondary"
            onClick={handleLike}
            className="rounded-full w-14 h-14 bg-pink-500/20 hover:bg-pink-500/30 text-pink-500"
          >
            <Heart className="w-6 h-6" />
          </Button>

          <Button size="lg" variant="ghost" className="rounded-full w-14 h-14 text-muted-foreground">
            <Flag className="w-6 h-6" />
          </Button>
        </div>
      )}
    </div>
  )
}

export { VideoPage }
export default VideoPage
