"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { VideoIcon, VideoOff, Mic, MicOff, PhoneOff, Heart, Loader2, SkipForward, RotateCcw } from "lucide-react"
import { joinVideoQueue, leaveVideoRoom } from "@/app/actions/video"
import { likeUser } from "@/app/actions/user"

interface VideoPageProps {
  userId: string
  userProfile: { full_name: string; avatar_url?: string }
}

interface PartnerProfile {
  id: string
  full_name: string
  avatar_url: string
  city: string
}

const DEFAULT_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
]

const REACTIONS = [
  { emoji: "❤️", label: "Gostar" },
  { emoji: "😂", label: "Rir" },
  { emoji: "👍", label: "Legal" },
  { emoji: "😊", label: "Smiley" },
  { emoji: "👌", label: "Ok" },
  { emoji: "😍", label: "Apaixonado" },
]

export function VideoPage({ userId, userProfile }: VideoPageProps) {
  const supabase = createBrowserClient()
  const router = useRouter()

  const [state, setState] = useState<"idle" | "searching" | "connected" | "error">("idle")
  const [partner, setPartner] = useState<PartnerProfile | null>(null)
  const [waitTime, setWaitTime] = useState(0)
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [showMatch, setShowMatch] = useState(false)
  const [showReaction, setShowReaction] = useState<string | null>(null)
  const [reactionPosition, setReactionPosition] = useState({ x: 0, y: 0 })
  const [connectionQuality, setConnectionQuality] = useState<"excellent" | "good" | "poor">("good")

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const roomIdRef = useRef<string>("")
  const partnerIdRef = useRef<string>("")
  const isInitiatorRef = useRef(false)
  const intervalsRef = useRef<NodeJS.Timeout[]>([])
  const processedSignalsRef = useRef<Set<string>>(new Set())
  const processedCandidatesRef = useRef<Set<string>>(new Set())
  const iceServersRef = useRef(DEFAULT_ICE_SERVERS)
  const connectionStartTimeRef = useRef<number>(0)

  const monitorConnectionQuality = useCallback(async () => {
    if (!peerRef.current) return

    try {
      const stats = await peerRef.current.getStats()
      let inboundRtpStats = null
      let outboundRtpStats = null

      stats.forEach((report) => {
        if (report.type === "inbound-rtp" && report.kind === "video") {
          inboundRtpStats = report
        }
        if (report.type === "outbound-rtp" && report.kind === "video") {
          outboundRtpStats = report
        }
      })

      if (inboundRtpStats && outboundRtpStats) {
        const packetsLost = inboundRtpStats.packetsLost || 0
        const packetsReceived = inboundRtpStats.packetsReceived || 1
        const packetLossPercent = (packetsLost / (packetsLost + packetsReceived)) * 100

        if (packetLossPercent < 2) {
          setConnectionQuality("excellent")
        } else if (packetLossPercent < 5) {
          setConnectionQuality("good")
        } else {
          setConnectionQuality("poor")
        }
      }
    } catch (err) {
      console.error("[v0] Error monitoring connection:", err)
    }
  }, [])

  const cleanup = useCallback(() => {
    intervalsRef.current.forEach(clearInterval)
    intervalsRef.current = []

    if (peerRef.current) {
      peerRef.current.close()
      peerRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null

    connectionStartTimeRef.current = 0
  }, [])

  const setupWebRTC = useCallback(
    async (roomId: string, isInitiator: boolean, partnerId: string) => {
      try {
        console.log("[v0] Fetching ICE servers from /api/turn-credentials")
        try {
          const turnResponse = await fetch("/api/turn-credentials")
          if (turnResponse.ok) {
            const turnData = await turnResponse.json()
            iceServersRef.current = turnData.iceServers || DEFAULT_ICE_SERVERS
            console.log("[v0] ICE servers loaded:", iceServersRef.current.length, "servers")
          }
        } catch (err) {
          console.error("[v0] Failed to fetch TURN credentials, using defaults:", err)
          iceServersRef.current = DEFAULT_ICE_SERVERS
        }

        const localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        })

        localStreamRef.current = localStream

        const pc = new RTCPeerConnection({ iceServers: iceServersRef.current })
        peerRef.current = pc
        roomIdRef.current = roomId
        partnerIdRef.current = partnerId
        isInitiatorRef.current = isInitiator
        connectionStartTimeRef.current = Date.now()

        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream
        }

        pc.ontrack = (event) => {
          if (event.streams?.[0]) {
            remoteStreamRef.current = event.streams[0]
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = event.streams[0]
            }
          }
        }

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected" || pc.connectionState === "completed") {
            setShowMatch(true)
            setTimeout(() => setShowMatch(false), 1500)
            setState("connected")
          } else if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
            setErrorMsg("Conexão perdida")
            setState("error")
          }
        }

        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            try {
              await supabase.from("ice_candidates").insert({
                room_id: roomId,
                from_user_id: userId,
                to_user_id: partnerId,
                candidate: JSON.stringify(event.candidate.toJSON()),
              })
            } catch (err) {
              console.error("[v0] ICE save error:", err)
            }
          }
        }

        if (isInitiator) {
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
          await pc.setLocalDescription(offer)
          await supabase.from("signaling").insert({
            room_id: roomId,
            from_user_id: userId,
            to_user_id: partnerId,
            type: "offer",
            sdp: JSON.stringify(offer),
          })
        }

        const signalingInterval = setInterval(async () => {
          if (!pc || pc.connectionState === "closed") {
            clearInterval(signalingInterval)
            return
          }

          try {
            const { data: signals } = await supabase
              .from("signaling")
              .select("*")
              .eq("room_id", roomId)
              .eq("to_user_id", userId)
              .order("created_at", { ascending: true })

            if (signals) {
              for (const sig of signals) {
                if (processedSignalsRef.current.has(sig.id)) continue
                processedSignalsRef.current.add(sig.id)

                try {
                  if (sig.type === "offer" && !pc.remoteDescription) {
                    const offer = JSON.parse(sig.sdp)
                    await pc.setRemoteDescription(new RTCSessionDescription(offer))
                    const answer = await pc.createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
                    await pc.setLocalDescription(answer)
                    await supabase.from("signaling").insert({
                      room_id: roomId,
                      from_user_id: userId,
                      to_user_id: sig.from_user_id,
                      type: "answer",
                      sdp: JSON.stringify(answer),
                    })
                  } else if (sig.type === "answer" && !pc.remoteDescription) {
                    const answer = JSON.parse(sig.sdp)
                    await pc.setRemoteDescription(new RTCSessionDescription(answer))
                  }
                } catch (err) {
                  console.error("[v0] Signal process error:", err)
                }
              }
            }

            const { data: ices } = await supabase
              .from("ice_candidates")
              .select("*")
              .eq("room_id", roomId)
              .eq("to_user_id", userId)
              .order("created_at", { ascending: true })

            if (ices) {
              for (const ice of ices) {
                if (processedCandidatesRef.current.has(ice.id)) continue
                processedCandidatesRef.current.add(ice.id)

                try {
                  const candidate = new RTCIceCandidate(JSON.parse(ice.candidate))
                  await pc.addIceCandidate(candidate)
                } catch (err) {
                  // Ignore invalid candidates
                }
              }
            }
          } catch (err) {
            console.error("[v0] Polling error:", err)
          }
        }, 50)

        intervalsRef.current.push(signalingInterval)

        const qualityInterval = setInterval(monitorConnectionQuality, 2000)
        intervalsRef.current.push(qualityInterval)
      } catch (err) {
        console.error("[v0] WebRTC setup error:", err)
        setErrorMsg("Erro ao conectar câmera/microfone")
        setState("error")
      }
    },
    [userId, supabase, monitorConnectionQuality],
  )

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }, [isMuted])

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsVideoOff(!isVideoOff)
    }
  }, [isVideoOff])

  const handleSkip = useCallback(async () => {
    cleanup()
    if (roomIdRef.current) {
      await leaveVideoRoom(roomIdRef.current)
    }
    setState("idle")
  }, [cleanup])

  const handleHangup = useCallback(async () => {
    cleanup()
    if (roomIdRef.current) {
      await leaveVideoRoom(roomIdRef.current)
    }
    setState("idle")
  }, [cleanup])

  const handleReaction = useCallback((emoji: string) => {
    setShowReaction(emoji)
    setReactionPosition({
      x: Math.random() * 200 - 100,
      y: Math.random() * 200 - 100,
    })
    setTimeout(() => setShowReaction(null), 1500)
  }, [])

  const handleStartCall = useCallback(async () => {
    setState("searching")
    setWaitTime(0)
    setErrorMsg("")
    setPartner(null)
    setCallDuration(0)
    processedSignalsRef.current.clear()
    processedCandidatesRef.current.clear()

    try {
      console.log("[v0] Starting video call...")

      const result = await joinVideoQueue()

      if (!result.success) {
        setErrorMsg(result.error || "Erro ao conectar")
        setState("error")
        cleanup()
        return
      }

      roomIdRef.current = result.roomId

      if (result.matched && result.partnerId) {
        console.log("[v0] Immediately matched! Partner ID:", result.partnerId)
        setPartner({
          id: result.partnerId,
          full_name: "Conectando...",
          avatar_url: "",
          city: "",
        })

        await setupWebRTC(result.roomId, false, result.partnerId)
        return
      }

      console.log("[v0] Waiting for match in room:", result.roomId)

      const matchSubscription = supabase
        .channel(`video-match-${result.roomId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "video_rooms",
            filter: `id=eq.${result.roomId}`,
          },
          async (payload: any) => {
            const room = payload.new
            if (room?.status === "active" && room?.user2_id && room?.user2_id !== userId) {
              const partnerId = room.user1_id === userId ? room.user2_id : room.user1_id
              matchSubscription.unsubscribe()

              console.log("[v0] Match found! Partner ID:", partnerId)

              const { data: partnerProfile } = await supabase
                .from("profiles")
                .select("id, full_name, avatar_url, city")
                .eq("id", partnerId)
                .single()

              setPartner(
                partnerProfile || {
                  id: partnerId,
                  full_name: "Conectando...",
                  avatar_url: "",
                  city: "",
                },
              )

              await setupWebRTC(result.roomId, true, partnerId)
            }
          },
        )
        .subscribe()

      const timeoutId = setTimeout(() => {
        matchSubscription.unsubscribe()
        setErrorMsg("Sem parceiros disponíveis. Tente novamente mais tarde.")
        setState("error")
        leaveVideoRoom(result.roomId)
        cleanup()
      }, 120000)

      intervalsRef.current.push(timeoutId as any)
    } catch (err) {
      console.error("[v0] Start call error:", err)
      setErrorMsg("Erro ao iniciar chamada")
      setState("error")
    }
  }, [userId, setupWebRTC, supabase, cleanup])

  useEffect(() => {
    if (state !== "connected") return

    const durationInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - connectionStartTimeRef.current) / 1000)
      const minutes = Math.floor(elapsed / 60)
      const seconds = elapsed % 60
      setCallDuration(minutes * 100 + seconds) // Format as MM:SS for display
    }, 1000)

    return () => clearInterval(durationInterval)
  }, [state])

  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  if (state === "idle") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-12">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-[#ec4899] via-[#ff6b35] to-[#ec4899] bg-clip-text text-transparent mb-4">
              Connext
            </h1>
            <p className="text-[#ec4899]/80 text-xl">Conecte-se com empreendedores via videochamada</p>
          </div>
          <Button
            onClick={handleStartCall}
            size="lg"
            className="w-full bg-gradient-to-r from-[#ec4899] to-[#ff6b35] hover:from-[#d946a6] hover:to-[#e55a1f] text-white font-bold text-xl py-8 rounded-2xl"
          >
            Começar Videochamada
          </Button>
        </div>
      </div>
    )
  }

  if (state === "error") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 mb-6">
            <p className="text-red-400 text-lg mb-4">{errorMsg}</p>
          </div>
          <Button onClick={() => setState("idle")} className="bg-gradient-to-r from-[#ec4899] to-[#ff6b35]">
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  if (state === "searching") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-[#ec4899] mx-auto mb-4" />
          <p className="text-white text-2xl mb-2">Conectando...</p>
          <p className="text-[#ec4899]/80 text-lg mb-8">{waitTime.toFixed(1)}s</p>
          <Button onClick={handleHangup} className="bg-red-600 hover:bg-red-700">
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {showMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="text-6xl font-bold bg-gradient-to-r from-[#ec4899] via-[#ff6b35] to-[#ec4899] bg-clip-text text-transparent animate-bounce">
            ✨ MATCH! ✨
          </div>
        </div>
      )}

      {showReaction && (
        <div
          className="fixed z-40 text-6xl animate-bounce pointer-events-none"
          style={{
            top: "50%",
            left: "50%",
            transform: `translate(calc(-50% + ${reactionPosition.x}px), calc(-50% + ${reactionPosition.y}px))`,
          }}
        >
          {showReaction}
        </div>
      )}

      {/* Header - Status Bar */}
      <div className="bg-black/80 border-b border-[#ec4899]/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              connectionQuality === "excellent"
                ? "bg-green-500"
                : connectionQuality === "good"
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
          />
          <span className="text-white text-sm font-medium">
            {String(Math.floor(callDuration / 100)).padStart(2, "0")}:{String(callDuration % 100).padStart(2, "0")}
          </span>
        </div>

        <h1 className="text-white font-bold text-lg">Connext</h1>

        <Button size="sm" variant="ghost" onClick={handleSkip} className="text-white hover:text-[#ec4899]">
          <RotateCcw className="w-5 h-5" />
        </Button>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative">
        {/* Remote Video - Full screen */}
        <div className="w-full h-full relative bg-black">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

          {/* Partner Info - Top Left */}
          {partner && (
            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur rounded-lg px-4 py-2">
              <p className="text-white font-semibold text-sm">{partner.full_name}</p>
              {partner.city && (
                <p className="text-[#ec4899]/80 text-xs flex items-center gap-1">
                  <span>🇧🇷</span>
                  {partner.city}
                </p>
              )}
            </div>
          )}

          {/* Local Video - Bottom Right (Picture in Picture) */}
          <div className="absolute bottom-4 right-4 w-28 h-40 rounded-lg overflow-hidden border-2 border-[#ec4899]/50 shadow-lg">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="bg-black/90 border-t border-[#ec4899]/20 p-4">
        {/* Reactions Row */}
        <div className="flex justify-center gap-2 mb-4 overflow-x-auto pb-2">
          {REACTIONS.map((r) => (
            <Button
              key={r.emoji}
              onClick={() => handleReaction(r.emoji)}
              size="sm"
              className="bg-slate-800 hover:bg-[#ec4899]/30 text-lg px-3 py-1 rounded-lg whitespace-nowrap"
              title={r.label}
            >
              {r.emoji}
            </Button>
          ))}
        </div>

        {/* Main Controls Row */}
        <div className="flex justify-center gap-3 flex-wrap">
          <Button
            onClick={toggleMute}
            size="lg"
            className={`rounded-full w-16 h-16 flex items-center justify-center ${
              isMuted
                ? "bg-red-600/80 hover:bg-red-700"
                : "bg-gradient-to-r from-[#ec4899] to-[#ff6b35] hover:from-[#d946a6] hover:to-[#e55a1f]"
            }`}
            title={isMuted ? "Ativar microfone" : "Desativar microfone"}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          <Button
            onClick={toggleVideo}
            size="lg"
            className={`rounded-full w-16 h-16 flex items-center justify-center ${
              isVideoOff
                ? "bg-red-600/80 hover:bg-red-700"
                : "bg-gradient-to-r from-[#a855f7] to-[#a855f7] hover:from-[#9333ea] hover:to-[#9333ea]"
            }`}
            title={isVideoOff ? "Ativar câmera" : "Desativar câmera"}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <VideoIcon className="w-6 h-6" />}
          </Button>

          <Button
            onClick={handleSkip}
            size="lg"
            className="rounded-full w-16 h-16 flex items-center justify-center bg-yellow-600/80 hover:bg-yellow-700"
            title="Próximo"
          >
            <SkipForward className="w-6 h-6" />
          </Button>

          <Button
            onClick={() => partner?.id && likeUser(partner.id)}
            size="lg"
            className="rounded-full w-16 h-16 flex items-center justify-center bg-gradient-to-r from-[#ec4899] to-[#ff6b35] hover:from-[#d946a6] hover:to-[#e55a1f]"
            title="Gostar"
          >
            <Heart className="w-6 h-6" />
          </Button>

          <Button
            onClick={handleHangup}
            size="lg"
            className="rounded-full w-16 h-16 flex items-center justify-center bg-red-600 hover:bg-red-700"
            title="Desligar"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}
