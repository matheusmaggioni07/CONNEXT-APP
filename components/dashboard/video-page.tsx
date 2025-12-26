"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { VideoIcon, VideoOff, Mic, MicOff, PhoneOff, Heart, Loader2, Repeat2, SkipForward } from "lucide-react"
import { joinVideoQueue, checkRoomStatus, leaveVideoQueue } from "@/app/actions/video"
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

  const cleanup = useCallback(() => {
    console.log("[v0] Cleaning up resources")
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
    remoteStreamRef.current = null
    isConnectingRef.current = false
  }, [])

  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: isFrontCamera ? "user" : "environment" },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      console.log("[v0] Got local stream")
      return stream
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Câmera ou microfone negados"
      console.error("[v0] getUserMedia error:", errorMsg)
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
          console.log("[v0] Remote track received:", event.track.kind)
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
          await new Promise((resolve) => setTimeout(resolve, 500))
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
        }, 250)

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

      if (result.matched) {
        setPartner(result.partnerProfile)
        await setupWebRTC(result.roomId, true, result.partnerId || "")
        return
      }

      // Poll for match with simpler interval
      let waitCounter = 0
      const matchInterval = setInterval(async () => {
        waitCounter++
        setWaitTime(waitCounter)

        try {
          const status = await checkRoomStatus(result.roomId)
          if (status.status === "active" && status.partnerId && status.partnerId !== userId) {
            clearInterval(matchInterval)
            setPartner(status.partnerProfile)
            await setupWebRTC(result.roomId, false, status.partnerId)
          }
        } catch (err) {
          console.error("[v0] Status check error:", err)
        }
      }, 300)

      intervalsRef.current.push(matchInterval)
    } catch (err) {
      console.error("[v0] Start call error:", err)
      setErrorMsg("Erro ao iniciar chamada")
      setState("error")
    }
  }, [userId, setupWebRTC])

  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  // Idle state
  if (state === "idle") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Conecte-se com empreendedores ao vivo</h1>
            <p className="text-purple-200 text-lg">Faça conexões genuínas em tempo real</p>
          </div>
          <div className="bg-gradient-to-b from-purple-950 to-slate-900 rounded-3xl p-8 md:p-12 border border-purple-500/30 shadow-2xl">
            <Button
              onClick={handleStartCall}
              size="lg"
              className="w-full bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 hover:from-purple-700 hover:via-pink-600 hover:to-purple-700 text-white font-bold text-xl py-8 rounded-2xl transition-all duration-300"
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
          <Button onClick={() => setState("idle")} className="bg-purple-600 hover:bg-purple-700">
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
            <Loader2 className="w-16 h-16 animate-spin text-purple-500 mx-auto" />
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="relative bg-slate-950 rounded-2xl overflow-hidden border-2 border-purple-500/50 shadow-xl">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            <div className="absolute top-4 left-4 bg-slate-900/80 px-3 py-1 rounded-lg">
              <p className="text-white text-sm font-semibold">Você</p>
            </div>
          </div>

          <div className="relative bg-gradient-to-br from-purple-950 to-slate-950 rounded-2xl overflow-hidden border-2 border-pink-500/50 shadow-xl flex items-center justify-center">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            {state === "connected" && partner && (
              <div className="absolute top-4 left-4 bg-slate-900/80 px-3 py-1 rounded-lg">
                <p className="text-white text-sm font-semibold">{partner.full_name}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-4 flex-wrap">
          <Button
            onClick={toggleMute}
            size="lg"
            className={`rounded-full w-16 h-16 ${
              isMuted ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          <Button
            onClick={toggleVideo}
            size="lg"
            className={`rounded-full w-16 h-16 ${
              isVideoOff ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <VideoIcon className="w-6 h-6" />}
          </Button>

          <Button onClick={flipCamera} size="lg" className="rounded-full w-16 h-16 bg-purple-600 hover:bg-purple-700">
            <Repeat2 className="w-6 h-6" />
          </Button>

          <Button onClick={handleSkip} size="lg" className="rounded-full w-16 h-16 bg-yellow-600 hover:bg-yellow-700">
            <SkipForward className="w-6 h-6" />
          </Button>

          <Button
            onClick={() => likeUser(partner?.id || "")}
            size="lg"
            className="rounded-full w-16 h-16 bg-pink-600 hover:bg-pink-700"
          >
            <Heart className="w-6 h-6" />
          </Button>

          <Button onClick={handleHangup} size="lg" className="rounded-full w-16 h-16 bg-red-600 hover:bg-red-700">
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}
