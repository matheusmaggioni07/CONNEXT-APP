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
  AlertCircle,
  Flag,
} from "lucide-react"
import { createVideoRoom, findVideoPartner, checkCallLimit, endVideoRoom } from "@/app/actions/video"
import { likeUser } from "@/app/actions/likes"
import { updatePresence } from "@/app/actions/presence"
import { getProfileById } from "@/app/actions/profile"
import { useWebRTC } from "@/hooks/use-webrtc"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"
import Link from "next/link"

const MAX_WAIT_TIME = 60000

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
  const [waitTime, setWaitTime] = useState(0)
  const [likeLoading, setLikeLoading] = useState(false)
  const localVideoElementRef = useRef<HTMLVideoElement>(null)
  const remoteVideoElementRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<NodeJS.Timeout>()
  const pollIntervalRef = useRef<NodeJS.Timeout>()
  const waitTimerRef = useRef<NodeJS.Timeout>()
  const waitStartTimeRef = useRef<number>(0)

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id)
      }
    })
  }, [supabase])

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
    },
    onPartnerDisconnected: () => {
      handlePartnerDisconnected()
    },
  })

  useEffect(() => {
    if (webrtcLocalStream && localVideoElementRef.current) {
      localVideoElementRef.current.srcObject = webrtcLocalStream
      setLocalStream(webrtcLocalStream)
    }
  }, [webrtcLocalStream])

  useEffect(() => {
    if (webrtcRemoteStream && remoteVideoElementRef.current) {
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
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (waitTimerRef.current) clearInterval(waitTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (isInCall) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setCallDuration(0)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isInCall])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getConnectionStatusText = () => {
    if (isWaiting) return `Aguardando...`
    switch (connectionState) {
      case "connecting":
        return "Conectando..."
      case "connected":
        return "Conectado"
      case "disconnected":
        return "Desconectado"
      case "failed":
        return "Falha"
      default:
        return webrtcStatus
    }
  }

  const startSearching = async () => {
    if (!callStatus.canCall || !currentUserId) return

    setIsSearching(true)
    setNoUsersMessage(null)
    setWebrtcStatus("searching")

    const result = await createVideoRoom()

    if (result.error) {
      setIsSearching(false)
      setNoUsersMessage(result.error)
      return
    }

    if (result.room) setCurrentRoomId(result.room.id)

    if (result.joined && result.partnerId) {
      const partnerProfile = await getProfileById(result.partnerId)
      if (partnerProfile) {
        setCurrentPartner(partnerProfile)
        setIsSearching(false)
        setIsInCall(true)
        setIsWaiting(false)
        setTimeout(async () => {
          await startConnection()
        }, 500)
      }
    } else if (result.waiting && result.room) {
      setIsWaiting(true)
      setIsSearching(false)
      setWaitTime(0)
      waitStartTimeRef.current = Date.now()

      waitTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - waitStartTimeRef.current) / 1000)
        setWaitTime(elapsed)
      }, 1000)

      pollIntervalRef.current = setInterval(async () => {
        const elapsedTime = Date.now() - waitStartTimeRef.current
        if (elapsedTime > MAX_WAIT_TIME) {
          clearInterval(pollIntervalRef.current!)
          clearInterval(waitTimerRef.current!)
          setNoUsersMessage("Tempo limite excedido. Tente novamente!")
          endCall()
          return
        }

        const pollResult = await findVideoPartner(result.room.id)

        if (pollResult.partnerId) {
          clearInterval(pollIntervalRef.current!)
          clearInterval(waitTimerRef.current!)

          const partnerProfile = await getProfileById(pollResult.partnerId)
          if (partnerProfile) {
            setCurrentPartner(partnerProfile)
            setIsWaiting(false)
            setIsInCall(true)
            setTimeout(async () => {
              await startConnection()
            }, 500)
          }
        }
      }, 2000)
    }
  }

  const endCall = async () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    if (waitTimerRef.current) clearInterval(waitTimerRef.current)
    endConnection()
    if (currentRoomId) await endVideoRoom(currentRoomId)
    setIsInCall(false)
    setIsSearching(false)
    setIsWaiting(false)
    setCurrentPartner(null)
    setCurrentRoomId(null)
    setWebrtcStatus("idle")
    setLocalStream(null)
    setRemoteStream(null)
    setWaitTime(0)
    const status = await checkCallLimit()
    setCallStatus(status as { canCall: boolean; remaining: number; isPro?: boolean })
  }

  const skipPartner = async () => {
    await endCall()
    setTimeout(() => startSearching(), 500)
  }

  const likePartner = async () => {
    if (!currentPartner || likeLoading) return
    setLikeLoading(true)
    try {
      const result = await likeUser(currentPartner.id)
      if (result?.match) setShowMatchModal(true)
    } finally {
      setLikeLoading(false)
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

  const retryConnection = async () => {
    if (!currentPartner || !currentRoomId) return
    setWebrtcStatus("reconnecting")
    endConnection()
    setTimeout(async () => await startConnection(), 1000)
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-black">
      {/* Top bar with connection info */}
      {(isInCall || isWaiting || isSearching) && (
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur rounded-full">
              {connectionState === "connected" ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-yellow-500" />
              )}
              <span className="text-sm text-white">{getConnectionStatusText()}</span>
            </div>
            {isInCall && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/80 backdrop-blur rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-sm text-white font-medium">{formatDuration(callDuration)}</span>
              </div>
            )}
          </div>
          {!callStatus.isPro && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur rounded-full">
              <Video className="w-4 h-4 text-white/70" />
              <span className="text-sm text-white/70">{callStatus.remaining} restantes</span>
            </div>
          )}
        </div>
      )}

      {!isInCall && !isSearching && !isWaiting ? (
        /* Idle State */
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background">
          {noUsersMessage ? (
            <div className="text-center">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">Nenhum usuario disponivel</h2>
              <p className="text-muted-foreground mb-6">{noUsersMessage}</p>
              <Button onClick={() => setNoUsersMessage(null)}>Tentar novamente</Button>
            </div>
          ) : !callStatus.canCall && !callStatus.isPro ? (
            <div className="text-center max-w-md">
              <Crown className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">Limite atingido</h2>
              <p className="text-muted-foreground mb-6">Faca upgrade para Pro e tenha chamadas ilimitadas</p>
              <Link href="/dashboard/upgrade">
                <Button className="bg-gradient-to-r from-primary to-pink-500">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade Pro
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-center max-w-md">
              <div className="w-24 h-24 bg-gradient-to-r from-primary to-pink-500 rounded-full flex items-center justify-center mb-6 mx-auto">
                <Video className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Pronto para conectar?</h2>
              <p className="text-muted-foreground mb-6">
                Inicie uma videochamada e conheca profissionais em tempo real
              </p>
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-pink-500 text-white px-8"
                onClick={startSearching}
                disabled={!currentUserId}
              >
                <Video className="w-5 h-5 mr-2" />
                Iniciar Videochamada
              </Button>

              <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                <div>
                  <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Video HD</p>
                </div>
                <div>
                  <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Profissionais reais</p>
                </div>
                <div>
                  <Heart className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Match e WhatsApp</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : isSearching || isWaiting ? (
        /* Searching/Waiting State */
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background">
          <div className="relative mb-6">
            <div className="w-32 h-32 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <Users className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{isSearching ? "Procurando..." : "Aguardando..."}</h2>
          <p className="text-muted-foreground mb-2">
            {isSearching ? "Buscando usuarios disponiveis" : "Esperando outro usuario entrar"}
          </p>
          {isWaiting && (
            <>
              <p className="text-primary font-medium mb-4">{formatDuration(waitTime)}</p>
              <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-pink-500 transition-all"
                  style={{ width: `${Math.min((waitTime / 60) * 100, 100)}%` }}
                />
              </div>
            </>
          )}
          <Button variant="outline" className="mt-6 bg-transparent" onClick={endCall}>
            Cancelar
          </Button>
        </div>
      ) : (
        /* In Call - Ome.tv Style Layout */
        <div className="flex-1 flex flex-col relative">
          {/* Partner Video (Large - Top) */}
          <div className="flex-1 relative bg-black min-h-0">
            <video ref={remoteVideoElementRef} autoPlay playsInline className="w-full h-full object-cover" />

            {/* Partner Info Overlay */}
            {currentPartner && connectionState === "connected" && (
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-xl p-3 max-w-[200px]">
                <p className="font-semibold text-white text-sm truncate">{currentPartner.full_name}</p>
                <p className="text-white/70 text-xs truncate">{currentPartner.position || currentPartner.situation}</p>
                {currentPartner.location && <p className="text-white/50 text-xs mt-1">📍 {currentPartner.location}</p>}
              </div>
            )}

            {/* Connection States */}
            {connectionState !== "connected" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90">
                {connectionState === "failed" ? (
                  <>
                    <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                    <p className="text-white text-lg mb-2">Falha na conexao</p>
                    <Button
                      onClick={retryConnection}
                      variant="outline"
                      className="text-white border-white bg-transparent"
                    >
                      Tentar novamente
                    </Button>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
                    <p className="text-white text-lg">Conectando video...</p>
                    <p className="text-white/60 text-sm mt-2">Aguarde enquanto estabelecemos a conexao</p>
                  </>
                )}
              </div>
            )}

            {/* No remote stream yet */}
            {connectionState === "connected" && !remoteStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-white">Recebendo video do parceiro...</p>
              </div>
            )}
          </div>

          {/* Local Video (Small - Bottom Right) */}
          <div className="absolute bottom-24 right-4 w-28 h-40 md:w-36 md:h-48 bg-black rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl">
            <video
              ref={localVideoElementRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""} ${!isCameraOn ? "hidden" : ""}`}
            />
            {!isCameraOn && (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <VideoOff className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            {isCameraOn && !localStream && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            )}
            <Button
              size="sm"
              variant="secondary"
              className="absolute bottom-2 right-2 w-7 h-7 p-0 rounded-full bg-black/60"
              onClick={switchCamera}
            >
              <SwitchCamera className="w-3 h-3" />
            </Button>
          </div>

          {/* Bottom Controls - Ome.tv Style */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
            <div className="flex items-center justify-center gap-4">
              {/* Mic Toggle */}
              <Button
                size="lg"
                className={`w-14 h-14 rounded-full ${
                  isMicOn ? "bg-white/20 hover:bg-white/30" : "bg-red-500 hover:bg-red-600"
                }`}
                onClick={toggleMic}
              >
                {isMicOn ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-white" />}
              </Button>

              {/* Camera Toggle */}
              <Button
                size="lg"
                className={`w-14 h-14 rounded-full ${
                  isCameraOn ? "bg-white/20 hover:bg-white/30" : "bg-red-500 hover:bg-red-600"
                }`}
                onClick={toggleCamera}
              >
                {isCameraOn ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
              </Button>

              {/* End Call */}
              <Button size="lg" className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600" onClick={endCall}>
                <PhoneOff className="w-6 h-6 text-white" />
              </Button>

              {/* Skip / Next */}
              <Button size="lg" className="w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600" onClick={skipPartner}>
                <SkipForward className="w-6 h-6 text-white" />
              </Button>

              {/* Like */}
              <Button
                size="lg"
                className="w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 to-red-500 hover:opacity-90"
                onClick={likePartner}
                disabled={likeLoading}
              >
                {likeLoading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Heart className="w-6 h-6 text-white" />
                )}
              </Button>

              {/* Report */}
              <Button
                size="lg"
                className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30"
                onClick={() => alert("Denuncia enviada!")}
              >
                <Flag className="w-6 h-6 text-white" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Match Modal */}
      {showMatchModal && currentPartner && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-8 max-w-md w-full text-center border border-border animate-in zoom-in-95">
            <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-white fill-white" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-2">E um Match!</h2>
            <p className="text-muted-foreground mb-6">
              Voce e <strong>{currentPartner.full_name}</strong> deram match! Agora podem trocar WhatsApp.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowMatchModal(false)}>
                Continuar
              </Button>
              <Link href="/dashboard/matches" className="flex-1">
                <Button className="w-full bg-gradient-to-r from-primary to-pink-500">Ver Matches</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* WebRTC Error */}
      {webrtcError && (
        <div className="absolute bottom-24 left-4 right-4 p-4 bg-red-500/90 rounded-xl text-center">
          <p className="text-white font-medium">{webrtcError}</p>
          <Button size="sm" variant="outline" className="mt-2 text-white border-white bg-transparent" onClick={endCall}>
            Encerrar
          </Button>
        </div>
      )}
    </div>
  )
}
