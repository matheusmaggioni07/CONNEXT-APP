"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  SkipForward,
  Heart,
  AlertCircle,
  Loader2,
  Clock,
  Sparkles,
  SwitchCamera,
} from "lucide-react"
import { joinVideoQueue, leaveVideoQueue, checkRoomStatus, getRemainingCalls } from "@/app/actions/video"
import { likeUser } from "@/app/actions/likes"

interface VideoPageProps {
  userId: string
  userProfile: {
    full_name: string
    avatar_url?: string
    city?: string
    interests?: string[]
  }
}

interface PartnerProfile {
  id: string
  full_name: string
  avatar_url: string
  profession?: string
  bio?: string
  city?: string
}

type VideoState = "idle" | "searching" | "connecting" | "connected" | "ended" | "permission_denied"

export function VideoPage({ userId, userProfile }: VideoPageProps) {
  // State
  const [videoState, setVideoState] = useState<VideoState>("idle")
  const [currentPartner, setCurrentPartner] = useState<PartnerProfile | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [localVideoReady, setLocalVideoReady] = useState(false)
  const [remoteVideoReady, setRemoteVideoReady] = useState(false)
  const [waitTime, setWaitTime] = useState(0)
  const [remainingCalls, setRemainingCalls] = useState<number | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [timeUntilReset, setTimeUntilReset] = useState("")
  const [isLiked, setIsLiked] = useState(false)

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const currentRoomIdRef = useRef<string | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const waitTimeRef = useRef<NodeJS.Timeout | null>(null)
  const isCleaningUpRef = useRef(false)
  const iceCandidatesQueueRef = useRef<RTCIceCandidate[]>([])
  const hasRemoteDescriptionRef = useRef(false)
  const facingModeRef = useRef<"user" | "environment">("user")
  const currentPartnerIdRef = useRef<string | null>(null)
  const isInitiatorRef = useRef<boolean>(false)
  const signalingPollingRef = useRef<NodeJS.Timeout | null>(null)
  const processedSignalingIds = useRef<Set<string>>(new Set())
  const processedIceCandidateIds = useRef<Set<string>>(new Set())

  // Check remaining calls on mount
  useEffect(() => {
    const checkCalls = async () => {
      const result = await getRemainingCalls()
      if (result.success) {
        setRemainingCalls(result.remaining)
        if (result.remaining === 0) {
          setLimitReached(true)
          setTimeUntilReset(result.resetIn || "24 horas")
        }
      }
    }
    checkCalls()
  }, [])

  // Wait time counter
  useEffect(() => {
    if (videoState === "searching") {
      waitTimeRef.current = setInterval(() => {
        setWaitTime((prev) => prev + 1)
      }, 1000)
    } else {
      if (waitTimeRef.current) {
        clearInterval(waitTimeRef.current)
      }
      setWaitTime(0)
    }
    return () => {
      if (waitTimeRef.current) clearInterval(waitTimeRef.current)
    }
  }, [videoState])

  const attachStreamToVideo = useCallback(
    (videoElement: HTMLVideoElement | null, stream: MediaStream, label: string): boolean => {
      if (!videoElement) {
        console.log(`[v0] ${label}: No video element`)
        return false
      }
      if (!stream) {
        console.log(`[v0] ${label}: No stream`)
        return false
      }

      console.log(`[v0] Attaching ${label} - tracks:`, stream.getTracks().length)

      // Enable all tracks
      stream.getTracks().forEach((track) => {
        track.enabled = true
      })

      // Set stream to video element
      videoElement.srcObject = stream
      videoElement.muted = label.includes("local")
      videoElement.autoplay = true
      videoElement.playsInline = true

      // Force play
      const playVideo = () => {
        videoElement.play().catch(() => {
          // Retry
          setTimeout(() => videoElement.play().catch(() => {}), 100)
        })
      }

      playVideo()
      videoElement.onloadedmetadata = playVideo
      videoElement.oncanplay = playVideo

      return true
    },
    [],
  )

  const formatWaitTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const cleanup = useCallback(async () => {
    if (isCleaningUpRef.current) return
    isCleaningUpRef.current = true

    console.log("[v0] Cleaning up...")

    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }

    if (signalingPollingRef.current) {
      clearInterval(signalingPollingRef.current)
      signalingPollingRef.current = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null
      peerConnectionRef.current.onicecandidate = null
      peerConnectionRef.current.onconnectionstatechange = null
      peerConnectionRef.current.oniceconnectionstatechange = null
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop())
      remoteStreamRef.current = null
    }

    const roomId = currentRoomIdRef.current
    if (roomId && roomId !== "undefined") {
      await leaveVideoQueue(roomId)
    }

    currentRoomIdRef.current = null
    currentPartnerIdRef.current = null
    hasRemoteDescriptionRef.current = false
    iceCandidatesQueueRef.current = []
    processedSignalingIds.current.clear()
    processedIceCandidateIds.current.clear()
    setLocalVideoReady(false)
    setRemoteVideoReady(false)
    setIsLiked(false)

    isCleaningUpRef.current = false
  }, [])

  const getLocalStream = useCallback(async () => {
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingModeRef.current,
          width: { ideal: isMobile ? 640 : 1280, max: 1920 },
          height: { ideal: isMobile ? 480 : 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      }

      console.log("[v0] Requesting media...")
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("[v0] Got local stream with", stream.getTracks().length, "tracks")

      localStreamRef.current = stream

      if (attachStreamToVideo(localVideoRef.current, stream, "local")) {
        setLocalVideoReady(true)
      }

      return stream
    } catch (error: unknown) {
      const err = error as Error
      console.error("[v0] getUserMedia error:", err.name, err.message)

      if (err.name === "NotAllowedError") {
        setPermissionError("Você precisa permitir o acesso à câmera e microfone para usar a videochamada.")
        setVideoState("permission_denied")
      } else if (err.name === "NotFoundError") {
        setPermissionError("Nenhuma câmera ou microfone encontrado no dispositivo.")
        setVideoState("permission_denied")
      } else if (err.name === "NotReadableError") {
        setPermissionError("Câmera ou microfone já está sendo usado por outro aplicativo.")
        setVideoState("permission_denied")
      } else {
        setPermissionError("Erro ao acessar câmera/microfone: " + err.message)
        setVideoState("permission_denied")
      }
      return null
    }
  }, [attachStreamToVideo])

  const setupWebRTC = useCallback(
    async (roomId: string, isInitiator: boolean, partnerId: string) => {
      console.log("[v0] ====== WEBRTC SETUP ======")
      console.log("[v0] Room:", roomId)
      console.log("[v0] I am initiator:", isInitiator)
      console.log("[v0] Partner ID:", partnerId)
      console.log("[v0] My ID:", userId)

      isInitiatorRef.current = isInitiator
      processedSignalingIds.current.clear()
      processedIceCandidateIds.current.clear()
      hasRemoteDescriptionRef.current = false
      iceCandidatesQueueRef.current = []
      remoteStreamRef.current = null
      setRemoteVideoReady(false)

      // Fetch ICE servers
      let iceServers: RTCIceServer[] = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ]

      try {
        const response = await fetch("/api/turn-credentials")
        if (response.ok) {
          const data = await response.json()
          if (data.iceServers && data.iceServers.length > 0) {
            iceServers = data.iceServers
            console.log("[v0] Got", iceServers.length, "ICE servers from API")
          }
        }
      } catch (error) {
        console.error("[v0] Error fetching TURN credentials:", error)
      }

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers,
        iceCandidatePoolSize: 10,
      })

      peerConnectionRef.current = pc
      const supabase = createClient()

      await supabase.from("signaling").delete().eq("room_id", roomId)
      await supabase.from("ice_candidates").delete().eq("room_id", roomId)

      // Add local tracks FIRST
      if (localStreamRef.current) {
        const tracks = localStreamRef.current.getTracks()
        console.log("[v0] Adding", tracks.length, "local tracks to peer connection")
        tracks.forEach((track) => {
          pc.addTrack(track, localStreamRef.current!)
        })
      } else {
        console.error("[v0] ERROR: No local stream available!")
        return
      }

      pc.ontrack = (event) => {
        console.log("[v0] *** RECEIVED REMOTE TRACK ***", event.track.kind)

        // Enable track
        event.track.enabled = true

        // Get or create stream
        let stream: MediaStream
        if (event.streams && event.streams[0]) {
          stream = event.streams[0]
        } else if (remoteStreamRef.current) {
          remoteStreamRef.current.addTrack(event.track)
          stream = remoteStreamRef.current
        } else {
          stream = new MediaStream([event.track])
        }

        remoteStreamRef.current = stream

        // Enable all tracks in stream
        stream.getTracks().forEach((t) => {
          t.enabled = true
        })

        console.log("[v0] Remote stream has", stream.getTracks().length, "tracks")

        // Attach immediately
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream
          remoteVideoRef.current.play().catch(() => {})
          setRemoteVideoReady(true)
          setVideoState("connected")
          setConnectionStatus("Conectado!")
        }

        // Retry attachments
        const delays = [200, 500, 1000, 2000, 3000]
        delays.forEach((delay) => {
          setTimeout(() => {
            if (remoteVideoRef.current && remoteStreamRef.current) {
              remoteVideoRef.current.srcObject = remoteStreamRef.current
              remoteVideoRef.current.play().catch(() => {})
              setRemoteVideoReady(true)
            }
          }, delay)
        })
      }

      // Connection state monitoring
      pc.onconnectionstatechange = () => {
        console.log("[v0] Connection state:", pc.connectionState)

        if (pc.connectionState === "connected") {
          console.log("[v0] *** CONNECTION ESTABLISHED ***")
          setVideoState("connected")
          setConnectionStatus("Conectado!")

          // Re-attach both streams when connected
          setTimeout(() => {
            if (localStreamRef.current && localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current
              localVideoRef.current.play().catch(() => {})
              setLocalVideoReady(true)
            }
            if (remoteStreamRef.current && remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStreamRef.current
              remoteVideoRef.current.play().catch(() => {})
              setRemoteVideoReady(true)
            }
          }, 500)
        } else if (pc.connectionState === "disconnected") {
          setConnectionStatus("Reconectando...")
        } else if (pc.connectionState === "failed") {
          setConnectionStatus("Conexão falhou")
          if (isInitiatorRef.current && peerConnectionRef.current) {
            peerConnectionRef.current.restartIce()
          }
        }
      }

      pc.oniceconnectionstatechange = () => {
        console.log("[v0] ICE connection state:", pc.iceConnectionState)
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          setConnectionStatus("Conectado!")
        }
      }

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log("[v0] *** ICE CANDIDATE GENERATED ***", {
            candidate: event.candidate.candidate.substring(0, 50),
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          })
          try {
            await supabase.from("ice_candidates").insert({
              room_id: roomId,
              from_user_id: userId,
              to_user_id: partnerId,
              candidate: JSON.stringify(event.candidate.toJSON()),
            })
            console.log("[v0] ✓ ICE candidate sent to database")
          } catch (error) {
            console.error("[v0] ✗ Error sending ICE candidate:", error)
          }
        } else {
          console.log("[v0] ICE gathering complete (event.candidate is null)")
        }
      }

      const pollForSignaling = async () => {
        if (!peerConnectionRef.current || peerConnectionRef.current.connectionState === "closed") {
          if (signalingPollingRef.current) {
            clearInterval(signalingPollingRef.current)
            signalingPollingRef.current = null
          }
          return
        }

        try {
          // Poll for signaling messages (offer/answer)
          const { data: signals } = await supabase
            .from("signaling")
            .select("*")
            .eq("room_id", roomId)
            .eq("from_user_id", partnerId)
            .eq("to_user_id", userId)
            .order("created_at", { ascending: true })

          if (signals && signals.length > 0) {
            for (const signal of signals) {
              if (processedSignalingIds.current.has(signal.id)) continue
              processedSignalingIds.current.add(signal.id)

              const pc = peerConnectionRef.current
              if (!pc || pc.connectionState === "closed") break

              console.log("[v0] Processing signal type:", signal.type)

              if (signal.type === "offer" && !isInitiator) {
                console.log("[v0] Received offer from partner")
                const offerDesc = JSON.parse(signal.sdp)
                await pc.setRemoteDescription(new RTCSessionDescription(offerDesc))
                hasRemoteDescriptionRef.current = true

                // Process queued ICE candidates
                console.log("[v0] Processing", iceCandidatesQueueRef.current.length, "queued ICE candidates")
                for (const candidate of iceCandidatesQueueRef.current) {
                  await pc.addIceCandidate(candidate)
                }
                iceCandidatesQueueRef.current = []

                // Create and send answer
                const answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)

                await supabase.from("signaling").insert({
                  room_id: roomId,
                  from_user_id: userId,
                  to_user_id: partnerId,
                  type: "answer",
                  sdp: JSON.stringify(answer),
                })
                console.log("[v0] Answer sent")
              } else if (signal.type === "answer" && isInitiator) {
                console.log("[v0] Received answer from partner")
                const answerDesc = JSON.parse(signal.sdp)
                await pc.setRemoteDescription(new RTCSessionDescription(answerDesc))
                hasRemoteDescriptionRef.current = true

                // Process queued ICE candidates
                console.log("[v0] Processing", iceCandidatesQueueRef.current.length, "queued ICE candidates")
                for (const candidate of iceCandidatesQueueRef.current) {
                  await pc.addIceCandidate(candidate)
                }
                iceCandidatesQueueRef.current = []
              }
            }
          }

          // Poll for ICE candidates
          const { data: iceCandidates } = await supabase
            .from("ice_candidates")
            .select("*")
            .eq("room_id", roomId)
            .eq("from_user_id", partnerId)
            .eq("to_user_id", userId)
            .order("created_at", { ascending: true })

          if (iceCandidates && iceCandidates.length > 0) {
            for (const ice of iceCandidates) {
              if (processedIceCandidateIds.current.has(ice.id)) continue
              processedIceCandidateIds.current.add(ice.id)

              const pc = peerConnectionRef.current
              if (!pc || pc.connectionState === "closed") break

              try {
                const candidateObj = JSON.parse(ice.candidate)
                const candidate = new RTCIceCandidate(candidateObj)

                if (hasRemoteDescriptionRef.current) {
                  await pc.addIceCandidate(candidate)
                  console.log("[v0] Added ICE candidate directly")
                } else {
                  iceCandidatesQueueRef.current.push(candidate)
                  console.log("[v0] Queued ICE candidate")
                }
              } catch (error) {
                console.error("[v0] Error processing ICE candidate:", error)
              }
            }
          }
        } catch (error) {
          console.error("[v0] Signaling poll error:", error)
        }
      }

      signalingPollingRef.current = setInterval(pollForSignaling, 100)
      pollForSignaling()

      if (isInitiator) {
        try {
          console.log("[v0] Creating offer as initiator...")
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          })
          await pc.setLocalDescription(offer)

          // Send offer with retries
          let offerSent = false
          let retries = 0
          const sendOfferWithRetry = async () => {
            try {
              await supabase.from("signaling").insert({
                room_id: roomId,
                from_user_id: userId,
                to_user_id: partnerId,
                type: "offer",
                sdp: JSON.stringify(offer),
              })
              offerSent = true
              console.log("[v0] Offer sent to database")
            } catch (error) {
              retries++
              if (retries < 5) {
                console.log("[v0] Retrying offer send (attempt", retries, ")...")
                setTimeout(sendOfferWithRetry, 200)
              } else {
                console.error("[v0] Failed to send offer after 5 retries:", error)
              }
            }
          }
          sendOfferWithRetry()
        } catch (error) {
          console.error("[v0] Error creating offer:", error)
        }
      }
    },
    [userId, attachStreamToVideo],
  )

  const startSearching = useCallback(async () => {
    if (limitReached) return

    setIsLoading(true)
    setVideoState("searching")

    try {
      const stream = await getLocalStream()
      if (!stream) {
        setIsLoading(false)
        return
      }

      const result = await joinVideoQueue()

      if (!result.success) {
        console.error("[v0] Failed to join queue:", result.error)
        setVideoState("idle")
        setIsLoading(false)
        return
      }

      currentRoomIdRef.current = result.roomId

      if (result.matched && result.partnerId && result.partnerProfile) {
        currentPartnerIdRef.current = result.partnerId
        setCurrentPartner(result.partnerProfile as PartnerProfile)
        setVideoState("connecting")
        setConnectionStatus("Estabelecendo conexão...")
        setIsLoading(false)

        const isInitiator = userId < result.partnerId
        await setupWebRTC(result.roomId!, isInitiator, result.partnerId)
        return
      }

      // Poll for room status
      pollingRef.current = setInterval(async () => {
        if (!currentRoomIdRef.current) return

        const status = await checkRoomStatus(currentRoomIdRef.current)

        if (status.status === "active" && status.partnerId && status.partnerProfile) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }

          currentPartnerIdRef.current = status.partnerId
          setCurrentPartner(status.partnerProfile as PartnerProfile)
          setVideoState("connecting")
          setConnectionStatus("Estabelecendo conexão...")

          // Determine initiator
          const isInitiator = userId < status.partnerId

          await setupWebRTC(currentRoomIdRef.current!, isInitiator, status.partnerId)
        }
      }, 1500)
    } catch (error) {
      console.error("[v0] Error starting search:", error)
      setVideoState("idle")
    } finally {
      setIsLoading(false)
    }
  }, [userId, getLocalStream, setupWebRTC, limitReached])

  const endCall = useCallback(async () => {
    await cleanup()
    setVideoState("ended")
    setCurrentPartner(null)
  }, [cleanup])

  const skipToNext = useCallback(async () => {
    await cleanup()
    setVideoState("idle")
    setCurrentPartner(null)
    startSearching()
  }, [cleanup, startSearching])

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
    facingModeRef.current = facingModeRef.current === "user" ? "environment" : "user"

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingModeRef.current },
        audio: true,
      })

      localStreamRef.current = newStream
      attachStreamToVideo(localVideoRef.current, newStream, "local-flipped")

      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders()
        const videoSender = senders.find((s) => s.track?.kind === "video")
        const audioSender = senders.find((s) => s.track?.kind === "audio")

        const newVideoTrack = newStream.getVideoTracks()[0]
        const newAudioTrack = newStream.getAudioTracks()[0]

        if (videoSender && newVideoTrack) {
          await videoSender.replaceTrack(newVideoTrack)
        }
        if (audioSender && newAudioTrack) {
          await audioSender.replaceTrack(newAudioTrack)
        }
      }
    } catch (error) {
      console.error("[v0] Error flipping camera:", error)
    }
  }, [attachStreamToVideo])

  const handleLike = useCallback(async () => {
    if (!currentPartner || isLiked) return
    setIsLiked(true)

    try {
      await likeUser(currentPartner.id)
    } catch (error) {
      console.error("Error liking user:", error)
    }
  }, [currentPartner, isLiked])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Videochamada</h1>
            <p className="text-sm text-muted-foreground">Conecte-se instantaneamente com empreendedores</p>
          </div>
          {remainingCalls !== null && !limitReached && (
            <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">{remainingCalls} chamadas restantes</span>
            </div>
          )}
        </div>
      </div>

      {/* Permission Denied State */}
      {videoState === "permission_denied" && (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center">
            <div className="mb-6 flex h-24 w-24 mx-auto items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-foreground">Acesso Negado</h2>
            <p className="mb-6 max-w-md text-muted-foreground">{permissionError}</p>
            <Button onClick={() => setVideoState("idle")} variant="outline">
              Tentar Novamente
            </Button>
          </div>
        </div>
      )}

      {/* Limit Reached State */}
      {limitReached && videoState === "idle" && (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center">
            <div className="mb-6 flex h-24 w-24 mx-auto items-center justify-center rounded-full bg-yellow-500/10">
              <Clock className="h-12 w-12 text-yellow-500" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-foreground">Limite Diário Atingido</h2>
            <p className="mb-2 text-muted-foreground">Você atingiu o limite de 15 videochamadas por dia.</p>
            <p className="mb-6 text-sm text-muted-foreground">Próximo reset em: {timeUntilReset}</p>
          </div>
        </div>
      )}

      {/* Main Video Container */}
      {videoState !== "permission_denied" && !limitReached && (
        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          {/* Remote Video - Left/Top */}
          <div className="relative h-1/2 lg:h-full lg:w-1/2 w-full bg-slate-900">
            {/* Video element always rendered */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 h-full w-full object-contain z-0"
            />

            {/* Idle state overlay */}
            {videoState === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-8 text-center z-10">
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-pink-500/20">
                  <Video className="h-12 w-12 text-primary" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-foreground">Pronto para conectar?</h2>
                <p className="mb-6 max-w-sm text-muted-foreground">
                  Inicie uma videochamada e conheça empreendedores em tempo real
                </p>
                <Button
                  onClick={startSearching}
                  disabled={isLoading}
                  size="lg"
                  className="bg-gradient-to-r from-primary to-pink-500 px-8"
                >
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Video className="mr-2 h-5 w-5" />}
                  Iniciar Videochamada
                </Button>
              </div>
            )}

            {/* Searching state overlay */}
            {videoState === "searching" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-8 text-center z-10">
                <div className="relative mb-6">
                  <div className="h-24 w-24 animate-spin rounded-full border-4 border-primary/20 border-t-primary"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-pink-500"></div>
                  </div>
                </div>
                <h2 className="mb-2 text-2xl font-bold text-foreground">Buscando empreendedor...</h2>
                <p className="mb-4 flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Tempo de espera: {formatWaitTime(waitTime)}
                </p>
                <Button onClick={endCall} variant="outline">
                  Cancelar
                </Button>
              </div>
            )}

            {/* Connecting state overlay */}
            {videoState === "connecting" && currentPartner && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-8 text-center z-10">
                <Avatar className="mb-4 h-24 w-24 ring-4 ring-primary/20">
                  <AvatarImage src={currentPartner.avatar_url || undefined} alt={currentPartner.full_name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-pink-500 text-2xl text-white">
                    {currentPartner.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="mb-4 flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-lg font-medium text-foreground">Conectando...</span>
                </div>
                <p className="text-muted-foreground">{connectionStatus}</p>
              </div>
            )}

            {/* Connected state - partner info and controls */}
            {videoState === "connected" && currentPartner && (
              <>
                {/* Loading indicator moved to non-blocking position with pointer-events-none */}
                {!remoteVideoReady && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
                      <p className="text-muted-foreground">Carregando vídeo...</p>
                    </div>
                  </div>
                )}

                {/* Partner Info */}
                <div className="absolute left-4 top-4 flex items-center gap-3 rounded-lg bg-black/50 p-2 backdrop-blur-sm z-20">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={currentPartner.avatar_url || undefined} />
                    <AvatarFallback>{currentPartner.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-white">{currentPartner.full_name}</p>
                    {currentPartner.city && <p className="text-xs text-white/70">{currentPartner.city}</p>}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2 z-20">
                  <Button
                    onClick={handleLike}
                    disabled={isLiked}
                    size="icon"
                    className={`h-12 w-12 lg:h-14 lg:w-14 rounded-full ${isLiked ? "bg-pink-500" : "bg-pink-500/80 hover:bg-pink-500"}`}
                  >
                    <Heart className={`h-6 w-6 lg:h-7 lg:w-7 ${isLiked ? "fill-white" : ""}`} />
                  </Button>
                  <Button
                    onClick={skipToNext}
                    size="icon"
                    className="h-12 w-12 lg:h-14 lg:w-14 rounded-full bg-blue-500 hover:bg-blue-600"
                  >
                    <SkipForward className="h-6 w-6 lg:h-7 lg:w-7" />
                  </Button>
                </div>

                {/* End call button */}
                <Button
                  onClick={endCall}
                  size="icon"
                  className="absolute left-4 bottom-4 h-10 w-10 lg:h-12 lg:w-12 rounded-full bg-red-500 hover:bg-red-600 z-20"
                >
                  <PhoneOff className="h-5 w-5 lg:h-6 lg:w-6" />
                </Button>
              </>
            )}

            {/* Ended state */}
            {videoState === "ended" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-8 text-center z-10">
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
                  <PhoneOff className="h-12 w-12 text-muted-foreground" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-foreground">Chamada Encerrada</h2>
                <p className="mb-6 text-muted-foreground">Obrigado por usar o Connext!</p>
                <Button
                  onClick={() => {
                    setVideoState("idle")
                    startSearching()
                  }}
                  className="bg-gradient-to-r from-primary to-pink-500"
                >
                  Nova Videochamada
                </Button>
              </div>
            )}
          </div>

          {/* Local Video - Right/Bottom */}
          <div className="relative h-1/2 lg:h-full lg:w-1/2 w-full bg-slate-800">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
            />

            {!localVideoReady && (
              <div className="absolute inset-0 flex h-full items-center justify-center bg-slate-800">
                <p className="text-muted-foreground">Câmera desativada</p>
              </div>
            )}

            {/* Flip camera button */}
            {localVideoReady && (
              <Button
                onClick={flipCamera}
                size="icon"
                variant="secondary"
                className="absolute right-4 top-4 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70"
              >
                <SwitchCamera className="h-5 w-5 text-white" />
              </Button>
            )}

            {/* Local video controls */}
            {localVideoReady && (
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
                <Button
                  onClick={toggleMute}
                  size="icon"
                  variant={isMuted ? "destructive" : "secondary"}
                  className="h-12 w-12 rounded-full"
                >
                  {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>
                <Button
                  onClick={toggleVideo}
                  size="icon"
                  variant={isVideoOff ? "destructive" : "secondary"}
                  className="h-12 w-12 rounded-full"
                >
                  {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
