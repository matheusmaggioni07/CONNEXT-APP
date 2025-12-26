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
  const [isFrontCamera, setIsFrontCamera] = useState(true)

  // REFS
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const roomIdRef = useRef<string>("")
  const partnerIdRef = useRef<string>("")
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const isInitiatorRef = useRef(false)
  const signalingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const iceIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const processedSignalingRef = useRef<Set<string>>(new Set())
  const processedIceRef = useRef<Set<string>>(new Set())

  // GET LOCAL STREAM
  const getLocalStream = useCallback(async (facingMode: "user" | "environment" = "user") => {
    try {
      console.log("[v0] Getting local stream with facingMode:", facingMode)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode,
        },
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      console.log("[v0] Local stream obtained successfully")
      return stream
    } catch (err) {
      console.error("[v0] Error getting local stream:", err)
      setErrorMsg("Permissão de câmera/microfone negada")
      setState("error")
      return null
    }
  }, [])

  // SETUP WEBRTC - MAIN CONNECTION LOGIC
  const setupWebRTC = useCallback(
    async (roomId: string, isInitiator: boolean) => {
      console.log("[v0] setupWebRTC starting", { roomId, isInitiator, partnerId: partnerIdRef.current })

      // Get local stream
      const localStream = await getLocalStream(isFrontCamera ? "user" : "environment")
      if (!localStream) {
        console.error("[v0] Failed to get local stream")
        return
      }

      localStreamRef.current = localStream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream
        console.log("[v0] Local video stream set")
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
        iceCandidatePoolSize: 10,
        iceTransportPolicy: "all",
      })

      peerRef.current = pc
      console.log("[v0] Peer connection created")

      // Add local tracks
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream)
        console.log("[v0] Added local track:", track.kind, "enabled:", track.enabled)
      })

      pc.ontrack = (event) => {
        console.log("[v0] ✅ REMOTE TRACK RECEIVED!", {
          kind: event.track.kind,
          enabled: event.track.enabled,
          streams: event.streams.length,
        })

        if (event.streams && event.streams.length > 0) {
          const remoteStream = event.streams[0]
          remoteStreamRef.current = remoteStream

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream

            // Force video to play with autoplay
            remoteVideoRef.current
              .play()
              .catch((err) => console.log("[v0] Autoplay blocked (user interaction required):", err?.message))
          }

          console.log("[v0] ✅ Remote stream set to video element")
        }
      }

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log("[v0] ICE candidate:", event.candidate.candidate.substring(0, 50) + "...")
          try {
            await supabase.from("ice_candidates").insert({
              room_id: roomId,
              from_user_id: userId,
              to_user_id: partnerIdRef.current,
              candidate: JSON.stringify(event.candidate.toJSON()),
            })
          } catch (err) {
            console.error("[v0] Error saving ICE:", err)
          }
        }
      }

      pc.onicegatheringstatechange = () => {
        console.log("[v0] ICE gathering state:", pc.iceGatheringState)
      }

      pc.onconnectionstatechange = () => {
        console.log("[v0] Connection state:", pc.connectionState)
        if (pc.connectionState === "connected") {
          console.log("[v0] ✅ WebRTC CONNECTED!")
          setState("connected")
        } else if (pc.connectionState === "failed") {
          console.error("[v0] Connection FAILED")
          setState("error")
          setErrorMsg("Conexão perdida - tente novamente")
        }
      }

      pc.oniceconnectionstatechange = () => {
        console.log("[v0] ICE connection state:", pc.iceConnectionState)
      }

      if (isInitiator) {
        console.log("[v0] 🎬 INITIATOR - Creating offer...")
        setTimeout(async () => {
          try {
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
              voiceActivityDetection: false,
            })
            console.log("[v0] ✅ Offer created")

            await pc.setLocalDescription(offer)
            console.log("[v0] ✅ Local description set")

            await supabase.from("signaling").insert({
              room_id: roomId,
              from_user_id: userId,
              to_user_id: partnerIdRef.current,
              type: "offer",
              sdp: JSON.stringify(offer),
            })
            console.log("[v0] ✅ Offer sent to database")
          } catch (err) {
            console.error("[v0] Error creating offer:", err)
          }
        }, 500)
      } else {
        console.log("[v0] ⏳ NON-INITIATOR - Waiting for offer...")
      }

      signalingIntervalRef.current = setInterval(async () => {
        if (!peerRef.current || peerRef.current.connectionState === "closed") {
          clearInterval(signalingIntervalRef.current!)
          return
        }

        try {
          const { data: signals } = await supabase
            .from("signaling")
            .select("*")
            .eq("room_id", roomId)
            .eq("to_user_id", userId)
            .order("created_at", { ascending: true })

          if (signals && signals.length > 0) {
            for (const sig of signals) {
              if (processedSignalingRef.current.has(sig.id)) continue
              processedSignalingRef.current.add(sig.id)

              try {
                if (sig.type === "offer") {
                  console.log("[v0] 📨 Processing OFFER...")
                  const offer = JSON.parse(sig.sdp)
                  if (pc.remoteDescription === null) {
                    await pc.setRemoteDescription(new RTCSessionDescription(offer))
                    console.log("[v0] ✅ Remote offer set")

                    if (!isInitiator) {
                      const answer = await pc.createAnswer({
                        offerToReceiveAudio: true,
                        offerToReceiveVideo: true,
                        voiceActivityDetection: false,
                      })
                      console.log("[v0] ✅ Answer created")

                      await pc.setLocalDescription(answer)
                      console.log("[v0] ✅ Local answer set")

                      await supabase.from("signaling").insert({
                        room_id: roomId,
                        from_user_id: userId,
                        to_user_id: sig.from_user_id,
                        type: "answer",
                        sdp: JSON.stringify(answer),
                      })
                      console.log("[v0] ✅ Answer sent")
                    }
                  }
                } else if (sig.type === "answer" && isInitiator) {
                  console.log("[v0] 📨 Processing ANSWER...")
                  const answer = JSON.parse(sig.sdp)
                  if (pc.remoteDescription === null) {
                    await pc.setRemoteDescription(new RTCSessionDescription(answer))
                    console.log("[v0] ✅ Remote answer set")
                  }
                }
              } catch (err) {
                console.error("[v0] Error processing signaling:", err)
              }
            }
          }
        } catch (err) {
          console.error("[v0] Signaling poll error:", err)
        }
      }, 300)

      iceIntervalRef.current = setInterval(async () => {
        if (!peerRef.current || peerRef.current.connectionState === "closed") {
          clearInterval(iceIntervalRef.current!)
          return
        }

        try {
          const { data: ices } = await supabase
            .from("ice_candidates")
            .select("*")
            .eq("room_id", roomId)
            .eq("to_user_id", userId)
            .order("created_at", { ascending: true })

          if (ices && ices.length > 0) {
            for (const ice of ices) {
              if (processedIceRef.current.has(ice.id)) continue
              processedIceRef.current.add(ice.id)

              try {
                if (pc.remoteDescription) {
                  const candidate = new RTCIceCandidate(JSON.parse(ice.candidate))
                  await pc.addIceCandidate(candidate)
                }
              } catch (err) {
                console.error("[v0] Error adding ICE:", err?.message)
              }
            }
          }
        } catch (err) {
          console.error("[v0] ICE polling error:", err)
        }
      }, 300)
    },
    [userId, getLocalStream, supabase, isFrontCamera],
  )

  const handleStartCall = useCallback(async () => {
    console.log("[v0] Starting video call...")
    setState("searching")
    setWaitTime(0)
    setErrorMsg("")

    try {
      const result = await joinVideoQueue()
      console.log("[v0] joinVideoQueue result:", result)

      if (!result.success) {
        setErrorMsg(result.error || "Erro ao conectar")
        setState("error")
        return
      }

      roomIdRef.current = result.roomId
      partnerIdRef.current = result.partnerId || ""
      const initiator = !result.waiting

      console.log("[v0] Joined queue:", { roomId: result.roomId, waiting: result.waiting, initiator })

      if (result.matched) {
        console.log("[v0] ✅ Immediate match found!")
        setPartner(result.partnerProfile)
        isInitiatorRef.current = initiator
        await setupWebRTC(result.roomId, initiator)
        return
      }

      console.log("[v0] Polling for match...")
      pollingRef.current = setInterval(async () => {
        try {
          const statusResult = await checkRoomStatus(result.roomId)
          console.log("[v0] Room status:", statusResult.status)

          if (statusResult.status === "active" && statusResult.partnerId) {
            console.log("[v0] ✅ Partner found!")
            clearInterval(pollingRef.current!)
            setPartner(statusResult.partnerProfile)
            partnerIdRef.current = statusResult.partnerId
            isInitiatorRef.current = false // Non-initiator since we joined

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

  const handleHangUp = useCallback(async () => {
    console.log("[v0] Hanging up...")
    if (pollingRef.current) clearInterval(pollingRef.current)
    if (signalingIntervalRef.current) clearInterval(signalingIntervalRef.current)
    if (iceIntervalRef.current) clearInterval(iceIntervalRef.current)

    if (peerRef.current) {
      peerRef.current.close()
    }

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
    console.log("[v0] Hangup complete")
  }, [])

  // SKIP TO NEXT
  const handleSkip = useCallback(async () => {
    console.log("[v0] Skipping...")
    await handleHangUp()
    setState("idle")
  }, [handleHangUp])

  // LIKE
  const handleLike = useCallback(async () => {
    if (partner) {
      await likeUser(partner.id)
      console.log("[v0] User liked")
    }
  }, [partner])

  // Toggle microphone
  const handleToggleMic = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
      console.log("[v0] Mic toggled:", !isMuted)
    }
  }, [isMuted])

  // Toggle camera
  const handleToggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsVideoOff(!isVideoOff)
      console.log("[v0] Camera toggled:", !isVideoOff)
    }
  }, [isVideoOff])

  const handleFlipCamera = useCallback(async () => {
    console.log("[v0] Flipping camera...")
    setIsFrontCamera(!isFrontCamera)

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
    }

    if (roomIdRef.current && isInitiatorRef.current !== undefined) {
      const newStream = await getLocalStream(!isFrontCamera ? "user" : "environment")
      if (newStream && peerRef.current) {
        localStreamRef.current = newStream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream
        }

        // Replace video track in peer connection
        const videoTrack = newStream.getVideoTracks()[0]
        const videoSender = peerRef.current.getSenders().find((sender) => sender.track?.kind === "video")

        if (videoSender && videoTrack) {
          await videoSender.replaceTrack(videoTrack)
          console.log("[v0] Camera flipped successfully")
        }
      }
    }
  }, [isFrontCamera, getLocalStream])

  // WAIT TIME DISPLAY
  useEffect(() => {
    if (state !== "searching") return

    const interval = setInterval(() => {
      setWaitTime((t) => t + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [state])

  // RENDER - IDLE STATE
  if (state === "idle") {
    return (
      <div className="h-screen w-full bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex flex-col items-center justify-center gap-6 p-4">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-2">Videochamada</h1>
          <p className="text-purple-200 text-lg md:text-xl">Conecte-se com empreendedores ao vivo</p>
        </div>
        <Button
          onClick={handleStartCall}
          className="bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 hover:from-purple-700 hover:via-pink-600 hover:to-purple-700 text-white px-12 py-8 text-xl rounded-full font-bold shadow-2xl transform transition hover:scale-105"
        >
          Começar Chamada
        </Button>
      </div>
    )
  }

  // RENDER - ERROR STATE
  if (state === "error") {
    return (
      <div className="h-screen w-full bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex flex-col items-center justify-center gap-4 p-4">
        <div className="text-center">
          <p className="text-red-400 text-lg font-bold mb-4">{errorMsg || "Erro na conexão"}</p>
          <Button
            onClick={() => setState("idle")}
            className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white"
          >
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  // RENDER - CONNECTED/SEARCHING STATE
  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex flex-col overflow-hidden">
      {/* VIDEOS */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-1 sm:gap-2 p-2 sm:p-3 w-full h-full">
        {/* Local Video */}
        <div className="bg-gray-900 rounded-xl overflow-hidden relative w-full h-full border border-purple-500/30">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <div className="absolute top-3 sm:top-4 left-3 sm:left-4 bg-black/70 px-3 sm:px-4 py-2 sm:py-2 rounded-lg backdrop-blur-sm">
            <p className="text-white font-bold text-xs sm:text-sm">Você</p>
          </div>
        </div>

        {/* Remote Video */}
        <div className="bg-gray-900 rounded-xl overflow-hidden relative w-full h-full border border-purple-500/30">
          {state === "searching" ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-purple-900">
              <div className="text-center">
                <Loader2 className="w-12 sm:w-16 h-12 sm:h-16 animate-spin mx-auto mb-4 text-purple-400" />
                <p className="text-white text-sm sm:text-base font-semibold">Conectando...</p>
                <p className="text-purple-300 text-xs sm:text-sm mt-2">{formatTime(waitTime)}</p>
              </div>
            </div>
          ) : (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {partner && (
                <div className="absolute top-3 sm:top-4 left-3 sm:left-4 bg-black/70 px-3 sm:px-4 py-2 sm:py-2 rounded-lg backdrop-blur-sm">
                  <p className="text-white font-bold text-xs sm:text-sm">{partner.full_name}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* BUTTONS - Connected State */}
      {state === "connected" && (
        <div className="bg-black/80 backdrop-blur-md border-t border-purple-500/30 p-4 sm:p-5 flex justify-center gap-2 sm:gap-4 flex-wrap">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleMic}
            className={`rounded-full w-12 sm:w-14 h-12 sm:h-14 transition-all ${
              isMuted ? "bg-red-600/80 hover:bg-red-700 text-white" : "bg-purple-600/60 hover:bg-purple-700 text-white"
            }`}
            title={isMuted ? "Ativar microfone" : "Desativar microfone"}
          >
            {isMuted ? <MicOff className="w-6 sm:w-7 h-6 sm:h-7" /> : <Mic className="w-6 sm:w-7 h-6 sm:h-7" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleCamera}
            className={`rounded-full w-12 sm:w-14 h-12 sm:h-14 transition-all ${
              isVideoOff
                ? "bg-red-600/80 hover:bg-red-700 text-white"
                : "bg-purple-600/60 hover:bg-purple-700 text-white"
            }`}
            title={isVideoOff ? "Ativar câmera" : "Desativar câmera"}
          >
            {isVideoOff ? (
              <VideoOff className="w-6 sm:w-7 h-6 sm:h-7" />
            ) : (
              <VideoIcon className="w-6 sm:w-7 h-6 sm:h-7" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleFlipCamera}
            className="rounded-full w-12 sm:w-14 h-12 sm:h-14 bg-blue-600/60 hover:bg-blue-700 text-white transition-all"
            title="Virar câmera"
          >
            <Repeat2 className="w-6 sm:w-7 h-6 sm:h-7" />
          </Button>

          <Button
            onClick={handleLike}
            className="rounded-full w-12 sm:w-14 h-12 sm:h-14 bg-pink-600/80 hover:bg-pink-700 text-white transition-all"
            title="Curtir"
          >
            <Heart className="w-6 sm:w-7 h-6 sm:h-7" />
          </Button>

          <Button
            onClick={handleSkip}
            className="rounded-full w-12 sm:w-14 h-12 sm:h-14 bg-orange-600/80 hover:bg-orange-700 text-white transition-all"
            title="Pular"
          >
            <SkipForward className="w-6 sm:w-7 h-6 sm:h-7" />
          </Button>

          <Button
            onClick={handleHangUp}
            className="rounded-full w-12 sm:w-14 h-12 sm:h-14 bg-red-600/80 hover:bg-red-700 text-white transition-all"
            title="Desligar"
          >
            <PhoneOff className="w-6 sm:w-7 h-6 sm:h-7" />
          </Button>
        </div>
      )}

      {/* BUTTONS - Searching State */}
      {state === "searching" && (
        <div className="bg-black/80 backdrop-blur-md border-t border-purple-500/30 p-4 sm:p-5 flex justify-center gap-3">
          <Button
            onClick={handleHangUp}
            className="bg-red-600/80 hover:bg-red-700 px-8 sm:px-10 text-sm sm:text-base text-white font-semibold"
          >
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
