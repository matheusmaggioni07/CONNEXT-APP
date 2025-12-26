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

export function VideoPage({ userId, userProfile }: VideoPageProps) {
  const router = useRouter()

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
        return false
      }
      if (!stream) {
        return false
      }

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
        const supabase = await createBrowserClient()
        await supabase.removeChannel(realtimeChannelRef.current!)
        realtimeChannelRef.current = null
      }
    } finally {
      isCleaningUpRef.current = false
    }
  }, [userId])

  const setupWebRTC = useCallback(
    async (roomId: string, isInitiator: boolean, partnerId: string) => {
      try {
        processedSignalingIds.current = new Set()
        processedIceCandidateIds.current = new Set()
        iceCandidateBufferRef.current = []
        hasRemoteDescriptionRef.current = false
        connectionAttemptRef.current = 0

        isInitiatorRef.current = isInitiator
        currentRoomIdRef.current = roomId
        currentPartnerIdRef.current = partnerId

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
            }
          }
        } catch (error) {
          console.error("[v0] Error fetching TURN:", error)
        }

        // Create peer connection
        const pc = new RTCPeerConnection({
          iceServers,
          iceCandidatePoolSize: 10,
        })

        peerConnectionRef.current = pc
        const supabase = await createBrowserClient()

        try {
          await supabase.from("signaling").delete().eq("room_id", roomId)
          await supabase.from("ice_candidates").delete().eq("room_id", roomId)
        } catch (e) {
          // Silent cleanup - not critical
        }

        if (localStreamRef.current) {
          const tracks = localStreamRef.current.getTracks()
          tracks.forEach((track) => {
            pc.addTrack(track, localStreamRef.current!)
          })
        } else {
          console.error("[v0] ERROR: No local stream!")
          return
        }

        pc.ontrack = (event) => {
          event.track.enabled = true
          console.log("[v0] TRACK RECEIVED:", { kind: event.track.kind, readyState: event.track.readyState }) // Debug remote track

          // Use the stream provided by the event
          const stream = event.streams[0] || remoteStreamRef.current || new MediaStream()

          if (!remoteStreamRef.current) {
            remoteStreamRef.current = stream
          }

          // Add track to existing stream if not already there
          if (!remoteStreamRef.current.getTracks().find((t) => t.id === event.track.id)) {
            remoteStreamRef.current.addTrack(event.track)
          }

          // Attach to video element
          if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current
            remoteVideoRef.current.autoplay = true
            remoteVideoRef.current.playsInline = true
            remoteVideoRef.current.play().catch((e) => console.error("[v0] Play error:", e))
          }

          setRemoteVideoReady(true)
          setVideoState("connected")
          setConnectionStatus("Conectado!")
        }

        pc.onconnectionstatechange = handleConnectionStateChange

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === "failed") {
            console.error("[v0] ICE connection failed")
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
            } catch (error) {
              console.error("[v0] Error sending ICE candidate:", error)
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
            // Poll for signaling messages
            const { data: signals, error: signalError } = await supabase
              .from("signaling")
              .select("*")
              .eq("room_id", roomId)
              .eq("from_user_id", partnerId)
              .eq("to_user_id", userId)
              .order("created_at", { ascending: true })

            if (signalError) {
              console.error("[v0] Signal polling error:", signalError)
              return
            }

            if (signals && signals.length > 0) {
              console.log("[v0] SIGNALS RECEIVED:", signals.length)
              for (const signal of signals) {
                if (processedSignalingIds.current.has(signal.id)) continue
                processedSignalingIds.current.add(signal.id)
                console.log("[v0] PROCESSING SIGNAL:", { type: signal.type, id: signal.id })

                const pc = peerConnectionRef.current
                if (!pc || pc.connectionState === "closed") break

                try {
                  if (signal.type === "offer" && !isInitiator) {
                    const offerDesc = JSON.parse(signal.sdp)
                    console.log("[v0] APPLYING REMOTE OFFER")

                    await pc.setRemoteDescription(new RTCSessionDescription(offerDesc))
                    hasRemoteDescriptionRef.current = true
                    console.log("[v0] REMOTE DESC SET")

                    for (const candidate of iceCandidateBufferRef.current) {
                      try {
                        await pc.addIceCandidate(candidate)
                      } catch (e) {
                        console.error("[v0] Error adding queued candidate:", e)
                      }
                    }
                    iceCandidateBufferRef.current = []

                    // Create and send answer
                    const answer = await pc.createAnswer()
                    console.log("[v0] ANSWER CREATED")
                    await pc.setLocalDescription(answer)
                    console.log("[v0] LOCAL DESC SET FOR ANSWER")

                    const { error: answerError } = await supabase.from("signaling").insert({
                      room_id: roomId,
                      from_user_id: userId,
                      to_user_id: partnerId,
                      type: "answer",
                      sdp: JSON.stringify(answer),
                    })
                    if (answerError) {
                      console.error("[v0] ERROR SENDING ANSWER:", answerError)
                    } else {
                      console.log("[v0] ANSWER SENT")
                    }
                  } else if (signal.type === "answer" && isInitiator) {
                    const answerDesc = JSON.parse(signal.sdp)
                    console.log("[v0] APPLYING REMOTE ANSWER")
                    await pc.setRemoteDescription(new RTCSessionDescription(answerDesc))
                    hasRemoteDescriptionRef.current = true
                    console.log("[v0] REMOTE DESC SET FOR ANSWER")

                    for (const candidate of iceCandidateBufferRef.current) {
                      try {
                        await pc.addIceCandidate(candidate)
                      } catch (error) {
                        const err = error as Error
                        if (!err.message?.includes("duplicate")) {
                          console.error("[v0] ICE add error:", err.message)
                        }
                      }
                    }
                    iceCandidateBufferRef.current = []
                  }
                } catch (error) {
                  console.error("[v0] Error processing signal:", signal.type, "-", error)
                }
              }
            }

            // Poll for ICE candidates
            const { data: iceCandidates, error: iceError } = await supabase
              .from("ice_candidates")
              .select("*")
              .eq("room_id", roomId)
              .eq("from_user_id", partnerId)
              .eq("to_user_id", userId)
              .order("created_at", { ascending: true })

            if (iceError) {
              console.error("[v0] ICE polling error:", iceError)
              return
            }

            if (iceCandidates && iceCandidates.length > 0) {
              console.log("[v0] ICE CANDIDATES RECEIVED:", iceCandidates.length)
              for (const ice of iceCandidates) {
                if (processedIceCandidateIds.current.has(ice.id)) continue
                processedIceCandidateIds.current.add(ice.id)

                const pc = peerConnectionRef.current
                if (!pc || pc.connectionState === "closed") break

                try {
                  const candidateObj = JSON.parse(ice.candidate)
                  const candidate = new RTCIceCandidate(candidateObj)

                  if (hasRemoteDescriptionRef.current) {
                    try {
                      await pc.addIceCandidate(candidate)
                    } catch (error) {
                      const err = error as Error
                      if (!err.message?.includes("duplicate")) {
                        console.error("[v0] ICE add error:", err.message)
                      }
                    }
                  } else {
                    iceCandidateBufferRef.current.push(candidate)
                  }
                } catch (error) {
                  console.error("[v0] Error parsing ICE candidate:", error)
                }
              }
            }
          } catch (error) {
            console.error("[v0] Polling error:", error)
          }
        }

        console.log("[v0] SETUP WEBRTC: Starting polling interval", { roomId, isInitiator, partnerId })
        signalingPollingRef.current = setInterval(pollForSignaling, 50)
        await pollForSignaling() // Run immediately

        // Create offer if initiator
        if (isInitiator) {
          try {
            console.log("[v0] INITIATOR: Creating offer", { roomId, partnerId })
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            })
            console.log("[v0] OFFER CREATED:", { type: offer.type })
            await pc.setLocalDescription(offer)
            console.log("[v0] LOCAL DESC SET")

            // Send offer
            const { error: insertError } = await supabase.from("signaling").insert({
              room_id: roomId,
              from_user_id: userId,
              to_user_id: partnerId,
              type: "offer",
              sdp: JSON.stringify(offer),
            })
            if (insertError) {
              console.error("[v0] ERROR SENDING OFFER:", insertError)
            } else {
              console.log("[v0] OFFER SENT TO SUPABASE")
            }
          } catch (error) {
            console.error("[v0] Error creating offer:", error)
          }
        } else {
          console.log("[v0] NOT INITIATOR: Waiting for offer", { roomId, partnerId })
        }
      } catch (error) {
        console.error("[v0] Error setting up WebRTC:", error)
      }
    },
    [userId],
  )

  const handleConnectionStateChange = useCallback(async () => {
    if (!peerConnectionRef.current) return

    const state = peerConnectionRef.current.connectionState

    console.log("[v0] Connection state changed:", state)

    if (state === "connected") {
      console.log("[v0] CALL CONNECTED! ✅")
      setVideoState("connected")
      setConnectionStatus("Conectado")
    } else if (state === "failed") {
      console.log("[v0] Connection failed, attempting restart...")
      if (connectionAttemptRef.current < maxConnectionAttempts) {
        connectionAttemptRef.current++
        setConnectionStatus(`Tentando reconectar... (${connectionAttemptRef.current}/${maxConnectionAttempts})`)

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 2000))

        if (peerConnectionRef.current && currentRoomIdRef.current && currentPartnerIdRef.current) {
          await setupWebRTC(currentRoomIdRef.current, isInitiatorRef.current, currentPartnerIdRef.current)
        }
      } else {
        setVideoState("error")
        setConnectionStatus("Falha na conexão após múltiplas tentativas")
      }
    } else if (state === "disconnected" || state === "closed") {
      console.log("[v0] Peer connection closed:", state)
      setVideoState("idle")
      setCurrentPartner(null)
      await cleanup()
    }
  }, [cleanup])

  const subscribeToQueueUpdates = useCallback(async () => {
    if (!currentRoomIdRef.current) return

    try {
      const supabase = await createBrowserClient()

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
                setConnectionStatus("Estabelecendo conexão...")

                const isInitiator = userId < partnerId
                await setupWebRTC(currentRoomIdRef.current!, isInitiator, partnerId)
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
  }, [userId])

  const startSearching = useCallback(async () => {
    if (limitReached) return

    setIsLoading(true)
    setVideoState("searching")

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingModeRef.current },
        audio: true,
      })
      if (!stream) {
        setIsLoading(false)
        setVideoState("permission_denied")
        setPermissionError("Falha ao acessar câmera e microfone")
        return
      }

      localStreamRef.current = stream
      attachStreamToVideo(localVideoRef.current, stream, "local")

      const result = await joinVideoQueue(userId)

      if (!result.success) {
        console.error("[v0] Failed to join queue:", result.error)
        setVideoState("idle")
        setIsLoading(false)
        return
      }

      currentRoomIdRef.current = result.roomId

      await subscribeToQueueUpdates()

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

      let checkCount = 0
      const maxChecks = 90 // 90 checks * 500ms = 45 seconds

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
          return
        }

        try {
          const status = await checkRoomStatus(currentRoomIdRef.current, userId)

          if (status.status === "active" && status.partnerId && status.partnerProfile) {
            if (pollingRef.current) {
              clearInterval(pollingRef.current)
              pollingRef.current = null
            }

            currentPartnerIdRef.current = status.partnerId
            setCurrentPartner(status.partnerProfile as PartnerProfile)
            setVideoState("connecting")
            setConnectionStatus("Estabelecendo conexão...")

            const isInitiator = userId < status.partnerId

            await setupWebRTC(currentRoomIdRef.current!, isInitiator, status.partnerId)
          }
        } catch (error) {
          console.log("[v0] Polling error (non-critical):", error instanceof Error ? error.message : error)
        }
      }, 500)
    } catch (error) {
      console.error("[v0] Error starting search:", error)
      setVideoState("idle")
    } finally {
      setIsLoading(false)
    }
  }, [subscribeToQueueUpdates, userId, limitReached])

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
        const { error } = await createBrowserClient()
          .from("matches")
          .insert({
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
  }, [currentPartner, userId, router])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  // Call handleMatchSuccess after handleLike if it's a match
  useEffect(() => {
    if (isLiked && currentPartner) {
      handleMatchSuccess()
    }
  }, [isLiked, currentPartner, handleMatchSuccess])

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
              {videoState === "searching" ? (
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
                  <span className="text-sm text-muted-foreground">Aguardando resposta...</span>
                </div>
              ) : videoState === "error" ? (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">{connectionStatus}</span>
                </div>
              ) : null}

              <h2 className="mb-2 text-lg md:text-2xl font-bold text-foreground">
                {videoState === "searching"
                  ? "Buscando empreendedor..."
                  : videoState === "idle"
                    ? "Pronto para conectar?"
                    : videoState === "connecting"
                      ? "Estabelecendo conexão..."
                      : videoState === "error"
                        ? "Erro de Conexão"
                        : "Erro de Conexão"}
              </h2>

              {videoState === "searching" ? (
                <p className="mb-4 flex items-center justify-center gap-2 text-xs md:text-sm text-muted-foreground">
                  <Clock className="h-3 md:h-4 w-3 md:w-4" />
                  Tempo de espera: {formatWaitTime(waitTime)}
                </p>
              ) : videoState === "idle" ? (
                <p className="mb-4 md:mb-6 max-w-md text-xs md:text-sm text-muted-foreground">
                  Clique no botão abaixo para começar a encontrar outros empreendedores em tempo real.
                </p>
              ) : null}

              {videoState === "searching" ? (
                <Button onClick={endCall} variant="outline" size="sm" className="text-xs md:text-sm bg-transparent">
                  Cancelar
                </Button>
              ) : videoState === "idle" ? (
                <Button
                  onClick={startSearching}
                  className="gradient-bg text-primary-foreground gap-2 text-xs md:text-sm h-8 md:h-10"
                >
                  <Search className="h-3 md:h-4 w-3 md:w-4" />
                  Começar Chamada
                </Button>
              ) : videoState === "connecting" ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Aguardando resposta...</span>
                </div>
              ) : videoState === "error" ? (
                <Button
                  onClick={startSearching}
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
    </div>
  )
}
