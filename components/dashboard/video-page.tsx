"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { VideoIcon, VideoOff, Mic, MicOff, PhoneOff, Heart, Loader2 } from "lucide-react"
import { joinVideoQueue, checkRoomStatus, leaveVideoQueue } from "@/app/actions/video"
import { likeUser } from "@/app/actions/user"

interface VideoPageProps {
  userId: string
  userProfile: {
    full_name: string
    avatar_url?: string
  }
}

interface PartnerProfile {
  id: string
  full_name: string
  avatar_url: string
}

export function VideoPage({ userId, userProfile }: VideoPageProps) {
  const supabase = createBrowserClient()
  const router = useRouter()

  // ESTADO
  const [state, setState] = useState<"idle" | "searching" | "connected" | "error">("idle")
  const [partner, setPartner] = useState<PartnerProfile | null>(null)
  const [waitTime, setWaitTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  // REFS
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const roomIdRef = useRef<string>("")
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isInitiatorRef = useRef(false)
  const processedSignalingRef = useRef<Set<string>>(new Set())
  const processedIceRef = useRef<Set<string>>(new Set())

  // GET LOCAL STREAM
  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      return stream
    } catch (err) {
      setErrorMsg("Permissão de câmera/microfone negada")
      setState("error")
      return null
    }
  }, [])

  // SETUP WEBRTC
  const setupWebRTC = useCallback(
    async (roomId: string, isInitiator: boolean) => {
      console.log("[v0] setupWebRTC", { roomId, isInitiator })

      // Get local stream
      const localStream = await getLocalStream()
      if (!localStream) return

      localStreamRef.current = localStream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream
      }

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
        ],
      })

      peerRef.current = pc

      // Add local tracks
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream)
      })

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log("[v0] Remote track received", event.track.kind)
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0]
        }
      }

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await supabase.from("ice_candidates").insert({
            room_id: roomId,
            from_user_id: userId,
            to_user_id: partner?.id,
            candidate: JSON.stringify(event.candidate.toJSON()),
          })
        }
      }

      // Handle connection state
      pc.onconnectionstatechange = () => {
        console.log("[v0] Connection state:", pc.connectionState)
        if (pc.connectionState === "connected") {
          setState("connected")
        } else if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          setState("error")
        }
      }

      // CREATE OFFER OR ANSWER
      if (isInitiator) {
        console.log("[v0] Creating offer")
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        await supabase.from("signaling").insert({
          room_id: roomId,
          from_user_id: userId,
          to_user_id: partner?.id,
          type: "offer",
          sdp: JSON.stringify(offer),
        })
        console.log("[v0] Offer saved to database")
      } else {
        console.log("[v0] Waiting for offer...")
      }

      // POLLING: Get signaling messages
      const signalingInterval = setInterval(async () => {
        if (!peerRef.current || peerRef.current.connectionState === "closed") {
          clearInterval(signalingInterval)
          return
        }

        try {
          const { data: signals } = await supabase
            .from("signaling")
            .select("*")
            .eq("room_id", roomId)
            .neq("from_user_id", userId)
            .order("created_at", { ascending: true })

          if (signals && signals.length > 0) {
            console.log("[v0] Found", signals.length, "signaling messages")
            for (const sig of signals) {
              if (processedSignalingRef.current.has(sig.id)) continue
              processedSignalingRef.current.add(sig.id)

              if (sig.type === "offer" && !isInitiator) {
                console.log("[v0] Processing offer - setting remote description")
                const offer = JSON.parse(sig.sdp)
                await pc.setRemoteDescription(new RTCSessionDescription(offer))

                const answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)

                console.log("[v0] Answer created and set as local description, saving to database")
                await supabase.from("signaling").insert({
                  room_id: roomId,
                  from_user_id: userId,
                  to_user_id: sig.from_user_id,
                  type: "answer",
                  sdp: JSON.stringify(answer),
                })
              } else if (sig.type === "answer" && isInitiator) {
                console.log("[v0] Processing answer - setting remote description")
                const answer = JSON.parse(sig.sdp)
                await pc.setRemoteDescription(new RTCSessionDescription(answer))
              }
            }
          }
        } catch (err) {
          console.error("[v0] Signaling error:", err)
        }
      }, 500)

      // POLLING: Get ICE candidates
      const iceInterval = setInterval(async () => {
        if (!peerRef.current || peerRef.current.connectionState === "closed") {
          clearInterval(iceInterval)
          return
        }

        try {
          const { data: ices } = await supabase
            .from("ice_candidates")
            .select("*")
            .eq("room_id", roomId)
            .neq("from_user_id", userId)
            .order("created_at", { ascending: true })

          if (ices && ices.length > 0) {
            for (const ice of ices) {
              if (processedIceRef.current.has(ice.id)) continue
              processedIceRef.current.add(ice.id)

              try {
                if (peerRef.current?.remoteDescription) {
                  const candidate = new RTCIceCandidate(JSON.parse(ice.candidate))
                  await peerRef.current.addIceCandidate(candidate)
                  console.log("[v0] ICE candidate added")
                }
              } catch (err) {
                console.error("[v0] Error adding ICE candidate:", err)
              }
            }
          }
        } catch (err) {
          console.error("[v0] ICE polling error:", err)
        }
      }, 500)

      return () => {
        clearInterval(signalingInterval)
        clearInterval(iceInterval)
      }
    },
    [userId, partner?.id, getLocalStream, supabase],
  )

  // START CALL - Join video queue
  const handleStartCall = useCallback(async () => {
    setState("searching")
    setWaitTime(0)
    setErrorMsg("")

    try {
      const result = await joinVideoQueue()
      if (!result.success) {
        setErrorMsg(result.error || "Erro ao conectar")
        setState("error")
        return
      }

      roomIdRef.current = result.roomId
      isInitiatorRef.current = !result.waiting

      if (result.matched) {
        console.log("[v0] Immediate match!")
        setPartner(result.partnerProfile)
        await setupWebRTC(result.roomId, !result.waiting)
        return
      }

      // POLLING: Check for match
      pollingRef.current = setInterval(async () => {
        try {
          const statusResult = await checkRoomStatus(result.roomId)

          if (statusResult.status === "active" && statusResult.partnerId) {
            console.log("[v0] Found partner!")
            clearInterval(pollingRef.current!)
            setPartner(statusResult.partnerProfile)
            isInitiatorRef.current = false
            await setupWebRTC(result.roomId, false)
          }
        } catch (err) {
          console.error("[v0] Polling error:", err)
        }
      }, 500)
    } catch (err) {
      console.error("[v0] Start call error:", err)
      setErrorMsg("Erro ao iniciar chamada")
      setState("error")
    }
  }, [setupWebRTC])

  // HANG UP
  const handleHangUp = useCallback(async () => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    if (peerRef.current) peerRef.current.close()
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
    }
    if (roomIdRef.current) {
      await leaveVideoQueue(roomIdRef.current)
    }

    setState("idle")
    setPartner(null)
    setWaitTime(0)
    processedSignalingRef.current.clear()
    processedIceRef.current.clear()
  }, [])

  // LIKE
  const handleLike = useCallback(async () => {
    if (partner) {
      await likeUser(partner.id)
    }
  }, [partner])

  // WAIT TIME DISPLAY
  useEffect(() => {
    if (state !== "searching") return

    const interval = setInterval(() => {
      setWaitTime((t) => t + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [state])

  // RENDER
  if (state === "idle") {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-2xl font-bold">Videochamada</h1>
        <p className="text-gray-400">Conecte-se instantaneamente com profissionais</p>
        <Button
          onClick={handleStartCall}
          className="bg-gradient-to-r from-pink-500 to-blue-500 text-white px-8 py-6 text-lg rounded-full"
        >
          Começar Chamada
        </Button>
      </div>
    )
  }

  if (state === "error") {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-red-500 text-lg font-bold">{errorMsg || "Erro na conexão"}</p>
        <Button onClick={() => setState("idle")} variant="outline">
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="h-screen bg-black flex flex-col">
      {/* VÍDEOS */}
      <div className="flex-1 grid grid-cols-2 gap-2 p-2">
        {/* Local Video */}
        <div className="bg-gray-900 rounded-lg overflow-hidden relative">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>

        {/* Remote Video */}
        <div className="bg-gray-900 rounded-lg overflow-hidden relative">
          {state === "searching" ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-pink-500" />
                <p className="text-white">Conectando...</p>
                <p className="text-gray-400 text-sm mt-2">{formatTime(waitTime)}</p>
              </div>
            </div>
          ) : (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {partner && (
                <div className="absolute top-4 left-4 bg-black/60 px-3 py-2 rounded-lg">
                  <p className="text-white font-bold">{partner.full_name}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* BOTÕES */}
      {state === "connected" && (
        <div className="bg-black border-t border-gray-700 p-4 flex justify-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="rounded-full w-12 h-12 bg-gray-800 hover:bg-gray-700"
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsVideoOff(!isVideoOff)}
            className="rounded-full w-12 h-12 bg-gray-800 hover:bg-gray-700"
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <VideoIcon className="w-6 h-6" />}
          </Button>

          <Button onClick={handleLike} className="rounded-full w-12 h-12 bg-pink-500 hover:bg-pink-600">
            <Heart className="w-6 h-6" />
          </Button>

          <Button onClick={handleHangUp} className="rounded-full w-12 h-12 bg-red-500 hover:bg-red-600">
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      )}

      {state === "searching" && (
        <div className="bg-black border-t border-gray-700 p-4 flex justify-center">
          <Button onClick={handleHangUp} className="bg-red-500 hover:bg-red-600 px-8">
            Cancelar
          </Button>
        </div>
      )}
    </div>
  )
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}
