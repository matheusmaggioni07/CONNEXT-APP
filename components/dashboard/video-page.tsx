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
  const getLocalStream = useCallback(async () => {
    try {
      console.log("[v0] Getting local stream...")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
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
      const localStream = await getLocalStream()
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

        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0]
          console.log(
            "[v0] Remote stream stored:",
            event.streams[0].getTracks().map((t) => ({ kind: t.kind, enabled: t.enabled })),
          )

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0]
            remoteVideoRef.current.play().catch((err) => console.log("[v0] Play error (normal):", err.message))
            console.log("[v0] ✅ Remote video element srcObject set")
          } else {
            console.warn("[v0] ⚠️ remoteVideoRef is null!")
          }
        } else {
          console.warn("[v0] ⚠️ No streams in track event!")
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
          console.log("[v0] ✅ WebRTC CONNECTED! Waiting for remote tracks...")
          setState("connected")
        } else if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          console.error("[v0] Connection FAILED:", pc.connectionState)
          setState("error")
          setErrorMsg("Conexão perdida")
        }
      }

      if (isInitiator) {
        console.log("[v0] 🎬 INITIATOR - Creating offer...")
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          })
          console.log("[v0] ✅ Offer created with audio/video flags")

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
      } else {
        console.log("[v0] ⏳ NON-INITIATOR - Waiting for offer...")
      }

      signalingIntervalRef.current = setInterval(async () => {
        if (!peerRef.current || peerRef.current.connectionState === "closed") {
          clearInterval(signalingIntervalRef.current!)
          return
        }

        try {
          const { data: signals, error } = await supabase
            .from("signaling")
            .select("*")
            .eq("room_id", roomId)
            .eq("to_user_id", userId)
            .order("created_at", { ascending: true })

          if (error) {
            console.error("[v0] Signaling fetch error:", error)
            return
          }

          if (signals && signals.length > 0) {
            for (const sig of signals) {
              if (processedSignalingRef.current.has(sig.id)) continue
              processedSignalingRef.current.add(sig.id)

              if (sig.type === "offer" && !isInitiator) {
                console.log("[v0] 📨 Processing OFFER...")
                try {
                  const offer = JSON.parse(sig.sdp)
                  await pc.setRemoteDescription(new RTCSessionDescription(offer))
                  console.log("[v0] ✅ Remote description set (offer)")

                  const answer = await pc.createAnswer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true,
                  })
                  console.log("[v0] ✅ Answer created")

                  await pc.setLocalDescription(answer)
                  console.log("[v0] ✅ Local description set (answer)")

                  await supabase.from("signaling").insert({
                    room_id: roomId,
                    from_user_id: userId,
                    to_user_id: sig.from_user_id,
                    type: "answer",
                    sdp: JSON.stringify(answer),
                  })
                  console.log("[v0] ✅ Answer sent")
                } catch (err) {
                  console.error("[v0] Error processing offer:", err)
                }
              } else if (sig.type === "answer" && isInitiator) {
                console.log("[v0] 📨 Processing ANSWER...")
                try {
                  const answer = JSON.parse(sig.sdp)
                  await pc.setRemoteDescription(new RTCSessionDescription(answer))
                  console.log("[v0] ✅ Remote description set (answer)")
                } catch (err) {
                  console.error("[v0] Error processing answer:", err)
                }
              }
            }
          }
        } catch (err) {
          console.error("[v0] Signaling poll error:", err)
        }
      }, 500)

      iceIntervalRef.current = setInterval(async () => {
        if (!peerRef.current || peerRef.current.connectionState === "closed") {
          clearInterval(iceIntervalRef.current!)
          return
        }

        try {
          const { data: ices, error } = await supabase
            .from("ice_candidates")
            .select("*")
            .eq("room_id", roomId)
            .eq("to_user_id", userId)
            .order("created_at", { ascending: true })

          if (error) {
            console.error("[v0] Error fetching ICE candidates:", error)
            return
          }

          if (ices && ices.length > 0) {
            console.log(`[v0] Found ${ices.length} ICE candidates`)
            for (const ice of ices) {
              if (processedIceRef.current.has(ice.id)) continue
              processedIceRef.current.add(ice.id)

              try {
                if (peerRef.current?.remoteDescription) {
                  const candidate = new RTCIceCandidate(JSON.parse(ice.candidate))
                  await peerRef.current.addIceCandidate(candidate)
                  console.log("[v0] ✅ ICE candidate added")
                } else {
                  console.log("[v0] ⏳ Waiting for remote description before adding ICE candidate")
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
    },
    [userId, getLocalStream, supabase],
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

  // LIKE
  const handleLike = useCallback(async () => {
    if (partner) {
      await likeUser(partner.id)
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
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center gap-6 p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Videochamada</h1>
          <p className="text-gray-300 text-lg">Conecte-se instantaneamente com profissionais</p>
        </div>
        <Button
          onClick={handleStartCall}
          className="bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-600 hover:to-blue-600 text-white px-10 py-6 text-lg rounded-full font-semibold shadow-lg"
        >
          Começar Chamada
        </Button>
      </div>
    )
  }

  // RENDER - ERROR STATE
  if (state === "error") {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center gap-4 p-4">
        <div className="text-center">
          <p className="text-red-500 text-lg font-bold mb-4">{errorMsg || "Erro na conexão"}</p>
          <Button onClick={() => setState("idle")} className="bg-blue-500 hover:bg-blue-600">
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  // RENDER - CONNECTED/SEARCHING STATE
  return (
    <div className="h-screen w-full bg-black flex flex-col overflow-hidden">
      {/* VIDEOS */}
      <div className="flex-1 grid grid-cols-2 gap-1 sm:gap-2 p-1 sm:p-2 w-full h-full">
        {/* Local Video */}
        <div className="bg-gray-900 rounded-lg overflow-hidden relative w-full h-full">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <div className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-black/60 px-2 sm:px-3 py-1 sm:py-2 rounded-lg">
            <p className="text-white font-bold text-xs sm:text-sm">Você</p>
          </div>
        </div>

        {/* Remote Video */}
        <div className="bg-gray-900 rounded-lg overflow-hidden relative w-full h-full">
          {state === "searching" ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-10 sm:w-12 h-10 sm:h-12 animate-spin mx-auto mb-4 text-pink-500" />
                <p className="text-white text-sm sm:text-base">Conectando...</p>
                <p className="text-gray-400 text-xs sm:text-sm mt-2">{formatTime(waitTime)}</p>
              </div>
            </div>
          ) : (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {partner && (
                <div className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-black/60 px-2 sm:px-3 py-1 sm:py-2 rounded-lg">
                  <p className="text-white font-bold text-xs sm:text-sm">{partner.full_name}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* BUTTONS - Connected State */}
      {state === "connected" && (
        <div className="bg-black/80 border-t border-gray-700 p-3 sm:p-4 flex justify-center gap-2 sm:gap-4 flex-wrap">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleMic}
            className={`rounded-full w-10 sm:w-12 h-10 sm:h-12 ${
              isMuted ? "bg-red-500 hover:bg-red-600" : "bg-gray-700 hover:bg-gray-600"
            }`}
            title={isMuted ? "Ativar microfone" : "Desativar microfone"}
          >
            {isMuted ? <MicOff className="w-5 sm:w-6 h-5 sm:h-6" /> : <Mic className="w-5 sm:w-6 h-5 sm:h-6" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleCamera}
            className={`rounded-full w-10 sm:w-12 h-10 sm:h-12 ${
              isVideoOff ? "bg-red-500 hover:bg-red-600" : "bg-gray-700 hover:bg-gray-600"
            }`}
            title={isVideoOff ? "Ativar câmera" : "Desativar câmera"}
          >
            {isVideoOff ? (
              <VideoOff className="w-5 sm:w-6 h-5 sm:h-6" />
            ) : (
              <VideoIcon className="w-5 sm:w-6 h-5 sm:h-6" />
            )}
          </Button>

          <Button
            onClick={handleLike}
            className="rounded-full w-10 sm:w-12 h-10 sm:h-12 bg-pink-500 hover:bg-pink-600"
            title="Curtir"
          >
            <Heart className="w-5 sm:w-6 h-5 sm:h-6" />
          </Button>

          <Button
            onClick={handleHangUp}
            className="rounded-full w-10 sm:w-12 h-10 sm:h-12 bg-red-500 hover:bg-red-600"
            title="Desligar"
          >
            <PhoneOff className="w-5 sm:w-6 h-5 sm:h-6" />
          </Button>
        </div>
      )}

      {/* BUTTONS - Searching State */}
      {state === "searching" && (
        <div className="bg-black/80 border-t border-gray-700 p-3 sm:p-4 flex justify-center gap-2 sm:gap-4">
          <Button onClick={handleHangUp} className="bg-red-500 hover:bg-red-600 px-6 sm:px-8 text-sm sm:text-base">
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
