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
    // STUN servers
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.relay.metered.ca:80" },
    // TURN servers (Metered.ca - free tier)
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
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)
  const roomIdRef = useRef<string | null>(null)
  const partnerIdRef = useRef<string | null>(null)
  const isInitiatorRef = useRef(false)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const hasRemoteDescRef = useRef(false)
  const videoEnabledRef = useRef(true)

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

  const cleanup = useCallback(() => {
    console.log("[v0] Cleaning up...")
    if (waitTimeIntervalRef.current) clearInterval(waitTimeIntervalRef.current)
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)

    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    if (roomIdRef.current) {
      leaveVideoQueue(roomIdRef.current)
      roomIdRef.current = null
    }

    partnerIdRef.current = null
    pendingCandidatesRef.current = []
    hasRemoteDescRef.current = false
  }, [])

  const initLocalMedia = useCallback(async (facing: "user" | "environment" = "user") => {
    try {
      setConnectionStatus("Acessando câmera e microfone...")

      // Stop existing tracks
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
      // Replace video track in peer connection
      const videoTrack = stream.getVideoTracks()[0]
      const senders = peerConnectionRef.current.getSenders()
      const videoSender = senders.find((s) => s.track?.kind === "video")
      if (videoSender && videoTrack) {
        await videoSender.replaceTrack(videoTrack)
      }
    }
  }, [facingMode, initLocalMedia])

  const setupWebRTC = useCallback(
    async (partnerId: string, isInitiator: boolean) => {
      console.log("[v0] Setting up WebRTC. Initiator:", isInitiator, "Partner:", partnerId)

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }

      const pc = new RTCPeerConnection(rtcConfig)
      peerConnectionRef.current = pc
      hasRemoteDescRef.current = false
      pendingCandidatesRef.current = []

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
        console.log("[v0] Received remote track:", event.track.kind, "readyState:", event.track.readyState)

        // Add track to remote stream
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
          // Try to restart ICE
          pc.restartIce()
        } else if (pc.iceConnectionState === "disconnected") {
          setConnectionStatus("Conexão perdida...")
          setConnectionQuality("poor")
        }
      }

      pc.onconnectionstatechange = () => {
        console.log("[v0] Connection state:", pc.connectionState)
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

      // Setup signaling channel using Supabase Broadcast
      const supabase = supabaseRef.current!
      const roomId = [currentUserId, partnerId].sort().join("-")
      console.log("[v0] Joining signaling room:", roomId)

      const channel = supabase.channel(`video-${roomId}`)

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("[v0] Sending ICE candidate:", event.candidate.candidate.substring(0, 50))
          channel.send({
            type: "broadcast",
            event: "ice-candidate",
            payload: { from: currentUserId, candidate: event.candidate.toJSON() },
          })
        }
      }

      pc.onicegatheringstatechange = () => {
        console.log("[v0] ICE gathering state:", pc.iceGatheringState)
      }

      channel
        .on("broadcast", { event: "offer" }, async ({ payload }) => {
          if (payload.from === currentUserId) return
          console.log("[v0] Received offer from:", payload.from)

          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
            hasRemoteDescRef.current = true

            // Process pending ICE candidates
            console.log("[v0] Processing", pendingCandidatesRef.current.length, "pending ICE candidates")
            for (const candidate of pendingCandidatesRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate))
            }
            pendingCandidatesRef.current = []

            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)

            console.log("[v0] Sending answer")
            channel.send({
              type: "broadcast",
              event: "answer",
              payload: { from: currentUserId, sdp: answer },
            })
          } catch (err) {
            console.error("[v0] Error handling offer:", err)
          }
        })
        .on("broadcast", { event: "answer" }, async ({ payload }) => {
          if (payload.from === currentUserId) return
          console.log("[v0] Received answer from:", payload.from)

          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
            hasRemoteDescRef.current = true

            // Process pending ICE candidates
            console.log("[v0] Processing", pendingCandidatesRef.current.length, "pending ICE candidates")
            for (const candidate of pendingCandidatesRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate))
            }
            pendingCandidatesRef.current = []
          } catch (err) {
            console.error("[v0] Error handling answer:", err)
          }
        })
        .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
          if (payload.from === currentUserId) return
          console.log("[v0] Received ICE candidate from:", payload.from)

          try {
            if (hasRemoteDescRef.current && pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
            } else {
              console.log("[v0] Buffering ICE candidate")
              pendingCandidatesRef.current.push(payload.candidate)
            }
          } catch (err) {
            console.error("[v0] Error adding ICE candidate:", err)
          }
        })
        .subscribe(async (status) => {
          console.log("[v0] Signaling channel status:", status)
          if (status === "SUBSCRIBED") {
            channelRef.current = channel

            // If initiator, create and send offer after a small delay
            if (isInitiator) {
              setTimeout(async () => {
                try {
                  console.log("[v0] Creating offer...")
                  const offer = await pc.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true,
                  })
                  await pc.setLocalDescription(offer)

                  console.log("[v0] Sending offer...")
                  channel.send({
                    type: "broadcast",
                    event: "offer",
                    payload: { from: currentUserId, sdp: offer },
                  })
                } catch (err) {
                  console.error("[v0] Error creating offer:", err)
                }
              }, 1500) // Increased delay for better sync
            }
          }
        })

      return pc
    },
    [currentUserId],
  )

  const startVideoCall = useCallback(async () => {
    if (!currentUserId) {
      setConnectionStatus("Erro: usuário não identificado")
      return
    }

    const limitCheck = await checkCallLimit()
    if (!limitCheck.canCall) {
      setLimitReached(true)
      setTimeUntilReset(getTimeUntilReset())
      return
    }

    setIsLoading(true)
    setVideoState("searching")
    setWaitTime(0)
    setPermissionError(null)
    setConnectionStatus("Acessando câmera...")

    // Start wait timer
    waitTimeIntervalRef.current = setInterval(() => {
      setWaitTime((prev) => prev + 1)
    }, 1000)

    // Get local media first
    const stream = await initLocalMedia(facingMode)
    if (!stream) {
      setIsLoading(false)
      if (waitTimeIntervalRef.current) clearInterval(waitTimeIntervalRef.current)
      return
    }

    setConnectionStatus("Procurando alguém para conectar...")

    // Join the video queue
    const result = await joinVideoQueue()
    console.log("[v0] Join queue result:", result)

    if (result.error) {
      setConnectionStatus(result.error)
      setIsLoading(false)
      if (waitTimeIntervalRef.current) clearInterval(waitTimeIntervalRef.current)
      return
    }

    roomIdRef.current = result.roomId || null

    if (result.matched && result.partnerId) {
      // Found someone immediately!
      console.log("[v0] Matched immediately with:", result.partnerId)
      partnerIdRef.current = result.partnerId
      isInitiatorRef.current = false // We joined someone else's room

      // Get partner profile
      const supabase = supabaseRef.current!
      const { data: partnerProfile } = await supabase.from("profiles").select("*").eq("id", result.partnerId).single()
      if (partnerProfile) {
        setCurrentPartner(partnerProfile as Profile)
      }

      setVideoState("connecting")
      setConnectionStatus("Conectando...")
      await setupWebRTC(result.partnerId, false)
      setIsLoading(false)
    } else {
      // We're waiting, start polling for a match
      console.log("[v0] Waiting for someone to join, roomId:", result.roomId)
      isInitiatorRef.current = true

      pollIntervalRef.current = setInterval(async () => {
        if (!roomIdRef.current) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          return
        }

        const status = await checkRoomStatus(roomIdRef.current)
        console.log("[v0] Room status:", status)

        if (status.matched && status.partnerId) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)

          partnerIdRef.current = status.partnerId
          roomIdRef.current = status.roomId || roomIdRef.current

          // Get partner profile
          const supabase = supabaseRef.current!
          const { data: partnerProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", status.partnerId)
            .single()
          if (partnerProfile) {
            setCurrentPartner(partnerProfile as Profile)
          }

          setVideoState("connecting")
          setConnectionStatus("Conectando...")
          await setupWebRTC(status.partnerId, true)
          setIsLoading(false)
        }
      }, 2000)
    }
  }, [currentUserId, initLocalMedia, setupWebRTC, facingMode])

  const endCall = useCallback(async () => {
    cleanup()
    setVideoState("ended")
    setCurrentPartner(null)
    setLocalVideoReady(false)
    setRemoteVideoReady(false)
    setChatMessages([])
    setIsChatOpen(false)
    setConnectionQuality(null)

    const limit = await checkCallLimit()
    if (limit.remaining !== undefined) {
      setRemainingCalls(limit.remaining === Number.POSITIVE_INFINITY ? -1 : limit.remaining)
    }
  }, [cleanup])

  const skipPartner = useCallback(async () => {
    await endCall()
    setVideoState("idle")
  }, [endCall])

  const connectWithPartner = async () => {
    if (!currentPartner) return

    const result = await likeUser(currentPartner.id)
    if (result.isMatch) {
      alert(`Match com ${currentPartner.full_name}! Vocês podem continuar conversando no WhatsApp.`)
    } else if (result.error) {
      alert(result.error)
    } else {
      alert(`Você curtiu ${currentPartner.full_name}!`)
    }
  }

  const sendChatMessage = () => {
    if (!chatInput.trim() || !dataChannelRef.current || !currentUserId) return

    const message: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentUserId,
      senderName: currentUserName || "Você",
      content: chatInput.trim(),
      timestamp: new Date(),
    }

    if (dataChannelRef.current.readyState === "open") {
      dataChannelRef.current.send(JSON.stringify(message))
      setChatMessages((prev) => [...prev, message])
      setChatInput("")
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

  const toggleVideo = useCallback(async () => {
    if (!localStreamRef.current) return

    const videoTracks = localStreamRef.current.getVideoTracks()

    if (isVideoOff) {
      // Turning video ON - get new stream
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: false,
        })

        const newVideoTrack = newStream.getVideoTracks()[0]
        if (newVideoTrack) {
          // Replace in local stream
          const oldTrack = localStreamRef.current.getVideoTracks()[0]
          if (oldTrack) {
            localStreamRef.current.removeTrack(oldTrack)
            oldTrack.stop()
          }
          localStreamRef.current.addTrack(newVideoTrack)

          // Update local video element
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current
            await localVideoRef.current.play().catch(() => {})
          }

          // Replace in peer connection
          if (peerConnectionRef.current) {
            const senders = peerConnectionRef.current.getSenders()
            const videoSender = senders.find((s) => s.track?.kind === "video")
            if (videoSender) {
              await videoSender.replaceTrack(newVideoTrack)
            }
          }
        }
      } catch (err) {
        console.error("[v0] Error enabling video:", err)
        return
      }
    } else {
      // Turning video OFF
      videoTracks.forEach((track) => {
        track.enabled = false
      })
    }

    setIsVideoOff(!isVideoOff)
    videoEnabledRef.current = isVideoOff // Will be the new value after toggle
  }, [isVideoOff, facingMode])

  if (videoState === "permission_denied") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Permissão Necessária</h2>
          <p className="text-muted-foreground mb-6">{permissionError}</p>
          <Button
            onClick={() => {
              setVideoState("idle")
              setPermissionError(null)
            }}
            className="bg-gradient-to-r from-pink-500 to-purple-500"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    )
  }

  const showCallControls = videoState === "searching" || videoState === "connecting" || videoState === "connected"

  return (
    <div className="flex flex-col h-full" data-protected="true">
      {/* Header with filters */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-border">
        <div className="flex items-center gap-2">
          {remainingCalls !== null && remainingCalls !== -1 && (
            <Badge variant="outline" className="text-xs">
              {remainingCalls} chamadas restantes hoje
            </Badge>
          )}
          {remainingCalls === -1 && (
            <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              Ilimitado
            </Badge>
          )}
          {connectionQuality && videoState === "connected" && (
            <Badge
              variant="outline"
              className={`text-xs ${
                connectionQuality === "good"
                  ? "text-green-500 border-green-500/50"
                  : connectionQuality === "medium"
                    ? "text-yellow-500 border-yellow-500/50"
                    : "text-red-500 border-red-500/50"
              }`}
            >
              {connectionQuality === "good" ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
              {connectionQuality === "good" ? "Ótima" : connectionQuality === "medium" ? "Média" : "Ruim"}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="text-muted-foreground hover:text-foreground"
        >
          <MapPin className="w-4 h-4 mr-1" />
          Filtros
          {showFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-3 md:p-4 border-b border-border bg-muted/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
                <MapPin className="w-3 h-3" /> Estado
              </Label>
              <Select
                value={locationFilter.state}
                onValueChange={(value) => setLocationFilter((prev) => ({ ...prev, state: value }))}
              >
                <SelectTrigger className="bg-background border-border">
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
              <Label className="text-xs text-muted-foreground mb-1.5 block">Cidade (opcional)</Label>
              <Input
                placeholder="Digite a cidade..."
                value={locationFilter.city}
                onChange={(e) => setLocationFilter((prev) => ({ ...prev, city: e.target.value }))}
                className="bg-background border-border"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Filtre por localização para encontrar profissionais perto de você
          </p>
        </div>
      )}

      {/* Main video area */}
      <div className="flex-1 relative bg-black/50 min-h-[300px] md:min-h-[400px]">
        {/* Partner info overlay */}
        {currentPartner && (videoState === "connecting" || videoState === "connected") && (
          <div className="absolute top-4 left-4 z-10 flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
            <Avatar className="w-10 h-10 border-2 border-pink-500">
              <AvatarImage src={currentPartner.avatar_url || ""} />
              <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-500 text-white">
                {currentPartner.full_name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-white text-sm">{currentPartner.full_name}</p>
              <p className="text-xs text-gray-300">{currentPartner.position}</p>
            </div>
          </div>
        )}

        {/* Remote video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover ${remoteVideoReady ? "opacity-100" : "opacity-0"}`}
        />

        {/* Status overlay when not connected */}
        {videoState !== "connected" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {(videoState === "searching" || videoState === "connecting") && (
              <>
                <Loader2 className="w-12 h-12 text-pink-500 animate-spin mb-4" />
                <p className="text-foreground font-medium">
                  {connectionStatus || "Procurando alguém para conectar..."}
                </p>
                <p className="text-muted-foreground text-sm mt-1">{waitTime}s</p>
              </>
            )}

            {videoState === "idle" && !limitReached && (
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center mb-4 mx-auto">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Videochamada Aleatória</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  Conecte-se instantaneamente com profissionais de todo o Brasil
                </p>
                <Button
                  onClick={startVideoCall}
                  disabled={isLoading}
                  size="lg"
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Video className="w-5 h-5 mr-2" />}
                  Iniciar Videochamada
                </Button>
              </div>
            )}

            {videoState === "idle" && limitReached && (
              <div className="text-center p-6">
                <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4 mx-auto">
                  <Clock className="w-10 h-10 text-yellow-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Limite Diário Atingido</h3>
                <p className="text-muted-foreground mb-4">
                  Você usou todas as suas chamadas de hoje.
                  <br />
                  Reseta em: <span className="text-pink-500 font-medium">{timeUntilReset}</span>
                </p>
                <Button className="bg-gradient-to-r from-pink-500 to-purple-500">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Fazer Upgrade para Pro
                </Button>
              </div>
            )}

            {videoState === "ended" && (
              <div className="text-center">
                <h3 className="text-xl font-bold text-foreground mb-4">Chamada Encerrada</h3>
                <Button onClick={() => setVideoState("idle")} className="bg-gradient-to-r from-pink-500 to-purple-500">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Nova Chamada
                </Button>
              </div>
            )}
          </div>
        )}

        {showCallControls && videoState !== "ended" && (
          <div className="absolute bottom-4 right-4 w-32 h-24 md:w-48 md:h-36 rounded-lg overflow-hidden border-2 border-pink-500/50 shadow-lg bg-black">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isVideoOff ? "hidden" : ""}`}
            />
            {isVideoOff && (
              <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <VideoOff className="w-8 h-8 text-gray-500" />
              </div>
            )}
            {videoState === "connected" && !isVideoOff && (
              <Button
                variant="ghost"
                size="icon"
                onClick={flipCamera}
                className="absolute top-1 right-1 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-full"
              >
                <SwitchCamera className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* Chat panel */}
        {isChatOpen && videoState === "connected" && (
          <div className="absolute top-0 right-0 w-80 h-full bg-background/95 backdrop-blur-sm border-l border-border flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h4 className="font-medium text-foreground">Chat</h4>
              <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2 rounded-lg ${
                    msg.senderId === currentUserId ? "bg-pink-500/20 ml-auto" : "bg-muted"
                  } max-w-[80%]`}
                >
                  <p className="text-xs text-muted-foreground">{msg.senderName}</p>
                  <p className="text-sm text-foreground">{msg.content}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
                placeholder="Digite uma mensagem..."
                className="flex-1"
              />
              <Button onClick={sendChatMessage} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {showCallControls && videoState !== "ended" && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMute}
              className={isMuted ? "bg-red-500/20 border-red-500/50" : ""}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleVideo}
              className={isVideoOff ? "bg-red-500/20 border-red-500/50" : ""}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </Button>

            {videoState === "connected" && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={isChatOpen ? "bg-pink-500/20 border-pink-500/50" : ""}
              >
                <MessageCircle className="w-5 h-5" />
              </Button>
            )}

            <Button variant="outline" onClick={skipPartner} className="gap-2 bg-transparent">
              <SkipForward className="w-5 h-5" />
              <span className="hidden sm:inline">Next</span>
            </Button>

            <Button variant="destructive" size="icon" onClick={endCall} className="bg-red-500 hover:bg-red-600">
              <PhoneOff className="w-5 h-5" />
            </Button>

            {currentPartner && (
              <Button onClick={connectWithPartner} className="bg-gradient-to-r from-pink-500 to-purple-500 gap-2">
                <Sparkles className="w-5 h-5" />
                <span className="hidden sm:inline">Connect</span>
                <Heart className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
