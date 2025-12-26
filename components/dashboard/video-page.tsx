"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { VideoIcon, VideoOff, Mic, MicOff, PhoneOff, Heart, Loader2, SkipForward } from "lucide-react"
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

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  {
    urls: "turn:a.relay.metered.ca:80",
    username: "87e69d8f6e87d94518d47ac4",
    credential: "yWdZ8VhPV8dLGF0H",
  },
  {
    urls: "turn:a.relay.metered.ca:80?transport=tcp",
    username: "87e69d8f6e87d94518d47ac4",
    credential: "yWdZ8VhPV8dLGF0H",
  },
  {
    urls: "turn:a.relay.metered.ca:443",
    username: "87e69d8f6e87d94518d47ac4",
    credential: "yWdZ8VhPV8dLGF0H",
  },
  {
    urls: "turns:a.relay.metered.ca:443?transport=tcp",
    username: "87e69d8f6e87d94518d47ac4",
    credential: "yWdZ8VhPV8dLGF0H",
  },
]

export function VideoPage({ userId, userProfile }: VideoPageProps) {
  const supabase = createBrowserClient()
  const router = useRouter()

  const [state, setState] = useState<"idle" | "searching" | "connected" | "error">("idle")
  const [partner, setPartner] = useState<PartnerProfile | null>(null)
  const [waitTime, setWaitTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [showMatch, setShowMatch] = useState(false)

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
  }, [])

  const setupWebRTC = useCallback(
    async (roomId: string, isInitiator: boolean, partnerId: string) => {
      try {
        const localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        })

        localStreamRef.current = localStream

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
        peerRef.current = pc
        roomIdRef.current = roomId
        partnerIdRef.current = partnerId
        isInitiatorRef.current = isInitiator

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
      } catch (err) {
        console.error("[v0] WebRTC setup error:", err)
        setErrorMsg("Erro ao conectar câmera/microfone")
        setState("error")
      }
    },
    [userId, supabase],
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

  const handleStartCall = useCallback(async () => {
    setState("searching")
    setWaitTime(0)
    setErrorMsg("")
    setPartner(null)
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
        setPartner({
          id: result.partnerId,
          full_name: "Conectando...",
          avatar_url: "",
          city: "",
        })
        await setupWebRTC(result.roomId, false, result.partnerId)
        return
      }

      let pollCounter = 0
      const pollInterval = setInterval(async () => {
        pollCounter++
        setWaitTime((pollCounter * 50) / 1000)

        if (pollCounter > 2400) {
          clearInterval(pollInterval)
          setErrorMsg("Sem parceiros disponíveis")
          setState("error")
          await leaveVideoRoom(result.roomId)
          return
        }

        try {
          const { data: room } = await supabase.from("video_rooms").select("*").eq("id", result.roomId).single()

          if (room && room.status === "active" && room.user2_id && room.user2_id !== userId) {
            const partnerId = room.user1_id === userId ? room.user2_id : room.user1_id
            clearInterval(pollInterval)

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
        } catch (err) {
          console.error("[v0] Polling error:", err)
        }
      }, 50)

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

  if (state === "idle") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-4">
              Conecte-se com empreendedores
            </h1>
            <p className="text-purple-200 text-lg">Videochamadas profissionais instantâneas</p>
          </div>
          <Button
            onClick={handleStartCall}
            size="lg"
            className="w-full bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 hover:from-purple-700 hover:via-pink-600 hover:to-blue-700 text-white font-bold text-xl py-8 rounded-2xl"
          >
            Começar Chamada
          </Button>
        </div>
      </div>
    )
  }

  if (state === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 mb-6">
            <p className="text-red-400 text-lg mb-4">{errorMsg}</p>
          </div>
          <Button onClick={() => setState("idle")} className="bg-gradient-to-r from-purple-600 to-pink-600">
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  if (state === "searching") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-white text-2xl mb-2">Conectando...</p>
          <p className="text-purple-300 text-lg mb-8">{waitTime.toFixed(1)}s</p>
          <Button onClick={handleHangup} className="bg-red-600 hover:bg-red-700">
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-6">
      {showMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="text-7xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-bounce">
            ✨ MATCH! ✨
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto h-screen flex flex-col">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-white">Videochamada</h1>
          <p className="text-purple-300">Conecte-se com empreendedores</p>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 min-h-0">
          <div className="relative bg-slate-950 rounded-2xl overflow-hidden border-2 border-purple-500/30 shadow-xl">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            <div className="absolute top-3 left-3 bg-slate-900/90 px-4 py-2 rounded-lg">
              <p className="text-white text-sm font-semibold">Você</p>
            </div>
          </div>

          <div className="relative bg-slate-950 rounded-2xl overflow-hidden border-2 border-purple-500/30 shadow-xl flex items-center justify-center">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            {state === "connected" && partner && (
              <div className="absolute top-3 left-3 bg-slate-900/90 px-4 py-2 rounded-lg">
                <p className="text-white text-sm font-semibold">{partner.full_name}</p>
                {partner.city && <p className="text-purple-300 text-xs">{partner.city}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-4 flex-wrap">
          <Button
            onClick={toggleMute}
            size="lg"
            className={`rounded-full w-16 h-16 ${
              isMuted
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          <Button
            onClick={toggleVideo}
            size="lg"
            className={`rounded-full w-16 h-16 ${
              isVideoOff
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            }`}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <VideoIcon className="w-6 h-6" />}
          </Button>

          <Button
            onClick={handleSkip}
            size="lg"
            className="rounded-full w-16 h-16 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
          >
            <SkipForward className="w-6 h-6" />
          </Button>

          <Button
            onClick={() => partner?.id && likeUser(partner.id)}
            size="lg"
            className="rounded-full w-16 h-16 bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700"
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
