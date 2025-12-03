"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  SkipForward,
  Heart,
  Loader2,
  Sparkles,
  Users,
  RefreshCw,
  MapPin,
  MessageCircle,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  Wifi,
  WifiOff,
  SwitchCamera,
} from "lucide-react"
import { checkCallLimit, joinVideoQueue, checkRoomStatus, leaveVideoQueue } from "@/app/actions/video"
import { likeUser } from "@/app/actions/likes"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"

type VideoState = "idle" | "searching" | "connecting" | "connected" | "ended" | "permission_denied"

type LocationFilter = {
  country: string
  state: string
  city: string
}

type ChatMessage = {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: Date
}

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun.relay.metered.ca:80" },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "d7d85abc5c3c7f8c3e2c3f28",
      credential: "9lKDqQE5V5MxKPJx",
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "d7d85abc5c3c7f8c3e2c3f28",
      credential: "9lKDqQE5V5MxKPJx",
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "d7d85abc5c3c7f8c3e2c3f28",
      credential: "9lKDqQE5V5MxKPJx",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "d7d85abc5c3c7f8c3e2c3f28",
      credential: "9lKDqQE5V5MxKPJx",
    },
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: "all",
}

const brazilianStates = [
  { value: "all", label: "Todos os Estados" },
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
]

function getTimeUntilReset(): string {
  const now = new Date()
  const brazilOffset = -3 * 60
  const brazilTime = new Date(now.getTime() + (brazilOffset + now.getTimezoneOffset()) * 60 * 1000)
  const midnight = new Date(brazilTime)
  midnight.setHours(24, 0, 0, 0)
  const diff = midnight.getTime() - brazilTime.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `${hours}h ${minutes}min`
  return `${minutes} minutos`
}

