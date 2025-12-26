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
import { joinVideoQueue, checkRoomStatus, leaveVideoQueue } from "@/app/actions/video"
import type { RealtimeChannel } from "@supabase/supabase-js"

// Import likeUser action
import { likeUser } from "@/app/actions/user"

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
  const handleStartCallRef = useRef<() => Promise<void>>(() => Promise.resolve()) // Add ref to avoid circular dependency

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
          await leaveVideoQueue(currentRoomIdRef.current)
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
        // ✅ CORREÇÃO 1: Obter stream ANTES de criar PeerConnection
        const localStream = await getLocalStream()
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

        // ✅ CORREÇÃO 2: Configurar ICE servers ANTES de criar PeerConnection
        let iceServers: RTCIceServer[] = [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
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

        // ✅ CORREÇÃO 3: Criar PeerConnection com configuração robusta
        console.log("[v0] Creating RTCPeerConnection with ICE servers:", iceServers.length)
        const pc = new RTCPeerConnection({
          iceServers,
          iceCandidatePoolSize: 10,
          bundlePolicy: "max-bundle",
          rtcpMuxPolicy: "require",
        })

        peerConnectionRef.current = pc

        // ✅ CORREÇÃO 4: Event handlers ANTES de adicionar tracks
        pc.oniceconnectionstatechange = () => {
          console.log("[v0] ICE connection state:", pc.iceConnectionState)
          if (pc.iceConnectionState === "failed") {
            console.log("[v0] ICE failed, restarting...")
            pc.restartIce()
          }
        }

        pc.onconnectionstatechange = () => {
          console.log("[v0] Connection state:", pc.connectionState)
          handleConnectionStateChange()
        }

        pc.onsignalingstatechange = () => {
          console.log("[v0] Signaling state:", pc.signalingState)
        }

        // ✅ CORREÇÃO 5: ontrack handler com auto-play forçado
        const pendingCandidates: RTCIceCandidate[] = []

        pc.ontrack = (event) => {
          console.log("[v0] 🎥 REMOTE TRACK RECEIVED:", {
            kind: event.track.kind,
            enabled: event.track.enabled,
            readyState: event.track.readyState,
          })

          event.track.enabled = true

          const stream = event.streams[0]
          if (!stream) {
            console.error("[v0] No stream in track event!")
            return
          }

          console.log("[v0] Remote stream tracks:", stream.getTracks().length)
          remoteStreamRef.current = stream

          // ✅ CORREÇÃO 6: Attach stream imediatamente com retry automático
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream
            remoteVideoRef.current.autoplay = true
            remoteVideoRef.current.playsInline = true
            remoteVideoRef.current.muted = false

            let playAttempts = 0
            const tryPlay = () => {
              playAttempts++
              remoteVideoRef.current
                ?.play()
                .then(() => {
                  console.log("[v0] ✅ Remote video playing!")
                  setRemoteVideoReady(true)
                  setVideoState("connected")
                  setConnectionStatus("")
                })
                .catch((e) => {
                  console.warn("[v0] Remote play attempt", playAttempts, "failed:", e.message)
                  if (playAttempts < 10) {
                    setTimeout(tryPlay, 300)
                  }
                })
            }

            tryPlay()
            setTimeout(tryPlay, 500)
            setTimeout(tryPlay, 1000)
            setTimeout(tryPlay, 2000)
          }
        }

        // ✅ CORREÇÃO 7: ICE candidate handler
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            console.log("[v0] 🧊 Sending ICE candidate:", event.candidate.type)
            try {
              await supabase.from("ice_candidates").insert({
                room_id: roomId,
                from_user_id: userId,
                to_user_id: currentPartnerIdRef.current, // adicionado to_user_id para routing correto
                candidate: JSON.stringify(event.candidate.toJSON()),
                created_at: new Date().toISOString(),
              })
              console.log("[v0] ✅ ICE candidate sent")
            } catch (error) {
              console.warn("[v0] ❌ Error sending ICE candidate:", error)
            }
          }
        }

        // ✅ CORREÇÃO 8: Salvar stream local
        localStreamRef.current = localStream

        console.log("[v0] Attaching local stream to video element")
        const attachResult = attachStreamToVideo(localVideoRef.current, localStream, "local")
        if (!attachResult) {
          console.error("[v0] Failed to attach local stream")
          setVideoState("permission_denied")
          setPermissionError("Falha ao exibir câmera")
          return
        }

        // ✅ CORREÇÃO 9: Adicionar tracks NA ORDEM CORRETA
        localStream.getTracks().forEach((track) => {
          console.log("[v0] Adding track to peer:", track.kind, track.enabled)
          pc.addTrack(track, localStream)
        })

        console.log("[v0] All tracks added to peer connection")

        // ✅ CORREÇÃO 10: Limpar tabelas antigas ANTES de começar
        try {
          await supabase.from("signaling").delete().eq("room_id", roomId)
          await supabase.from("ice_candidates").delete().eq("room_id", roomId)
          console.log("[v0] Cleaned old signaling data")
        } catch (e) {
          console.warn("[v0] Cleanup failed (non-critical):", e)
        }

        // ✅ CORREÇÃO 11: Função para processar ICE candidates recebidos
        const processReceivedIceCandidates = async () => {
          try {
            const { data: iceCandidates, error } = await supabase
              .from("ice_candidates")
              .select("*")
              .eq("room_id", roomId)
              .neq("from_user_id", userId)
              .order("created_at", { ascending: true })

            if (error) throw error

            if (iceCandidates && iceCandidates.length > 0) {
              for (const ice of iceCandidates) {
                if (processedIceCandidateIds.current.has(ice.id)) continue
                processedIceCandidateIds.current.add(ice.id)

                const pc = peerConnectionRef.current
                if (!pc || pc.connectionState === "closed") break

                try {
                  const candidateObj = JSON.parse(ice.candidate)
                  const candidate = new RTCIceCandidate(candidateObj)

                  // ✅ CORREÇÃO 12: Só adicionar se remoteDescription existe
                  if (pc.remoteDescription) {
                    await pc.addIceCandidate(candidate)
                    console.log("[v0] ✅ ICE candidate added:", candidate.type)
                  } else {
                    pendingCandidates.push(candidate)
                    console.log("[v0] ⏳ ICE candidate buffered (no remote desc yet)")
                  }
                } catch (error) {
                  console.warn("[v0] ICE candidate error:", error)
                }
              }
            }
          } catch (error) {
            console.error("[v0] ICE polling error:", error)
          }
        }

        // ✅ CORREÇÃO 13: Função para processar signaling
        const processSignaling = async () => {
          if (!peerConnectionRef.current || peerConnectionRef.current.connectionState === "closed") {
            if (signalingPollingRef.current) {
              clearInterval(signalingPollingRef.current)
              signalingPollingRef.current = null
            }
            return
          }

          try {
            const { data: signals, error } = await supabase
              .from("signaling")
              .select("*")
              .eq("room_id", roomId)
              .neq("from_user_id", userId)
              .order("created_at", { ascending: true })

            if (error) throw error

            if (signals && signals.length > 0) {
              console.log("[v0] 📡 Processing", signals.length, "signals")

              for (const signal of signals) {
                if (processedSignalingIds.current.has(signal.id)) continue
                processedSignalingIds.current.add(signal.id)

                const pc = peerConnectionRef.current
                if (!pc || pc.connectionState === "closed") break

                try {
                  if (signal.type === "offer" && !isInitiator) {
                    console.log("[v0] 📥 Processing OFFER")
                    const offerDesc = JSON.parse(signal.sdp)
                    await pc.setRemoteDescription(new RTCSessionDescription(offerDesc))
                    console.log("[v0] ✅ Remote description set (offer)")

                    // ✅ CORREÇÃO 14: Adicionar candidatos em buffer
                    if (pendingCandidates.length > 0) {
                      console.log("[v0] Adding", pendingCandidates.length, "buffered candidates")
                      for (const candidate of pendingCandidates) {
                        try {
                          await pc.addIceCandidate(candidate)
                        } catch (e) {
                          console.warn("[v0] Buffered candidate failed:", e)
                        }
                      }
                      pendingCandidates.length = 0
                    }

                    const answer = await pc.createAnswer()
                    await pc.setLocalDescription(answer)
                    console.log("[v0] ✅ Local description set (answer)")

                    await supabase.from("signaling").insert({
                      room_id: roomId,
                      from_user_id: userId,
                      type: "answer",
                      sdp: JSON.stringify(answer),
                      created_at: new Date().toISOString(),
                    })
                    console.log("[v0] 📤 ANSWER SENT")
                  } else if (signal.type === "answer" && isInitiator) {
                    console.log("[v0] 📥 Processing ANSWER")
                    const answerDesc = JSON.parse(signal.sdp)
                    await pc.setRemoteDescription(new RTCSessionDescription(answerDesc))
                    console.log("[v0] ✅ Remote description set (answer)")

                    // ✅ CORREÇÃO 15: Adicionar candidatos em buffer
                    if (pendingCandidates.length > 0) {
                      console.log("[v0] Adding", pendingCandidates.length, "buffered candidates")
                      for (const candidate of pendingCandidates) {
                        try {
                          await pc.addIceCandidate(candidate)
                        } catch (e) {
                          console.warn("[v0] Buffered candidate failed:", e)
                        }
                      }
                      pendingCandidates.length = 0
                    }
                  }
                } catch (error) {
                  console.error("[v0] ❌ Signal processing error:", error)
                }
              }
            }

            await processReceivedIceCandidates()
          } catch (error) {
            console.error("[v0] ❌ Signaling polling error:", error)
          }
        }

        // ✅ CORREÇÃO 16: Polling com intervalo otimizado (200ms em vez de 50ms)
        console.log("[v0] Starting signaling poll (every 200ms)")
        signalingPollingRef.current = setInterval(processSignaling, 200)
        await processSignaling()

        // ✅ CORREÇÃO 17: CREATE OFFER (apenas se initiator)
        if (isInitiator) {
          try {
            console.log("[v0] 🎬 INITIATOR: Creating offer")

            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            })

            await pc.setLocalDescription(offer)
            console.log("[v0] ✅ Local description set (offer)")

            const { error: insertError } = await supabase.from("signaling").insert({
              room_id: roomId,
              from_user_id: userId,
              type: "offer",
              sdp: JSON.stringify(offer),
              created_at: new Date().toISOString(),
            })

            if (insertError) {
              console.error("[v0] ❌ Offer send error:", insertError)
            } else {
              console.log("[v0] 📤 OFFER SENT")
            }
          } catch (error) {
            console.error("[v0] ❌ Offer creation error:", error)
            setVideoState("error")
            setConnectionStatus("Erro ao criar oferta")
          }
        } else {
          console.log("[v0] ⏳ Waiting for offer...")
        }
      } catch (error) {
        console.error("[v0] ❌ WebRTC setup error:", error)
        setVideoState("error")
        setConnectionStatus("Erro ao conectar")
      }
    },
    [userId, handleConnectionStateChange, supabase, attachStreamToVideo],
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

  // Removed startSearching function as it's redundant and replaced by handleStartCall
  // const startSearching = useCallback(async () => { ... });

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
    handleStartCallRef.current()
  }, [cleanup])

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

  const handleStartCall = useCallback(async () => {
    if (limitReached) {
      setPermissionError("Limite de chamadas atingido")
      return
    }

    setVideoState("searching")
    setConnectionStatus("")
    setPermissionError(null)
    setCurrentPartner(null)
    setIsLoading(true)

    try {
      console.log("[v0] 📞 handleStartCall - Joining queue...")
      console.log("[v0] Current user ID:", userId)

      const joinResult = await joinVideoQueue()

      console.log("[v0] ✅ Join result:", {
        success: joinResult.success,
        roomId: joinResult.roomId,
        matched: joinResult.matched,
        partnerId: joinResult.partnerId,
        waiting: joinResult.waiting,
        hasPartnerProfile: !!joinResult.partnerProfile,
      })

      if (!joinResult.success) {
        console.error("[v0] ❌ Failed to join queue:", joinResult.error)
        setVideoState("error")
        setPermissionError("Erro ao entrar na fila")
        setIsLoading(false)
        return
      }

      currentRoomIdRef.current = joinResult.roomId
      console.log("[v0] ✅ Joined room:", joinResult.roomId)

      // Fetch local stream immediately
      const localStream = await getLocalStream()
      if (!localStream) {
        setVideoState("permission_denied")
        setPermissionError("Não foi possível obter acesso à câmera/microfone.")
        setIsLoading(false)
        return
      }
      localStreamRef.current = localStream
      attachStreamToVideo(localVideoRef.current, localStream, "local")
      console.log("[v0] ✅ Local stream attached to video element")

      // Immediate match case
      if (joinResult.matched && joinResult.partnerId) {
        console.log("[v0] 🎉 IMMEDIATE MATCH - Starting WebRTC with partner:", joinResult.partnerId)
        currentPartnerIdRef.current = joinResult.partnerId
        isInitiatorRef.current = userId < joinResult.partnerId
        setCurrentPartner(joinResult.partnerProfile || { id: joinResult.partnerId, full_name: "User", avatar_url: "" })
        setVideoState("connecting")
        setIsLoading(false)

        await setupWebRTC(joinResult.roomId, isInitiatorRef.current)
        return
      }

      // No match yet - start polling
      if (!joinResult.matched) {
        console.log("[v0] ⏳ Starting polling with room:", joinResult.roomId)
        let pollCount = 0
        const maxPolls = 300 // 150 seconds max

        pollingRef.current = setInterval(async () => {
          pollCount++

          if (pollCount % 10 === 0) {
            console.log(`[v0] 🔍 Poll attempt #${pollCount}/${maxPolls}`)
          }

          if (pollCount >= maxPolls) {
            console.log("[v0] ⏱️ Polling timeout")
            clearInterval(pollingRef.current!)
            pollingRef.current = null
            setVideoState("idle")
            setCurrentPartner(null)
            setPermissionError("Nenhum usuário disponível.")
            if (localStreamRef.current) {
              localStreamRef.current.getTracks().forEach((track) => track.stop())
              localStreamRef.current = null
            }
            setIsLoading(false)
            return
          }

          try {
            const statusResult = await checkRoomStatus(joinResult.roomId)

            if (pollCount % 10 === 0) {
              console.log("[v0] Status check result:", {
                status: statusResult.status,
                hasPartnerId: !!statusResult.partnerId,
                partnerId: statusResult.partnerId,
                hasPartnerProfile: !!statusResult.partnerProfile,
              })
            }

            if (statusResult.partnerId && statusResult.status === "active") {
              console.log("[v0] 🎉 MATCH FOUND! Partner:", statusResult.partnerId)
              clearInterval(pollingRef.current!)
              pollingRef.current = null

              currentPartnerIdRef.current = statusResult.partnerId
              setCurrentPartner(
                statusResult.partnerProfile || { id: statusResult.partnerId, full_name: "User", avatar_url: "" },
              )
              setVideoState("connecting")
              setIsLoading(false)

              const isInitiator = userId < statusResult.partnerId
              console.log("[v0] WebRTC initiator:", isInitiator)
              await setupWebRTC(joinResult.roomId, isInitiator)
            }
          } catch (error) {
            if (pollCount % 20 === 0) {
              console.error("[v0] ❌ Polling error on attempt #", pollCount, error)
            }
          }
        }, 500) // Poll every 500ms instead of 1000ms for faster detection
      }
    } catch (error) {
      console.error("[v0] ❌ Error in handleStartCall:", error)
      setVideoState("error")
      setPermissionError("Erro ao conectar")
      setIsLoading(false)
    }
  }, [userId, limitReached, setupWebRTC, attachStreamToVideo])

  useEffect(() => {
    handleStartCallRef.current = handleStartCall
  }, [handleStartCall])

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
                await handleStartCall() // Changed from startSearching
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
