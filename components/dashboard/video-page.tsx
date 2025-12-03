"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  SkipForward,
  Heart,
  MessageCircle,
  Send,
  Users,
  Loader2,
  X,
  RefreshCw,
  AlertCircle,
  Clock,
  SwitchCamera,
  Sparkles,
  Filter,
  Wifi,
  WifiOff,
  Signal,
} from "lucide-react"
import { joinVideoQueue, leaveVideoQueue, checkRoomStatus, getRemainingCalls } from "@/app/actions/video"
import { likeUser } from "@/app/actions/likes"
import { brazilianStates } from "@/lib/brazilian-states"

interface VideoPageProps {
  userId: string
  userProfile: {
    full_name: string
    avatar_url?: string
    city?: string
    state?: string
    interests?: string[]
  }
}

interface PartnerProfile {
  id: string
  full_name: string
  avatar_url?: string
  profession?: string
  bio?: string
  city?: string
  state?: string
}

interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: Date
}

type VideoState = "idle" | "searching" | "connecting" | "connected" | "ended" | "permission_denied"
type ConnectionQuality = "excellent" | "good" | "poor" | "disconnected"

export function VideoPage({ userId, userProfile }: VideoPageProps) {
  // Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // State
  const [videoState, setVideoState] = useState<VideoState>("idle")
  const [currentPartner, setCurrentPartner] = useState<PartnerProfile | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<string>("")
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>("good")
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [waitTime, setWaitTime] = useState(0)
  const [localVideoReady, setLocalVideoReady] = useState(false)
  const [remoteVideoReady, setRemoteVideoReady] = useState(false)
  const [remainingCalls, setRemainingCalls] = useState<number | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [timeUntilReset, setTimeUntilReset] = useState<string>("")
  const [showFilters, setShowFilters] = useState(false)
  const [locationFilter, setLocationFilter] = useState({ state: "", city: "" })

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const currentRoomIdRef = useRef<string | null>(null)
  const currentPartnerIdRef = useRef<string | null>(null)
  const isInitiatorRef = useRef<boolean>(false)
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const iceCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([])
  const hasRemoteDescriptionRef = useRef<boolean>(false)
  const isSettingUpRef = useRef<boolean>(false)
  const facingModeRef = useRef<"user" | "environment">("user")
  const waitTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const iceServersRef = useRef<RTCIceServer[]>([])

  const currentUserId = userId

  const loadIceServers = useCallback(async () => {
    try {
      const response = await fetch("/api/turn-credentials")
      const data = await response.json()
      if (data.iceServers && data.iceServers.length > 0) {
        iceServersRef.current = data.iceServers
        console.log("[v0] ICE servers loaded:", data.iceServers.length)
      } else {
        // Fallback to public STUN servers
        iceServersRef.current = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }]
        console.log("[v0] Using fallback STUN servers")
      }
    } catch (error) {
      console.error("[v0] Error loading ICE servers:", error)
      iceServersRef.current = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }]
    }
  }, [])

  // Load remaining calls on mount
  useEffect(() => {
    const loadRemainingCalls = async () => {
      const result = await getRemainingCalls(userId)
      if (result.success) {
        setRemainingCalls(result.remaining ?? null)
        if (result.remaining === 0 && result.resetTime) {
          setLimitReached(true)
          const resetDate = new Date(result.resetTime)
          const now = new Date()
          const diff = resetDate.getTime() - now.getTime()
          const hours = Math.floor(diff / (1000 * 60 * 60))
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
          setTimeUntilReset(`${hours}h ${minutes}m`)
        }
      }
    }
    loadRemainingCalls()
    loadIceServers()
  }, [userId, loadIceServers])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const cleanup = useCallback(async () => {
    console.log("[v0] Cleaning up...")

    // Clear timers
    if (waitTimerRef.current) {
      clearInterval(waitTimerRef.current)
      waitTimerRef.current = null
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    // Unsubscribe from realtime channel
    if (realtimeChannelRef.current) {
      await supabase.removeChannel(realtimeChannelRef.current)
      realtimeChannelRef.current = null
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    // Leave video queue if in a room
    if (currentRoomIdRef.current) {
      await leaveVideoQueue(userId, currentRoomIdRef.current)
    }

    // Reset refs
    currentRoomIdRef.current = null
    currentPartnerIdRef.current = null
    isInitiatorRef.current = false
    hasRemoteDescriptionRef.current = false
    isSettingUpRef.current = false
    iceCandidatesQueueRef.current = []
    dataChannelRef.current = null

    // Reset state
    setLocalVideoReady(false)
    setRemoteVideoReady(false)
    setConnectionStatus("")
    setWaitTime(0)
  }, [supabase, userId])

  const getLocalStream = useCallback(async () => {
    try {
      const constraints = {
        video: { facingMode: facingModeRef.current, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        setLocalVideoReady(true)
      }

      return stream
    } catch (error: unknown) {
      console.error("[v0] Error getting local stream:", error)
      const err = error as Error
      if (err.name === "NotAllowedError") {
        setPermissionError("Você precisa permitir acesso à câmera e microfone para usar a videochamada.")
        setVideoState("permission_denied")
      } else {
        setPermissionError(
          "Não foi possível acessar sua câmera ou microfone. Verifique as configurações do seu dispositivo.",
        )
        setVideoState("permission_denied")
      }
      return null
    }
  }, [])

  const subscribeToSignaling = useCallback(
    (roomId: string, partnerId: string) => {
      console.log("[v0] Subscribing to realtime for room:", roomId)

      // Unsubscribe from previous channel if exists
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current)
      }

      const channel = supabase
        .channel(`room-${roomId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "signaling",
            filter: `room_id=eq.${roomId}`,
          },
          async (payload) => {
            const signal = payload.new as {
              id: string
              type: string
              sdp: string
              from_user_id: string
              to_user_id: string
              room_id: string
            }

            // Only process signals sent to me
            if (signal.to_user_id !== userId) return
            console.log("[v0] Received signal:", signal.type, "from:", signal.from_user_id)

            if (signal.type === "offer" && !isInitiatorRef.current) {
              await handleOffer(signal.sdp, signal.from_user_id)
            } else if (signal.type === "answer" && isInitiatorRef.current) {
              await handleAnswer(signal.sdp)
            }

            // Mark as processed
            await supabase.from("signaling").update({ processed: true }).eq("id", signal.id)
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "ice_candidates",
            filter: `room_id=eq.${roomId}`,
          },
          async (payload) => {
            const candidate = payload.new as {
              id: string
              candidate: string
              from_user_id: string
              to_user_id: string
              room_id: string
            }

            // Only process candidates sent to me
            if (candidate.to_user_id !== userId) return
            console.log("[v0] Received ICE candidate from:", candidate.from_user_id)

            try {
              const candidateObj = JSON.parse(candidate.candidate)
              if (hasRemoteDescriptionRef.current && peerConnectionRef.current) {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidateObj))
                console.log("[v0] Added ICE candidate")
              } else {
                iceCandidatesQueueRef.current.push(candidateObj)
                console.log("[v0] Queued ICE candidate")
              }
            } catch (error) {
              console.error("[v0] Error adding ICE candidate:", error)
            }

            // Mark as processed
            await supabase.from("ice_candidates").update({ processed: true }).eq("id", candidate.id)
          },
        )
        .subscribe((status) => {
          console.log("[v0] Realtime subscription status:", status)
        })

      realtimeChannelRef.current = channel
    },
    [supabase, userId],
  )

  const sendSignal = useCallback(
    async (type: "offer" | "answer", sdp: string) => {
      if (!currentRoomIdRef.current || !currentPartnerIdRef.current) {
        console.error("[v0] Cannot send signal - no room or partner")
        return
      }

      console.log("[v0] Sending signal:", type)
      const { error } = await supabase.from("signaling").insert({
        room_id: currentRoomIdRef.current,
        from_user_id: userId,
        to_user_id: currentPartnerIdRef.current,
        type,
        sdp,
        processed: false,
      })

      if (error) {
        console.error("[v0] Error sending signal:", error)
      } else {
        console.log("[v0] Signal sent successfully:", type)
      }
    },
    [supabase, userId],
  )

  const sendIceCandidate = useCallback(
    async (candidate: RTCIceCandidate) => {
      if (!currentRoomIdRef.current || !currentPartnerIdRef.current) return

      console.log("[v0] Sending ICE candidate")
      const { error } = await supabase.from("ice_candidates").insert({
        room_id: currentRoomIdRef.current,
        from_user_id: userId,
        to_user_id: currentPartnerIdRef.current,
        candidate: JSON.stringify(candidate.toJSON()),
        processed: false,
      })

      if (error) {
        console.error("[v0] Error sending ICE candidate:", error)
      }
    },
    [supabase, userId],
  )

  const handleOffer = useCallback(
    async (sdp: string, fromUserId: string) => {
      console.log("[v0] Handling offer from:", fromUserId)

      if (!peerConnectionRef.current) {
        console.error("[v0] No peer connection")
        return
      }

      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp }))
        hasRemoteDescriptionRef.current = true
        console.log("[v0] Remote description set (offer)")

        // Process queued ICE candidates
        for (const candidate of iceCandidatesQueueRef.current) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
          console.log("[v0] Added queued ICE candidate")
        }
        iceCandidatesQueueRef.current = []

        // Create and send answer
        const answer = await peerConnectionRef.current.createAnswer()
        await peerConnectionRef.current.setLocalDescription(answer)
        await sendSignal("answer", answer.sdp!)
        console.log("[v0] Answer sent")
      } catch (error) {
        console.error("[v0] Error handling offer:", error)
      }
    },
    [sendSignal],
  )

  const handleAnswer = useCallback(async (sdp: string) => {
    console.log("[v0] Handling answer")

    if (!peerConnectionRef.current) {
      console.error("[v0] No peer connection")
      return
    }

    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp }))
      hasRemoteDescriptionRef.current = true
      console.log("[v0] Remote description set (answer)")

      // Process queued ICE candidates
      for (const candidate of iceCandidatesQueueRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        console.log("[v0] Added queued ICE candidate")
      }
      iceCandidatesQueueRef.current = []
    } catch (error) {
      console.error("[v0] Error handling answer:", error)
    }
  }, [])

  const setupWebRTC = useCallback(
    async (isInitiator: boolean) => {
      if (isSettingUpRef.current) {
        console.log("[v0] Already setting up WebRTC")
        return
      }
      isSettingUpRef.current = true
      isInitiatorRef.current = isInitiator

      console.log("[v0] Setting up WebRTC, isInitiator:", isInitiator)

      // Get local stream first
      let stream = localStreamRef.current
      if (!stream) {
        stream = await getLocalStream()
        if (!stream) {
          isSettingUpRef.current = false
          return
        }
      }

      // Create peer connection with ICE servers
      const config: RTCConfiguration = {
        iceServers:
          iceServersRef.current.length > 0
            ? iceServersRef.current
            : [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
        iceCandidatePoolSize: 10,
      }

      console.log("[v0] Creating peer connection with", config.iceServers?.length, "ICE servers")
      const pc = new RTCPeerConnection(config)
      peerConnectionRef.current = pc

      // Add local tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream!)
        console.log("[v0] Added local track:", track.kind)
      })

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("[v0] Local ICE candidate:", event.candidate.type, event.candidate.protocol)
          sendIceCandidate(event.candidate)
        }
      }

      // Handle ICE connection state changes
      pc.oniceconnectionstatechange = () => {
        console.log("[v0] ICE connection state:", pc.iceConnectionState)

        switch (pc.iceConnectionState) {
          case "checking":
            setConnectionStatus("Conectando...")
            break
          case "connected":
          case "completed":
            setConnectionStatus("")
            setVideoState("connected")
            setConnectionQuality("good")
            break
          case "disconnected":
            setConnectionStatus("Reconectando...")
            setConnectionQuality("poor")
            break
          case "failed":
            setConnectionStatus("Conexão falhou")
            setConnectionQuality("disconnected")
            // Try ICE restart
            if (isInitiatorRef.current && peerConnectionRef.current) {
              console.log("[v0] Attempting ICE restart")
              peerConnectionRef.current.restartIce()
            }
            break
        }
      }

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log("[v0] Connection state:", pc.connectionState)
      }

      // Handle remote tracks
      pc.ontrack = (event) => {
        console.log("[v0] Remote track received:", event.track.kind)
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0]
          setRemoteVideoReady(true)
          setVideoState("connected")
          console.log("[v0] Remote video connected!")
        }
      }

      // Setup data channel for chat
      if (isInitiator) {
        const dataChannel = pc.createDataChannel("chat")
        setupDataChannel(dataChannel)
      } else {
        pc.ondatachannel = (event) => {
          setupDataChannel(event.channel)
        }
      }

      // If initiator, create and send offer
      if (isInitiator) {
        try {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          await sendSignal("offer", offer.sdp!)
          console.log("[v0] Offer created and sent")
        } catch (error) {
          console.error("[v0] Error creating offer:", error)
        }
      }

      isSettingUpRef.current = false
    },
    [getLocalStream, sendIceCandidate, sendSignal],
  )

  // Setup data channel for chat
  const setupDataChannel = (channel: RTCDataChannel) => {
    dataChannelRef.current = channel

    channel.onopen = () => {
      console.log("[v0] Data channel opened")
    }

    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        setChatMessages((prev) => [...prev, message])
      } catch (error) {
        console.error("[v0] Error parsing chat message:", error)
      }
    }

    channel.onerror = (error) => {
      console.error("[v0] Data channel error:", error)
    }
  }

  const handleMatch = useCallback(
    async (partnerId: string, roomId: string, isInitiator: boolean, partnerProfile: PartnerProfile) => {
      console.log("[v0] Match found! Partner:", partnerId, "Room:", roomId, "isInitiator:", isInitiator)

      currentPartnerIdRef.current = partnerId
      currentRoomIdRef.current = roomId
      setCurrentPartner(partnerProfile)
      setVideoState("connecting")
      setConnectionStatus("Conectando com " + partnerProfile.full_name + "...")

      // Subscribe to realtime signaling FIRST
      subscribeToSignaling(roomId, partnerId)

      // Small delay to ensure subscription is active
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Then setup WebRTC
      await setupWebRTC(isInitiator)
    },
    [subscribeToSignaling, setupWebRTC],
  )

  const startSearching = useCallback(async () => {
    setIsLoading(true)
    setVideoState("searching")
    setConnectionStatus("Buscando profissionais...")
    setWaitTime(0)

    // Start wait timer
    waitTimerRef.current = setInterval(() => {
      setWaitTime((prev) => prev + 1)
    }, 1000)

    try {
      // Get local stream first
      const stream = await getLocalStream()
      if (!stream) {
        setIsLoading(false)
        return
      }

      // Join video queue
      const result = await joinVideoQueue(userId, locationFilter.state || undefined, locationFilter.city || undefined)
      console.log("[v0] Join queue result:", result)

      if (!result.success) {
        console.error("[v0] Failed to join queue:", result.error)
        setConnectionStatus("Erro ao buscar parceiro")
        setVideoState("idle")
        setIsLoading(false)
        return
      }

      currentRoomIdRef.current = result.roomId!

      // If matched immediately (joined existing room)
      if (result.matched && result.partnerId && result.partnerProfile) {
        console.log("[v0] Matched immediately - I joined existing room")
        await handleMatch(
          result.partnerId,
          result.roomId!,
          false, // I joined, so I'm NOT the initiator
          {
            id: result.partnerId,
            full_name: result.partnerProfile.full_name || "Usuário",
            avatar_url: result.partnerProfile.avatar_url,
            bio: result.partnerProfile.bio,
            city: result.partnerProfile.city,
            state: result.partnerProfile.state,
          },
        )
        setIsLoading(false)
        return
      }

      // If created new room, poll for partner to join
      console.log("[v0] Created new room, waiting for partner...")
      setConnectionStatus("Aguardando outro profissional...")

      // Poll for partner
      pollIntervalRef.current = setInterval(async () => {
        if (!currentRoomIdRef.current) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          return
        }

        const status = await checkRoomStatus(currentRoomIdRef.current)
        console.log("[v0] Room status:", status.status, status.partnerId ? "Partner found!" : "")

        if (status.status === "active" && status.partnerId && status.partnerProfile) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null

          console.log("[v0] Partner joined my room - I am initiator")
          await handleMatch(
            status.partnerId,
            currentRoomIdRef.current!,
            true, // I created the room, so I'm the initiator
            {
              id: status.partnerId,
              full_name: status.partnerProfile.full_name || "Usuário",
              avatar_url: status.partnerProfile.avatar_url,
              bio: status.partnerProfile.bio,
              city: status.partnerProfile.city,
              state: status.partnerProfile.state,
            },
          )
        }
      }, 1000)

      setIsLoading(false)
    } catch (error) {
      console.error("[v0] Error starting search:", error)
      setConnectionStatus("Erro ao iniciar busca")
      setVideoState("idle")
      setIsLoading(false)
    }
  }, [userId, locationFilter, getLocalStream, handleMatch])

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

  // Flip camera
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

      // Replace track in peer connection
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

  // Send chat message
  const sendChatMessage = useCallback(() => {
    if (!chatInput.trim()) return

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: currentUserId,
      senderName: userProfile.full_name,
      content: chatInput.trim(),
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, message])
    setChatInput("")

    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(JSON.stringify(message))
    }
  }, [chatInput, currentUserId, userProfile.full_name])

  // Handle end call
  const handleEndCall = useCallback(async () => {
    await cleanup()
    setVideoState("ended")
    setCurrentPartner(null)
  }, [cleanup])

  // Handle next call
  const handleNextCall = useCallback(async () => {
    await cleanup()
    setCurrentPartner(null)
    setChatMessages([])
    startSearching()
  }, [cleanup, startSearching])

  // Handle connect (like)
  const handleConnect = useCallback(async () => {
    if (!currentPartner) return
    await likeUser(currentUserId, currentPartner.id)
  }, [currentUserId, currentPartner])

  // Get connection quality badge
  const getConnectionQualityBadge = () => {
    const qualityConfig = {
      excellent: { icon: Signal, color: "text-green-500", label: "Excelente" },
      good: { icon: Wifi, color: "text-yellow-500", label: "Boa" },
      poor: { icon: WifiOff, color: "text-orange-500", label: "Fraca" },
      disconnected: { icon: WifiOff, color: "text-red-500", label: "Desconectado" },
    }

    const config = qualityConfig[connectionQuality]
    const Icon = config.icon

    return (
      <div className={`flex items-center gap-1 text-xs ${config.color}`}>
        <Icon className="w-3 h-3" />
        <span>{config.label}</span>
      </div>
    )
  }

  // Render filters
  const renderFilters = () => (
    <div className="mb-4">
      <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
        <Filter className="w-4 h-4" />
        Filtros
      </Button>

      {showFilters && (
        <div className="mt-3 p-3 rounded-lg border bg-card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Estado</Label>
              <Select
                value={locationFilter.state}
                onValueChange={(value) => setLocationFilter((prev) => ({ ...prev, state: value, city: "" }))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todos os Estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Estados</SelectItem>
                  {brazilianStates.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Cidade (opcional)</Label>
              <Input
                placeholder="Digite a cidade..."
                value={locationFilter.city}
                onChange={(e) => setLocationFilter((prev) => ({ ...prev, city: e.target.value }))}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground">
            Filtre por localização para encontrar profissionais perto de você
          </p>
        </div>
      )}
    </div>
  )

  const renderPartnerInfo = () => {
    if (!currentPartner) return null

    return (
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-background/80 to-background/60 backdrop-blur-sm rounded-lg border border-border/50">
        <Avatar className="h-10 w-10 border-2 border-primary/30">
          <AvatarImage src={currentPartner.avatar_url || ""} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-pink-500 text-white text-sm">
            {currentPartner.full_name?.[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{currentPartner.full_name}</h3>
          <p className="text-xs text-muted-foreground truncate">{currentPartner.profession || currentPartner.bio}</p>
        </div>
        {getConnectionQualityBadge()}
      </div>
    )
  }

  const renderIdleState = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-pink-500 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold">Videochamada Aleatória</h2>
          <p className="text-sm text-muted-foreground">
            Conecte-se com profissionais de forma instantânea e expanda sua rede
          </p>
        </div>

        {renderFilters()}

        {remainingCalls !== null && remainingCalls !== -1 && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Video className="w-4 h-4" />
            <span>{remainingCalls} chamadas restantes hoje</span>
          </div>
        )}

        <Button
          onClick={startSearching}
          disabled={isLoading || limitReached}
          className="w-full h-12 bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90 text-base font-semibold"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Iniciando...
            </>
          ) : (
            <>
              <Video className="w-5 h-5 mr-2" />
              Iniciar Videochamada
            </>
          )}
        </Button>
      </div>
    </div>
  )

  const renderSearchingState = () => (
    <div className="flex flex-col h-full">
      {renderFilters()}

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 mx-auto border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <Users className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold">Procurando...</h3>
            <p className="text-sm text-muted-foreground">{connectionStatus || "Buscando profissionais disponíveis"}</p>
            <p className="text-xs text-muted-foreground">{waitTime}s</p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 w-32 h-44 sm:w-40 sm:h-56 rounded-xl overflow-hidden border-2 border-primary/50 shadow-lg">
        {localVideoReady ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
            style={{ transform: "scaleX(-1)" }}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        <button
          onClick={flipCamera}
          className="absolute bottom-2 right-2 p-1.5 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
        >
          <SwitchCamera className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="p-4 flex justify-center">
        <Button variant="destructive" size="sm" onClick={handleEndCall}>
          <PhoneOff className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
      </div>
    </div>
  )

  const renderConnectedState = () => (
    <div className="flex flex-col h-full relative">
      {renderPartnerInfo()}

      <div className="flex-1 relative bg-black rounded-lg overflow-hidden my-2">
        {remoteVideoReady ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">{connectionStatus || "Conectando vídeo..."}</p>
          </div>
        )}

        <div className="absolute bottom-4 right-4 w-28 h-40 sm:w-36 sm:h-48 rounded-xl overflow-hidden border-2 border-primary/50 shadow-lg">
          {isVideoOff ? (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-muted-foreground" />
            </div>
          ) : (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
          )}
          <button
            onClick={flipCamera}
            className="absolute bottom-2 right-2 p-1.5 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
          >
            <SwitchCamera className="w-4 h-4 text-white" />
          </button>
        </div>

        {connectionStatus && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm">
            {connectionStatus}
          </div>
        )}
      </div>

      {isChatOpen && (
        <div className="absolute bottom-20 left-2 right-2 sm:left-4 sm:right-4 bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg max-h-64 flex flex-col">
          <div className="flex items-center justify-between p-2 border-b">
            <span className="text-sm font-medium">Chat</span>
            <button onClick={() => setIsChatOpen(false)} className="p-1 hover:bg-muted rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]">
            {chatMessages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma mensagem ainda</p>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2 rounded-lg text-sm ${msg.senderId === currentUserId ? "bg-primary text-primary-foreground ml-8" : "bg-muted mr-8"}`}
                >
                  <p className="font-medium text-xs">{msg.senderId === currentUserId ? "Você" : msg.senderName}</p>
                  <p>{msg.content}</p>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-2 border-t flex gap-2">
            <Input
              placeholder="Digite uma mensagem..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
              className="flex-1 h-8 text-sm"
            />
            <Button size="sm" onClick={sendChatMessage} className="h-8 w-8 p-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="p-2 sm:p-4 border-t bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
          <Button
            variant={isMuted ? "destructive" : "outline"}
            size="icon"
            onClick={toggleMute}
            className="h-10 w-10 shrink-0"
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          <Button
            variant={isVideoOff ? "destructive" : "outline"}
            size="icon"
            onClick={toggleVideo}
            className="h-10 w-10 shrink-0"
          >
            {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
          </Button>

          <Button
            variant={isChatOpen ? "default" : "outline"}
            size="icon"
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="h-10 w-10 shrink-0"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>

          <Button variant="outline" onClick={handleNextCall} className="h-10 px-3 shrink-0 bg-transparent">
            <SkipForward className="h-4 w-4 mr-1" />
            <span className="text-sm">Next</span>
          </Button>

          <Button variant="destructive" size="icon" onClick={handleEndCall} className="h-10 w-10 shrink-0">
            <PhoneOff className="h-4 w-4" />
          </Button>

          <Button
            onClick={handleConnect}
            className="h-10 px-3 bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90 shrink-0"
          >
            <Sparkles className="h-4 w-4 mr-1" />
            <Heart className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  const renderEndedState = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
          <PhoneOff className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold">Chamada Encerrada</h2>
        <p className="text-sm text-muted-foreground">Obrigado por usar o Connext!</p>
        <Button
          onClick={() => {
            setVideoState("idle")
            setCurrentPartner(null)
          }}
          className="bg-gradient-to-r from-primary to-pink-500"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Nova Chamada
        </Button>
      </div>
    </div>
  )

  const renderPermissionDenied = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold">Permissão Necessária</h2>
        <p className="text-sm text-muted-foreground">{permissionError}</p>
        <Button
          onClick={() => {
            setVideoState("idle")
            setPermissionError(null)
          }}
        >
          Tentar Novamente
        </Button>
      </div>
    </div>
  )

  const renderLimitReached = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 mx-auto bg-yellow-500/10 rounded-full flex items-center justify-center">
          <Clock className="w-8 h-8 text-yellow-500" />
        </div>
        <h2 className="text-xl font-bold">Limite Diário Atingido</h2>
        <p className="text-sm text-muted-foreground">
          Você atingiu o limite de videochamadas para hoje. Volte em {timeUntilReset}.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            setLimitReached(false)
            setVideoState("idle")
          }}
        >
          Entendi
        </Button>
      </div>
    </div>
  )

  if (limitReached) return renderLimitReached()

  switch (videoState) {
    case "idle":
      return renderIdleState()
    case "searching":
      return renderSearchingState()
    case "connecting":
      return renderSearchingState()
    case "connected":
      return renderConnectedState()
    case "ended":
      return renderEndedState()
    case "permission_denied":
      return renderPermissionDenied()
    default:
      return renderIdleState()
  }
}
