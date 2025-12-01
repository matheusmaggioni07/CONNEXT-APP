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
  AlertCircle,
} from "lucide-react"
import { joinVideoQueue, checkRoomStatus, endVideoRoom, checkCallLimit } from "@/app/actions/video"
import { likeUser } from "@/app/actions/likes"
import { getProfileById } from "@/app/actions/profile"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"

type VideoState = "idle" | "searching" | "connecting" | "connected" | "ended"

// Simple STUN/TURN config
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

function VideoPage() {
  const [videoState, setVideoState] = useState<VideoState>("idle")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [currentPartner, setCurrentPartner] = useState<Profile | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [waitTime, setWaitTime] = useState(0)
  const [callsRemaining, setCallsRemaining] = useState<number | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>("")

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const channelRef = useRef<any>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const waitTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isInitiatorRef = useRef(false)
  const hasRemoteDescRef = useRef(false)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])

  const supabase = createClient()

  // Initialize user
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setCurrentUserId(data.user.id)
        console.log("[v0] User ID:", data.user.id)
      }

      const result = await checkCallLimit()
      if (result.remaining !== undefined) {
        setCallsRemaining(result.remaining === Number.POSITIVE_INFINITY ? -1 : result.remaining)
      }
    }
    init()
  }, [supabase])

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup()
  }, [])

  const cleanup = useCallback(() => {
    console.log("[v0] Cleanup called")

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

    hasRemoteDescRef.current = false
    pendingCandidatesRef.current = []
  }, [supabase])

  // Get camera and microphone
  const getLocalStream = async (): Promise<MediaStream | null> => {
    try {
      console.log("[v0] Requesting camera/mic...")
      setDebugInfo("Solicitando câmera...")

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      console.log("[v0] Got stream with", stream.getTracks().length, "tracks")
      setDebugInfo("Câmera OK!")

      localStreamRef.current = stream

      // Show local video immediately
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.muted = true
        await localVideoRef.current.play().catch((e) => console.log("[v0] Play error:", e))
      }

      return stream
    } catch (err: any) {
      console.error("[v0] Media error:", err)

      if (err.name === "NotAllowedError") {
        setErrorMessage("Permita o acesso à câmera e microfone no seu navegador.")
      } else if (err.name === "NotFoundError") {
        setErrorMessage("Câmera ou microfone não encontrado.")
      } else {
        setErrorMessage("Erro ao acessar câmera: " + err.message)
      }

      return null
    }
  }

  // Setup WebRTC connection
  const setupPeerConnection = (stream: MediaStream, roomId: string, partnerId: string) => {
    console.log("[v0] Setting up peer connection for room:", roomId)
    setDebugInfo("Configurando conexão...")

    const pc = new RTCPeerConnection(rtcConfig)
    peerConnectionRef.current = pc

    // Add local tracks
    stream.getTracks().forEach((track) => {
      console.log("[v0] Adding track:", track.kind)
      pc.addTrack(track, stream)
    })

    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log("[v0] Received remote track:", event.track.kind)
      setDebugInfo("Recebendo vídeo remoto...")

      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0]
        remoteVideoRef.current.play().catch((e) => console.log("[v0] Remote play error:", e))
        setVideoState("connected")
        setConnectionStatus("Conectado!")
      }
    }

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        console.log("[v0] Sending ICE candidate")
        channelRef.current.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: {
            candidate: event.candidate.toJSON(),
            from: currentUserId,
          },
        })
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log("[v0] ICE state:", pc.iceConnectionState)
      setDebugInfo("ICE: " + pc.iceConnectionState)

      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setVideoState("connected")
        setConnectionStatus("Conectado!")
      } else if (pc.iceConnectionState === "failed") {
        setErrorMessage("Falha na conexão. Tente novamente.")
      }
    }

    pc.onconnectionstatechange = () => {
      console.log("[v0] Connection state:", pc.connectionState)
    }

    // Setup signaling channel
    const channel = supabase.channel(`video-room-${roomId}`, {
      config: { broadcast: { self: false } },
    })

    channel
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.from === currentUserId) return
        console.log("[v0] Received offer")
        setDebugInfo("Recebendo oferta...")

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
          hasRemoteDescRef.current = true

          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)

          channel.send({
            type: "broadcast",
            event: "answer",
            payload: { answer, from: currentUserId },
          })
          console.log("[v0] Answer sent")

          // Process pending candidates
          for (const candidate of pendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          }
          pendingCandidatesRef.current = []
        } catch (err) {
          console.error("[v0] Offer handling error:", err)
        }
      })
      .on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (payload.from === currentUserId) return
        console.log("[v0] Received answer")
        setDebugInfo("Recebendo resposta...")

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.answer))
          hasRemoteDescRef.current = true

          for (const candidate of pendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          }
          pendingCandidatesRef.current = []
        } catch (err) {
          console.error("[v0] Answer handling error:", err)
        }
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        if (payload.from === currentUserId) return
        console.log("[v0] Received ICE candidate")

        try {
          if (hasRemoteDescRef.current && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
          } else {
            pendingCandidatesRef.current.push(payload.candidate)
          }
        } catch (err) {
          console.error("[v0] ICE candidate error:", err)
        }
      })
      .subscribe(async (status) => {
        console.log("[v0] Channel status:", status)

        if (status === "SUBSCRIBED" && isInitiatorRef.current) {
          // Wait a moment for the other peer to connect
          await new Promise((r) => setTimeout(r, 1000))

          console.log("[v0] Creating offer as initiator")
          setDebugInfo("Criando oferta...")

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
            console.error("[v0] Offer creation error:", err)
          }
        }
      })

    channelRef.current = channel
    return pc
  }

  // Connect to matched partner
  const connectToPartner = async (roomId: string, partnerId: string, stream: MediaStream) => {
    console.log("[v0] Connecting to partner:", partnerId)
    setVideoState("connecting")
    setConnectionStatus("Conectando com parceiro...")
    setCurrentRoomId(roomId)

    // Get partner profile
    const partner = await getProfileById(partnerId)
    if (partner) {
      setCurrentPartner(partner)
      console.log("[v0] Partner name:", partner.full_name)
    }

    // Setup WebRTC
    setupPeerConnection(stream, roomId, partnerId)
  }

  const startVideoCall = async () => {
    console.log("[v0] === START VIDEO CALL ===")

    if (!currentUserId) {
      setErrorMessage("Você precisa estar logado.")
      return
    }

    if (isLoading) return

    setIsLoading(true)
    setErrorMessage(null)
    setDebugInfo("")
    setVideoState("searching")
    setWaitTime(0)
    hasRemoteDescRef.current = false
    pendingCandidatesRef.current = []

    try {
      // Step 1: Get camera
      const stream = await getLocalStream()
      if (!stream) {
        setVideoState("idle")
        setIsLoading(false)
        return
      }

      // Step 2: Join queue and find/create room
      console.log("[v0] Joining video queue...")
      setDebugInfo("Procurando parceiro...")

      const result = await joinVideoQueue()
      console.log("[v0] Queue result:", JSON.stringify(result))

      if (result.error) {
        setErrorMessage(result.error)
        setVideoState("idle")
        setIsLoading(false)
        return
      }

      if (!result.roomId) {
        setErrorMessage("Erro ao criar sala.")
        setVideoState("idle")
        setIsLoading(false)
        return
      }

      setCurrentRoomId(result.roomId)

      // Step 3: Check if matched immediately
      if (result.matched && result.partnerId) {
        console.log("[v0] Matched immediately!")
        isInitiatorRef.current = false // We joined, so we're not initiator
        await connectToPartner(result.roomId, result.partnerId, stream)
        setIsLoading(false)
        return
      }

      // Step 4: Waiting for someone - we are initiator
      console.log("[v0] Waiting for partner...")
      isInitiatorRef.current = true
      setConnectionStatus("Aguardando outro usuário...")

      // Start wait timer
      waitTimerRef.current = setInterval(() => {
        setWaitTime((prev) => prev + 1)
      }, 1000)

      // Poll for partner every 1.5 seconds
      let pollCount = 0
      pollIntervalRef.current = setInterval(async () => {
        pollCount++
        console.log("[v0] Polling for partner... attempt", pollCount)
        setDebugInfo(`Procurando... (${pollCount})`)

        const status = await checkRoomStatus(result.roomId!)
        console.log("[v0] Room status:", JSON.stringify(status))

        if (status.matched && status.partnerId) {
          console.log("[v0] Partner found:", status.partnerId)

          // Clear intervals
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          if (waitTimerRef.current) clearInterval(waitTimerRef.current)
          pollIntervalRef.current = null
          waitTimerRef.current = null

          // Update room ID if switched
          if (status.switchedRoom && status.roomId) {
            setCurrentRoomId(status.roomId)
          }

          // Connect
          await connectToPartner(status.roomId || result.roomId!, status.partnerId, stream)
        }
      }, 1500)

      setIsLoading(false)
    } catch (err: any) {
      console.error("[v0] Error:", err)
      setErrorMessage("Erro: " + err.message)
      setVideoState("idle")
      setIsLoading(false)
    }
  }

  const endCall = async () => {
    console.log("[v0] Ending call")

    if (currentRoomId) {
      await endVideoRoom(currentRoomId)
    }

    cleanup()
    setVideoState("ended")
    setCurrentPartner(null)
    setCurrentRoomId(null)
    setDebugInfo("")
  }

  const skipToNext = async () => {
    await endCall()
    setVideoState("idle")
    setTimeout(() => startVideoCall(), 500)
  }

  const handleLike = async () => {
    if (!currentPartner) return
    const result = await likeUser(currentPartner.id)
    console.log("[v0] Like result:", result)
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Calls remaining badge */}
      {callsRemaining !== null && (
        <div className="absolute top-4 right-4 z-10">
          <Badge variant="outline" className="bg-background/80 backdrop-blur">
            <Video className="w-3 h-3 mr-1" />
            {callsRemaining === -1 ? "Ilimitado" : `${callsRemaining} restantes`}
          </Badge>
        </div>
      )}

      {/* Search status */}
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

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4">
        {/* IDLE STATE */}
        {videoState === "idle" && (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-pink-500/20 flex items-center justify-center">
              <Camera className="w-12 h-12 text-primary" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground">Pronto para conectar?</h2>
              <p className="text-muted-foreground mt-2">
                Inicie uma videochamada e conheça profissionais em tempo real
              </p>
            </div>

            {errorMessage && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button
              onClick={startVideoCall}
              disabled={isLoading}
              size="lg"
              className="bg-gradient-to-r from-primary to-pink-500 hover:opacity-90"
            >
              {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Video className="w-5 h-5 mr-2" />}
              {isLoading ? "Iniciando..." : "Iniciar Videochamada"}
            </Button>

            <div className="flex justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-primary" />
                Video HD
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-primary" />
                Profissionais reais
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-primary" />
                Match e WhatsApp
              </div>
            </div>
          </div>
        )}

        {/* SEARCHING/CONNECTING STATE */}
        {(videoState === "searching" || videoState === "connecting") && (
          <div className="w-full h-full relative">
            {/* Remote video (placeholder while searching) */}
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-lg">
              {videoState === "connecting" && currentPartner ? (
                <div className="text-center">
                  <Avatar className="w-24 h-24 mx-auto mb-4">
                    <AvatarImage src={currentPartner.avatar_url || ""} />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-pink-500">
                      {currentPartner.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-lg font-medium">{currentPartner.full_name}</p>
                  <p className="text-muted-foreground">{currentPartner.position}</p>
                </div>
              ) : (
                <div className="text-center">
                  <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
                  <p className="text-lg font-medium">
                    {videoState === "connecting" ? "Conectando video..." : "Procurando..."}
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    {connectionStatus || "Aguarde enquanto estabelecemos a conexão"}
                  </p>
                  {debugInfo && <p className="text-xs text-muted-foreground mt-2 font-mono">{debugInfo}</p>}
                </div>
              )}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-0 transition-opacity"
                style={{ opacity: videoState === "connected" ? 1 : 0 }}
              />
            </div>

            {/* Local video preview (bottom right) */}
            <div className="absolute bottom-4 right-4 w-32 h-44 md:w-48 md:h-64 rounded-lg overflow-hidden border-2 border-primary shadow-xl bg-black">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
                style={{ transform: "scaleX(-1)" }}
              />
              {isVideoOff && (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <VideoOff className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 md:gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleMute}
                className={`rounded-full ${isMuted ? "bg-destructive text-destructive-foreground" : ""}`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={toggleVideo}
                className={`rounded-full ${isVideoOff ? "bg-destructive text-destructive-foreground" : ""}`}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </Button>

              <Button variant="destructive" size="icon" onClick={endCall} className="rounded-full">
                <PhoneOff className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* CONNECTED STATE */}
        {videoState === "connected" && (
          <div className="w-full h-full relative">
            {/* Remote video (full screen) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover rounded-lg bg-black"
            />

            {/* Partner info overlay */}
            {currentPartner && (
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

            {/* Local video (bottom right) */}
            <div className="absolute bottom-20 right-4 w-32 h-44 md:w-48 md:h-64 rounded-lg overflow-hidden border-2 border-primary shadow-xl bg-black">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              {isVideoOff && (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <VideoOff className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 md:gap-3 bg-black/30 backdrop-blur rounded-full px-4 py-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className={`rounded-full text-white hover:bg-white/20 ${isMuted ? "bg-destructive" : ""}`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleVideo}
                className={`rounded-full text-white hover:bg-white/20 ${isVideoOff ? "bg-destructive" : ""}`}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </Button>

              <Button variant="destructive" size="icon" onClick={endCall} className="rounded-full">
                <PhoneOff className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={skipToNext}
                className="rounded-full text-white hover:bg-white/20"
              >
                <SkipForward className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleLike}
                className="rounded-full text-white hover:bg-pink-500/50"
              >
                <Heart className="w-5 h-5" />
              </Button>

              <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-white/20">
                <Flag className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* ENDED STATE */}
        {videoState === "ended" && (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-muted flex items-center justify-center">
              <PhoneOff className="w-12 h-12 text-muted-foreground" />
            </div>

            <div>
              <h2 className="text-2xl font-bold">Chamada encerrada</h2>
              <p className="text-muted-foreground mt-2">
                {currentPartner ? `Você conversou com ${currentPartner.full_name}` : "A chamada foi encerrada"}
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <Button onClick={() => setVideoState("idle")} variant="outline">
                Voltar
              </Button>
              <Button onClick={startVideoCall} className="bg-gradient-to-r from-primary to-pink-500">
                <RefreshCw className="w-4 h-4 mr-2" />
                Nova chamada
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export { VideoPage }
export default VideoPage
