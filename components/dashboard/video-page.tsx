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
  const [localVideoReady, setLocalVideoReady] = useState(false)
  const [remoteVideoReady, setRemoteVideoReady] = useState(false)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
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
    setLocalVideoReady(false)
    setRemoteVideoReady(false)
  }, [supabase])

  const getLocalStream = async (): Promise<MediaStream | null> => {
    try {
      console.log("[v0] Requesting camera/mic...")
      setConnectionStatus("Solicitando câmera...")

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
      console.log(
        "[v0] Video tracks:",
        stream.getVideoTracks().map((t) => t.label),
      )
      console.log(
        "[v0] Audio tracks:",
        stream.getAudioTracks().map((t) => t.label),
      )

      localStreamRef.current = stream

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.muted = true
        localVideoRef.current.playsInline = true
        localVideoRef.current.autoplay = true

        // Wait for video to be ready
        localVideoRef.current.onloadedmetadata = () => {
          console.log("[v0] Local video metadata loaded")
          localVideoRef.current
            ?.play()
            .then(() => {
              console.log("[v0] Local video playing!")
              setLocalVideoReady(true)
            })
            .catch((e) => console.log("[v0] Play error:", e))
        }

        // Also try to play immediately
        try {
          await localVideoRef.current.play()
          setLocalVideoReady(true)
          console.log("[v0] Local video playing immediately!")
        } catch (e) {
          console.log("[v0] Will play when metadata loads")
        }
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

  const setupPeerConnection = (stream: MediaStream, roomId: string, partnerId: string) => {
    console.log("[v0] Setting up peer connection for room:", roomId)
    setConnectionStatus("Configurando conexão...")

    // Close any existing connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }

    const pc = new RTCPeerConnection(rtcConfig)
    peerConnectionRef.current = pc

    const remoteStream = new MediaStream()
    remoteStreamRef.current = remoteStream

    // Add local tracks to peer connection
    stream.getTracks().forEach((track) => {
      console.log("[v0] Adding local track to PC:", track.kind, track.label)
      pc.addTrack(track, stream)
    })

    pc.ontrack = (event) => {
      console.log("[v0] ========== RECEIVED REMOTE TRACK ==========")
      console.log("[v0] Track kind:", event.track.kind)
      console.log("[v0] Track id:", event.track.id)
      console.log("[v0] Track enabled:", event.track.enabled)
      console.log("[v0] Streams count:", event.streams.length)

      // Add track to our remote stream
      remoteStream.addTrack(event.track)

      // Attach remote stream to video element
      if (remoteVideoRef.current) {
        console.log("[v0] Attaching remote stream to video element")
        remoteVideoRef.current.srcObject = remoteStream
        remoteVideoRef.current.muted = false // Important: don't mute remote audio!
        remoteVideoRef.current.playsInline = true
        remoteVideoRef.current.autoplay = true

        remoteVideoRef.current.onloadedmetadata = () => {
          console.log("[v0] Remote video metadata loaded")
          remoteVideoRef.current
            ?.play()
            .then(() => {
              console.log("[v0] Remote video playing!")
              setRemoteVideoReady(true)
              setVideoState("connected")
              setConnectionStatus("Conectado!")
            })
            .catch((e) => console.error("[v0] Remote play error:", e))
        }

        // Try to play immediately
        remoteVideoRef.current
          .play()
          .then(() => {
            console.log("[v0] Remote video playing immediately!")
            setRemoteVideoReady(true)
            setVideoState("connected")
            setConnectionStatus("Conectado!")
          })
          .catch((e) => console.log("[v0] Will play when metadata loads:", e))
      }
    }

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        console.log("[v0] Sending ICE candidate:", event.candidate.candidate?.substring(0, 50))
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

    pc.onicegatheringstatechange = () => {
      console.log("[v0] ICE gathering state:", pc.iceGatheringState)
    }

    pc.oniceconnectionstatechange = () => {
      console.log("[v0] ICE connection state:", pc.iceConnectionState)
      setConnectionStatus("ICE: " + pc.iceConnectionState)

      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setVideoState("connected")
        setConnectionStatus("Conectado!")
      } else if (pc.iceConnectionState === "failed") {
        console.log("[v0] ICE connection failed, trying restart")
        pc.restartIce()
      } else if (pc.iceConnectionState === "disconnected") {
        setConnectionStatus("Reconectando...")
      }
    }

    pc.onconnectionstatechange = () => {
      console.log("[v0] Peer connection state:", pc.connectionState)
      if (pc.connectionState === "connected") {
        setVideoState("connected")
        setConnectionStatus("Conectado!")
      }
    }

    pc.onnegotiationneeded = async () => {
      console.log("[v0] Negotiation needed, isInitiator:", isInitiatorRef.current)
    }

    // Setup signaling channel
    const channel = supabase.channel(`video-room-${roomId}`, {
      config: { broadcast: { self: false } },
    })

    channel
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.from === currentUserId) return
        console.log("[v0] ========== RECEIVED OFFER ==========")
        setConnectionStatus("Recebendo oferta...")

        try {
          if (pc.signalingState !== "stable") {
            console.log("[v0] Signaling state not stable, waiting...")
            await new Promise((r) => setTimeout(r, 100))
          }

          await pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
          hasRemoteDescRef.current = true
          console.log("[v0] Remote description set from offer")

          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          console.log("[v0] Local description set with answer")

          channel.send({
            type: "broadcast",
            event: "answer",
            payload: { answer, from: currentUserId },
          })
          console.log("[v0] Answer sent!")

          // Process pending candidates
          console.log("[v0] Processing", pendingCandidatesRef.current.length, "pending candidates")
          for (const candidate of pendingCandidatesRef.current) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (e) {
              console.log("[v0] Error adding pending candidate:", e)
            }
          }
          pendingCandidatesRef.current = []
        } catch (err) {
          console.error("[v0] Offer handling error:", err)
        }
      })
      .on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (payload.from === currentUserId) return
        console.log("[v0] ========== RECEIVED ANSWER ==========")
        setConnectionStatus("Recebendo resposta...")

        try {
          if (pc.signalingState !== "have-local-offer") {
            console.log("[v0] Unexpected signaling state for answer:", pc.signalingState)
            return
          }

          await pc.setRemoteDescription(new RTCSessionDescription(payload.answer))
          hasRemoteDescRef.current = true
          console.log("[v0] Remote description set from answer")

          // Process pending candidates
          console.log("[v0] Processing", pendingCandidatesRef.current.length, "pending candidates")
          for (const candidate of pendingCandidatesRef.current) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (e) {
              console.log("[v0] Error adding pending candidate:", e)
            }
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
            console.log("[v0] ICE candidate added immediately")
          } else {
            console.log("[v0] Queuing ICE candidate (no remote desc yet)")
            pendingCandidatesRef.current.push(payload.candidate)
          }
        } catch (err) {
          console.error("[v0] ICE candidate error:", err)
        }
      })
      .subscribe(async (status) => {
        console.log("[v0] Signaling channel status:", status)

        if (status === "SUBSCRIBED") {
          console.log("[v0] Channel subscribed, isInitiator:", isInitiatorRef.current)

          if (isInitiatorRef.current) {
            // Wait for the other peer to also subscribe
            await new Promise((r) => setTimeout(r, 1500))

            console.log("[v0] ========== CREATING OFFER ==========")
            setConnectionStatus("Criando oferta...")

            try {
              const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
              })
              await pc.setLocalDescription(offer)
              console.log("[v0] Local description set with offer")

              channel.send({
                type: "broadcast",
                event: "offer",
                payload: { offer, from: currentUserId },
              })
              console.log("[v0] Offer sent!")
            } catch (err) {
              console.error("[v0] Offer creation error:", err)
            }
          }
        }
      })

    channelRef.current = channel
    return pc
  }

  // Connect to matched partner
  const connectToPartner = async (roomId: string, partnerId: string, stream: MediaStream) => {
    console.log("[v0] ========== CONNECTING TO PARTNER ==========")
    console.log("[v0] Room:", roomId, "Partner:", partnerId)
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
    console.log("[v0] ========== START VIDEO CALL ==========")

    if (!currentUserId) {
      setErrorMessage("Você precisa estar logado.")
      return
    }

    if (isLoading) return

    setIsLoading(true)
    setErrorMessage(null)
    setConnectionStatus("")
    setVideoState("searching")
    setWaitTime(0)
    setLocalVideoReady(false)
    setRemoteVideoReady(false)
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
      setConnectionStatus("Procurando parceiro...")

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
        console.log("[v0] Matched immediately with:", result.partnerId)
        isInitiatorRef.current = false // We joined existing room, so we wait for offer
        await connectToPartner(result.roomId, result.partnerId, stream)
        setIsLoading(false)
        return
      }

      // Step 4: Waiting for someone - we are initiator (created the room)
      console.log("[v0] Room created, waiting for partner...")
      isInitiatorRef.current = true
      setConnectionStatus("Aguardando outro usuário...")

      // Start wait timer
      waitTimerRef.current = setInterval(() => {
        setWaitTime((prev) => prev + 1)
      }, 1000)

      // Poll for partner
      let pollCount = 0
      pollIntervalRef.current = setInterval(async () => {
        pollCount++
        console.log("[v0] Polling for partner... attempt", pollCount)

        const status = await checkRoomStatus(result.roomId!)
        console.log("[v0] Room status:", JSON.stringify(status))

        if (status.matched && status.partnerId) {
          console.log("[v0] Partner found via polling:", status.partnerId)

          // Clear intervals
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          if (waitTimerRef.current) clearInterval(waitTimerRef.current)
          pollIntervalRef.current = null
          waitTimerRef.current = null

          // Use the correct room ID
          const finalRoomId = status.switchedRoom && status.roomId ? status.roomId : result.roomId!

          // Connect
          await connectToPartner(finalRoomId, status.partnerId, stream)
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
              onClick={startVideoCall}
              size="lg"
              className="bg-gradient-to-r from-primary to-pink-500 hover:opacity-90"
            >
              <Video className="w-5 h-5 mr-2" />
              Nova Videochamada
            </Button>
          </div>
        )}

        {/* SEARCHING/CONNECTING/CONNECTED STATES - Video UI */}
        {(videoState === "searching" || videoState === "connecting" || videoState === "connected") && (
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

            {/* Local video (bottom right) - ALWAYS VISIBLE */}
            <div className="absolute bottom-20 right-4 w-32 h-44 md:w-48 md:h-64 rounded-lg overflow-hidden border-2 border-primary shadow-xl bg-black z-20">
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

            {/* Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 md:gap-3 z-20">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleMute}
                className={`rounded-full ${isMuted ? "bg-destructive text-destructive-foreground" : "bg-background/80"}`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={toggleVideo}
                className={`rounded-full ${isVideoOff ? "bg-destructive text-destructive-foreground" : "bg-background/80"}`}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </Button>

              <Button variant="destructive" size="icon" onClick={endCall} className="rounded-full">
                <PhoneOff className="w-5 h-5" />
              </Button>

              <Button variant="outline" size="icon" onClick={skipToNext} className="rounded-full bg-background/80">
                <SkipForward className="w-5 h-5" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={handleLike}
                disabled={!currentPartner}
                className="rounded-full bg-pink-500/20 hover:bg-pink-500/30 text-pink-500"
              >
                <Heart className="w-5 h-5" />
              </Button>

              <Button variant="outline" size="icon" className="rounded-full bg-background/80">
                <Flag className="w-5 h-5" />
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
