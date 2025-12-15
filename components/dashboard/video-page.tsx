"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  SkipForward,
  Heart,
  Loader2,
  Clock,
  SwitchCamera,
  Maximize2,
  Minimize2,
} from "lucide-react"

type VideoState = "idle" | "searching" | "connecting" | "connected" | "ended"

interface Partner {
  id: string
  full_name: string
  avatar_url: string | null
  city: string | null
  position: string | null
  company: string | null
  interests: string[] | null
}

export function VideoPage() {
  const { user } = useAuth()
  const userId = user?.id

  const [videoState, setVideoState] = useState<VideoState>("idle")
  const [partner, setPartner] = useState<Partner | null>(null)
  const [connectionStatus, setConnectionStatus] = useState("")
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [searchTime, setSearchTime] = useState(0)
  const [callDuration, setCallDuration] = useState(0)
  const [remoteVideoReady, setRemoteVideoReady] = useState(false)
  const [localStreamReady, setLocalStreamReady] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
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
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Timer for search
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (videoState === "searching") {
      interval = setInterval(() => {
        setSearchTime((prev) => prev + 1)
      }, 1000)
    } else {
      setSearchTime(0)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [videoState])

  // Timer for call duration
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (videoState === "connected") {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    } else {
      setCallDuration(0)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [videoState])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Initialize local camera
  const initLocalStream = useCallback(async () => {
    try {
      // Stop any existing stream first
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingModeRef.current,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      localStreamRef.current = stream

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.muted = true
        try {
          await localVideoRef.current.play()
          setLocalStreamReady(true)
        } catch (e) {
          // Autoplay might be blocked, that's ok
          setLocalStreamReady(true)
        }
      }

      return stream
    } catch (error) {
      console.error("[v0] Error accessing camera:", error)
      setConnectionStatus("Erro ao acessar câmera")
      return null
    }
  }, [])

  // Clean up resources
  const cleanup = useCallback(async () => {
    if (isCleaningUpRef.current) return
    isCleaningUpRef.current = true

    // Stop polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    if (signalingPollingRef.current) {
      clearInterval(signalingPollingRef.current)
      signalingPollingRef.current = null
    }
    if (waitTimeRef.current) {
      clearTimeout(waitTimeRef.current)
      waitTimeRef.current = null
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current)
      connectionTimeoutRef.current = null
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Clean up room in database
    if (currentRoomIdRef.current && userId) {
      const supabase = createClient()
      try {
        await supabase.from("video_rooms").update({ status: "ended" }).eq("id", currentRoomIdRef.current)

        await supabase.from("signaling").delete().eq("room_id", currentRoomIdRef.current)

        await supabase.from("ice_candidates").delete().eq("room_id", currentRoomIdRef.current)
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    // Reset refs
    currentRoomIdRef.current = null
    currentPartnerIdRef.current = null
    hasRemoteDescriptionRef.current = false
    iceCandidatesQueueRef.current = []
    processedSignalingIds.current.clear()
    processedIceCandidateIds.current.clear()
    isCleaningUpRef.current = false

    // Reset state
    setRemoteVideoReady(false)
    setPartner(null)
  }, [userId])

  // Setup WebRTC connection
  const setupWebRTC = useCallback(
    async (roomId: string, isInitiator: boolean, partnerId: string) => {
      isInitiatorRef.current = isInitiator
      processedSignalingIds.current.clear()
      processedIceCandidateIds.current.clear()
      hasRemoteDescriptionRef.current = false
      iceCandidatesQueueRef.current = []

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
        console.error("[v0] Error fetching TURN credentials:", error)
      }

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers,
        iceCandidatePoolSize: 10,
      })

      peerConnectionRef.current = pc
      const supabase = createClient()

      // Add local tracks FIRST
      if (localStreamRef.current) {
        const tracks = localStreamRef.current.getTracks()
        tracks.forEach((track) => {
          pc.addTrack(track, localStreamRef.current!)
        })
      } else {
        console.error("[v0] ERROR: No local stream available!")
        return
      }

      connectionTimeoutRef.current = setTimeout(() => {
        if (videoState === "connecting" && pc.connectionState !== "connected") {
          console.log("[v0] Connection timeout - restarting ICE")
          pc.restartIce()
        }
      }, 30000)

      // Handle remote track - THIS IS KEY for video
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0]

          event.streams[0].getTracks().forEach((track) => {
            track.enabled = true
          })

          const tryPlay = async (attempts = 0) => {
            try {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.muted = false
                await remoteVideoRef.current.play()
                setRemoteVideoReady(true)
                setVideoState("connected")
                setConnectionStatus("Conectado!")
                if (connectionTimeoutRef.current) {
                  clearTimeout(connectionTimeoutRef.current)
                  connectionTimeoutRef.current = null
                }
              }
            } catch (e: unknown) {
              const error = e as Error
              if (attempts < 10) {
                setTimeout(() => tryPlay(attempts + 1), 500)
              }
            }
          }

          remoteVideoRef.current.onloadedmetadata = () => {
            tryPlay()
          }

          // Also try immediately
          setTimeout(() => tryPlay(), 100)
        }
      }

      // Connection state monitoring
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setVideoState("connected")
          setConnectionStatus("Conectado!")
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current)
            connectionTimeoutRef.current = null
          }
        } else if (pc.connectionState === "failed") {
          pc.restartIce()
        } else if (pc.connectionState === "disconnected") {
          setConnectionStatus("Reconectando...")
          setTimeout(() => {
            if (pc.connectionState === "disconnected") {
              pc.restartIce()
            }
          }, 3000)
        }
      }

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed") {
          pc.restartIce()
        }
      }

      // Handle ICE candidates - send to database
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
            console.error("[v0] Error sending ICE candidate:", err)
          }
        }
      }

      // Function to add ICE candidate
      const addIceCandidate = async (candidateStr: string) => {
        try {
          const candidateObj = JSON.parse(candidateStr)
          const candidate = new RTCIceCandidate(candidateObj)

          if (hasRemoteDescriptionRef.current && pc.remoteDescription) {
            await pc.addIceCandidate(candidate)
          } else {
            iceCandidatesQueueRef.current.push(candidate)
          }
        } catch (err) {
          console.error("[v0] Error adding ICE candidate:", err)
        }
      }

      // Process queued ICE candidates
      const processQueuedCandidates = async () => {
        const queueSize = iceCandidatesQueueRef.current.length
        if (queueSize > 0) {
          while (iceCandidatesQueueRef.current.length > 0) {
            const candidate = iceCandidatesQueueRef.current.shift()
            if (candidate) {
              try {
                await pc.addIceCandidate(candidate)
              } catch (e) {
                console.error("[v0] Error adding queued candidate:", e)
              }
            }
          }
        }
      }

      // Create and send offer (for initiator)
      const createAndSendOffer = async () => {
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          })
          await pc.setLocalDescription(offer)

          // Clear old signaling first
          await supabase.from("signaling").delete().eq("room_id", roomId)
          await supabase.from("ice_candidates").delete().eq("room_id", roomId)

          // Send offer
          const { error } = await supabase.from("signaling").insert({
            room_id: roomId,
            from_user_id: userId,
            to_user_id: partnerId,
            type: "offer",
            sdp: offer.sdp,
          })

          if (error) {
            console.error("[v0] Error sending offer:", error)
          }
        } catch (err) {
          console.error("[v0] Error creating offer:", err)
        }
      }

      // Process offer (for non-initiator)
      const processOffer = async (sdp: string) => {
        try {
          if (pc.signalingState !== "stable") {
            return
          }

          await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp }))
          hasRemoteDescriptionRef.current = true

          await processQueuedCandidates()

          // Create and send answer
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)

          const { error } = await supabase.from("signaling").insert({
            room_id: roomId,
            from_user_id: userId,
            to_user_id: partnerId,
            type: "answer",
            sdp: answer.sdp,
          })

          if (error) {
            console.error("[v0] Error sending answer:", error)
          }
        } catch (err) {
          console.error("[v0] Error processing offer:", err)
        }
      }

      // Process answer (for initiator)
      const processAnswer = async (sdp: string) => {
        if (hasRemoteDescriptionRef.current) {
          return
        }

        try {
          if (pc.signalingState !== "have-local-offer") {
            return
          }

          await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp }))
          hasRemoteDescriptionRef.current = true

          await processQueuedCandidates()
        } catch (err) {
          console.error("[v0] Error processing answer:", err)
        }
      }

      const pollSignaling = async () => {
        if (!peerConnectionRef.current || isCleaningUpRef.current) return

        try {
          // Check for signaling messages
          const { data: signals, error: sigError } = await supabase
            .from("signaling")
            .select("*")
            .eq("room_id", roomId)
            .eq("to_user_id", userId)
            .order("created_at", { ascending: true })

          if (sigError) {
            console.error("[v0] Error fetching signals:", sigError)
            return
          }

          if (signals && signals.length > 0) {
            for (const signal of signals) {
              if (processedSignalingIds.current.has(signal.id)) continue
              processedSignalingIds.current.add(signal.id)

              if (signal.type === "offer" && !isInitiatorRef.current) {
                await processOffer(signal.sdp)
              } else if (signal.type === "answer" && isInitiatorRef.current) {
                await processAnswer(signal.sdp)
              }
            }
          }

          // Check for ICE candidates
          const { data: candidates, error: iceError } = await supabase
            .from("ice_candidates")
            .select("*")
            .eq("room_id", roomId)
            .eq("to_user_id", userId)
            .order("created_at", { ascending: true })

          if (iceError) {
            console.error("[v0] Error fetching ICE candidates:", iceError)
            return
          }

          if (candidates && candidates.length > 0) {
            for (const ice of candidates) {
              if (processedIceCandidateIds.current.has(ice.id)) continue
              processedIceCandidateIds.current.add(ice.id)

              await addIceCandidate(ice.candidate)
            }
          }
        } catch (err) {
          console.error("[v0] Error polling signaling:", err)
        }
      }

      // Start polling immediately and more frequently
      pollSignaling()
      signalingPollingRef.current = setInterval(pollSignaling, 250) // Poll every 250ms for faster response

      // If initiator, send offer after a short delay
      if (isInitiator) {
        setTimeout(createAndSendOffer, 300) // Reduced delay
      }
    },
    [userId, videoState],
  )

  // Start searching for a partner
  const startSearch = useCallback(async () => {
    if (!userId) return

    await cleanup()
    setVideoState("searching")
    setConnectionStatus("Buscando empreendedores...")

    // Initialize local stream
    const stream = await initLocalStream()
    if (!stream) {
      setVideoState("idle")
      return
    }

    const supabase = createClient()

    // Get user profile for matching
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("city, country, interests")
      .eq("id", userId)
      .single()

    // Look for waiting rooms or create one
    const findOrCreateRoom = async () => {
      if (isCleaningUpRef.current) return

      try {
        // First, check for existing waiting rooms
        let query = supabase
          .from("video_rooms")
          .select(
            `
            *,
            user1:profiles!video_rooms_user1_id_fkey(id, full_name, avatar_url, city, position, company, interests),
            user2:profiles!video_rooms_user2_id_fkey(id, full_name, avatar_url, city, position, company, interests)
          `,
          )
          .eq("status", "waiting")
          .neq("user1_id", userId)
          .is("user2_id", null)
          .order("created_at", { ascending: true })
          .limit(10)

        // Prefer same city/country
        if (myProfile?.city) {
          query = query.eq("city", myProfile.city)
        }

        const { data: waitingRooms } = await query

        if (waitingRooms && waitingRooms.length > 0) {
          // Found a waiting room, join it
          const room = waitingRooms[0]

          const { error: joinError } = await supabase
            .from("video_rooms")
            .update({
              user2_id: userId,
              status: "matched",
            })
            .eq("id", room.id)
            .eq("status", "waiting")

          if (!joinError) {
            currentRoomIdRef.current = room.id
            currentPartnerIdRef.current = room.user1_id
            setPartner(room.user1 as unknown as Partner)
            setVideoState("connecting")
            setConnectionStatus("Conectando...")

            // User 2 is NOT the initiator - wait for offer
            await setupWebRTC(room.id, false, room.user1_id)
            return
          }
        }

        // No waiting room found, create one
        const { data: newRoom, error: createError } = await supabase
          .from("video_rooms")
          .insert({
            user1_id: userId,
            status: "waiting",
            city: myProfile?.city,
            country: myProfile?.country,
            interests: myProfile?.interests,
          })
          .select()
          .single()

        if (createError || !newRoom) {
          console.error("[v0] Error creating room:", createError)
          return
        }

        currentRoomIdRef.current = newRoom.id

        // Poll for someone to join
        const pollForPartner = async () => {
          if (isCleaningUpRef.current) return

          const { data: updatedRoom } = await supabase
            .from("video_rooms")
            .select(
              `
              *,
              user2:profiles!video_rooms_user2_id_fkey(id, full_name, avatar_url, city, position, company, interests)
            `,
            )
            .eq("id", newRoom.id)
            .single()

          if (updatedRoom?.user2_id && updatedRoom.status === "matched") {
            // Match found!
            if (pollingRef.current) {
              clearInterval(pollingRef.current)
              pollingRef.current = null
            }

            currentPartnerIdRef.current = updatedRoom.user2_id
            setPartner(updatedRoom.user2 as unknown as Partner)
            setVideoState("connecting")
            setConnectionStatus("Conectando...")

            // User 1 IS the initiator - send offer
            await setupWebRTC(newRoom.id, true, updatedRoom.user2_id)
          }
        }

        pollingRef.current = setInterval(pollForPartner, 1000)

        // Timeout after 60 seconds
        waitTimeRef.current = setTimeout(async () => {
          if (videoState === "searching") {
            if (pollingRef.current) {
              clearInterval(pollingRef.current)
              pollingRef.current = null
            }
            // Delete the waiting room
            await supabase.from("video_rooms").delete().eq("id", newRoom.id)
            setConnectionStatus("Nenhum empreendedor encontrado. Tente novamente!")
            setVideoState("idle")
          }
        }, 60000)
      } catch (error) {
        console.error("[v0] Error in findOrCreateRoom:", error)
      }
    }

    findOrCreateRoom()
  }, [userId, cleanup, initLocalStream, setupWebRTC, videoState])

  // End call
  const endCall = useCallback(async () => {
    await cleanup()
    setVideoState("idle")
    setConnectionStatus("")
  }, [cleanup])

  // Skip to next partner
  const skipPartner = useCallback(async () => {
    await cleanup()
    startSearch()
  }, [cleanup, startSearch])

  // Like partner
  const likePartner = useCallback(async () => {
    if (!userId || !partner) return

    const supabase = createClient()

    // Record the like
    await supabase.from("likes").insert({
      from_user_id: userId,
      to_user_id: partner.id,
    })

    // Check for mutual match
    const { data: mutualLike } = await supabase
      .from("likes")
      .select("id")
      .eq("from_user_id", partner.id)
      .eq("to_user_id", userId)
      .single()

    if (mutualLike) {
      // Create match
      await supabase.from("matches").insert({
        user1_id: userId,
        user2_id: partner.id,
      })

      setConnectionStatus("Match! Vocês se curtiram!")
    } else {
      setConnectionStatus("Like enviado!")
    }

    // Move to next
    setTimeout(() => {
      skipPartner()
    }, 2000)
  }, [userId, partner, skipPartner])

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }, [])

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOff(!videoTrack.enabled)
      }
    }
  }, [])

  // Switch camera
  const switchCamera = useCallback(async () => {
    facingModeRef.current = facingModeRef.current === "user" ? "environment" : "user"
    await initLocalStream()
  }, [initLocalStream])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen)
  }, [isFullscreen])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isCleaningUpRef.current = true
      if (pollingRef.current) clearInterval(pollingRef.current)
      if (signalingPollingRef.current) clearInterval(signalingPollingRef.current)
      if (waitTimeRef.current) clearTimeout(waitTimeRef.current)
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current)
      if (peerConnectionRef.current) peerConnectionRef.current.close()
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  // Initialize camera on mount
  useEffect(() => {
    initLocalStream()
  }, [initLocalStream])

  return (
    <div className={`flex flex-col h-full bg-slate-900 ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
      {/* Header - always show except fullscreen connected */}
      {!(isFullscreen && videoState === "connected") && (
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h1 className="text-white font-semibold text-lg">Videochamada</h1>
            <p className="text-white/60 text-sm">Conecte-se instantaneamente com empreendedores</p>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white">
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
        </div>
      )}

      {/* Video Area */}
      <div className="flex-1 relative flex flex-col">
        {videoState === "idle" && (
          <>
            {/* Main content area - same design for mobile and desktop */}
            <div className="flex-1 flex flex-col items-center justify-center text-white px-6">
              {/* Purple circular icon */}
              <div className="w-28 h-28 rounded-full bg-purple-500/20 flex items-center justify-center mb-6">
                <Video className="w-14 h-14 text-purple-400" />
              </div>

              <h2 className="text-2xl font-bold mb-3 text-center">Pronto para conectar?</h2>
              <p className="text-slate-400 text-center max-w-sm mb-8">
                Inicie uma videochamada e conheça empreendedores em tempo real
              </p>

              <Button
                onClick={startSearch}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8 py-6 text-base"
              >
                <Video className="w-5 h-5 mr-2" />
                Iniciar Videochamada
              </Button>
            </div>

            <div className="p-4">
              <div className="relative rounded-2xl overflow-hidden bg-slate-800 aspect-video max-h-48 max-w-md mx-auto">
                {localStreamReady ? (
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                    Câmera desativada
                  </div>
                )}
                {localStreamReady && (
                  <div className="absolute bottom-2 right-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={switchCamera}
                      className="w-8 h-8 bg-black/50 text-white hover:bg-black/70"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {videoState === "searching" && (
          <>
            <div className="flex-1 flex flex-col items-center justify-center text-white px-6">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full border-4 border-purple-500/30 flex items-center justify-center">
                  <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Buscando empreendedores...</h2>
              <p className="text-slate-400 mb-2">{connectionStatus}</p>
              <div className="flex items-center gap-2 text-slate-400 mb-6">
                <Clock className="w-4 h-4" />
                <span>{formatTime(searchTime)}</span>
              </div>
              <Button
                variant="outline"
                onClick={endCall}
                className="text-white border-white/20 hover:bg-white/10 bg-transparent"
              >
                Cancelar
              </Button>
            </div>

            <div className="p-4">
              <div className="relative rounded-2xl overflow-hidden bg-slate-800 aspect-video max-h-48 max-w-md mx-auto">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute bottom-2 right-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={switchCamera}
                    className="w-8 h-8 bg-black/50 text-white hover:bg-black/70"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {(videoState === "connecting" || videoState === "connected") && (
          <>
            {/* MOBILE: Layout empilhado */}
            <div className="absolute inset-0 flex flex-col md:hidden bg-[#0f1729]">
              {/* Remote Video - top */}
              <div className="flex-1 relative bg-[#1a2332]">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover ${!remoteVideoReady ? "hidden" : ""}`}
                />
                {!remoteVideoReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-12 h-12 animate-spin text-purple-500 mb-4" />
                    <p className="text-slate-400">{connectionStatus || "Conectando..."}</p>
                  </div>
                )}

                {/* Partner Info */}
                {partner && (
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-full pr-4 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold overflow-hidden">
                      {partner.avatar_url ? (
                        <img
                          src={partner.avatar_url || "/placeholder.svg"}
                          alt={partner.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        partner.full_name?.charAt(0) || "?"
                      )}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">{partner.full_name}</h3>
                      <p className="text-white/70 text-xs">{partner.city || "Brasil"}</p>
                    </div>
                  </div>
                )}

                {/* Controls on remote video */}
                <div className="absolute bottom-4 left-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={endCall}
                    className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white"
                  >
                    <PhoneOff className="w-5 h-5" />
                  </Button>
                </div>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={likePartner}
                    className="w-12 h-12 rounded-full bg-pink-500 hover:bg-pink-600 text-white"
                  >
                    <Heart className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={skipPartner}
                    className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <SkipForward className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Local Video - bottom */}
              <div className="h-[35%] relative bg-[#1e293b]">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMute}
                    className={`w-10 h-10 rounded-full ${isMuted ? "bg-red-500" : "bg-slate-700"} text-white`}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleVideo}
                    className={`w-10 h-10 rounded-full ${isVideoOff ? "bg-red-500" : "bg-slate-700"} text-white`}
                  >
                    {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="absolute top-4 right-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={switchCamera}
                    className="w-8 h-8 bg-black/50 text-white hover:bg-black/70"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </Button>
                </div>
                {videoState === "connected" && (
                  <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                    <span className="text-white text-sm">{formatTime(callDuration)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* DESKTOP: Split-screen 50/50 */}
            <div className="absolute inset-0 hidden md:flex bg-[#0f1729]">
              {/* Remote Video - left side */}
              <div className="w-1/2 relative bg-[#1a2332]">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover ${!remoteVideoReady ? "hidden" : ""}`}
                />
                {!remoteVideoReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-12 h-12 animate-spin text-purple-500 mb-4" />
                    <p className="text-slate-400">{connectionStatus || "Conectando..."}</p>
                  </div>
                )}

                {/* Partner Info */}
                {partner && (
                  <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-sm rounded-full pr-5 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold overflow-hidden">
                      {partner.avatar_url ? (
                        <img
                          src={partner.avatar_url || "/placeholder.svg"}
                          alt={partner.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        partner.full_name?.charAt(0) || "?"
                      )}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{partner.full_name}</h3>
                      <p className="text-white/70 text-sm">{partner.city || "Brasil"}</p>
                    </div>
                  </div>
                )}

                {/* Controls */}
                <div className="absolute bottom-6 left-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={endCall}
                    className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </Button>
                </div>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={likePartner}
                    className="w-14 h-14 rounded-full bg-pink-500 hover:bg-pink-600 text-white"
                  >
                    <Heart className="w-6 h-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={skipPartner}
                    className="w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <SkipForward className="w-6 h-6" />
                  </Button>
                </div>

                {/* Fullscreen toggle */}
                <div className="absolute top-6 right-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleFullscreen}
                    className="w-10 h-10 bg-black/50 text-white hover:bg-black/70"
                  >
                    {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                  </Button>
                </div>
              </div>

              {/* Local Video - right side */}
              <div className="w-1/2 relative bg-[#1e293b]">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

                <div className="absolute bottom-6 right-6 flex gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMute}
                    className={`w-12 h-12 rounded-full ${isMuted ? "bg-red-500" : "bg-slate-700"} text-white hover:opacity-80`}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleVideo}
                    className={`w-12 h-12 rounded-full ${isVideoOff ? "bg-red-500" : "bg-slate-700"} text-white hover:opacity-80`}
                  >
                    {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </Button>
                </div>

                <div className="absolute top-6 right-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={switchCamera}
                    className="w-10 h-10 bg-black/50 text-white hover:bg-black/70"
                  >
                    <SwitchCamera className="w-5 h-5" />
                  </Button>
                </div>

                {videoState === "connected" && (
                  <div className="absolute top-6 left-6 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
                    <span className="text-white">{formatTime(callDuration)}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ENDED STATE */}
        {videoState === "ended" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900 px-6">
            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-4">
              <PhoneOff className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Chamada encerrada</h2>
            <p className="text-slate-400 mb-6 text-center">
              {partner ? `Você conversou com ${partner.full_name}` : "A chamada foi encerrada"}
            </p>
            <Button
              onClick={() => {
                setVideoState("idle")
                setPartner(null)
                setConnectionStatus("")
                setRemoteVideoReady(false)
              }}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Video className="w-5 h-5 mr-2" />
              Nova Videochamada
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
