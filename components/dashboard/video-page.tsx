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

  const [state, setState] = useState<"idle" | "searching" | "connected" | "error">("idle")
  const [partner, setPartner] = useState<PartnerProfile | null>(null)
  const [waitTime, setWaitTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [isFrontCamera, setIsFrontCamera] = useState(true)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const roomIdRef = useRef<string>("")
  const partnerIdRef = useRef<string>("")
  const isInitiatorRef = useRef(false)

  // Cleanup intervals
  const intervalsRef = useRef<NodeJS.Timeout[]>([])

  const clearAllIntervals = () => {
    intervalsRef.current.forEach((interval) => clearInterval(interval))
    intervalsRef.current = []
  }

  const getLocalStream = useCallback(async (facingMode: "user" | "environment" = "user") => {
    try {
      console.log("[v0] 🎥 Requesting camera/mic with facingMode:", facingMode)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode,
        },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      console.log("[v0] ✅ Local stream obtained")
      return stream
    } catch (err) {
      console.error("[v0] ❌ getUserMedia error:", err)
      setErrorMsg("Permissão de câmera/microfone negada. Verifique as configurações do navegador.")
      setState("error")
      return null
    }
  }, [])

  const setupWebRTC = useCallback(
    async (roomId: string, isInitiator: boolean) => {
      console.log("[v0] 🔗 Setting up WebRTC", { roomId, isInitiator, partnerId: partnerIdRef.current })

      // Get local stream
      const localStream = await getLocalStream(isFrontCamera ? "user" : "environment")
      if (!localStream) return

      localStreamRef.current = localStream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream
        await localVideoRef.current.play().catch(() => {})
        console.log("[v0] ✅ Local video playing")
      }

      const pc = new RTCPeerConnection({
        iceServers: [
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
            urls: "turn:a.relay.metered.ca:443",
            username: "87e69d8f6e87d94518d47ac4",
            credential: "yWdZ8VhPV8dLGF0H",
          },
        ],
      })

      peerRef.current = pc

      // Add local tracks
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream)
        console.log("[v0] 📤 Added local", track.kind, "track")
      })

      pc.ontrack = (event) => {
        console.log("[v0] 📥 Remote track received:", event.track.kind)
        if (event.streams?.[0]) {
          remoteStreamRef.current = event.streams[0]
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0]
            remoteVideoRef.current.play().catch(() => {})
            console.log("[v0] ✅ Remote video playing")
          }
        }
      }

      // Save ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          try {
            await supabase.from("ice_candidates").insert({
              room_id: roomId,
              from_user_id: userId,
              to_user_id: partnerIdRef.current,
              candidate: JSON.stringify(event.candidate.toJSON()),
            })
          } catch (err) {
            console.error("[v0] ICE save error:", err)
          }
        }
      }

      pc.onconnectionstatechange = () => {
        console.log("[v0] Connection state:", pc.connectionState)
        if (pc.connectionState === "connected") {
          console.log("[v0] ✅ WebRTC CONNECTED!")
          setState("connected")
        } else if (pc.connectionState === "failed") {
          console.error("[v0] Connection failed")
          setState("error")
          setErrorMsg("Conexão falhou")
        }
      }

      if (isInitiator) {
        setTimeout(async () => {
          try {
            console.log("[v0] 📤 Creating offer...")
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            })
            await pc.setLocalDescription(offer)
            await supabase.from("signaling").insert({
              room_id: roomId,
              from_user_id: userId,
              to_user_id: partnerIdRef.current,
              type: "offer",
              sdp: JSON.stringify(offer),
            })
            console.log("[v0] ✅ Offer sent")
          } catch (err) {
            console.error("[v0] Offer error:", err)
          }
        }, 300)
      }

      const signalingInterval = setInterval(async () => {
        if (pc.connectionState === "closed") {
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

          if (!signals) return

          for (const sig of signals) {
            try {
              if (sig.type === "offer" && pc.remoteDescription === null) {
                console.log("[v0] 📥 Processing offer...")
                const offer = JSON.parse(sig.sdp)
                await pc.setRemoteDescription(new RTCSessionDescription(offer))

                if (!isInitiator) {
                  const answer = await pc.createAnswer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true,
                  })
                  await pc.setLocalDescription(answer)
                  await supabase.from("signaling").insert({
                    room_id: roomId,
                    from_user_id: userId,
                    to_user_id: sig.from_user_id,
                    type: "answer",
                    sdp: JSON.stringify(answer),
                  })
                  console.log("[v0] ✅ Answer sent")
                }

                // Delete processed offer
                await supabase.from("signaling").delete().eq("id", sig.id)
              } else if (sig.type === "answer" && isInitiator && pc.remoteDescription === null) {
                console.log("[v0] 📥 Processing answer...")
                const answer = JSON.parse(sig.sdp)
                await pc.setRemoteDescription(new RTCSessionDescription(answer))
                await supabase.from("signaling").delete().eq("id", sig.id)
              }
            } catch (err) {
              console.error("[v0] Signaling error:", err)
            }
          }
        } catch (err) {
          console.error("[v0] Signaling poll error:", err)
        }
      }, 300) // was 500ms, now 300ms

      const iceInterval = setInterval(async () => {
        if (pc.connectionState === "closed" || !pc.remoteDescription) {
          return
        }

        try {
          const { data: ices } = await supabase
            .from("ice_candidates")
            .select("*")
            .eq("room_id", roomId)
            .eq("to_user_id", userId)
            .order("created_at", { ascending: true })

          if (!ices) return

          for (const ice of ices) {
            try {
              const candidate = new RTCIceCandidate(JSON.parse(ice.candidate))
              await pc.addIceCandidate(candidate)
              await supabase.from("ice_candidates").delete().eq("id", ice.id)
            } catch (err) {
              console.error("[v0] ICE error:", err)
            }
          }
        } catch (err) {
          console.error("[v0] ICE poll error:", err)
        }
      }, 300) // was 500ms, now 300ms

      intervalsRef.current.push(signalingInterval, iceInterval)
    },
    [userId, getLocalStream, supabase, isFrontCamera],
  )

  const handleStartCall = useCallback(async () => {
    console.log("[v0] 🚀 Starting call...")
    setState("searching")
    setWaitTime(0)
    clearAllIntervals()

    try {
      const result = await joinVideoQueue()
      console.log("[v0] Join result:", result)

      if (!result.success) {
        setErrorMsg(result.error || "Erro ao conectar")
        setState("error")
        return
      }

      roomIdRef.current = result.roomId
      partnerIdRef.current = result.partnerId || ""
      isInitiatorRef.current = !result.waiting

      if (result.matched) {
        console.log("[v0] ✅ Immediate match!")
        setPartner(result.partnerProfile)
        await setupWebRTC(result.roomId, true)
        return
      }

      // Poll for match
      const interval = setInterval(async () => {
        try {
          const status = await checkRoomStatus(result.roomId)
          console.log("[v0] 📊 Status check:", status.status)

          if (status.status === "active" && status.partnerId) {
            clearInterval(interval)
            console.log("[v0] ✅ Partner found!")
            setPartner(status.partnerProfile)
            partnerIdRef.current = status.partnerId
            await setupWebRTC(result.roomId, false)
          }
        } catch (err) {
          console.error("[v0] Poll error:", err)
        }
      }, 200) // was 500ms, now 200ms

      intervalsRef.current.push(interval)
    } catch (err) {
      console.error("[v0] Start call error:", err)
      setErrorMsg("Erro ao iniciar chamada")
      setState("error")
    }
  }, [setupWebRTC])

  const handleHangUp = useCallback(async () => {
    console.log("[v0] 📞 Hanging up...")
    clearAllIntervals()

    if (peerRef.current) {
      peerRef.current.close()
    }

    localStreamRef.current?.getTracks().forEach((t) => t.stop())

    if (roomIdRef.current) {
      await leaveVideoQueue(roomIdRef.current)
    }

    setState("idle")
    setPartner(null)
    setWaitTime(0)
  }, [])

  const handleSkip = useCallback(async () => {
    await handleHangUp()
  }, [handleHangUp])

  const handleLike = useCallback(async () => {
    if (partner) {
      await likeUser(partner.id)
      console.log("[v0] ❤️ User liked")
    }
  }, [partner])

  const handleToggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const enabled = !isMuted
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = enabled))
      setIsMuted(!isMuted)
      console.log("[v0] 🔊 Mic:", enabled ? "on" : "off")
    }
  }, [isMuted])

  const handleToggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const enabled = !isVideoOff
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = enabled))
      setIsVideoOff(!isVideoOff)
      console.log("[v0] 🎥 Camera:", enabled ? "on" : "off")
    }
  }, [isVideoOff])

  const handleFlipCamera = useCallback(async () => {
    if (state !== "connected") return
    console.log("[v0] 🔄 Flipping camera...")
    setIsFrontCamera(!isFrontCamera)

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
    }

    const newStream = await getLocalStream(!isFrontCamera ? "user" : "environment")
    if (newStream && peerRef.current) {
      localStreamRef.current = newStream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream
        await localVideoRef.current.play().catch(() => {})
      }

      const videoTrack = newStream.getVideoTracks()[0]
      const sender = peerRef.current.getSenders().find((s) => s.track?.kind === "video")
      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack)
        console.log("[v0] ✅ Camera flipped")
      }
    }
  }, [isFrontCamera, getLocalStream, state])

  // Wait timer
  useEffect(() => {
    if (state !== "searching") return
    const timer = setInterval(() => setWaitTime((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [state])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllIntervals()
      if (peerRef.current) peerRef.current.close()
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // RENDER
  if (state === "idle") {
    return (
      <div className="h-screen w-full bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex flex-col items-center justify-center gap-6 p-4">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Videochamada</h1>
          <p className="text-purple-200 text-base md:text-lg">Conecte-se com empreendedores ao vivo</p>
        </div>
        <Button
          onClick={handleStartCall}
          className="bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 hover:from-purple-700 hover:via-pink-600 hover:to-purple-700 text-white px-8 md:px-12 py-6 md:py-8 text-lg md:text-xl rounded-full font-bold"
        >
          Começar Chamada
        </Button>
      </div>
    )
  }

  if (state === "error") {
    return (
      <div className="h-screen w-full bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-red-400 text-center">{errorMsg}</p>
        <Button onClick={() => setState("idle")} className="bg-gradient-to-r from-purple-600 to-pink-500 text-white">
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex flex-col overflow-hidden">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 p-3 w-full h-full">
        <div className="bg-gray-900 rounded-lg overflow-hidden relative border border-purple-500/30">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <div className="absolute top-3 left-3 bg-black/70 px-3 py-1 rounded backdrop-blur">
            <p className="text-white text-sm font-semibold">Você</p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg overflow-hidden relative border border-purple-500/30">
          {state === "searching" ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-purple-900">
              <div className="text-center">
                <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-purple-400" />
                <p className="text-white font-semibold">Conectando...</p>
                <p className="text-purple-300 text-sm mt-2">{formatTime(waitTime)}</p>
              </div>
            </div>
          ) : (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {partner && (
                <div className="absolute top-3 left-3 bg-black/70 px-3 py-1 rounded backdrop-blur">
                  <p className="text-white text-sm font-semibold">{partner.full_name}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {state === "connected" && (
        <div className="bg-black/80 backdrop-blur border-t border-purple-500/30 p-4 flex justify-center gap-3 flex-wrap">
          <Button
            size="icon"
            onClick={handleToggleMic}
            className={`rounded-full w-12 h-12 ${isMuted ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"}`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          <Button
            size="icon"
            onClick={handleToggleCamera}
            className={`rounded-full w-12 h-12 ${isVideoOff ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"}`}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
          </Button>

          <Button
            size="icon"
            onClick={handleFlipCamera}
            className="rounded-full w-12 h-12 bg-purple-600 hover:bg-purple-700"
          >
            <Repeat2 className="w-5 h-5" />
          </Button>

          <Button size="icon" onClick={handleLike} className="rounded-full w-12 h-12 bg-pink-600 hover:bg-pink-700">
            <Heart className="w-5 h-5" />
          </Button>

          <Button size="icon" onClick={handleSkip} className="rounded-full w-12 h-12 bg-yellow-600 hover:bg-yellow-700">
            <SkipForward className="w-5 h-5" />
          </Button>

          <Button size="icon" onClick={handleHangUp} className="rounded-full w-12 h-12 bg-red-600 hover:bg-red-700">
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      )}

      {state === "searching" && (
        <div className="bg-black/80 backdrop-blur border-t border-purple-500/30 p-4 flex justify-center">
          <Button onClick={handleHangUp} className="bg-red-600 hover:bg-red-700 text-white rounded-full px-6">
            Cancelar
          </Button>
        </div>
      )}
    </div>
  )
}
