"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { VideoIcon, VideoOff, Mic, MicOff, PhoneOff, Heart, Loader2, Repeat2, SkipForward } from "lucide-react"
import { joinVideoQueue, leaveVideoQueue } from "@/app/actions/video"
import { likeUser } from "@/app/actions/user"

interface VideoPageProps {
  userId: string
  userProfile: { full_name: string; avatar_url?: string }
}

interface PartnerProfile {
  id: string
  full_name: string
  avatar_url: string
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function VideoPage({ userId, userProfile }: VideoPageProps) {
  const supabase = createBrowserClient()
  const router = useRouter()

  // State
  const [state, setState] = useState<"idle" | "searching" | "connected" | "error">("idle")
  const [partner, setPartner] = useState<PartnerProfile | null>(null)
  const [waitTime, setWaitTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [isFrontCamera, setIsFrontCamera] = useState(true)
  const [showMatchAnimation, setShowMatchAnimation] = useState(false)

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const roomIdRef = useRef<string>("")
  const partnerIdRef = useRef<string>("")
  const isInitiatorRef = useRef(false)
  const intervalsRef = useRef<NodeJS.Timeout[]>([])
  const isConnectingRef = useRef(false)

  const processedSignalsRef = useRef<Set<string>>(new Set())
  const processedCandidatesRef = useRef<Set<string>>(new Set())
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const cleanup = useCallback(() => {
    console.log("[v0] Cleaning up resources")
    intervalsRef.current.forEach(clearInterval)
    intervalsRef.current = []

    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }

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
    remoteStreamRef.current = null
    isConnectingRef.current = false
  }, [])

  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: isFrontCamera ? "user" : "environment" },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      console.log("[v0] ✅ Got local stream")
      return stream
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Câmera ou microfone negados"
      console.error("[v0] ❌ getUserMedia error:", errorMsg)
      setErrorMsg(`Erro de câmera: ${errorMsg}`)
      setState("error")
      return null
    }
  }, [isFrontCamera])

  const setupWebRTC = useCallback(
    async (roomId: string, isInitiator: boolean, partnerId: string) => {
      if (isConnectingRef.current) return
      isConnectingRef.current = true

      try {
        const localStream = await getLocalStream()
        if (!localStream) {
          setErrorMsg("Não foi possível acessar câmera/microfone")
          setState("error")
          isConnectingRef.current = false
          return
        }

        localStreamRef.current = localStream

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            {
              urls: "turn:a.relay.metered.ca:80",
              username: "87e69d8f6e87d94518d47ac4",
              credential: "yWdZ8VhPV8dLGF0H",
            },
            {
              urls: "turn:a.relay.metered.ca:443",
              username: "87e69d8f6e87d94518d47ac4",
              credential: "yWdZ8VhPV8dLGF0H",
            },
          ],
        })

        peerRef.current = pc
        roomIdRef.current = roomId
        partnerIdRef.current = partnerId
        isInitiatorRef.current = isInitiator

        // Add local tracks
        localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream
          localVideoRef.current.onloadedmetadata = () => {
            localVideoRef.current?.play().catch(() => {})
          }
        }

        // Handle remote tracks
        pc.ontrack = (event) => {
          console.log("[v0] 📹 Remote track received:", event.track.kind)
          if (event.streams?.[0]) {
            remoteStreamRef.current = event.streams[0]
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = event.streams[0]
              remoteVideoRef.current.onloadedmetadata = () => {
                remoteVideoRef.current?.play().catch(() => {})
              }
            }
          }
        }

        pc.onconnectionstatechange = () => {
          console.log("[v0] Connection state:", pc.connectionState)
          if (pc.connectionState === "connected" || pc.connectionState === "completed") {
            console.log("[v0] ✅ CONNECTED!")
            setShowMatchAnimation(true)
            setTimeout(() => setShowMatchAnimation(false), 1000)
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
          console.log("[v0] 🎯 Creating offer as initiator")
          try {
            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
            await pc.setLocalDescription(offer)
            await supabase.from("signaling").insert({
              room_id: roomId,
              from_user_id: userId,
              to_user_id: partnerId,
              type: "offer",
              sdp: JSON.stringify(offer),
            })
          } catch (err) {
            console.error("[v0] Offer error:", err)
          }
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
              .limit(10)

            if (signals) {
              for (const sig of signals) {
                if (processedSignalsRef.current.has(sig.id)) continue
                processedSignalsRef.current.add(sig.id)

                try {
                  if (sig.type === "offer" && !pc.remoteDescription) {
                    console.log("[v0] 📩 Received offer")
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
                    console.log("[v0] 📩 Received answer")
                    const answer = JSON.parse(sig.sdp)
                    await pc.setRemoteDescription(new RTCSessionDescription(answer))
                  }
                } catch (err) {
                  console.error("[v0] Signal error:", err)
                }
              }
            }

            const { data: ices } = await supabase
              .from("ice_candidates")
              .select("*")
              .eq("room_id", roomId)
              .eq("to_user_id", userId)
              .order("created_at", { ascending: true })
              .limit(50)

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
        }, 100)

        intervalsRef.current.push(signalingInterval)
      } catch (err) {
        console.error("[v0] WebRTC setup failed:", err)
        setErrorMsg("Erro ao conectar WebRTC")
        setState("error")
        isConnectingRef.current = false
      }
    },
    [userId, getLocalStream, supabase],
  )

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks()
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }, [isMuted])

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks()
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsVideoOff(!isVideoOff)
    }
  }, [isVideoOff])

  const flipCamera = useCallback(async () => {
    setIsFrontCamera(!isFrontCamera)
    cleanup()
    if (roomIdRef.current && partnerIdRef.current) {
      await setupWebRTC(roomIdRef.current, isInitiatorRef.current, partnerIdRef.current)
    }
  }, [isFrontCamera, cleanup, setupWebRTC])

  const handleSkip = useCallback(async () => {
    cleanup()
    await leaveVideoQueue(roomIdRef.current)
    setState("idle")
  }, [cleanup])

  const handleHangup = useCallback(async () => {
    cleanup()
    if (roomIdRef.current) {
      await leaveVideoQueue(roomIdRef.current)
    }
    setState("idle")
  }, [cleanup])

  const handleStartCall = useCallback(async () => {
    setState("searching")
    setWaitTime(0)
    setErrorMsg("")
    processedSignalsRef.current.clear()
    processedCandidatesRef.current.clear()

    try {
      const result = await joinVideoQueue()
      if (!result.success) {
        setErrorMsg(result.error || "Erro ao conectar")
        setState("error")
        return
      }

      roomIdRef.current = result.roomId

      if (result.matched && result.partnerId) {
        setPartner(result.partnerProfile)
        await setupWebRTC(result.roomId, true, result.partnerId)
        return
      }

      console.log("[v0] 🔄 Starting polling for partner - Room:", result.roomId)

      let pollCounter = 0
      const pollInterval = setInterval(async () => {
        pollCounter++
        setWaitTime(pollCounter)

        if (pollCounter > 180) {
          clearInterval(pollInterval)
          setErrorMsg("Nenhum parceiro disponível. Tente novamente.")
          setState("error")
          return
        }

        try {
          const { data: room } = await supabase
            .from("video_rooms")
            .select("id, user1_id, user2_id, status")
            .eq("id", result.roomId)
            .single()

          if (room) {
            console.log("[v0] Room state:", { status: room.status, user1: room.user1_id, user2: room.user2_id })

            if (room.status === "active" && room.user2_id && room.user2_id !== userId) {
              const partnerId = room.user1_id === userId ? room.user2_id : room.user1_id
              console.log("[v0] ✅ Partner found:", partnerId)
              clearInterval(pollInterval)

              const { data: partnerProfile } = await supabase
                .from("profiles")
                .select("id, full_name, avatar_url")
                .eq("id", partnerId)
                .single()

              setPartner(
                partnerProfile || {
                  id: partnerId,
                  full_name: "Conectando...",
                  avatar_url: "",
                },
              )

              await setupWebRTC(result.roomId, false, partnerId)
            }
          }
        } catch (err) {
          console.error("[v0] Poll error:", err)
        }
      }, 200)

      intervalsRef.current.push(pollInterval)
    } catch (err) {
      console.error("[v0] Start call error:", err)
      setErrorMsg("Erro ao iniciar chamada")
      setState("error")
    }
  }, [userId, setupWebRTC, supabase])

  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  // Idle state
  if (state === "idle") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div
            className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-600 via-purple-500 to-pink-600 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"
            style={{ animationDelay: "2s" }}
          ></div>
        </div>

        <div className="max-w-2xl w-full relative z-10">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-4">
              Videochamada Connext
            </h1>
            <p className="text-purple-200 text-lg">Conecte-se instantaneamente com profissionais</p>
          </div>
          <div className="bg-gradient-to-b from-purple-950/80 to-slate-900/80 rounded-3xl p-8 md:p-12 border border-purple-500/30 shadow-2xl backdrop-blur-sm">
            <Button
              onClick={handleStartCall}
              size="lg"
              className="w-full bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 hover:from-purple-700 hover:via-pink-600 hover:to-blue-700 text-white font-bold text-xl py-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-pink-500/50"
            >
              Começar Chamada
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (state === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 mb-6 max-w-md">
            <p className="text-red-400 text-lg mb-4">{errorMsg}</p>
          </div>
          <Button
            onClick={() => setState("idle")}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  // Searching state
  if (state === "searching") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mb-8">
            <Loader2 className="w-16 h-16 animate-spin bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 bg-clip-text text-transparent mx-auto" />
          </div>
          <p className="text-white text-2xl mb-2">Conectando...</p>
          <p className="text-purple-300">{formatTime(waitTime)}</p>
          <Button onClick={handleHangup} className="mt-8 bg-red-600 hover:bg-red-700">
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  // Connected state
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 relative">
      {showMatchAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="animate-pulse">
            <div className="text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              ✨ MATCH! ✨
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-500/20 to-purple-600/20 animate-pulse"></div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div
            className="relative bg-slate-950 rounded-2xl overflow-hidden border-2 border-transparent bg-clip-padding shadow-xl"
            style={{
              backgroundImage: "linear-gradient(#0f172a, #0f172a), linear-gradient(135deg, #a855f7, #ec4899, #3b82f6)",
            }}
          >
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover min-h-80" />
            <div className="absolute top-4 left-4 bg-slate-900/80 px-4 py-2 rounded-lg backdrop-blur-sm">
              <p className="text-white text-sm font-semibold">Você</p>
            </div>
          </div>

          <div
            className="relative bg-gradient-to-br from-purple-950 to-slate-950 rounded-2xl overflow-hidden border-2 border-transparent bg-clip-padding shadow-xl flex items-center justify-center"
            style={{
              backgroundImage:
                "linear-gradient(rgba(88, 28, 135, 0.5), rgba(15, 23, 42, 0.5)), linear-gradient(135deg, #3b82f6, #a855f7, #ec4899)",
            }}
          >
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover min-h-80" />
            {state === "connected" && partner && (
              <div className="absolute top-4 left-4 bg-slate-900/80 px-4 py-2 rounded-lg backdrop-blur-sm">
                <p className="text-white text-sm font-semibold">{partner.full_name}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-4 flex-wrap">
          <Button
            onClick={toggleMute}
            size="lg"
            className={`rounded-full w-16 h-16 transition-all ${
              isMuted
                ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/50"
                : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-600/50"
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          <Button
            onClick={toggleVideo}
            size="lg"
            className={`rounded-full w-16 h-16 transition-all ${
              isVideoOff
                ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/50"
                : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-600/50"
            }`}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <VideoIcon className="w-6 h-6" />}
          </Button>

          <Button
            onClick={flipCamera}
            size="lg"
            className="rounded-full w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-600/50"
          >
            <Repeat2 className="w-6 h-6" />
          </Button>

          <Button
            onClick={handleSkip}
            size="lg"
            className="rounded-full w-16 h-16 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 shadow-lg shadow-yellow-600/50"
          >
            <SkipForward className="w-6 h-6" />
          </Button>

          <Button
            onClick={() => likeUser(partner?.id || "")}
            size="lg"
            className="rounded-full w-16 h-16 bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 shadow-lg shadow-pink-600/50"
          >
            <Heart className="w-6 h-6" />
          </Button>

          <Button
            onClick={handleHangup}
            size="lg"
            className="rounded-full w-16 h-16 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/50"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}
