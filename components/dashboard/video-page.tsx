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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

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
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
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

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.onloadedmetadata = () => {
          localVideoRef.current?.play().catch((e) => console.log("[v0] Video autoplay blocked:", e))
        }
      }

      setLocalVideoReady(true)
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
  }, [])

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

      // Handle remote track - THIS IS KEY for video
      pc.ontrack = (event) => {
        console.log("[v0] *** RECEIVED REMOTE TRACK ***", event.track.kind)
        if (remoteVideoRef.current && event.streams[0]) {
          console.log("[v0] Setting remote video srcObject")
          remoteVideoRef.current.srcObject = event.streams[0]
          remoteVideoRef.current.onloadedmetadata = () => {
            console.log("[v0] Remote video metadata loaded")
            remoteVideoRef.current?.play().catch((e) => console.log("[v0] Remote autoplay blocked:", e))
          }
          setRemoteVideoReady(true)
          setVideoState("connected")
          setConnectionStatus("Conectado!")
        }
      }

      // Connection state monitoring
      pc.onconnectionstatechange = () => {
        console.log("[v0] Connection state:", pc.connectionState)
        if (pc.connectionState === "connected") {
          setVideoState("connected")
          setConnectionStatus("Conectado!")
        } else if (pc.connectionState === "failed") {
          console.log("[v0] Connection FAILED")
          setConnectionStatus("Conexão falhou")
        }
      }

      pc.oniceconnectionstatechange = () => {
        console.log("[v0] ICE connection state:", pc.iceConnectionState)
      }

      // Handle ICE candidates - send to database
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log("[v0] Sending ICE candidate:", event.candidate.type || "unknown")
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
            console.log("[v0] Added ICE candidate directly")
          } else {
            iceCandidatesQueueRef.current.push(candidate)
            console.log("[v0] Queued ICE candidate")
          }
        } catch (err) {
          console.error("[v0] Error adding ICE candidate:", err)
        }
      }

      // Process queued ICE candidates
      const processQueuedCandidates = async () => {
        console.log("[v0] Processing", iceCandidatesQueueRef.current.length, "queued ICE candidates")
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

      // Create and send offer (for initiator)
      const createAndSendOffer = async () => {
        console.log("[v0] Creating offer...")
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          })
          await pc.setLocalDescription(offer)
          console.log("[v0] Local description set (offer)")

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
          } else {
            console.log("[v0] *** OFFER SENT TO DATABASE ***")
          }
        } catch (err) {
          console.error("[v0] Error creating offer:", err)
        }
      }

      // Process offer (for non-initiator)
      const processOffer = async (sdp: string) => {
        console.log("[v0] Processing received offer...")
        try {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp }))
          hasRemoteDescriptionRef.current = true
          console.log("[v0] Remote description set (offer)")

          await processQueuedCandidates()

          // Create and send answer
          console.log("[v0] Creating answer...")
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          console.log("[v0] Local description set (answer)")

          const { error } = await supabase.from("signaling").insert({
            room_id: roomId,
            from_user_id: userId,
            to_user_id: partnerId,
            type: "answer",
            sdp: answer.sdp,
          })

          if (error) {
            console.error("[v0] Error sending answer:", error)
          } else {
            console.log("[v0] *** ANSWER SENT TO DATABASE ***")
          }
        } catch (err) {
          console.error("[v0] Error processing offer:", err)
        }
      }

      // Process answer (for initiator)
      const processAnswer = async (sdp: string) => {
        if (hasRemoteDescriptionRef.current) {
          console.log("[v0] Already has remote description, ignoring duplicate answer")
          return
        }

        console.log("[v0] Processing received answer...")
        try {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp }))
          hasRemoteDescriptionRef.current = true
          console.log("[v0] Remote description set (answer)")

          await processQueuedCandidates()
        } catch (err) {
          console.error("[v0] Error processing answer:", err)
        }
      }

      // Poll for signaling messages and ICE candidates
      const pollSignaling = async () => {
        try {
          // Check for signaling messages
          const { data: signals } = await supabase
            .from("signaling")
            .select("*")
            .eq("room_id", roomId)
            .eq("to_user_id", userId)
            .order("created_at", { ascending: true })

          if (signals && signals.length > 0) {
            for (const signal of signals) {
              if (processedSignalingIds.current.has(signal.id)) continue
              processedSignalingIds.current.add(signal.id)

              console.log("[v0] Processing signaling:", signal.type)

              if (signal.type === "offer" && !isInitiatorRef.current) {
                await processOffer(signal.sdp)
              } else if (signal.type === "answer" && isInitiatorRef.current) {
                await processAnswer(signal.sdp)
              }
            }
          }

          // Check for ICE candidates
          const { data: candidates } = await supabase
            .from("ice_candidates")
            .select("*")
            .eq("room_id", roomId)
            .eq("to_user_id", userId)
            .order("created_at", { ascending: true })

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

      // Start signaling polling
      console.log("[v0] Starting signaling polling...")
      signalingPollingRef.current = setInterval(pollSignaling, 500) // Poll every 500ms

      // If initiator, wait a bit then send offer
      if (isInitiator) {
        console.log("[v0] I am initiator, sending offer in 1 second...")
        setTimeout(createAndSendOffer, 1000)
      } else {
        // Check immediately for existing offer
        console.log("[v0] I am NOT initiator, checking for existing offer...")
        setTimeout(pollSignaling, 100)
      }
    },
    [userId],
  )

  const handleMatch = useCallback(
    async (partnerId: string, roomId: string, isInitiator: boolean, partnerProfile: PartnerProfile) => {
      console.log("[v0] ====== MATCH FOUND ======")
      console.log("[v0] Partner:", partnerProfile.full_name)
      console.log("[v0] I am initiator:", isInitiator)

      setCurrentPartner(partnerProfile)
      currentPartnerIdRef.current = partnerId
      setVideoState("connecting")
      setConnectionStatus(`Conectando com ${partnerProfile.full_name}...`)

      currentRoomIdRef.current = roomId

      await setupWebRTC(roomId, isInitiator, partnerId)
    },
    [setupWebRTC],
  )

  const startSearching = useCallback(async () => {
    if (limitReached) return

    setIsLoading(true)
    setVideoState("searching")
    setConnectionStatus("Preparando câmera...")

    setCurrentPartner(null)
    currentPartnerIdRef.current = null
    setIsLiked(false)
    setRemoteVideoReady(false)

    const stream = await getLocalStream()
    if (!stream) {
      setIsLoading(false)
      return
    }

    setConnectionStatus("Buscando profissional...")

    try {
      const result = await joinVideoQueue()

      if (!result.success) {
        setConnectionStatus(result.error || "Erro ao entrar na fila")
        setVideoState("idle")
        setIsLoading(false)
        return
      }

      currentRoomIdRef.current = result.roomId!

      // Joined existing room (User2 - NOT initiator)
      if (result.matched && result.partnerId && result.partnerProfile) {
        console.log("[v0] Joined existing room as User2 (NOT initiator)")
        await handleMatch(result.partnerId, result.roomId!, false, {
          id: result.partnerId,
          full_name: result.partnerProfile.full_name || "Usuário",
          avatar_url: result.partnerProfile.avatar_url || "",
          bio: result.partnerProfile.bio,
          city: result.partnerProfile.city,
        })
        setIsLoading(false)
        return
      }

      // Created new room (User1 - IS initiator)
      console.log("[v0] Created new room as User1, waiting for partner...")
      pollingRef.current = setInterval(async () => {
        if (!currentRoomIdRef.current) return

        const status = await checkRoomStatus(currentRoomIdRef.current)

        if (status.status === "active" && status.partnerId && status.partnerProfile) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }

          console.log("[v0] Partner joined! I am User1 (initiator)")
          await handleMatch(status.partnerId, currentRoomIdRef.current!, true, {
            id: status.partnerId,
            full_name: status.partnerProfile.full_name || "Usuário",
            avatar_url: status.partnerProfile.avatar_url || "",
            bio: status.partnerProfile.bio,
            city: status.partnerProfile.city,
          })
        }
      }, 1500)

      setIsLoading(false)
    } catch (error) {
      console.error("[v0] Error starting search:", error)
      setConnectionStatus("Erro ao iniciar busca")
      setVideoState("idle")
      setIsLoading(false)
    }
  }, [getLocalStream, handleMatch, limitReached])

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }, [])

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOff(!videoTrack.enabled)
      }
    }
  }, [])

  const flipCamera = useCallback(async () => {
    facingModeRef.current = facingModeRef.current === "user" ? "environment" : "user"
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => track.stop())
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingModeRef.current },
        audio: true,
      })
      localStreamRef.current = stream

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      if (peerConnectionRef.current) {
        const videoTrack = stream.getVideoTracks()[0]
        const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === "video")
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack)
        }
      }
    } catch (error) {
      console.error("[v0] Error flipping camera:", error)
    }
  }, [])

  const endCall = useCallback(async () => {
    await cleanup()
    setVideoState("ended")
    setCurrentPartner(null)
  }, [cleanup])

  const skipToNext = useCallback(async () => {
    await cleanup()
    setCurrentPartner(null)
    setVideoState("idle")
    setTimeout(() => {
      startSearching()
    }, 500)
  }, [cleanup, startSearching])

  const handleLike = useCallback(async () => {
    if (!currentPartner || isLiked) return

    const result = await likeUser(currentPartner.id)
    setIsLiked(true)

    if (result.error) {
      console.error("[v0] Like error:", result.error)
      return
    }

    if (result.isMatch) {
      console.log("[v0] It's a match!")
    }
  }, [currentPartner, isLiked])

  const formatWaitTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // RENDER
  if (videoState === "permission_denied") {
    return (
      <div className="flex h-full items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-xl border border-destructive/20 bg-card p-6 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h2 className="mb-2 text-xl font-semibold text-foreground">Permissão Necessária</h2>
          <p className="mb-4 text-muted-foreground">{permissionError}</p>
          <Button onClick={() => setVideoState("idle")} variant="outline">
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  if (limitReached && videoState === "idle") {
    return (
      <div className="flex h-full items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-xl border border-primary/20 bg-card p-6 text-center">
          <Clock className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h2 className="mb-2 text-xl font-semibold text-foreground">Limite Diário Atingido</h2>
          <p className="mb-4 text-muted-foreground">
            Você atingiu o limite de chamadas diárias. Suas chamadas serão renovadas em {timeUntilReset}.
          </p>
          <Button className="bg-gradient-to-r from-primary to-pink-500">
            <Sparkles className="mr-2 h-4 w-4" />
            Fazer Upgrade para Pro
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Videochamada</h1>
            <p className="text-sm text-muted-foreground">Conecte-se instantaneamente com profissionais</p>
          </div>
          {remainingCalls !== null && remainingCalls !== -1 && (
            <div className="text-right">
              <span className="text-sm text-muted-foreground">Chamadas restantes:</span>
              <span className="ml-2 font-bold text-primary">{remainingCalls}</span>
            </div>
          )}
        </div>
      </div>

      {/* Video Area - TRUE 50/50 split on desktop */}
      <div className="flex flex-1 flex-col lg:flex-row lg:gap-0 overflow-hidden">
        {/* Remote Video - 50% on mobile, 50% on desktop */}
        <div className="relative flex h-1/2 lg:h-full lg:w-1/2 items-center justify-center overflow-hidden bg-card border-b lg:border-b-0 lg:border-r border-border">
          {videoState === "idle" && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-pink-500/20">
                <Video className="h-12 w-12 text-primary" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-foreground">Pronto para conectar?</h2>
              <p className="mb-6 max-w-sm text-muted-foreground">
                Inicie uma videochamada e conheça profissionais em tempo real
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

          {videoState === "searching" && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="relative mb-6">
                <div className="h-24 w-24 animate-spin rounded-full border-4 border-primary/20 border-t-primary"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-pink-500"></div>
                </div>
              </div>
              <h2 className="mb-2 text-2xl font-bold text-foreground">Buscando profissional...</h2>
              <p className="mb-4 flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                Tempo de espera: {formatWaitTime(waitTime)}
              </p>
              <Button onClick={endCall} variant="outline">
                Cancelar
              </Button>
            </div>
          )}

          {videoState === "connecting" && currentPartner && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
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

          {(videoState === "connected" || (videoState === "connecting" && currentPartner)) && (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`h-full w-full object-cover ${!remoteVideoReady ? "hidden" : ""}`}
              />

              {!remoteVideoReady && videoState === "connected" && (
                <div className="flex h-full w-full items-center justify-center bg-card">
                  <div className="text-center">
                    <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">Aguardando vídeo do parceiro...</p>
                  </div>
                </div>
              )}

              {/* Partner Info */}
              {currentPartner && videoState === "connected" && (
                <div className="absolute left-4 top-4 flex items-center gap-3 rounded-lg bg-black/50 p-2 backdrop-blur-sm">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={currentPartner.avatar_url || undefined} />
                    <AvatarFallback>{currentPartner.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-white">{currentPartner.full_name}</p>
                    {currentPartner.city && <p className="text-xs text-white/70">{currentPartner.city}</p>}
                  </div>
                </div>
              )}

              {/* Action buttons on remote video */}
              {videoState === "connected" && (
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
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
              )}

              {/* End call button */}
              {videoState === "connected" && (
                <Button
                  onClick={endCall}
                  size="icon"
                  className="absolute left-4 bottom-4 h-10 w-10 lg:h-12 lg:w-12 rounded-full bg-red-500 hover:bg-red-600"
                >
                  <PhoneOff className="h-5 w-5 lg:h-6 lg:w-6" />
                </Button>
              )}
            </>
          )}

          {videoState === "ended" && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
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

        {/* Local Video - TRUE 50% on mobile and desktop */}
        <div className="relative h-1/2 lg:h-full lg:w-1/2 w-full overflow-hidden bg-card">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${!localVideoReady ? "hidden" : ""}`}
          />

          {!localVideoReady && (
            <div className="flex h-full items-center justify-center">
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
    </div>
  )
}
