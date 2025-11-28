"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  SkipForward,
  Heart,
  Users,
  Sparkles,
  Crown,
  SwitchCamera,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react"
import { createVideoRoom, findVideoPartner, checkCallLimit, endVideoRoom } from "@/app/actions/video"
import { likeUser } from "@/app/actions/likes"
import { updatePresence } from "@/app/actions/presence"
import { getProfileById } from "@/app/actions/profile"
import { useWebRTC } from "@/hooks/use-webrtc"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"
import Link from "next/link"

export function VideoPage() {
  const [isInCall, setIsInCall] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [currentPartner, setCurrentPartner] = useState<Profile | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
  const [callDuration, setCallDuration] = useState(0)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [noUsersMessage, setNoUsersMessage] = useState<string | null>(null)
  const [callStatus, setCallStatus] = useState<{ canCall: boolean; remaining: number; isPro?: boolean }>({
    canCall: true,
    remaining: 5,
  })
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [webrtcStatus, setWebrtcStatus] = useState<string>("idle")
  const [isWaiting, setIsWaiting] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const localVideoElementRef = useRef<HTMLVideoElement>(null)
  const remoteVideoElementRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<NodeJS.Timeout>()
  const pollIntervalRef = useRef<NodeJS.Timeout>()

  const supabase = createClient()

  // Get current user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id)
      }
    })
  }, [supabase])

  // WebRTC hook - only active when in a call with a partner
  const {
    localVideoRef,
    remoteVideoRef,
    localStream: webrtcLocalStream,
    remoteStream: webrtcRemoteStream,
    connectionState,
    error: webrtcError,
    startConnection,
    endConnection,
    toggleCamera: webrtcToggleCamera,
    toggleMic: webrtcToggleMic,
    switchCamera: webrtcSwitchCamera,
  } = useWebRTC({
    roomId: currentRoomId || "",
    userId: currentUserId || "",
    partnerId: currentPartner?.id || "",
    onConnectionStateChange: (state) => {
      setWebrtcStatus(state)
      console.log("[v0] WebRTC connection state changed:", state)
    },
    onPartnerDisconnected: () => {
      handlePartnerDisconnected()
    },
  })

  useEffect(() => {
    if (webrtcLocalStream && localVideoElementRef.current) {
      console.log("[v0] Setting local stream to video element")
      localVideoElementRef.current.srcObject = webrtcLocalStream
      setLocalStream(webrtcLocalStream)
    }
  }, [webrtcLocalStream])

  useEffect(() => {
    if (webrtcRemoteStream && remoteVideoElementRef.current) {
      console.log("[v0] Setting remote stream to video element")
      remoteVideoElementRef.current.srcObject = webrtcRemoteStream
      setRemoteStream(webrtcRemoteStream)
    }
  }, [webrtcRemoteStream])

  const handlePartnerDisconnected = useCallback(() => {
    setNoUsersMessage("O parceiro desconectou da chamada.")
    endCall()
  }, [])

  useEffect(() => {
    checkCallLimit().then((status) => {
      setCallStatus(status as { canCall: boolean; remaining: number; isPro?: boolean })
    })

    updatePresence()
    const presenceInterval = setInterval(() => {
      updatePresence()
    }, 30000)

    return () => {
      clearInterval(presenceInterval)
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isInCall) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      setCallDuration(0)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isInCall])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getConnectionStatusText = () => {
    if (isWaiting) return "Aguardando parceiro..."
    switch (connectionState) {
      case "connecting":
        return "Conectando vídeo..."
      case "connected":
        return "Conectado"
      case "disconnected":
        return "Desconectado"
      case "failed":
        return "Falha na conexão"
      default:
        return webrtcStatus
    }
  }

  const startSearching = async () => {
    if (!callStatus.canCall || !currentUserId) return

    setIsSearching(true)
    setNoUsersMessage(null)
    setWebrtcStatus("searching")

    // Create or join a video room using the queue system
    const result = await createVideoRoom()

    if (result.error) {
      setIsSearching(false)
      setNoUsersMessage(result.error)
      return
    }

    if (result.room) {
      setCurrentRoomId(result.room.id)
    }

    // If we joined an existing room, we have a partner immediately
    if (result.joined && result.partnerId) {
      const partnerProfile = await getProfileById(result.partnerId)
      if (partnerProfile) {
        setCurrentPartner(partnerProfile)
        setIsSearching(false)
        setIsInCall(true)
        setIsWaiting(false)

        // Start WebRTC connection
        setTimeout(async () => {
          console.log("[v0] Starting WebRTC connection (joined existing room)")
          await startConnection()
        }, 500)
      }
    }
    // If we created a waiting room, poll for a partner
    else if (result.waiting && result.room) {
      setIsWaiting(true)
      setIsSearching(false)

      // Start polling for partner
      pollIntervalRef.current = setInterval(async () => {
        const pollResult = await findVideoPartner(result.room.id)

        if (pollResult.partnerId) {
          // Partner found!
          clearInterval(pollIntervalRef.current!)

          const partnerProfile = await getProfileById(pollResult.partnerId)
          if (partnerProfile) {
            setCurrentPartner(partnerProfile)
            setIsWaiting(false)
            setIsInCall(true)

            // Start WebRTC connection
            setTimeout(async () => {
              console.log("[v0] Starting WebRTC connection (partner joined our room)")
              await startConnection()
            }, 500)
          }
        }
      }, 2000) // Poll every 2 seconds
    }
  }

  const endCall = async () => {
    // Clear polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    // End WebRTC connection
    endConnection()

    // End room in database
    if (currentRoomId) {
      await endVideoRoom(currentRoomId)
    }

    // Reset state
    setIsInCall(false)
    setIsSearching(false)
    setIsWaiting(false)
    setCurrentPartner(null)
    setCurrentRoomId(null)
    setWebrtcStatus("idle")
    setLocalStream(null)
    setRemoteStream(null)

    // Refresh call status
    const status = await checkCallLimit()
    setCallStatus(status as { canCall: boolean; remaining: number; isPro?: boolean })
  }

  const skipPartner = async () => {
    await endCall()
    // Automatically start searching again
    setTimeout(() => {
      startSearching()
    }, 500)
  }

  const likePartner = async () => {
    if (!currentPartner) return

    const result = await likeUser(currentPartner.id)

    if (result?.match) {
      setShowMatchModal(true)
    }
  }

  const toggleCamera = () => {
    const newState = !isCameraOn
    setIsCameraOn(newState)
    webrtcToggleCamera(newState)
  }

  const toggleMic = () => {
    const newState = !isMicOn
    setIsMicOn(newState)
    webrtcToggleMic(newState)
  }

  const switchCamera = async () => {
    const newMode = facingMode === "user" ? "environment" : "user"
    setFacingMode(newMode)
    await webrtcSwitchCamera(newMode)
  }

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Videochamada</h1>
          <p className="text-muted-foreground">Conecte-se com profissionais em tempo real</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          {(isInCall || isWaiting) && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-full">
              {connectionState === "connected" ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-yellow-500" />
              )}
              <span className="text-sm text-muted-foreground">{getConnectionStatusText()}</span>
            </div>
          )}
          {/* Call Timer */}
          {isInCall && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 text-destructive rounded-full">
              <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
              <span className="text-sm font-medium">{formatDuration(callDuration)}</span>
            </div>
          )}
          {/* Call Limit */}
          {!callStatus.isPro && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-full">
              <Video className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{callStatus.remaining} chamadas restantes</span>
            </div>
          )}
        </div>
      </div>

      {/* Upgrade Banner */}
      {!callStatus.canCall && !callStatus.isPro && (
        <div className="bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Limite de chamadas atingido</h3>
                <p className="text-sm text-muted-foreground">Faça upgrade para Pro e tenha chamadas ilimitadas</p>
              </div>
            </div>
            <Link href="/dashboard/upgrade">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade Pro
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* No Users Message */}
      {noUsersMessage && !isSearching && !isInCall && (
        <div className="bg-secondary/50 border border-border rounded-xl p-6 mb-6 text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Nenhum profissional disponível</h2>
          <p className="text-muted-foreground mb-4">{noUsersMessage}</p>
          <Button variant="outline" onClick={() => setNoUsersMessage(null)} className="border-border text-foreground">
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Video Area */}
      <div className="relative bg-card rounded-2xl border border-border overflow-hidden aspect-video">
        {!isInCall && !isSearching && !isWaiting ? (
          /* Idle State */
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Video className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Pronto para conectar?</h2>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Clique no botão abaixo para iniciar uma videochamada real com um profissional.
            </p>
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={startSearching}
              disabled={!callStatus.canCall || !currentUserId}
            >
              <Video className="w-5 h-5 mr-2" />
              Iniciar Videochamada
            </Button>
          </div>
        ) : isSearching ? (
          /* Searching State */
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <Users className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Procurando profissionais...</h2>
            <p className="text-muted-foreground mb-6">Buscando um usuário real disponível</p>
            <Button
              variant="outline"
              className="border-border text-foreground bg-transparent"
              onClick={() => {
                setIsSearching(false)
                endCall()
              }}
            >
              Cancelar
            </Button>
          </div>
        ) : isWaiting ? (
          /* Waiting for Partner State */
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <Users className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Aguardando outro usuário...</h2>
            <p className="text-muted-foreground mb-2">Você está na fila de espera</p>
            <p className="text-sm text-muted-foreground mb-6">
              Assim que outro usuário entrar, vocês serão conectados automaticamente
            </p>
            <Button variant="outline" className="border-border text-foreground bg-transparent" onClick={endCall}>
              Cancelar
            </Button>
          </div>
        ) : (
          /* In Call State - Real WebRTC Video */
          <>
            {/* Remote Video (Partner) - Real video stream */}
            <div className="w-full h-full bg-black relative">
              <video
                ref={remoteVideoElementRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                style={{ backgroundColor: "black" }}
              />
              {/* Show connecting state or fallback */}
              {connectionState !== "connected" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                  <p className="text-white">
                    {connectionState === "connecting" ? "Conectando vídeo..." : "Aguardando conexão do parceiro..."}
                  </p>
                  <p className="text-white/60 text-sm mt-2">Estado: {connectionState}</p>
                </div>
              )}
              {/* Show when connected but no remote stream yet */}
              {connectionState === "connected" && !remoteStream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                  <p className="text-white">Recebendo vídeo do parceiro...</p>
                </div>
              )}
            </div>

            {/* Partner Info */}
            <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm rounded-xl p-4">
              <h3 className="font-semibold text-foreground">{currentPartner?.full_name}</h3>
              <p className="text-sm text-muted-foreground">
                {currentPartner?.position} • {currentPartner?.company}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {currentPartner?.interests?.slice(0, 2).map((interest) => (
                  <span key={interest} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                    {interest}
                  </span>
                ))}
              </div>
            </div>

            {/* Local Video (Self) - Real video stream */}
            <div className="absolute bottom-20 right-4 w-48 h-36 bg-black rounded-xl overflow-hidden border-2 border-border shadow-lg">
              <video
                ref={localVideoElementRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""} ${!isCameraOn ? "hidden" : ""}`}
                style={{ backgroundColor: "black" }}
              />
              {!isCameraOn && (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <VideoOff className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              {/* Show loading if no local stream */}
              {isCameraOn && !localStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              )}
              <Button
                size="sm"
                variant="secondary"
                className="absolute bottom-2 right-2 w-8 h-8 p-0 rounded-full bg-background/80"
                onClick={switchCamera}
              >
                <SwitchCamera className="w-4 h-4" />
              </Button>
            </div>

            {/* Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <Button
                size="lg"
                variant="outline"
                className={`w-14 h-14 rounded-full ${
                  isMicOn
                    ? "border-border text-foreground bg-background/80"
                    : "bg-destructive text-destructive-foreground border-destructive"
                }`}
                onClick={toggleMic}
              >
                {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </Button>

              <Button
                size="lg"
                variant="outline"
                className={`w-14 h-14 rounded-full ${
                  isCameraOn
                    ? "border-border text-foreground bg-background/80"
                    : "bg-destructive text-destructive-foreground border-destructive"
                }`}
                onClick={toggleCamera}
              >
                {isCameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="w-14 h-14 rounded-full border-border text-foreground bg-background/80"
                onClick={switchCamera}
              >
                <SwitchCamera className="w-6 h-6" />
              </Button>

              {/* End call */}
              <Button
                size="lg"
                className="w-14 h-14 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={endCall}
              >
                <PhoneOff className="w-6 h-6" />
              </Button>

              {/* Skip */}
              <Button
                size="lg"
                variant="outline"
                className="w-14 h-14 rounded-full border-border text-foreground hover:bg-secondary bg-background/80"
                onClick={skipPartner}
              >
                <SkipForward className="w-6 h-6" />
              </Button>

              {/* Like */}
              <Button
                size="lg"
                className="w-14 h-14 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={likePartner}
              >
                <Heart className="w-6 h-6" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* WebRTC Error */}
      {webrtcError && (
        <div className="mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-center">
          <p className="text-destructive">{webrtcError}</p>
        </div>
      )}

      {/* Tips */}
      {!isInCall && !isSearching && !isWaiting && callStatus.canCall && !noUsersMessage && (
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          {[
            {
              icon: Video,
              title: "Vídeo em tempo real",
              description: "Videochamada real com WebRTC peer-to-peer",
            },
            {
              icon: Sparkles,
              title: "Seja profissional",
              description: "Apresente-se e fale sobre seus objetivos",
            },
            {
              icon: Heart,
              title: "Match mútuo",
              description: "Curta para conectar no WhatsApp após a chamada",
            },
          ].map((tip, index) => (
            <div key={index} className="bg-card rounded-xl border border-border p-4 flex items-start gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <tip.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{tip.title}</h3>
                <p className="text-sm text-muted-foreground">{tip.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Match Modal */}
      {showMatchModal && currentPartner && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-8 max-w-md w-full text-center border border-border">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-primary fill-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Match!</h2>
            <p className="text-muted-foreground mb-6">
              Você e {currentPartner.full_name} deram match! Agora vocês podem se conectar no WhatsApp.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-border text-foreground bg-transparent"
                onClick={() => setShowMatchModal(false)}
              >
                Continuar
              </Button>
              <Link href="/dashboard/matches" className="flex-1">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Ver Matches</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
