"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  VideoIcon,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  SkipForward,
  Heart,
  AlertCircle,
  Loader2,
  Clock,
  SwitchCamera,
  Search,
} from "lucide-react"
import { getRemainingCalls } from "@/app/actions/video"
import { joinVideoQueue, checkRoomStatus, leaveVideoQueue, likeUser } from "@/lib/video-functions"
import type { RealtimeChannel } from "@supabase/supabase-js"

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

type VideoState =
  | "idle"
  | "searching"
  | "connecting"
  | "connected"
  | "ended"
  | "permission_denied"
  | "matched"
  | "error"
  | "waiting" // Added for new state

export function VideoPage({ userId, userProfile }: VideoPageProps) {
  const router = useRouter()
  const supabase = createBrowserClient()

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
  const facingModeRef = useRef<"user" | "environment">("user")
  const currentPartnerIdRef = useRef<string | null>(null)
  const isInitiatorRef = useRef<boolean>(false)
  const signalingPollingRef = useRef<NodeJS.Timeout | null>(null)
  const processedSignalingIds = useRef<Set<string>>(new Set())
  const processedIceCandidateIds = useRef<Set<string>>(new Set())
  const hasRemoteDescriptionRef = useRef(false)
  const iceCandidateBufferRef = useRef<RTCIceCandidate[]>([])

  const connectionAttemptRef = useRef(0)
  const maxConnectionAttempts = 5

  const realtimeChannelRef = useRef<RealtimeChannel | null>(null)

  const cleanup = useCallback(async () => {
    if (isCleaningUpRef.current) return
    isCleaningUpRef.current = true

    try {
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

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null
      }

      if (currentRoomIdRef.current) {
        try {
          await leaveVideoQueue(currentRoomIdRef.current, userId)
        } catch (leaveError) {
          console.log("[v0] Leave error (non-critical):", leaveError instanceof Error ? leaveError.message : leaveError)
        }
        currentRoomIdRef.current = null
      }

      currentPartnerIdRef.current = null
      processedSignalingIds.current.clear()
      processedIceCandidateIds.current.clear()
      hasRemoteDescriptionRef.current = false
      iceCandidateBufferRef.current = []
      connectionAttemptRef.current = 0

      if (realtimeChannelRef.current) {
        await supabase.removeChannel(realtimeChannelRef.current!)
        realtimeChannelRef.current = null
      }
    } finally {
      isCleaningUpRef.current = false
    }
  }, [userId, supabase])

  const handleConnectionStateChange = useCallback(async () => {
    if (!peerConnectionRef.current) return

    const state = peerConnectionRef.current.connectionState

    console.log("[v0] Connection state changed:", state)

    if (state === "connected") {
      console.log("[v0] CALL CONNECTED! ✅")
      setVideoState("connected")
      setConnectionStatus("") // Updated: User-friendly message
    } else if (state === "failed") {
      console.log("[v0] Connection failed, attempting restart...")
      if (connectionAttemptRef.current < maxConnectionAttempts) {
        connectionAttemptRef.current++
        setConnectionStatus("") // Updated: User-friendly message

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 2000))

        if (peerConnectionRef.current && currentRoomIdRef.current) {
          await setupWebRTC(currentRoomIdRef.current!, isInitiatorRef.current)
        }
      } else {
        setVideoState("error")
        setConnectionStatus("Falha na conexão") // Updated: User-friendly message
        setPermissionError("Falha na conexão") // Added
      }
    } else if (state === "disconnected" || state === "closed") {
      console.log("[v0] Peer connection closed:", state)
      setVideoState("idle")
      setCurrentPartner(null)
      setConnectionStatus("") // Updated: User-friendly message
      await cleanup()
    }
  }, [cleanup])

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
        console.error("[v0] No video element provided")
        return false
      }
      if (!stream || stream.getTracks().length === 0) {
        console.error("[v0] Invalid stream:", stream?.getTracks().length)
        return false
      }

      try {
        stream.getTracks().forEach((track) => {
          track.enabled = true
          console.log("[v0] Track enabled:", track.kind, track.enabled)
        })

        videoElement.srcObject = stream
        videoElement.muted = label.includes("local")
        videoElement.autoplay = true
        videoElement.playsInline = true
        videoElement.controls = false

        let playAttempts = 0
        const maxPlayAttempts = 5

        const playVideo = () => {
          playAttempts++
          console.log("[v0] Attempting to play video:", { label, attempt: playAttempts })

          videoElement
            .play()
            .then(() => {
              console.log("[v0] Video playing successfully:", label)
            })
            .catch((err) => {
              console.warn("[v0] Play error:", err.message)
              if (playAttempts < maxPlayAttempts) {
                setTimeout(playVideo, 200)
              }
            })
        }

        // Try to play immediately
        playVideo()

        // Also setup event listeners for when metadata loads
        videoElement.onloadedmetadata = () => {
          console.log("[v0] Metadata loaded:", label)
          playVideo()
        }

        videoElement.oncanplay = () => {
          console.log("[v0] Can play:", label)
          playVideo()
        }

        return true
      } catch (error) {
        console.error("[v0] Error attaching stream:", error)
        return false
      }
    },
    [],
  )

  const formatWaitTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  const setupWebRTC = useCallback(
    async (roomId: string, isInitiator: boolean) => {
      if (peerConnectionRef.current && peerConnectionRef.current.connectionState !== "closed") {
        console.log("[v0] setupWebRTC already active, skipping...")
        return
      }

      console.log("[v0] setupWebRTC starting:", { roomId, isInitiator })

      try {
        const localStream = await getLocalStream()

        let iceServers: RTCIceServer[] = [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          { urls: "stun:stun3.l.google.com:19302" },
          { urls: "stun:stun4.l.google.com:19302" },
        ]

        try {
          console.log("[v0] Fetching TURN credentials...")
          const response = await fetch("/api/turn-credentials")
          if (response.ok) {
            const data = await response.json()
            if (data.iceServers && data.iceServers.length > 0) {
              iceServers = data.iceServers
              console.log("[v0] TURN servers loaded:", iceServers.length)
            }
          }
        } catch (error) {
          console.warn("[v0] TURN fetch failed, using STUN only:", error)
        }

        console.log("[v0] Creating RTCPeerConnection with ICE servers:", iceServers.length)
        const pc = new RTCPeerConnection({
          iceServers,
          iceCandidatePoolSize: 10,
        })

        peerConnectionRef.current = pc

        pc.oniceconnectionstatechange = () => {
          console.log("[v0] ICE connection state:", pc.iceConnectionState)
        }

        pc.onconnectionstatechange = () => {
          console.log("[v0] Connection state:", pc.connectionState)
          handleConnectionStateChange()
        }

        pc.onsignalingstatechange = () => {
          console.log("[v0] Signaling state:", pc.signalingState)
        }

        if (!localStream || localStream.getTracks().length === 0) {
          console.error("[v0] ERROR: No valid local stream!")
          setVideoState("error")
          setConnectionStatus("Erro: Stream local inválido")
          return
        }

        console.log("[v0] Local stream verified:", {
          videoTracks: localStream.getVideoTracks().length,
          audioTracks: localStream.getAudioTracks().length,
        })

        localStreamRef.current = localStream
        console.log("[v0] Attaching local stream to video element")
        const attachResult = attachStreamToVideo(localVideoRef.current, localStream, "local")

        if (!attachResult) {
          console.error("[v0] Failed to attach stream to video element")
          setVideoState("permission_denied")
          setPermissionError("Falha ao exibir câmera")
          return
        }

        const videoTrack = localStream.getVideoTracks()[0]
        const audioTrack = localStream.getAudioTracks()[0]

        if (videoTrack) pc.addTrack(videoTrack, localStream)
        if (audioTrack) pc.addTrack(audioTrack, localStream)

        console.log("[v0] Tracks added to peer connection:", { videoTrack: !!videoTrack, audioTrack: !!audioTrack })

        pc.ontrack = (event) => {
          console.log("[v0] REMOTE TRACK RECEIVED:", { kind: event.track.kind })
          event.track.enabled = true

          const stream = event.streams[0]
          if (stream) {
            if (!remoteStreamRef.current) {
              remoteStreamRef.current = stream
            }

            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = stream
              remoteVideoRef.current.autoplay = true
              remoteVideoRef.current.playsInline = true

              remoteVideoRef.current.play().catch((e) => {
                console.error("[v0] Remote play error:", e)
              })
            }

            setRemoteVideoReady(true)
            setVideoState("connected")
            setConnectionStatus("") // Updated: User-friendly message
            console.log("[v0] CALL CONNECTED - Remote video attached")
          }
        }

        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            try {
              await supabase.from("ice_candidates").insert({
                room_id: roomId,
                from_user_id: userId,
                candidate: JSON.stringify(event.candidate.toJSON()),
              })
            } catch (error) {
              console.warn("[v0] Error sending ICE candidate:", error)
            }
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
            const { data: signals, error: signalError } = await supabase
              .from("signaling")
              .select("*")
              .eq("room_id", roomId)
              .order("created_at", { ascending: true })

            if (signalError) {
              console.error("[v0] Signal polling error:", signalError)
              return
            }

            if (signals && signals.length > 0) {
              console.log("[v0] Processing", signals.length, "signals")
              for (const signal of signals) {
                if (processedSignalingIds.current.has(signal.id)) continue
                processedSignalingIds.current.add(signal.id)

                const pc = peerConnectionRef.current
                if (!pc || pc.connectionState === "closed") break

                try {
                  if (signal.type === "offer" && !isInitiator) {
                    console.log("[v0] Processing OFFER")
                    const offerDesc = JSON.parse(signal.sdp)
                    await pc.setRemoteDescription(new RTCSessionDescription(offerDesc))
                    const answer = await pc.createAnswer()
                    await pc.setLocalDescription(answer)

                    await supabase.from("signaling").insert({
                      room_id: roomId,
                      from_user_id: userId,
                      type: "answer",
                      sdp: JSON.stringify(answer),
                    })
                    console.log("[v0] ANSWER SENT")
                  } else if (signal.type === "answer" && isInitiator) {
                    console.log("[v0] Processing ANSWER")
                    const answerDesc = JSON.parse(signal.sdp)
                    await pc.setRemoteDescription(new RTCSessionDescription(answerDesc))
                  }
                } catch (error) {
                  console.error("[v0] Signal processing error:", error)
                }
              }
            }

            const { data: iceCandidates, error: iceError } = await supabase
              .from("ice_candidates")
              .select("*")
              .eq("room_id", roomId)
              .order("created_at", { ascending: true })

            if (iceError) {
              console.error("[v0] ICE polling error:", iceError)
              return
            }

            if (iceCandidates && iceCandidates.length > 0) {
              for (const ice of iceCandidates) {
                if (processedIceCandidateIds.current.has(ice.id)) continue
                processedIceCandidateIds.current.add(ice.id)

                const pc = peerConnectionRef.current
                if (!pc || pc.connectionState === "closed") break

                try {
                  const candidateObj = JSON.parse(ice.candidate)
                  const candidate = new RTCIceCandidate(candidateObj)
                  await pc.addIceCandidate(candidate)
                } catch (error) {
                  console.warn("[v0] ICE candidate error:", error)
                }
              }
            }
          } catch (error) {
            console.error("[v0] Polling error:", error)
          }
        }

        console.log("[v0] Starting signaling poll")
        signalingPollingRef.current = setInterval(pollForSignaling, 50)
        await pollForSignaling()

        if (isInitiator) {
          try {
            console.log("[v0] INITIATOR: Creating offer")
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            })
            await pc.setLocalDescription(offer)

            const { error: insertError } = await supabase.from("signaling").insert({
              room_id: roomId,
              from_user_id: userId,
              type: "offer",
              sdp: JSON.stringify(offer),
            })
            if (insertError) {
              console.error("[v0] Offer send error:", insertError)
            } else {
              console.log("[v0] OFFER SENT")
            }
          } catch (error) {
            console.error("[v0] Offer creation error:", error)
          }
        } else {
          console.log("[v0] Waiting for offer...")
        }
      } catch (error) {
        console.error("[v0] WebRTC setup error:", error)
        setVideoState("error")
        setConnectionStatus("Erro ao conectar")
      }
    },
    [userId, handleConnectionStateChange, supabase],
  )

  const subscribeToQueueUpdates = useCallback(async () => {
    if (!currentRoomIdRef.current) return

    try {
      // Unsubscribe from old channel if exists
      if (realtimeChannelRef.current) {
        await supabase.removeChannel(realtimeChannelRef.current)
      }

      realtimeChannelRef.current = supabase
        .channel(`room:${currentRoomIdRef.current}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "video_queue",
            filter: `room_id=eq.${currentRoomIdRef.current}`,
          },
          async (payload: any) => {
            console.log("[v0] Queue update received:", payload)

            const updatedRow = payload.new

            // Check if we now have a match
            if (updatedRow.matched_user_id && !currentPartnerIdRef.current) {
              const partnerId = updatedRow.matched_user_id

              if (partnerId !== userId) {
                currentPartnerIdRef.current = partnerId

                // Fetch partner profile
                const { data: partnerProfile } = await supabase
                  .from("profiles")
                  .select("id, full_name, avatar_url, city")
                  .eq("id", partnerId)
                  .single()

                if (partnerProfile) {
                  setCurrentPartner(partnerProfile as PartnerProfile)
                }

                // Stop polling immediately
                if (pollingRef.current) {
                  clearInterval(pollingRef.current)
                  pollingRef.current = null
                }

                setVideoState("connecting")
                setConnectionStatus("") // Updated: User-friendly message
                const isInitiator = userId < partnerId
                await setupWebRTC(currentRoomIdRef.current!, isInitiator)
              }
            }
          },
        )
        .subscribe((status) => {
          console.log("[v0] Subscription status:", status)
        })
    } catch (error) {
      console.error("[v0] Error subscribing to queue updates:", error)
    }
  }, [userId, setupWebRTC, supabase])

  const startSearching = useCallback(async () => {
    if (limitReached) return

    setIsLoading(true)
    setVideoState("searching")
    setPermissionError("")
    setConnectionStatus("") // Updated: User-friendly message

    try {
      let stream: MediaStream | null = null

      try {
        stream = await getLocalStream()
      } catch (err) {
        console.error("[v0] getUserMedia failed:", err)
        setVideoState("permission_denied")
        setPermissionError(err.message)
        setIsLoading(false)
        return
      }

      if (!stream || stream.getTracks().length === 0) {
        setVideoState("permission_denied")
        setPermissionError("Nenhuma stream de mídia obtida")
        setIsLoading(false)
        return
      }

      localStreamRef.current = stream
      console.log("[v0] Attaching local stream to video element")
      const attachResult = attachStreamToVideo(localVideoRef.current, stream, "local")

      if (!attachResult) {
        console.error("[v0] Failed to attach stream to video element")
        setVideoState("permission_denied")
        setPermissionError("Falha ao exibir câmera")
        setIsLoading(false)
        return
      }

      setConnectionStatus("Conectando à fila...") // This message remains as it's specific to queue connection

      const result = await joinVideoQueue({
        userId,
        userProfile,
      })

      if (!result.success) {
        console.error("[v0] Failed to join queue:", result.error)
        stream.getTracks().forEach((track) => track.stop())
        localStreamRef.current = null
        setVideoState("idle")
        setConnectionStatus("")
        setPermissionError(result.error || "Falha ao conectar à fila")
        setIsLoading(false)
        return
      }

      currentRoomIdRef.current = result.roomId
      console.log("[v0] Joined queue with room:", result.roomId)

      await subscribeToQueueUpdates()

      if (result.matched && result.partnerId && result.partnerProfile) {
        console.log("[v0] Immediate match found:", result.partnerId)
        currentPartnerIdRef.current = result.partnerId
        setCurrentPartner(result.partnerProfile as PartnerProfile)
        setVideoState("connecting")
        setConnectionStatus("") // Updated: User-friendly message
        setIsLoading(false)

        const isInitiator = userId < result.partnerId
        await setupWebRTC(result.roomId!, isInitiator)
        return
      }

      let checkCount = 0
      const maxChecks = 150 // 150 checks * 300ms = 45 seconds

      setConnectionStatus("") // Updated: User-friendly message
      setVideoState("waiting") // Changed from "searching" to "waiting" for clarity

      pollingRef.current = setInterval(async () => {
        checkCount++

        if (checkCount >= maxChecks) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }
          setVideoState("idle")
          setConnectionStatus("")
          setPermissionError("Nenhum usuário disponível. Tente novamente.")
          // Stop local stream if no match found after timeout
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop())
            localStreamRef.current = null
          }
          setIsLoading(false)
          return
        }

        try {
          const status = await checkRoomStatus(currentRoomIdRef.current, userId)

          if (status.status === "active" && status.partnerId && status.partnerProfile) {
            if (pollingRef.current) {
              clearInterval(pollingRef.current)
              pollingRef.current = null
            }

            console.log("[v0] Match found during polling:", status.partnerId)
            currentPartnerIdRef.current = status.partnerId
            setCurrentPartner(status.partnerProfile as PartnerProfile)
            setVideoState("connecting")
            setConnectionStatus("") // Updated: User-friendly message

            const isInitiator = userId < status.partnerId

            await setupWebRTC(currentRoomIdRef.current!, isInitiator)
          }
        } catch (error) {
          console.log("[v0] Polling error (non-critical):", error instanceof Error ? error.message : error)
        }
      }, 300)
    } catch (error) {
      console.error("[v0] Error starting search:", error)
      const err = error as Error
      setVideoState("permission_denied")
      setPermissionError(err?.message || "Erro desconhecido ao iniciar câmera")
      setConnectionStatus("")
    } finally {
      setIsLoading(false)
    }
  }, [subscribeToQueueUpdates, userId, limitReached, attachStreamToVideo, setupWebRTC, userProfile])

  const endCall = useCallback(async () => {
    await cleanup()
    setVideoState("ended")
    setCurrentPartner(null)
    setConnectionStatus("") // Clear status on end
  }, [cleanup])

  // Alias for the endCall function used in error states
  const handleEndCall = endCall

  const skipToNext = useCallback(async () => {
    await cleanup()
    setVideoState("idle")
    setCurrentPartner(null)
    setConnectionStatus("") // Clear status on skip
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
      setPermissionError("Erro ao trocar câmera.") // Added error handling
    }
  }, [attachStreamToVideo])

  const handleLike = useCallback(async () => {
    if (!currentPartner || isLiked) return
    setIsLiked(true)

    try {
      await likeUser(currentPartner.id)
      // In this version, we'll simulate the match detection or rely on the backend check
      // For now, let's call it after a short delay if it's a match (this should be triggered by real data in production)
    } catch (error) {
      console.error("Error liking user:", error)
    }
  }, [currentPartner, isLiked])

  const handleMatchSuccess = useCallback(() => {
    const recordAndRedirect = async () => {
      if (!currentPartner || !userId) return

      try {
        const { error } = await supabase.from("matches").insert({
          user1_id: userId < currentPartner.id ? userId : currentPartner.id,
          user2_id: userId < currentPartner.id ? currentPartner.id : userId,
        })

        if (!error) {
          // Redirect immediately to matches page with highlight of the new match
          router.push(`/dashboard/matches?highlight=${currentPartner.id}&new=true`)
        } else {
          console.error("[v0] Match record error:", error)
          // Still redirect even if recording fails
          router.push(`/dashboard/matches?highlight=${currentPartner.id}`)
        }
      } catch (err) {
        console.error("[v0] Error recording match:", err)
        // Fallback redirect
        router.push("/dashboard/matches")
      }
    }

    setTimeout(recordAndRedirect, 2000)
  }, [currentPartner, userId, router, supabase])

  // Call handleMatchSuccess after handleLike if it's a match
  useEffect(() => {
    if (isLiked && currentPartner) {
      handleMatchSuccess()
    }
  }, [isLiked, currentPartner, handleMatchSuccess])

  // New handler for starting the call
  const handleStartCall = async () => {
    console.log("[v0] Starting video call...")

    if (videoState !== "idle") {
      console.warn("[v0] Video state is not idle:", videoState)
      return
    }

    setIsLoading(true)
    setConnectionStatus("")
    setPermissionError("")

    try {
      const stream = await getLocalStream()
      if (!stream) {
        setPermissionError("Permissão de câmera e microfone necessárias")
        setIsLoading(false)
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setPermissionError("Usuário não autenticado")
        setIsLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, city")
        .eq("id", user.id)
        .single()

      const result = await joinVideoQueue({
        userId: user.id,
        userProfile: profile || { full_name: "Usuário", avatar_url: "", city: "" },
      })

      if (!result.success) {
        console.error("[v0] Failed to join queue:", result.error)
        stream.getTracks().forEach((track) => track.stop())
        localStreamRef.current = null
        setVideoState("idle")
        setConnectionStatus("")
        setPermissionError(result.error || "Falha ao conectar à fila")
        setIsLoading(false)
        return
      }

      console.log("[v0] Joined queue successfully, roomId:", result.roomId)
      currentRoomIdRef.current = result.roomId
      currentPartnerIdRef.current = result.partnerId || null
      connectionAttemptRef.current = 0

      if (result.matched && result.partnerId) {
        console.log("[v0] Matched instantly with:", result.partnerId)
        setCurrentPartner(result.partnerProfile || null)
        setVideoState("connecting")
        setConnectionStatus("")
        setIsLoading(false)

        const isInitiator = user.id < result.partnerId
        await setupWebRTC(result.roomId, isInitiator)
        return
      }

      let checkCount = 0
      const maxChecks = 150

      setConnectionStatus("")
      setVideoState("waiting")

      pollingRef.current = setInterval(async () => {
        checkCount++

        if (checkCount > maxChecks) {
          clearInterval(pollingRef.current!)
          pollingRef.current = null
          setVideoState("idle")
          setConnectionStatus("")
          setPermissionError("Ninguém disponível no momento. Tente novamente.")
          stream.getTracks().forEach((track) => track.stop()) // Stop stream on timeout
          localStreamRef.current = null
          setIsLoading(false)
          return
        }

        const status = await checkRoomStatus(result.roomId, user.id)

        if (status.status === "active" && status.partnerId) {
          clearInterval(pollingRef.current!)
          pollingRef.current = null

          console.log("[v0] Match found during polling:", status.partnerId)
          setCurrentPartner(status.partnerProfile || null)
          currentPartnerIdRef.current = status.partnerId
          setVideoState("connecting")
          setConnectionStatus("")
          setIsLoading(false)

          const isInitiator = user.id < status.partnerId
          await setupWebRTC(result.roomId, isInitiator)
        }
      }, 300)
    } catch (error) {
      console.error("[v0] Error starting call:", error)
      setVideoState("idle")
      setConnectionStatus("")
      setPermissionError("Erro ao iniciar chamada")
      setIsLoading(false)
    }
  }

  if (videoState === "permission_denied") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <AlertCircle className="w-12 h-12 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">Acesso Negado</h1>
          <p className="text-muted-foreground mb-6 max-w-md">{permissionError}</p>

          <div className="bg-card border border-border rounded-xl p-6 mb-6 text-left max-w-md">
            <h3 className="font-semibold text-foreground mb-3">Como permitir acesso:</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-semibold">1.</span>
                <span>
                  Clique no ícone de <strong className="text-foreground">cadeado</strong> ao lado da URL no navegador
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-semibold">2.</span>
                <span>
                  Selecione <strong className="text-foreground">"Configurações do site"</strong>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-semibold">3.</span>
                <span>
                  Permita acesso à <strong className="text-foreground">Câmera</strong> e{" "}
                  <strong className="text-foreground">Microfone</strong>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-semibold">4.</span>
                <span>Recarregue a página ou clique em "Tentar Novamente"</span>
              </li>
            </ol>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={async () => {
                setPermissionError(null)
                setVideoState("idle")
                await startSearching()
              }}
              className="gradient-bg"
            >
              Tentar Novamente
            </Button>
            <Button onClick={() => router.push("/dashboard")} variant="outline">
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background p-2 md:p-4 lg:p-6 gap-2">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 lg:gap-4 min-h-0">
        {/* Remote Video / Status - Takes 50% on desktop, 100% on mobile */}
        <div className="relative flex-1 min-h-0 overflow-hidden rounded-2xl md:rounded-3xl bg-secondary border border-border">
          {videoState === "connected" || videoState === "matched" ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`h-full w-full object-cover transition-opacity duration-700 ${remoteVideoReady ? "opacity-100" : "opacity-0"}`}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 md:p-6 text-center">
              {videoState === "searching" || videoState === "waiting" ? ( // Updated for 'waiting' state
                <div className="mb-4 md:mb-6 flex h-16 md:h-24 w-16 md:w-24 items-center justify-center rounded-full bg-primary/10">
                  <div className="h-8 md:h-12 w-8 md:w-12 animate-spin rounded-full border-4 border-primary"></div>
                </div>
              ) : videoState === "idle" ? (
                <div className="mb-4 md:mb-6 flex h-16 md:h-24 w-16 md:w-24 items-center justify-center rounded-full bg-primary/10">
                  <div className="h-8 md:h-12 w-8 md:w-12 flex items-center justify-center rounded-full bg-primary">
                    <VideoIcon className="h-4 md:h-6 w-4 md:w-6 text-primary-foreground" />
                  </div>
                </div>
              ) : videoState === "connecting" ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Conectando com um empreendedor...</span>
                </div>
              ) : videoState === "error" ? (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">
                    {connectionStatus || permissionError || "Erro de conexão"}
                  </span>
                </div>
              ) : null}

              <h2 className="mb-2 text-lg md:text-2xl font-bold text-foreground">
                {videoState === "searching" || videoState === "waiting"
                  ? "Conectando com um empreendedor..." // Updated message
                  : videoState === "idle"
                    ? "Pronto para conectar?"
                    : videoState === "connecting"
                      ? "Conectando com um empreendedor..." // Updated message
                      : videoState === "error"
                        ? "Erro de Conexão"
                        : "Erro de Conexão"}
              </h2>

              {videoState === "searching" || videoState === "waiting" ? ( // Updated for 'waiting' state
                <p className="mb-4 flex items-center justify-center gap-2 text-xs md:text-sm text-muted-foreground">
                  <Clock className="h-3 md:h-4 w-3 md:w-4" />
                  Tempo de espera: {formatWaitTime(waitTime)}
                </p>
              ) : videoState === "idle" ? (
                <p className="mb-4 md:mb-6 max-w-md text-xs md:text-sm text-muted-foreground">
                  Clique no botão abaixo para começar a encontrar outros empreendedores em tempo real.
                </p>
              ) : null}

              {videoState === "searching" || videoState === "waiting" ? ( // Updated for 'waiting' state
                <Button onClick={endCall} variant="outline" size="sm" className="text-xs md:text-sm bg-transparent">
                  Cancelar
                </Button>
              ) : videoState === "idle" ? (
                <Button
                  onClick={handleStartCall} // Changed from startSearching
                  className="gradient-bg text-primary-foreground gap-2 text-xs md:text-sm h-8 md:h-10"
                >
                  <Search className="h-3 md:h-4 w-3 md:w-4" />
                  Começar Chamada
                </Button>
              ) : videoState === "connecting" ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Conectando com um empreendedor...</span>
                </div>
              ) : videoState === "error" ? (
                <Button
                  onClick={handleStartCall} // Changed from startSearching
                  className="gradient-bg text-primary-foreground gap-2 text-xs md:text-sm h-8 md:h-10"
                >
                  Tentar Novamente
                </Button>
              ) : null}
            </div>
          )}

          {/* Partner Info Overlay */}
          {currentPartner && (videoState === "connected" || videoState === "matched") && (
            <div className="absolute top-2 md:top-4 left-2 md:left-4 z-20">
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-2 md:px-3 py-1 md:py-2 rounded-lg md:rounded-xl border border-white/10">
                <Avatar className="h-8 md:h-10 w-8 md:w-10 border-2 border-primary/50">
                  <AvatarImage src={currentPartner.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback>{currentPartner.full_name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold text-white text-xs md:text-sm leading-tight">
                    {currentPartner.full_name}
                  </div>
                  <div className="text-[8px] md:text-[10px] text-zinc-300">{currentPartner.city || "Brasil"}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Local Video (Self) - Hidden on mobile initial state, shown during call */}
        <div className="relative flex-1 min-h-0 overflow-hidden rounded-2xl md:rounded-3xl bg-secondary border border-border hidden md:flex">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={cn(
              "h-full w-full object-cover transition-all duration-500",
              facingModeRef.current === "user" && "mirror-mode",
              isVideoOff && "opacity-0",
            )}
          />

          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
              <Avatar className="h-16 md:h-24 w-16 md:w-24 border-4 border-zinc-700">
                <AvatarImage src={userProfile.avatar_url || "/placeholder.svg"} />
                <AvatarFallback className="text-xl md:text-3xl text-zinc-400 bg-zinc-900">
                  {userProfile.full_name[0]}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* Local Controls Overlay */}
          <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 md:gap-4">
            <Button
              size="icon"
              variant={isMuted ? "destructive" : "secondary"}
              className="h-8 md:h-12 w-8 md:w-12 rounded-full shadow-lg text-xs md:text-sm"
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="h-3 md:h-5 w-3 md:w-5" /> : <Mic className="h-3 md:h-5 w-3 md:w-5" />}
            </Button>
            <Button
              size="icon"
              variant={isVideoOff ? "destructive" : "secondary"}
              className="h-8 md:h-12 w-8 md:w-12 rounded-full shadow-lg text-xs md:text-sm"
              onClick={toggleVideo}
            >
              {isVideoOff ? (
                <VideoOff className="h-3 md:h-5 w-3 md:w-5" />
              ) : (
                <VideoIcon className="h-3 md:h-5 w-3 md:w-5" />
              )}
            </Button>
            <Button
              size="icon"
              className="h-8 md:h-12 w-8 md:w-12 rounded-full bg-blue-600 hover:bg-blue-700 transition-all hover:scale-110 shadow-lg text-xs md:text-sm"
              onClick={flipCamera}
            >
              <SwitchCamera className="h-3 md:h-5 w-3 md:w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Floating Controls for Call Actions - Mobile optimized */}
      {videoState === "connected" && (
        <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 md:gap-6 px-4 md:px-8 py-2 md:py-4 bg-black/20 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl">
          <Button
            size="icon"
            variant="destructive"
            className="h-10 md:h-14 w-10 md:w-14 rounded-full hover:scale-110 transition-transform shadow-xl text-xs md:text-sm"
            onClick={endCall}
          >
            <PhoneOff className="h-4 md:h-6 w-4 md:w-6" />
          </Button>

          <Button
            size="icon"
            className={cn(
              "h-10 md:h-14 w-10 md:w-14 rounded-full transition-all duration-300 hover:scale-110 shadow-xl text-xs md:text-sm",
              isLiked ? "bg-pink-500 hover:bg-pink-600" : "bg-zinc-800 hover:bg-zinc-700",
            )}
            onClick={handleLike}
          >
            <Heart className={cn("h-4 md:h-6 w-4 md:w-6", isLiked && "fill-current animate-pulse")} />
          </Button>

          <Button
            size="icon"
            className="h-10 md:h-14 w-10 md:w-14 rounded-full bg-blue-600 hover:bg-blue-700 transition-all hover:scale-110 shadow-xl text-xs md:text-sm"
            onClick={skipToNext}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 md:h-6 w-4 md:w-6 animate-spin" />
            ) : (
              <SkipForward className="h-4 md:h-6 w-4 md:w-6" />
            )}
          </Button>
        </div>
      )}

      {/* Status Section Updates */}
      {videoState === "waiting" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Loader2 className="h-6 w-6 animate-spin text-primary-foreground" />
            </div>
            <p className="text-sm text-white">Conectando com um empreendedor...</p>
          </div>
        </div>
      )}

      {videoState === "connecting" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Loader2 className="h-6 w-6 animate-spin text-primary-foreground" />
            </div>
            <p className="text-sm text-white">Conectando com um empreendedor...</p>
          </div>
        </div>
      )}

      {videoState === "error" && permissionError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 text-center px-6">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-white">{permissionError}</p>
            <button
              onClick={handleEndCall}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

async function getLocalStream() {
  console.log("[v0] Requesting local media stream")

  try {
    // First, try with optimal constraints
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: { ideal: "user" },
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })

    console.log("[v0] Local stream acquired successfully:", {
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length,
    })

    return stream
  } catch (error: any) {
    console.warn("[v0] Optimal constraints failed, trying fallback:", error.message)

    try {
      // Fallback: basic constraints without facingMode
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      console.log("[v0] Local stream acquired with fallback constraints")
      return stream
    } catch (fallbackError: any) {
      console.error("[v0] getUserMedia failed completely:", {
        originalError: error.message,
        fallbackError: fallbackError.message,
      })
      throw new Error(`Não foi possível acessar câmera/microfone: ${fallbackError.message}`)
    }
  }
}