export function VideoPage() {
  const [videoState, setVideoState] = useState<VideoState>("idle")
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [currentPartner, setCurrentPartner] = useState<Profile | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState("")
  const [localVideoReady, setLocalVideoReady] = useState(false)
  const [remoteVideoReady, setRemoteVideoReady] = useState(false)
  const [remainingCalls, setRemainingCalls] = useState<number | null>(null)
  const [waitTime, setWaitTime] = useState(0)
  const [showFilters, setShowFilters] = useState(true)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [timeUntilReset, setTimeUntilReset] = useState("")
  const [connectionQuality, setConnectionQuality] = useState<"good" | "medium" | "poor" | null>(null)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
  const [locationFilter, setLocationFilter] = useState<LocationFilter>({
    country: "BR",
    state: "all",
    city: "",
  })

  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const waitTimeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const signalingPollRef = useRef<NodeJS.Timeout | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const roomIdRef = useRef<string | null>(null)
  const partnerIdRef = useRef<string | null>(null)
  const isInitiatorRef = useRef(false)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const hasRemoteDescRef = useRef(false)
  const processedSignalsRef = useRef<Set<string>>(new Set())
  const processedCandidatesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  useEffect(() => {
    if (limitReached) {
      setTimeUntilReset(getTimeUntilReset())
      const interval = setInterval(() => setTimeUntilReset(getTimeUntilReset()), 60000)
      return () => clearInterval(interval)
    }
  }, [limitReached])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      supabaseRef.current = supabase
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
        if (profile) setCurrentUserName(profile.full_name || "")
      }
      const limit = await checkCallLimit()
      if (limit.remaining !== undefined) {
        setRemainingCalls(limit.remaining === Number.POSITIVE_INFINITY ? -1 : limit.remaining)
        if (!limit.canCall) {
          setLimitReached(true)
          setTimeUntilReset(getTimeUntilReset())
        }
      }
    }
    init()
    return () => {
      cleanup()
    }
  }, [])

  const cleanup = useCallback(async () => {
    console.log("[v0] Cleaning up...")
    if (waitTimeIntervalRef.current) clearInterval(waitTimeIntervalRef.current)
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    if (signalingPollRef.current) clearInterval(signalingPollRef.current)

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    // Clean up signaling data from database
    if (supabaseRef.current && currentUserId && roomIdRef.current) {
      await supabaseRef.current.from("signaling").delete().eq("room_id", roomIdRef.current)
      await supabaseRef.current.from("ice_candidates").delete().eq("room_id", roomIdRef.current)
    }

    if (roomIdRef.current) {
      leaveVideoQueue(roomIdRef.current)
      roomIdRef.current = null
    }

    partnerIdRef.current = null
    pendingCandidatesRef.current = []
    hasRemoteDescRef.current = false
    processedSignalsRef.current.clear()
    processedCandidatesRef.current.clear()
    setLocalVideoReady(false)
  }, [currentUserId])

  const initLocalMedia = useCallback(async (facing: "user" | "environment" = "user") => {
    try {
      setConnectionStatus("Acessando câmera e microfone...")

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      let stream: MediaStream | null = null

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: facing },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        })
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: facing },
            audio: true,
          })
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        }
      }

      if (stream) {
        localStreamRef.current = stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
          localVideoRef.current.muted = true
          try {
            await localVideoRef.current.play()
          } catch {
            /* ignore */
          }
          setLocalVideoReady(true)
        }
        return stream
      }

      throw new Error("No media stream available")
    } catch (error: unknown) {
      console.error("[v0] Error accessing media:", error)
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"

      if (errorMessage.includes("Permission denied") || errorMessage.includes("NotAllowedError")) {
        setPermissionError(
          "Permissão de câmera/microfone negada. Por favor, permita o acesso nas configurações do seu navegador.",
        )
      } else if (errorMessage.includes("NotFoundError")) {
        setPermissionError("Nenhuma câmera ou microfone encontrado.")
      } else {
        setPermissionError(`Erro ao acessar mídia: ${errorMessage}`)
      }
      setVideoState("permission_denied")
      return null
    }
  }, [])

  const flipCamera = useCallback(async () => {
    const newFacingMode = facingMode === "user" ? "environment" : "user"
    setFacingMode(newFacingMode)

    const stream = await initLocalMedia(newFacingMode)
    if (stream && peerConnectionRef.current) {
      const videoTrack = stream.getVideoTracks()[0]
      const senders = peerConnectionRef.current.getSenders()
      const videoSender = senders.find((s) => s.track?.kind === "video")
      if (videoSender && videoTrack) {
        await videoSender.replaceTrack(videoTrack)
      }
    }
  }, [facingMode, initLocalMedia])

  const sendSignaling = useCallback(
    async (type: "offer" | "answer", sdp: RTCSessionDescriptionInit) => {
      if (!supabaseRef.current || !currentUserId || !partnerIdRef.current || !roomIdRef.current) return

      console.log("[v0] Sending signaling:", type)

      await supabaseRef.current.from("signaling").insert({
        room_id: roomIdRef.current,
        from_user_id: currentUserId,
        to_user_id: partnerIdRef.current,
        type: type,
        sdp: JSON.stringify(sdp),
      })
    },
    [currentUserId],
  )

  const sendIceCandidate = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      if (!supabaseRef.current || !currentUserId || !partnerIdRef.current || !roomIdRef.current) return

      console.log("[v0] Sending ICE candidate")

      await supabaseRef.current.from("ice_candidates").insert({
        room_id: roomIdRef.current,
        from_user_id: currentUserId,
        to_user_id: partnerIdRef.current,
        candidate: JSON.stringify(candidate),
      })
    },
    [currentUserId],
  )

  const startSignalingPoll = useCallback(() => {
    if (signalingPollRef.current) clearInterval(signalingPollRef.current)

    const poll = async () => {
      if (!supabaseRef.current || !currentUserId || !roomIdRef.current || !peerConnectionRef.current) return

      const pc = peerConnectionRef.current

      // Get signaling messages
      const { data: signals } = await supabaseRef.current
        .from("signaling")
        .select("*")
        .eq("room_id", roomIdRef.current)
        .eq("to_user_id", currentUserId)
        .order("created_at", { ascending: true })

      if (signals) {
        for (const signal of signals) {
          if (processedSignalsRef.current.has(signal.id)) continue
          processedSignalsRef.current.add(signal.id)

          console.log("[v0] Processing signal:", signal.type)

          try {
            const sdp = JSON.parse(signal.sdp) as RTCSessionDescriptionInit

            if (signal.type === "offer") {
              console.log("[v0] Received offer, setting remote description")
              await pc.setRemoteDescription(new RTCSessionDescription(sdp))
              hasRemoteDescRef.current = true

              // Process pending ICE candidates
              for (const candidate of pendingCandidatesRef.current) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(candidate))
                } catch (e) {
                  console.log("[v0] Error adding pending candidate:", e)
                }
              }
              pendingCandidatesRef.current = []

              // Create and send answer
              console.log("[v0] Creating answer")
              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)
              await sendSignaling("answer", answer)
              console.log("[v0] Answer sent")
            } else if (signal.type === "answer") {
              console.log("[v0] Received answer, setting remote description")
              await pc.setRemoteDescription(new RTCSessionDescription(sdp))
              hasRemoteDescRef.current = true

              // Process pending ICE candidates
              for (const candidate of pendingCandidatesRef.current) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(candidate))
                } catch (e) {
                  console.log("[v0] Error adding pending candidate:", e)
                }
              }
              pendingCandidatesRef.current = []
            }
          } catch (e) {
            console.error("[v0] Error processing signal:", e)
          }

          // Delete processed signal
          await supabaseRef.current.from("signaling").delete().eq("id", signal.id)
        }
      }

      // Get ICE candidates
      const { data: candidates } = await supabaseRef.current
        .from("ice_candidates")
        .select("*")
        .eq("room_id", roomIdRef.current)
        .eq("to_user_id", currentUserId)
        .order("created_at", { ascending: true })

      if (candidates) {
        for (const candidateRow of candidates) {
          if (processedCandidatesRef.current.has(candidateRow.id)) continue
          processedCandidatesRef.current.add(candidateRow.id)

          try {
            const candidate = JSON.parse(candidateRow.candidate) as RTCIceCandidateInit

            if (hasRemoteDescRef.current) {
              console.log("[v0] Adding ICE candidate")
              await pc.addIceCandidate(new RTCIceCandidate(candidate))
            } else {
              console.log("[v0] Buffering ICE candidate (no remote desc yet)")
              pendingCandidatesRef.current.push(candidate)
            }
          } catch (e) {
            console.error("[v0] Error processing ICE candidate:", e)
          }

          // Delete processed candidate
          await supabaseRef.current.from("ice_candidates").delete().eq("id", candidateRow.id)
        }
      }
    }

    // Poll every 500ms
    signalingPollRef.current = setInterval(poll, 500)
    // Run immediately
    poll()
  }, [currentUserId, sendSignaling])

  const setupWebRTC = useCallback(
    async (partnerId: string, isInitiator: boolean) => {
      console.log("[v0] Setting up WebRTC. Initiator:", isInitiator, "Partner:", partnerId)

      partnerIdRef.current = partnerId
      isInitiatorRef.current = isInitiator
      hasRemoteDescRef.current = false
      pendingCandidatesRef.current = []
      processedSignalsRef.current.clear()
      processedCandidatesRef.current.clear()

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }

      const pc = new RTCPeerConnection(rtcConfig)
      peerConnectionRef.current = pc

      // Add local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          console.log("[v0] Adding local track:", track.kind)
          pc.addTrack(track, localStreamRef.current!)
        })
      }

      // Setup remote stream
      const remoteStream = new MediaStream()
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream
      }

      pc.ontrack = (event) => {
        console.log("[v0] Received remote track:", event.track.kind)

        event.streams[0]?.getTracks().forEach((track) => {
          console.log("[v0] Adding track to remoteStream:", track.kind)
          remoteStream.addTrack(track)
        })

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream
          remoteVideoRef.current.play().catch((err) => console.log("[v0] Remote video play error:", err))
        }

        setRemoteVideoReady(true)
        setVideoState("connected")
        setConnectionStatus("")
      }

      pc.oniceconnectionstatechange = () => {
        console.log("[v0] ICE connection state:", pc.iceConnectionState)
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          setVideoState("connected")
          setConnectionStatus("")
          setConnectionQuality("good")
        } else if (pc.iceConnectionState === "failed") {
          setConnectionStatus("Conexão falhou. Tentando reconectar...")
          setConnectionQuality("poor")
          pc.restartIce()
        } else if (pc.iceConnectionState === "disconnected") {
          setConnectionStatus("Conexão perdida...")
          setConnectionQuality("poor")
        }
      }

      // Handle ICE candidates - send via database
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("[v0] Got ICE candidate, sending via DB")
          sendIceCandidate(event.candidate.toJSON())
        }
      }

      pc.onicegatheringstatechange = () => {
        console.log("[v0] ICE gathering state:", pc.iceGatheringState)
      }

      // Data channel for chat
      if (isInitiator) {
        const dataChannel = pc.createDataChannel("chat")
        dataChannelRef.current = dataChannel
        dataChannel.onopen = () => console.log("[v0] Data channel open")
        dataChannel.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as ChatMessage
            setChatMessages((prev) => [...prev, message])
          } catch {
            /* ignore */
          }
        }
      }

      pc.ondatachannel = (event) => {
        console.log("[v0] Received data channel")
        dataChannelRef.current = event.channel
        event.channel.onmessage = (e) => {
          try {
            const message = JSON.parse(e.data) as ChatMessage
            setChatMessages((prev) => [...prev, message])
          } catch {
            /* ignore */
          }
        }
      }

      // Start polling for signaling data
      startSignalingPoll()

      // If initiator, create and send offer
      if (isInitiator) {
        // Small delay to ensure both parties are ready
        await new Promise((resolve) => setTimeout(resolve, 1000))

        console.log("[v0] Creating offer...")
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        })
        await pc.setLocalDescription(offer)
        await sendSignaling("offer", offer)
        console.log("[v0] Offer sent")
      }

      return pc
    },
    [sendSignaling, sendIceCandidate, startSignalingPoll],
  )

  const startSearching = async () => {
    if (!currentUserId) return

    setIsLoading(true)
    setPermissionError(null)
    setVideoState("searching")
    setWaitTime(0)
    setConnectionStatus("Procurando alguém para conectar...")

    // Start wait timer
    waitTimeIntervalRef.current = setInterval(() => setWaitTime((prev) => prev + 1), 1000)

    // Get local media
    const stream = await initLocalMedia(facingMode)
    if (!stream) {
      setIsLoading(false)
      return
    }

    // Join queue
    const result = await joinVideoQueue()
    console.log("[v0] Join queue result:", JSON.stringify(result))

    if (result.error) {
      if (result.error.includes("limite")) {
        setLimitReached(true)
        setTimeUntilReset(getTimeUntilReset())
      }
      setVideoState("idle")
      setConnectionStatus(result.error)
      setIsLoading(false)
      if (waitTimeIntervalRef.current) clearInterval(waitTimeIntervalRef.current)
      return
    }

    roomIdRef.current = result.roomId!
    setIsLoading(false)

    if (result.matched && result.partnerId) {
      // Matched immediately
      console.log("[v0] Matched immediately with:", result.partnerId)
      handleMatch(result.partnerId, false)
    } else {
      // Wait for match
      console.log("[v0] Waiting for someone to join, roomId:", result.roomId)
      startPollingForMatch()
    }
  }

  const startPollingForMatch = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)

    pollIntervalRef.current = setInterval(async () => {
      if (!roomIdRef.current) return

      const status = await checkRoomStatus(roomIdRef.current)
      console.log("[v0] Room status:", JSON.stringify(status))

      if (status.matched && status.partnerId) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        if (status.switchedRoom) {
          roomIdRef.current = status.roomId!
        }
        handleMatch(status.partnerId, true)
      }
    }, 2000)
  }

  const handleMatch = async (partnerId: string, isInitiator: boolean) => {
    console.log("[v0] Handling match. Partner:", partnerId, "Is initiator:", isInitiator)

    setVideoState("connecting")
    setConnectionStatus("Conectando...")

    // Get partner profile
    const supabase = supabaseRef.current!
    const { data: partner } = await supabase.from("profiles").select("*").eq("id", partnerId).single()

    if (partner) {
      setCurrentPartner(partner as Profile)
    }

    // Setup WebRTC
    await setupWebRTC(partnerId, isInitiator)
  }

  const handleSkip = async () => {
    console.log("[v0] Skipping...")
    await cleanup()
    setVideoState("idle")
    setCurrentPartner(null)
    setRemoteVideoReady(false)
    setChatMessages([])
    setConnectionStatus("")
    setConnectionQuality(null)
    // Auto start new search
    setTimeout(() => startSearching(), 500)
  }

  const handleEndCall = async () => {
    console.log("[v0] Ending call...")
    await cleanup()
    setVideoState("ended")
    setRemoteVideoReady(false)
    setChatMessages([])
    setConnectionStatus("")
    setConnectionQuality(null)
  }

  const handleConnect = async () => {
    if (!currentPartner) return
    try {
      await likeUser(currentPartner.id)
    } catch {
      /* ignore */
    }
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  const toggleVideo = async () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks()

      if (isVideoOff) {
        // Turn video back on - need to get new stream
        const stream = await initLocalMedia(facingMode)
        if (stream && peerConnectionRef.current) {
          const newVideoTrack = stream.getVideoTracks()[0]
          const senders = peerConnectionRef.current.getSenders()
          const videoSender = senders.find((s) => s.track?.kind === "video")
          if (videoSender && newVideoTrack) {
            await videoSender.replaceTrack(newVideoTrack)
          }
        }
        setIsVideoOff(false)
      } else {
        // Turn video off
        videoTracks.forEach((track) => {
          track.enabled = false
          track.stop()
        })
        setIsVideoOff(true)
        setLocalVideoReady(false)
      }
    }
  }

  const handleNewCall = () => {
    setVideoState("idle")
    setCurrentPartner(null)
    setRemoteVideoReady(false)
    setChatMessages([])
    setConnectionStatus("")
  }

  const sendChatMessage = () => {
    if (!chatInput.trim() || !dataChannelRef.current || dataChannelRef.current.readyState !== "open") return

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: currentUserId!,
      senderName: currentUserName,
      content: chatInput.trim(),
      timestamp: new Date(),
    }

    dataChannelRef.current.send(JSON.stringify(message))
    setChatMessages((prev) => [...prev, message])
    setChatInput("")
  }

  // Clean UI for call ended state
  if (videoState === "ended") {
    return (
      <div className="relative flex h-full flex-col bg-background">
        <div className="flex min-h-[500px] flex-1 items-center justify-center">
          <div className="text-center">
            <h3 className="mb-4 text-xl font-semibold text-foreground">Chamada Encerrada</h3>
            <Button onClick={handleNewCall} className="bg-primary hover:bg-primary/90">
              <RefreshCw className="mr-2 h-4 w-4" />
              Nova Chamada
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col bg-background">
      {/* Filters */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Estado</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-muted-foreground md:hidden"
          >
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        <div className={`mt-3 grid gap-4 md:grid-cols-2 ${showFilters ? "block" : "hidden md:grid"}`}>
          <div>
            <Select
              value={locationFilter.state}
              onValueChange={(value) => setLocationFilter((prev) => ({ ...prev, state: value }))}
            >
              <SelectTrigger className="border-border bg-card">
                <SelectValue placeholder="Selecione o estado" />
              </SelectTrigger>
              <SelectContent>
                {brazilianStates.map((state) => (
                  <SelectItem key={state.value} value={state.value}>
                    {state.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">Cidade (opcional)</Label>
            <Input
              placeholder="Digite a cidade..."
              value={locationFilter.city}
              onChange={(e) => setLocationFilter((prev) => ({ ...prev, city: e.target.value }))}
              className="border-border bg-card"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Filtre por localização para encontrar profissionais perto de você
        </p>
      </div>

      {/* Main content */}
      <div className="relative flex min-h-[500px] flex-1 items-center justify-center bg-card/50 p-4">
        {/* Permission denied */}
        {videoState === "permission_denied" && (
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
            <h3 className="mb-2 text-xl font-semibold text-foreground">Permissão Necessária</h3>
            <p className="mb-4 max-w-md text-muted-foreground">{permissionError}</p>
            <Button
              onClick={() => {
                setVideoState("idle")
                setPermissionError(null)
              }}
            >
              Tentar Novamente
            </Button>
          </div>
        )}

        {/* Limit reached */}
        {limitReached && videoState === "idle" && (
          <div className="text-center">
            <Clock className="mx-auto mb-4 h-16 w-16 text-primary" />
            <h3 className="mb-2 text-xl font-semibold text-foreground">Limite Diário Atingido</h3>
            <p className="mb-4 text-muted-foreground">
              Você atingiu seu limite de chamadas diárias. Reseta em {timeUntilReset}.
            </p>
            <Button className="bg-gradient-to-r from-primary to-pink-500">
              <Sparkles className="mr-2 h-4 w-4" />
              Fazer Upgrade para Pro
            </Button>
          </div>
        )}

        {/* Idle state */}
        {videoState === "idle" && !limitReached && !permissionError && (
          <div className="text-center">
            <div className="mb-6">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">Videochamada com Profissionais</h3>
              <p className="text-muted-foreground">Conecte-se instantaneamente com empreendedores</p>
            </div>
            {remainingCalls !== null && remainingCalls !== -1 && (
              <p className="mb-4 text-sm text-muted-foreground">
                {remainingCalls} chamada{remainingCalls !== 1 ? "s" : ""} restante{remainingCalls !== 1 ? "s" : ""} hoje
              </p>
            )}
            <Button
              size="lg"
              onClick={startSearching}
              disabled={isLoading}
              className="bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90"
            >
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Video className="mr-2 h-5 w-5" />}
              Iniciar Videochamada
            </Button>
          </div>
        )}

        {/* Searching / Connecting */}
        {(videoState === "searching" || videoState === "connecting") && (
          <>
            {currentPartner && (
              <div className="absolute left-4 top-4 z-10 flex items-center gap-3 rounded-lg bg-card/90 p-3 backdrop-blur">
                <Avatar className="h-10 w-10 border-2 border-primary">
                  <AvatarImage src={currentPartner.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {currentPartner.full_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{currentPartner.full_name}</p>
                  <p className="text-xs text-muted-foreground">{currentPartner.position}</p>
                </div>
              </div>
            )}

            <div className="text-center">
              <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
              <p className="text-foreground">{connectionStatus || "Procurando alguém para conectar..."}</p>
              <p className="mt-2 text-sm text-muted-foreground">{waitTime}s</p>
            </div>

            {/* Local video preview during search */}
            {localVideoReady && (
              <div className="absolute bottom-24 right-4 h-32 w-24 overflow-hidden rounded-lg border-2 border-primary shadow-lg md:h-40 md:w-32">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
              </div>
            )}
          </>
        )}

        {/* Connected */}
        {videoState === "connected" && (
          <>
            {/* Remote video */}
            <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />

            {/* Partner info */}
            {currentPartner && (
              <div className="absolute left-4 top-4 z-10 flex items-center gap-3 rounded-lg bg-black/60 p-3 backdrop-blur">
                <Avatar className="h-10 w-10 border-2 border-primary">
                  <AvatarImage src={currentPartner.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {currentPartner.full_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-white">{currentPartner.full_name}</p>
                  <p className="text-xs text-gray-300">{currentPartner.position}</p>
                </div>
                {connectionQuality && (
                  <Badge
                    className={
                      connectionQuality === "good"
                        ? "bg-green-500/20 text-green-400"
                        : connectionQuality === "medium"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                    }
                  >
                    {connectionQuality === "good" ? (
                      <Wifi className="mr-1 h-3 w-3" />
                    ) : (
                      <WifiOff className="mr-1 h-3 w-3" />
                    )}
                    {connectionQuality === "good" ? "Boa" : connectionQuality === "medium" ? "Média" : "Fraca"}
                  </Badge>
                )}
              </div>
            )}

            {/* Local video */}
            <div className="absolute bottom-24 right-4 h-32 w-24 overflow-hidden rounded-lg border-2 border-primary shadow-lg md:h-40 md:w-32">
              {isVideoOff ? (
                <div className="flex h-full w-full items-center justify-center bg-card">
                  <VideoOff className="h-8 w-8 text-muted-foreground" />
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
              )}
              {/* Flip camera button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={flipCamera}
                className="absolute bottom-1 right-1 h-6 w-6 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <SwitchCamera className="h-3 w-3" />
              </Button>
            </div>

            {/* Chat panel */}
            {isChatOpen && (
              <div className="absolute bottom-24 left-4 z-10 flex h-80 w-72 flex-col rounded-lg bg-black/80 backdrop-blur">
                <div className="flex items-center justify-between border-b border-white/20 p-3">
                  <span className="font-medium text-white">Chat</span>
                  <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)} className="h-6 w-6">
                    <X className="h-4 w-4 text-white" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`mb-2 ${msg.senderId === currentUserId ? "text-right" : "text-left"}`}>
                      <div
                        className={`inline-block rounded-lg px-3 py-2 ${
                          msg.senderId === currentUserId ? "bg-primary text-white" : "bg-white/20 text-white"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2 border-t border-white/20 p-3">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                    placeholder="Digite uma mensagem..."
                    className="border-white/20 bg-white/10 text-white placeholder:text-white/50"
                  />
                  <Button size="icon" onClick={sendChatMessage} className="bg-primary">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Controls */}
      {(videoState === "searching" || videoState === "connecting" || videoState === "connected") && (
        <div className="flex items-center justify-center gap-3 border-t border-border bg-card/90 p-4 backdrop-blur">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleMute}
            className={isMuted ? "border-destructive text-destructive" : "border-border"}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleVideo}
            className={isVideoOff ? "border-destructive text-destructive" : "border-border"}
          >
            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>

          {videoState === "connected" && (
            <Button variant="outline" size="icon" onClick={() => setIsChatOpen(!isChatOpen)} className="border-border">
              <MessageCircle className="h-5 w-5" />
            </Button>
          )}

          <Button variant="outline" onClick={handleSkip} className="border-border bg-transparent">
            <SkipForward className="mr-2 h-4 w-4" />
            Next
          </Button>

          <Button variant="destructive" size="icon" onClick={handleEndCall}>
            <PhoneOff className="h-5 w-5" />
          </Button>

          {videoState === "connected" && currentPartner && (
            <Button
              onClick={handleConnect}
              className="bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Connect
              <Heart className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
