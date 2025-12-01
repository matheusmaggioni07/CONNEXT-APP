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
import { joinVideoQueue, checkRoomStatus, leaveVideoQueue, endVideoRoom, checkCallLimit } from "@/app/actions/video"
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
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id)
      }
    })

    checkCallLimit().then((result) => {
      if (result.remaining !== undefined) {
        setCallsRemaining(result.remaining === Number.POSITIVE_INFINITY ? -1 : result.remaining)
      }
    })
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
        await localVideoRef.current.play().catch(() => {})
      }

      return stream
    } catch (err: any) {
      console.error("[v0] Error getting media:", err)

      if (err.name === "NotAllowedError") {
        setErrorMessage("Por favor, permita o acesso à câmera e microfone.")
      } else if (err.name === "NotFoundError") {
        setErrorMessage("Câmera ou microfone não encontrado.")
      } else {
        setErrorMessage("Erro ao acessar câmera/microfone.")
      }

      return null
    }
  }

  const createPeerConnection = (stream: MediaStream, partnerId: string) => {
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

      if (event.streams[0] && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
        remoteVideoRef.current.muted = false

        remoteVideoRef.current.play().catch((e) => {
          console.log("[v0] Remote video play error:", e)
        })

        setVideoState("connected")
        setConnectionStatus("Conectado!")
      }
    }

    // Handle ICE candidates
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

    pc.onconnectionstatechange = () => {
      console.log("[v0] Connection state:", pc.connectionState)

      if (pc.connectionState === "connected") {
        setConnectionStatus("Conectado!")
        setVideoState("connected")
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setConnectionStatus("Conexão perdida")
        handlePartnerDisconnected()
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log("[v0] ICE state:", pc.iceConnectionState)

      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setConnectionStatus("Conectado!")
      }
    }

    peerConnectionRef.current = pc
    return pc
  }

  const setupSignaling = async (roomId: string, partnerId: string, pc: RTCPeerConnection) => {
    console.log("[v0] Setting up signaling for room:", roomId)

    isInitiatorRef.current = currentUserId! < partnerId
    console.log("[v0] I am initiator:", isInitiatorRef.current)

    const channel = supabase.channel(`webrtc-${roomId}`, {
      config: { broadcast: { self: false } },
    })

    channel
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.from === partnerId) {
          console.log("[v0] Received offer from partner")

          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
            hasRemoteDescriptionRef.current = true

            // Add pending candidates
            for (const candidate of pendingCandidatesRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
            }
            pendingCandidatesRef.current = []

            // Create answer
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)

            channel.send({
              type: "broadcast",
              event: "answer",
              payload: { sdp: answer, from: currentUserId },
            })
            console.log("[v0] Sent answer")
          } catch (err) {
            console.error("[v0] Error handling offer:", err)
          }
        }
      })
      .on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (payload.from === partnerId) {
          console.log("[v0] Received answer from partner")

          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
            hasRemoteDescriptionRef.current = true

            // Add pending candidates
            for (const candidate of pendingCandidatesRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
            }
            pendingCandidatesRef.current = []
          } catch (err) {
            console.error("[v0] Error handling answer:", err)
          }
        }
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        if (payload.from === partnerId) {
          console.log("[v0] Received ICE candidate")

          if (hasRemoteDescriptionRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {})
          } else {
            pendingCandidatesRef.current.push(payload.candidate)
          }
        }
      })
      .on("broadcast", { event: "end-call" }, ({ payload }) => {
        if (payload.from === partnerId) {
          console.log("[v0] Partner ended call")
          handlePartnerDisconnected()
        }
      })
      .on("broadcast", { event: "ready" }, async ({ payload }) => {
        if (payload.from === partnerId && isInitiatorRef.current && !offerSentRef.current) {
          console.log("[v0] Partner ready, creating offer...")
          offerSentRef.current = true

          try {
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            })
            await pc.setLocalDescription(offer)

            channel.send({
              type: "broadcast",
              event: "offer",
              payload: { sdp: offer, from: currentUserId },
            })
            console.log("[v0] Sent offer")
          } catch (err) {
            console.error("[v0] Error creating offer:", err)
          }
        }
      })

    await channel.subscribe(async (status) => {
      console.log("[v0] Signaling channel status:", status)

      if (status === "SUBSCRIBED") {
        // Notify partner we're ready
        channel.send({
          type: "broadcast",
          event: "ready",
          payload: { from: currentUserId },
        })

        // If initiator, wait a bit then send offer
        if (isInitiatorRef.current) {
          setTimeout(async () => {
            if (!offerSentRef.current && peerConnectionRef.current) {
              console.log("[v0] Timeout: creating offer anyway")
              offerSentRef.current = true

              try {
                const offer = await pc.createOffer({
                  offerToReceiveAudio: true,
                  offerToReceiveVideo: true,
                })
                await pc.setLocalDescription(offer)

                channel.send({
                  type: "broadcast",
                  event: "offer",
                  payload: { sdp: offer, from: currentUserId },
                })
              } catch (err) {
                console.error("[v0] Error creating offer:", err)
              }
            }
          }, 1500)
        }
      }
    })

    channelRef.current = channel
  }

  const startVideoCall = async () => {
    if (!currentUserId) return

    setErrorMessage(null)
    setVideoState("searching")
    setWaitTime(0)
    setConnectionStatus("Procurando...")
    hasRemoteDescriptionRef.current = false
    pendingCandidatesRef.current = []
    offerSentRef.current = false

    // Get camera first
    const stream = await getLocalStream()
    if (!stream) {
      setVideoState("idle")
      return
    }

    // Join queue
    const result = await joinVideoQueue()

    if (result.error) {
      setErrorMessage(result.error)
      setVideoState("idle")
      return
    }

    setCurrentRoomId(result.roomId!)

    if (result.matched && result.partnerId) {
      // Matched immediately!
      console.log("[v0] Matched immediately with:", result.partnerId)
      await connectToPartner(result.roomId!, result.partnerId, stream)
    } else {
      // Waiting for partner - start timer and polling
      console.log("[v0] Waiting for partner in room:", result.roomId)

      waitTimerRef.current = setInterval(() => {
        setWaitTime((prev) => prev + 1)
      }, 1000)

      // Subscribe to room changes for real-time updates
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
          async (payload) => {
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
        const status = await checkRoomStatus(result.roomId!)

        if (status.matched && status.partnerId) {
          console.log("[v0] Partner found via polling:", status.partnerId)

          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          if (waitTimerRef.current) clearInterval(waitTimerRef.current)

          const roomId = status.switchedRoom ? status.roomId! : result.roomId!
          setCurrentRoomId(roomId)

          await connectToPartner(roomId, status.partnerId, stream)
        }
      }, 1500)
    }
  }

  const connectToPartner = async (roomId: string, partnerId: string, stream: MediaStream) => {
    console.log("[v0] Connecting to partner:", partnerId)

    setVideoState("connecting")
    setConnectionStatus("Conectando...")

    // Get partner profile
    const partnerProfile = await getProfileById(partnerId)
    if (partnerProfile) {
      setCurrentPartner(partnerProfile)
    }

    // Create peer connection
    const pc = createPeerConnection(stream, partnerId)

    // Setup signaling
    await setupSignaling(roomId, partnerId, pc)
  }

  const handlePartnerDisconnected = () => {
    console.log("[v0] Partner disconnected")
    setVideoState("ended")
    setConnectionStatus("Parceiro desconectou")
    setCurrentPartner(null)

    // Cleanup peer connection but keep local stream
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }

  const skipToNext = async () => {
    console.log("[v0] Skipping to next partner")

    // Notify current partner
    if (channelRef.current && currentUserId) {
      channelRef.current.send({
        type: "broadcast",
        event: "end-call",
        payload: { from: currentUserId },
      })
    }

    // End current room
    if (currentRoomId) {
      await endVideoRoom(currentRoomId)
    }

    // Cleanup
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

    setCurrentPartner(null)
    setCurrentRoomId(null)
    hasRemoteDescriptionRef.current = false
    pendingCandidatesRef.current = []
    offerSentRef.current = false

    // Start new search
    if (localStreamRef.current) {
      setVideoState("searching")
      setConnectionStatus("Procurando...")
      setWaitTime(0)

      const result = await joinVideoQueue()

      if (result.error) {
        setErrorMessage(result.error)
        setVideoState("idle")
        return
      }

      setCurrentRoomId(result.roomId!)

      if (result.matched && result.partnerId) {
        await connectToPartner(result.roomId!, result.partnerId, localStreamRef.current)
      } else {
        // Setup waiting again
        waitTimerRef.current = setInterval(() => {
          setWaitTime((prev) => prev + 1)
        }, 1000)

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
            async (payload) => {
              if (payload.new.status === "active" && payload.new.user2_id) {
                const partnerId = payload.new.user1_id === currentUserId ? payload.new.user2_id : payload.new.user1_id

                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
                if (waitTimerRef.current) clearInterval(waitTimerRef.current)

                await connectToPartner(result.roomId!, partnerId, localStreamRef.current!)
              }
            },
          )
          .subscribe()

        roomChannelRef.current = roomChannel

        pollIntervalRef.current = setInterval(async () => {
          const status = await checkRoomStatus(result.roomId!)

          if (status.matched && status.partnerId) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
            if (waitTimerRef.current) clearInterval(waitTimerRef.current)

            const roomId = status.switchedRoom ? status.roomId! : result.roomId!
            setCurrentRoomId(roomId)

            await connectToPartner(roomId, status.partnerId, localStreamRef.current!)
          }
        }, 1500)
      }
    }
  }

  const endCall = async () => {
    console.log("[v0] Ending call")

    // Notify partner
    if (channelRef.current && currentUserId) {
      channelRef.current.send({
        type: "broadcast",
        event: "end-call",
        payload: { from: currentUserId },
      })
    }

    if (currentRoomId) {
      await leaveVideoQueue(currentRoomId)
    }

    cleanup()

    setVideoState("idle")
    setCurrentPartner(null)
    setCurrentRoomId(null)
    setWaitTime(0)
    setConnectionStatus("Iniciando...")
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

  const handleLike = async () => {
    if (currentPartner) {
      await likeUser(currentPartner.id)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          {videoState !== "idle" && (
            <Badge
              variant="outline"
              className={`${
                videoState === "connected"
                  ? "border-green-500 text-green-500"
                  : videoState === "searching" || videoState === "connecting"
                    ? "border-orange-500 text-orange-500"
                    : "border-muted-foreground text-muted-foreground"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full mr-2 ${
                  videoState === "connected"
                    ? "bg-green-500"
                    : videoState === "searching" || videoState === "connecting"
                      ? "bg-orange-500 animate-pulse"
                      : "bg-muted-foreground"
                }`}
              />
              {videoState === "searching" && `Procurando... ${formatTime(waitTime)}`}
              {videoState === "connecting" && "Conectando..."}
              {videoState === "connected" && "Conectado"}
              {videoState === "ended" && "Desconectado"}
            </Badge>
          )}
        </div>

        {callsRemaining !== null && callsRemaining !== -1 && (
          <Badge variant="secondary">
            <Video className="w-3 h-3 mr-1" />
            {callsRemaining} restantes
          </Badge>
        )}
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative bg-black">
        {/* Idle State */}
        {videoState === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center mb-6">
              <Camera className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Pronto para conectar?</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Inicie uma videochamada e conheça profissionais em tempo real
            </p>

            {errorMessage && (
              <div className="mb-4 p-3 bg-destructive/20 border border-destructive rounded-lg text-destructive text-sm">
                {errorMessage}
              </div>
            )}

            <Button
              size="lg"
              onClick={startVideoCall}
              className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] hover:opacity-90"
            >
              <Video className="w-5 h-5 mr-2" />
              Iniciar Videochamada
            </Button>

            <div className="flex gap-6 mt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[hsl(var(--accent))]" />
                Video HD
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[hsl(var(--primary))]" />
                Profissionais reais
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-[hsl(var(--accent))]" />
                Match e WhatsApp
              </div>
            </div>
          </div>
        )}

        {/* Searching State */}
        {videoState === "searching" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Loader2 className="w-16 h-16 text-[hsl(var(--primary))] animate-spin mb-4" />
            <p className="text-white text-lg">Procurando profissionais...</p>
            <p className="text-muted-foreground mt-2">Tempo: {formatTime(waitTime)}</p>
          </div>
        )}

        {/* Connecting State */}
        {videoState === "connecting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Loader2 className="w-16 h-16 text-green-500 animate-spin mb-4" />
            <p className="text-white text-lg">Conectando com {currentPartner?.full_name || "parceiro"}...</p>
            <p className="text-muted-foreground mt-2">{connectionStatus}</p>
          </div>
        )}

        {/* Ended State */}
        {videoState === "ended" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-white text-lg mb-4">Chamada encerrada</p>
            <div className="flex gap-3">
              <Button onClick={skipToNext} variant="default">
                <RefreshCw className="w-4 h-4 mr-2" />
                Próximo
              </Button>
              <Button onClick={endCall} variant="outline">
                Sair
              </Button>
            </div>
          </div>
        )}

        {/* Remote Video (Partner) - Full screen background */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 w-full h-full object-cover ${
            videoState === "connected" ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Partner Info Overlay */}
        {videoState === "connected" && currentPartner && (
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border-2 border-white">
                <AvatarImage src={currentPartner.avatar_url || ""} />
                <AvatarFallback className="bg-[hsl(var(--primary))] text-white">
                  {currentPartner.full_name?.substring(0, 2).toUpperCase() || "??"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white font-medium">{currentPartner.full_name}</p>
                <p className="text-white/70 text-sm">
                  {currentPartner.position} @ {currentPartner.company}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Local Video (You) - Small overlay */}
        <div
          className={`absolute bottom-24 right-4 w-32 h-44 md:w-48 md:h-64 rounded-xl overflow-hidden border-2 border-white/30 shadow-xl ${
            videoState === "idle" ? "hidden" : ""
          }`}
        >
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
          {isVideoOff && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-white/50" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      {videoState !== "idle" && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className={`rounded-full w-12 h-12 ${isMuted ? "bg-red-500/20 border-red-500" : "bg-white/10 border-white/30"}`}
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="w-5 h-5 text-red-500" /> : <Mic className="w-5 h-5 text-white" />}
            </Button>

            <Button
              variant="outline"
              size="icon"
              className={`rounded-full w-12 h-12 ${isVideoOff ? "bg-red-500/20 border-red-500" : "bg-white/10 border-white/30"}`}
              onClick={toggleVideo}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5 text-red-500" /> : <Video className="w-5 h-5 text-white" />}
            </Button>

            <Button variant="destructive" size="icon" className="rounded-full w-14 h-14" onClick={endCall}>
              <PhoneOff className="w-6 h-6" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="rounded-full w-12 h-12 bg-orange-500/20 border-orange-500"
              onClick={skipToNext}
              disabled={videoState === "searching"}
            >
              <SkipForward className="w-5 h-5 text-orange-500" />
            </Button>

            {videoState === "connected" && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full w-12 h-12 bg-pink-500/20 border-pink-500"
                  onClick={handleLike}
                >
                  <Heart className="w-5 h-5 text-pink-500" />
                </Button>

                <Button variant="outline" size="icon" className="rounded-full w-12 h-12 bg-white/10 border-white/30">
                  <Flag className="w-5 h-5 text-white" />
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  )
}

export { VideoPage }
export default VideoPage
