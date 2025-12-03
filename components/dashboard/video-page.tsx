"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
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
  AlertCircle,
  Clock,
  SwitchCamera,
  Sparkles,
  Filter,
  Wifi,
  WifiOff,
  Signal,
  Flag,
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
  const supabase = createClient()

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
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const loadIceServers = useCallback(async () => {
    try {
      const response = await fetch("/api/turn-credentials")
      const data = await response.json()
      if (data.iceServers && data.iceServers.length > 0) {
        iceServersRef.current = data.iceServers
        console.log("[v0] ICE servers loaded:", data.iceServers.length)
      } else {
        iceServersRef.current = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }]
        console.log("[v0] Using fallback STUN servers")
      }
    } catch (error) {
      console.error("[v0] Error loading ICE servers:", error)
      iceServersRef.current = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }]
    }
  }, [])

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

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const cleanup = useCallback(async () => {
    console.log("[v0] Cleaning up...")

    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current)
      connectionTimeoutRef.current = null
    }

    if (waitTimerRef.current) {
      clearInterval(waitTimerRef.current)
      waitTimerRef.current = null
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    if (realtimeChannelRef.current) {
      await supabase.removeChannel(realtimeChannelRef.current)
      realtimeChannelRef.current = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    if (currentRoomIdRef.current) {
      await leaveVideoQueue(userId, currentRoomIdRef.current)
    }

    currentRoomIdRef.current = null
    currentPartnerIdRef.current = null
    isInitiatorRef.current = false
    hasRemoteDescriptionRef.current = false
    isSettingUpRef.current = false
    iceCandidatesQueueRef.current = []
    dataChannelRef.current = null

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
    (roomId: string) => {
      console.log("[v0] Subscribing to realtime for room:", roomId)

      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current)
      }

      const channel = supabase
        .channel(`video-room-${roomId}`)
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
            }

            if (signal.to_user_id !== userId) return
            console.log("[v0] Received signal:", signal.type)

            if (signal.type === "offer" && !isInitiatorRef.current) {
              await handleOffer(signal.sdp)
            } else if (signal.type === "answer" && isInitiatorRef.current) {
              await handleAnswer(signal.sdp)
            }
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
              candidate: string
              from_user_id: string
              to_user_id: string
            }

            if (candidate.to_user_id !== userId) return
            console.log("[v0] Received ICE candidate")

            try {
              const candidateObj = JSON.parse(candidate.candidate)
              if (hasRemoteDescriptionRef.current && peerConnectionRef.current) {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidateObj))
                console.log("[v0] Added ICE candidate immediately")
              } else {
                iceCandidatesQueueRef.current.push(candidateObj)
                console.log("[v0] Queued ICE candidate")
              }
            } catch (error) {
              console.error("[v0] Error processing ICE candidate:", error)
            }
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

  const processQueuedCandidates = useCallback(async () => {
    if (!peerConnectionRef.current) return

    console.log("[v0] Processing", iceCandidatesQueueRef.current.length, "queued candidates")
    for (const candidate of iceCandidatesQueueRef.current) {
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        console.log("[v0] Added queued ICE candidate")
      } catch (error) {
        console.error("[v0] Error adding queued candidate:", error)
      }
    }
    iceCandidatesQueueRef.current = []
  }, [])

  const handleOffer = useCallback(
    async (sdp: string) => {
      console.log("[v0] Handling offer")

      if (!peerConnectionRef.current) {
        console.error("[v0] No peer connection for offer")
        return
      }

      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp }))
        hasRemoteDescriptionRef.current = true
        console.log("[v0] Remote description set (offer)")

        await processQueuedCandidates()

        const answer = await peerConnectionRef.current.createAnswer()
        await peerConnectionRef.current.setLocalDescription(answer)
        await sendSignal("answer", answer.sdp!)
        console.log("[v0] Answer created and sent")
      } catch (error) {
        console.error("[v0] Error handling offer:", error)
      }
    },
    [sendSignal, processQueuedCandidates],
  )

  const handleAnswer = useCallback(
    async (sdp: string) => {
      console.log("[v0] Handling answer")

      if (!peerConnectionRef.current) {
        console.error("[v0] No peer connection for answer")
        return
      }

      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp }))
        hasRemoteDescriptionRef.current = true
        console.log("[v0] Remote description set (answer)")

        await processQueuedCandidates()
      } catch (error) {
        console.error("[v0] Error handling answer:", error)
      }
    },
    [processQueuedCandidates],
  )

  const setupWebRTC = useCallback(
    async (isInitiator: boolean) => {
      if (isSettingUpRef.current) {
        console.log("[v0] Already setting up WebRTC, skipping")
        return
      }
      isSettingUpRef.current = true
      isInitiatorRef.current = isInitiator

      console.log("[v0] ===== SETTING UP WEBRTC =====")
      console.log("[v0] isInitiator:", isInitiator)
      console.log("[v0] roomId:", currentRoomIdRef.current)
      console.log("[v0] partnerId:", currentPartnerIdRef.current)

      // Get local stream
      let stream = localStreamRef.current
      if (!stream) {
        stream = await getLocalStream()
        if (!stream) {
          console.error("[v0] Failed to get local stream")
          isSettingUpRef.current = false
          return
        }
      }

      // Create peer connection
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

      // Add local tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream!)
        console.log("[v0] Added local track:", track.kind)
      })

      // ICE candidate handler
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("[v0] Local ICE candidate generated:", event.candidate.type)
          sendIceCandidate(event.candidate)
        } else {
          console.log("[v0] ICE gathering complete")
        }
      }

      // ICE connection state handler
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
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current)
              connectionTimeoutRef.current = null
            }
            console.log("[v0] ===== CONNECTION ESTABLISHED =====")
            break
          case "disconnected":
            setConnectionStatus("Reconectando...")
            setConnectionQuality("poor")
            break
          case "failed":
            setConnectionStatus("Falha na conexão")
            setConnectionQuality("disconnected")
            console.log("[v0] ICE connection failed, attempting restart")
            if (isInitiatorRef.current && pc.connectionState !== "closed") {
              pc.restartIce()
            }
            break
        }
      }

      // Connection state handler
      pc.onconnectionstatechange = () => {
        console.log("[v0] Connection state:", pc.connectionState)
      }

      // Remote track handler
      pc.ontrack = (event) => {
        console.log("[v0] ===== REMOTE TRACK RECEIVED =====")
        console.log("[v0] Track kind:", event.track.kind)

        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0]
          setRemoteVideoReady(true)
          setVideoState("connected")
          console.log("[v0] Remote video connected!")
        }
      }

      // Data channel for chat
      if (isInitiator) {
        const dataChannel = pc.createDataChannel("chat")
        setupDataChannel(dataChannel)
        console.log("[v0] Data channel created by initiator")
      } else {
        pc.ondatachannel = (event) => {
          setupDataChannel(event.channel)
          console.log("[v0] Data channel received")
        }
      }

      // If initiator, create and send offer
      if (isInitiator) {
        try {
          console.log("[v0] Creating offer...")
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          console.log("[v0] Local description set, sending offer...")
          await sendSignal("offer", offer.sdp!)
          console.log("[v0] Offer sent successfully")
        } catch (error) {
          console.error("[v0] Error creating/sending offer:", error)
        }
      } else {
        console.log("[v0] Waiting for offer from initiator...")
      }

      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (pc.iceConnectionState !== "connected" && pc.iceConnectionState !== "completed") {
          console.log("[v0] Connection timeout, attempting ICE restart")
          if (isInitiatorRef.current && pc.connectionState !== "closed") {
            pc.restartIce()
          }
        }
      }, 15000)

      isSettingUpRef.current = false
    },
    [getLocalStream, sendIceCandidate, sendSignal],
  )

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
      console.log("[v0] ===== MATCH FOUND =====")
      console.log("[v0] Partner:", partnerId)
      console.log("[v0] Room:", roomId)
      console.log("[v0] I am initiator:", isInitiator)

      currentPartnerIdRef.current = partnerId
      currentRoomIdRef.current = roomId
      setCurrentPartner(partnerProfile)
      setVideoState("connecting")
      setConnectionStatus("Conectando com " + partnerProfile.full_name + "...")

      // Subscribe to realtime FIRST
      subscribeToSignaling(roomId)

      // Wait for subscription to be ready
      await new Promise((resolve) => setTimeout(resolve, 1000))

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
      const result = await joinVideoQueue(locationFilter.state || undefined, locationFilter.city || undefined)
      console.log("[v0] Join queue result:", result)

      if (!result.success) {
        console.error("[v0] Failed to join queue:", result.error)
        setConnectionStatus(result.error || "Erro ao buscar parceiro")
        setVideoState("idle")
        setIsLoading(false)
        return
      }

      currentRoomIdRef.current = result.roomId!

      // If matched immediately (I joined existing room)
      if (result.matched && result.partnerId && result.partnerProfile) {
        console.log("[v0] Matched immediately - I joined existing room")
        if (waitTimerRef.current) {
          clearInterval(waitTimerRef.current)
          waitTimerRef.current = null
        }

        await handleMatch(
          result.partnerId,
          result.roomId!,
          false, // I joined existing room, so I am NOT initiator
          {
            id: result.partnerId,
            full_name: result.partnerProfile.full_name || "Usuário",
            avatar_url: result.partnerProfile.avatar_url,
            bio: result.partnerProfile.bio,
            city: result.partnerProfile.city,
          },
        )
        setIsLoading(false)
        return
      }

      // Created new room, poll for partner
      console.log("[v0] Created new room, waiting for partner...")
      setConnectionStatus("Aguardando outro profissional...")

      pollIntervalRef.current = setInterval(async () => {
        if (!currentRoomIdRef.current) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          return
        }

        const status = await checkRoomStatus(currentRoomIdRef.current)
        console.log("[v0] Room status:", status.status)

        if (status.status === "active" && status.partnerId && status.partnerProfile) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          if (waitTimerRef.current) {
            clearInterval(waitTimerRef.current)
            waitTimerRef.current = null
          }

          console.log("[v0] Partner joined my room - I am initiator")
          await handleMatch(
            status.partnerId,
            currentRoomIdRef.current!,
            true, // Someone joined MY room, so I am the initiator
            {
              id: status.partnerId,
              full_name: status.partnerProfile.full_name || "Usuário",
              avatar_url: status.partnerProfile.avatar_url,
              bio: status.partnerProfile.bio,
              city: status.partnerProfile.city,
            },
          )
        }
      }, 1500)

      setIsLoading(false)
    } catch (error) {
      console.error("[v0] Error starting search:", error)
      setConnectionStatus("Erro ao iniciar busca")
      setVideoState("idle")
      setIsLoading(false)
    }
  }, [locationFilter, getLocalStream, handleMatch])

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
          sender.replaceTrack(videoTrack)
        }
      }
    } catch (error) {
      console.error("[v0] Error flipping camera:", error)
    }
  }, [])

  const endCall = useCallback(async () => {
    console.log("[v0] Ending call")
    await cleanup()
    setVideoState("ended")
    setCurrentPartner(null)
    setChatMessages([])
  }, [cleanup])

  const skipToNext = useCallback(async () => {
    console.log("[v0] Skipping to next")
    await cleanup()
    setCurrentPartner(null)
    setChatMessages([])
    setVideoState("idle")
    setTimeout(() => {
      startSearching()
    }, 500)
  }, [cleanup, startSearching])

  const likeCurrentPartner = useCallback(async () => {
    if (!currentPartner) return

    try {
      await likeUser(currentPartner.id)
      console.log("[v0] Liked partner:", currentPartner.id)
    } catch (error) {
      console.error("[v0] Error liking partner:", error)
    }
  }, [currentPartner])

  const sendChatMessage = useCallback(() => {
    if (!chatInput.trim() || !dataChannelRef.current) return

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: userId,
      senderName: userProfile.full_name,
      content: chatInput.trim(),
      timestamp: new Date(),
    }

    if (dataChannelRef.current.readyState === "open") {
      dataChannelRef.current.send(JSON.stringify(message))
    }

    setChatMessages((prev) => [...prev, message])
    setChatInput("")
  }, [chatInput, userId, userProfile.full_name])

  const getQualityIcon = () => {
    switch (connectionQuality) {
      case "excellent":
        return <Wifi className="h-4 w-4 text-green-500" />
      case "good":
        return <Signal className="h-4 w-4 text-green-400" />
      case "poor":
        return <Signal className="h-4 w-4 text-yellow-500" />
      case "disconnected":
        return <WifiOff className="h-4 w-4 text-red-500" />
    }
  }

  const getQualityLabel = () => {
    switch (connectionQuality) {
      case "excellent":
        return "Excelente"
      case "good":
        return "Boa"
      case "poor":
        return "Fraca"
      case "disconnected":
        return "Desconectado"
    }
  }

  const formatWaitTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // RENDER
  if (videoState === "permission_denied") {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-xl bg-card p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Permissão Necessária</h2>
          <p className="mb-6 text-muted-foreground">{permissionError}</p>
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
  }

  if (limitReached) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-xl bg-card p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Limite Diário Atingido</h2>
          <p className="mb-4 text-muted-foreground">
            Você usou todas as suas videochamadas gratuitas de hoje. Renova em {timeUntilReset}.
          </p>
          <div className="space-y-3">
            <Button className="w-full" asChild>
              <a href="/dashboard/upgrade">
                <Sparkles className="mr-2 h-4 w-4" />
                Fazer Upgrade para Pro
              </a>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col bg-background">
      {/* Main video area */}
      <div className="relative flex-1">
        {/* Remote video (full screen) */}
        <div className="absolute inset-0 bg-muted">
          {videoState === "connected" && remoteVideoReady ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center">
              {videoState === "idle" && (
                <>
                  <Users className="mb-4 h-16 w-16 text-muted-foreground/50" />
                  <p className="text-lg text-muted-foreground">Pronto para conectar?</p>
                  <p className="mt-2 text-sm text-muted-foreground/70">
                    {remainingCalls !== null && remainingCalls > 0 && (
                      <span>{remainingCalls} chamadas restantes hoje</span>
                    )}
                    {remainingCalls === -1 && <span>Chamadas ilimitadas</span>}
                  </p>
                </>
              )}

              {videoState === "searching" && (
                <>
                  <Loader2 className="mb-4 h-16 w-16 animate-spin text-primary" />
                  <p className="text-lg text-muted-foreground">{connectionStatus}</p>
                  <p className="mt-2 text-sm text-muted-foreground/70">Aguardando: {formatWaitTime(waitTime)}</p>
                </>
              )}

              {videoState === "connecting" && (
                <>
                  <div className="mb-4 flex items-center gap-3">
                    {currentPartner?.avatar_url ? (
                      <Avatar className="h-20 w-20 border-4 border-primary">
                        <AvatarImage src={currentPartner.avatar_url || "/placeholder.svg"} />
                        <AvatarFallback>{currentPartner.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-2xl font-bold text-primary">
                          {currentPartner?.full_name?.charAt(0) || "?"}
                        </span>
                      </div>
                    )}
                  </div>
                  <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
                  <p className="text-lg text-muted-foreground">{connectionStatus}</p>
                </>
              )}

              {videoState === "ended" && (
                <>
                  <PhoneOff className="mb-4 h-16 w-16 text-muted-foreground/50" />
                  <p className="text-lg text-muted-foreground">Chamada encerrada</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Partner info overlay */}
        {currentPartner && (videoState === "connecting" || videoState === "connected") && (
          <div className="absolute left-4 top-4 flex items-center gap-3 rounded-lg bg-black/50 p-3 backdrop-blur-sm">
            <Avatar className="h-10 w-10 border-2 border-white/20">
              <AvatarImage src={currentPartner.avatar_url || "/placeholder.svg"} />
              <AvatarFallback>{currentPartner.full_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-white">{currentPartner.full_name}</p>
              <p className="text-sm text-white/70">{currentPartner.bio || currentPartner.city}</p>
            </div>
            {videoState === "connected" && (
              <div className="ml-2 flex items-center gap-1 rounded bg-black/30 px-2 py-1">
                {getQualityIcon()}
                <span className="text-xs text-white/70">{getQualityLabel()}</span>
              </div>
            )}
          </div>
        )}

        {/* Local video (picture-in-picture) */}
        <div className="absolute bottom-24 right-4 h-32 w-24 overflow-hidden rounded-xl border-2 border-primary/50 bg-muted shadow-lg sm:h-40 sm:w-32">
          {localVideoReady ? (
            <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <button
            onClick={flipCamera}
            className="absolute bottom-2 right-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
          >
            <SwitchCamera className="h-4 w-4" />
          </button>
        </div>

        {/* Chat panel */}
        {isChatOpen && videoState === "connected" && (
          <div className="absolute bottom-24 left-4 right-20 max-h-64 overflow-hidden rounded-xl bg-black/70 backdrop-blur-sm sm:left-4 sm:right-auto sm:w-80">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/10 p-3">
                <span className="font-medium text-white">Chat</span>
                <button onClick={() => setIsChatOpen(false)} className="text-white/70 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-lg p-2 ${msg.senderId === userId ? "ml-8 bg-primary text-primary-foreground" : "mr-8 bg-white/10 text-white"}`}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="border-t border-white/10 p-3">
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                    placeholder="Digite uma mensagem..."
                    className="flex-1 border-white/20 bg-white/10 text-white placeholder:text-white/50"
                  />
                  <Button size="icon" onClick={sendChatMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 border-t bg-card p-4 sm:gap-4">
        {videoState === "idle" || videoState === "ended" ? (
          <>
            <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)} className="h-10 w-10">
              <Filter className="h-5 w-5" />
            </Button>
            <Button size="lg" onClick={startSearching} disabled={isLoading} className="gap-2 px-8">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Video className="h-5 w-5" />}
              Iniciar Videochamada
            </Button>
          </>
        ) : (
          <>
            <Button
              variant={isMuted ? "destructive" : "outline"}
              size="icon"
              onClick={toggleMute}
              className="h-10 w-10"
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            <Button
              variant={isVideoOff ? "destructive" : "outline"}
              size="icon"
              onClick={toggleVideo}
              className="h-10 w-10"
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>

            {videoState === "connected" && (
              <Button variant="outline" size="icon" onClick={() => setIsChatOpen(!isChatOpen)} className="h-10 w-10">
                <MessageCircle className="h-5 w-5" />
              </Button>
            )}

            <Button variant="outline" size="icon" onClick={skipToNext} className="h-10 w-10 bg-transparent">
              <SkipForward className="h-5 w-5" />
            </Button>

            <Button variant="destructive" size="icon" onClick={endCall} className="h-10 w-10">
              <PhoneOff className="h-5 w-5" />
            </Button>

            {videoState === "connected" && currentPartner && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={likeCurrentPartner}
                  className="h-10 w-10 text-pink-500 hover:bg-pink-500/10 hover:text-pink-500 bg-transparent"
                >
                  <Heart className="h-5 w-5" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 text-orange-500 hover:bg-orange-500/10 hover:text-orange-500 bg-transparent"
                >
                  <Flag className="h-5 w-5" />
                </Button>
              </>
            )}
          </>
        )}
      </div>

      {/* Filters modal */}
      {showFilters && (
        <div className="absolute bottom-24 left-4 right-4 z-50 rounded-xl border bg-card p-4 shadow-lg sm:left-auto sm:right-4 sm:w-80">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Filtros de Localização</h3>
            <button onClick={() => setShowFilters(false)}>
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Estado</Label>
              <Select
                value={locationFilter.state}
                onValueChange={(value) => setLocationFilter((prev) => ({ ...prev, state: value, city: "" }))}
              >
                <SelectTrigger>
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
            <div>
              <Label>Cidade</Label>
              <Input
                value={locationFilter.city}
                onChange={(e) => setLocationFilter((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="Digite a cidade..."
              />
            </div>
            <Button
              variant="outline"
              className="w-full bg-transparent"
              onClick={() => setLocationFilter({ state: "", city: "" })}
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
