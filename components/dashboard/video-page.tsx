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
  const [iceServers, setIceServers] = useState<RTCIceServer[]>([])
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
  const remoteStreamRef = useRef<MediaStream | null>(null)
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
  const iceRestartAttempts = useRef(0)
  const offerSentRef = useRef(false)

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
    async function fetchTurnCredentials() {
      try {
        console.log("[v0] Fetching TURN credentials...")
        const res = await fetch("/api/turn-credentials")
        const data = await res.json()
        if (data.iceServers && data.iceServers.length > 0) {
          console.log("[v0] ICE servers loaded:", data.iceServers.length)
          setIceServers(data.iceServers)
        }
      } catch (err) {
        console.error("[v0] Failed to fetch TURN credentials:", err)
        // Use fallback
        setIceServers([{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }])
      }
    }
    fetchTurnCredentials()
  }, [])

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
    if (waitTimeIntervalRef.current) clearInterval(waitTimeIntervalRef.current)
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    if (signalingPollRef.current) clearInterval(signalingPollRef.current)

    if (dataChannelRef.current) {
      dataChannelRef.current.close()
      dataChannelRef.current = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

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
    iceRestartAttempts.current = 0
    offerSentRef.current = false
    setLocalVideoReady(false)
    remoteStreamRef.current = null
  }, [currentUserId])

  const initLocalMedia = useCallback(async (facing: "user" | "environment" = "user") => {
    try {
      setConnectionStatus("Acessando câmera e microfone...")
      console.log("[v0] Initializing local media with facing:", facing)

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      let stream: MediaStream | null = null

      const constraints = [
        {
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: facing },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        },
        { video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: facing }, audio: true },
        { video: { facingMode: facing }, audio: true },
        { video: true, audio: true },
      ]

      for (const constraint of constraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraint)
          console.log("[v0] Got media stream with constraint:", JSON.stringify(constraint))
          break
        } catch (err) {
          console.log("[v0] Failed with constraint, trying next:", err)
          continue
        }
      }

      if (stream) {
        localStreamRef.current = stream
        console.log(
          "[v0] Local stream tracks:",
          stream.getTracks().map((t) => `${t.kind}:${t.enabled}`),
        )

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
          localVideoRef.current.muted = true
          try {
            await localVideoRef.current.play()
            console.log("[v0] Local video playing")
          } catch (playErr) {
            console.log("[v0] Autoplay blocked, will play on interaction:", playErr)
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
      if (pc.signalingState === "closed") return

      try {
        // Get signaling messages
        const { data: signals } = await supabaseRef.current
          .from("signaling")
          .select("*")
          .eq("room_id", roomIdRef.current)
          .eq("to_user_id", currentUserId)
          .order("created_at", { ascending: true })

        if (signals && signals.length > 0) {
          for (const signal of signals) {
            if (processedSignalsRef.current.has(signal.id)) continue
            processedSignalsRef.current.add(signal.id)

            try {
              const sdp = JSON.parse(signal.sdp) as RTCSessionDescriptionInit
              console.log("[v0] Processing signal:", signal.type, "state:", pc.signalingState)

              if (signal.type === "offer" && pc.signalingState !== "closed") {
                if (pc.signalingState === "stable" || pc.signalingState === "have-local-offer") {
                  if (pc.signalingState === "have-local-offer") {
                    if (currentUserId > partnerIdRef.current!) {
                      await supabaseRef.current!.from("signaling").delete().eq("id", signal.id)
                      continue
                    }
                    await pc.setLocalDescription({ type: "rollback" })
                  }

                  await pc.setRemoteDescription(new RTCSessionDescription(sdp))
                  hasRemoteDescRef.current = true
                  console.log("[v0] Remote description set (offer)")

                  for (const candidate of pendingCandidatesRef.current) {
                    try {
                      await pc.addIceCandidate(new RTCIceCandidate(candidate))
                    } catch {
                      /* ignore */
                    }
                  }
                  pendingCandidatesRef.current = []

                  const answer = await pc.createAnswer()
                  await pc.setLocalDescription(answer)
                  await sendSignaling("answer", answer)
                  console.log("[v0] Answer sent")
                }
              } else if (signal.type === "answer" && pc.signalingState === "have-local-offer") {
                await pc.setRemoteDescription(new RTCSessionDescription(sdp))
                hasRemoteDescRef.current = true
                console.log("[v0] Remote description set (answer)")

                for (const candidate of pendingCandidatesRef.current) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate))
                  } catch {
                    /* ignore */
                  }
                }
                pendingCandidatesRef.current = []
              }
            } catch (e) {
              console.error("[v0] Error processing signal:", e)
            }

            await supabaseRef.current!.from("signaling").delete().eq("id", signal.id)
          }
        }

        // Get ICE candidates
        const { data: candidates } = await supabaseRef.current
          .from("ice_candidates")
          .select("*")
          .eq("room_id", roomIdRef.current)
          .eq("to_user_id", currentUserId)
          .order("created_at", { ascending: true })

        if (candidates && candidates.length > 0) {
          for (const candidateRow of candidates) {
            if (processedCandidatesRef.current.has(candidateRow.id)) continue
            processedCandidatesRef.current.add(candidateRow.id)

            try {
              const candidate = JSON.parse(candidateRow.candidate) as RTCIceCandidateInit

              if (hasRemoteDescRef.current && pc.signalingState !== "closed") {
                await pc.addIceCandidate(new RTCIceCandidate(candidate))
              } else {
                pendingCandidatesRef.current.push(candidate)
              }
            } catch {
              /* ignore */
            }

            await supabaseRef.current!.from("ice_candidates").delete().eq("id", candidateRow.id)
          }
        }
      } catch (e) {
        console.error("[v0] Polling error:", e)
      }
    }

    signalingPollRef.current = setInterval(poll, 500)
    poll()
  }, [currentUserId, sendSignaling])

  const setupWebRTC = useCallback(
    async (partnerId: string, isInitiator: boolean) => {
      partnerIdRef.current = partnerId
      isInitiatorRef.current = isInitiator
      hasRemoteDescRef.current = false
      pendingCandidatesRef.current = []
      processedSignalsRef.current.clear()
      processedCandidatesRef.current.clear()
      offerSentRef.current = false

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }

      const servers: RTCIceServer[] =
        iceServers.length > 0
          ? iceServers
          : [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" },
              { urls: "stun:stun2.l.google.com:19302" },
              // OpenRelay free TURN servers
              {
                urls: "turn:openrelay.metered.ca:80",
                username: "openrelayproject",
                credential: "openrelayproject",
              },
              {
                urls: "turn:openrelay.metered.ca:443",
                username: "openrelayproject",
                credential: "openrelayproject",
              },
              {
                urls: "turn:openrelay.metered.ca:443?transport=tcp",
                username: "openrelayproject",
                credential: "openrelayproject",
              },
            ]

      console.log("[v0] Setting up WebRTC with", servers.length, "ICE servers, isInitiator:", isInitiator)

      const rtcConfig: RTCConfiguration = {
        iceServers: servers,
        iceCandidatePoolSize: 10,
        iceTransportPolicy: "all",
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
      }

      const pc = new RTCPeerConnection(rtcConfig)
      peerConnectionRef.current = pc

      // Add local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!)
          console.log("[v0] Added local track:", track.kind)
        })
      }

      // Setup remote stream
      const remoteStream = new MediaStream()
      remoteStreamRef.current = remoteStream
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream
      }

      pc.ontrack = (event) => {
        console.log("[v0] Received remote track:", event.track.kind)
        const remote = remoteStreamRef.current
        if (!remote) return

        event.streams[0]?.getTracks().forEach((track) => {
          const existing = remote.getTracks().find((t) => t.id === track.id)
          if (!existing) {
            remote.addTrack(track)
            console.log("[v0] Added remote track to stream:", track.kind)
          }
        })

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remote
          remoteVideoRef.current.play().catch(() => {})
        }

        setRemoteVideoReady(true)
        setVideoState("connected")
        setConnectionStatus("")
      }

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState
        console.log("[v0] ICE connection state:", state)

        if (state === "connected" || state === "completed") {
          setVideoState("connected")
          setConnectionStatus("")
          setConnectionQuality("good")
          iceRestartAttempts.current = 0
        } else if (state === "failed") {
          if (iceRestartAttempts.current < 3) {
            iceRestartAttempts.current++
            setConnectionStatus(`Reconectando... (tentativa ${iceRestartAttempts.current})`)
            setConnectionQuality("poor")
            pc.restartIce()
          } else {
            setConnectionStatus("Conexão falhou. Clique em Next para tentar novamente.")
            setConnectionQuality("poor")
          }
        } else if (state === "disconnected") {
          setConnectionStatus("Reconectando...")
          setConnectionQuality("medium")
        } else if (state === "checking") {
          setConnectionStatus("Estabelecendo conexão...")
          setConnectionQuality("medium")
        }
      }

      pc.onconnectionstatechange = () => {
        console.log("[v0] Connection state:", pc.connectionState)
        if (pc.connectionState === "connected") {
          setVideoState("connected")
          setConnectionQuality("good")
        }
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendIceCandidate(event.candidate.toJSON())
        }
      }

      // Data channel for chat
      if (isInitiator) {
        const dataChannel = pc.createDataChannel("chat", { ordered: true })
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

      if (isInitiator && !offerSentRef.current) {
        offerSentRef.current = true
        // Small delay to ensure tracks are added
        await new Promise((resolve) => setTimeout(resolve, 500))

        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          })
          await pc.setLocalDescription(offer)
          await sendSignaling("offer", offer)
          console.log("[v0] Offer sent")
        } catch (e) {
          console.error("[v0] Error creating offer:", e)
        }
      }

      return pc
    },
    [iceServers, sendSignaling, sendIceCandidate, startSignalingPoll],
  )

  const startSearching = async () => {
    if (!currentUserId) return

    setIsLoading(true)
    setPermissionError(null)
    setVideoState("searching")
    setWaitTime(0)
    setConnectionStatus("Procurando alguém para conectar...")

    waitTimeIntervalRef.current = setInterval(() => setWaitTime((prev) => prev + 1), 1000)

    const stream = await initLocalMedia(facingMode)
    if (!stream) {
      setIsLoading(false)
      return
    }

    const result = await joinVideoQueue()

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
      handleMatch(result.partnerId, false)
    } else {
      startPollingForMatch()
    }
  }

  const startPollingForMatch = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)

    pollIntervalRef.current = setInterval(async () => {
      if (!roomIdRef.current) return

      const status = await checkRoomStatus(roomIdRef.current)

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
    setVideoState("connecting")
    setConnectionStatus("Conectando...")

    const supabase = supabaseRef.current!
    const { data: partner } = await supabase.from("profiles").select("*").eq("id", partnerId).single()

    if (partner) {
      setCurrentPartner(partner as Profile)
    }

    await setupWebRTC(partnerId, isInitiator)
  }

  const handleSkip = async () => {
    await cleanup()
    setVideoState("idle")
    setCurrentPartner(null)
    setRemoteVideoReady(false)
    setChatMessages([])
    setConnectionStatus("")
    setConnectionQuality(null)
    setTimeout(() => startSearching(), 500)
  }

  const handleEndCall = async () => {
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
    if (isVideoOff) {
      // Turn video ON - get new stream
      try {
        const stream = await initLocalMedia(facingMode)
        if (stream) {
          // Replace track in peer connection if exists
          if (peerConnectionRef.current) {
            const newVideoTrack = stream.getVideoTracks()[0]
            const senders = peerConnectionRef.current.getSenders()
            const videoSender = senders.find((s) => s.track?.kind === "video")
            if (videoSender && newVideoTrack) {
              await videoSender.replaceTrack(newVideoTrack)
            }
          }
          setIsVideoOff(false)
          setLocalVideoReady(true)
        }
      } catch (err) {
        console.error("[v0] Failed to turn video on:", err)
      }
    } else {
      // Turn video OFF
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = false
          track.stop()
        })
      }
      setIsVideoOff(true)
      setLocalVideoReady(false)
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
    if (!chatInput.trim()) return
    if (!currentUserId) return

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: currentUserId,
      senderName: currentUserName,
      content: chatInput.trim(),
      timestamp: new Date(),
    }

    const dc = dataChannelRef.current
    if (dc && dc.readyState === "open") {
      try {
        dc.send(JSON.stringify(message))
      } catch (e) {
        console.error("[v0] Failed to send message:", e)
      }
    }

    // Always show message locally
    setChatMessages((prev) => [...prev, message])
    setChatInput("")
  }

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

            <div className="text-center">
              <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
              <p className="text-foreground">{connectionStatus || "Procurando alguém para conectar..."}</p>
              <p className="mt-2 text-sm text-muted-foreground">{waitTime}s</p>
            </div>

            <div className="absolute bottom-24 right-4 h-32 w-24 overflow-hidden rounded-lg border-2 border-primary shadow-lg md:h-40 md:w-32">
              {isVideoOff ? (
                <div className="flex h-full w-full items-center justify-center bg-card">
                  <VideoOff className="h-8 w-8 text-muted-foreground" />
                </div>
              ) : localVideoReady ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-card">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={flipCamera}
                className="absolute bottom-1 right-1 h-6 w-6 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <SwitchCamera className="h-3 w-3" />
              </Button>
            </div>
          </>
        )}

        {/* Connected */}
        {videoState === "connected" && (
          <>
            <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />

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
              <Button
                variant="ghost"
                size="icon"
                onClick={flipCamera}
                className="absolute bottom-1 right-1 h-6 w-6 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <SwitchCamera className="h-3 w-3" />
              </Button>
            </div>

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

      {(videoState === "searching" || videoState === "connecting" || videoState === "connected") && (
        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-border bg-card/90 p-3 backdrop-blur sm:gap-3 sm:p-4">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleMute}
            className={`h-10 w-10 shrink-0 ${isMuted ? "border-destructive text-destructive" : "border-border"}`}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleVideo}
            className={`h-10 w-10 shrink-0 ${isVideoOff ? "border-destructive text-destructive" : "border-border"}`}
          >
            {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
          </Button>

          {videoState === "connected" && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="h-10 w-10 shrink-0 border-border"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}

          <Button variant="outline" onClick={handleSkip} className="h-10 shrink-0 border-border bg-transparent px-3">
            <SkipForward className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Next</span>
          </Button>

          <Button variant="destructive" size="icon" onClick={handleEndCall} className="h-10 w-10 shrink-0">
            <PhoneOff className="h-4 w-4" />
          </Button>

          {videoState === "connected" && currentPartner && (
            <Button
              onClick={handleConnect}
              className="h-10 shrink-0 bg-gradient-to-r from-primary to-pink-500 px-3 hover:from-primary/90 hover:to-pink-500/90"
            >
              <Sparkles className="h-4 w-4" />
              <Heart className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
