"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { rtcConfig } from "@/lib/webrtc-config"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface UseWebRTCProps {
  roomId: string
  userId: string
  partnerId: string
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void
  onPartnerDisconnected?: () => void
}

export function useWebRTC({
  roomId,
  userId,
  partnerId,
  onConnectionStateChange,
  onPartnerDisconnected,
}: UseWebRTCProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new")
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const hasRemoteDescriptionRef = useRef(false)
  const isInitiatorRef = useRef(false)
  const hasStartedRef = useRef(false)

  const supabase = createClient()

  // Determine if this user is the initiator (user1)
  useEffect(() => {
    isInitiatorRef.current = userId < partnerId
    console.log("[WebRTC] User is initiator:", isInitiatorRef.current, "userId:", userId, "partnerId:", partnerId)
  }, [userId, partnerId])

  // Get local media stream
  const getLocalStream = useCallback(
    async (video = true, audio = true, facingMode: "user" | "environment" = "user") => {
      try {
        // Stop existing tracks
        if (localStream) {
          localStream.getTracks().forEach((track) => track.stop())
        }

        console.log("[WebRTC] Requesting media with video:", video, "audio:", audio)

        const stream = await navigator.mediaDevices.getUserMedia({
          video: video ? { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } } : false,
          audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
        })

        console.log(
          "[WebRTC] Got local stream with tracks:",
          stream
            .getTracks()
            .map((t) => t.kind)
            .join(", "),
        )
        setLocalStream(stream)

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }

        return stream
      } catch (err) {
        console.error("[WebRTC] Error getting local stream:", err)
        setError("Não foi possível acessar câmera/microfone. Verifique as permissões.")
        return null
      }
    },
    [localStream],
  )

  // Create peer connection
  const createPeerConnection = useCallback(
    (stream: MediaStream) => {
      console.log("[WebRTC] Creating peer connection with config:", rtcConfig)
      const pc = new RTCPeerConnection(rtcConfig)

      // Add local tracks to connection
      stream.getTracks().forEach((track) => {
        console.log("[WebRTC] Adding local track:", track.kind)
        pc.addTrack(track, stream)
      })

      // Handle remote tracks
      pc.ontrack = (event) => {
        console.log("[WebRTC] Received remote track:", event.track.kind, "streams:", event.streams.length)
        if (event.streams && event.streams[0]) {
          const remoteStreamObj = event.streams[0]
          console.log(
            "[WebRTC] Setting remote stream with tracks:",
            remoteStreamObj
              .getTracks()
              .map((t) => t.kind)
              .join(", "),
          )
          setRemoteStream(remoteStreamObj)

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamObj
          }
        }
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("[WebRTC] Sending ICE candidate:", event.candidate.candidate?.substring(0, 50))
          channelRef.current?.send({
            type: "broadcast",
            event: "ice-candidate",
            payload: {
              candidate: event.candidate.toJSON(),
              from: userId,
            },
          })
        }
      }

      // Connection state changes
      pc.onconnectionstatechange = () => {
        console.log("[WebRTC] Connection state changed to:", pc.connectionState)
        setConnectionState(pc.connectionState)
        onConnectionStateChange?.(pc.connectionState)

        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          onPartnerDisconnected?.()
        }
      }

      pc.oniceconnectionstatechange = () => {
        console.log("[WebRTC] ICE connection state:", pc.iceConnectionState)
      }

      pc.onicegatheringstatechange = () => {
        console.log("[WebRTC] ICE gathering state:", pc.iceGatheringState)
      }

      pc.onsignalingstatechange = () => {
        console.log("[WebRTC] Signaling state:", pc.signalingState)
      }

      peerConnectionRef.current = pc
      return pc
    },
    [userId, onConnectionStateChange, onPartnerDisconnected],
  )

  // Handle incoming signaling messages
  const handleSignalingMessage = useCallback(
    async (payload: any) => {
      const pc = peerConnectionRef.current
      if (!pc) {
        console.log("[WebRTC] No peer connection, ignoring message")
        return
      }

      try {
        if (payload.type === "offer" && payload.from === partnerId) {
          console.log("[WebRTC] Received offer from partner, current signaling state:", pc.signalingState)

          if (pc.signalingState !== "stable") {
            console.log("[WebRTC] Ignoring offer, signaling state not stable")
            return
          }

          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          hasRemoteDescriptionRef.current = true
          console.log("[WebRTC] Set remote description (offer)")

          // Process pending candidates
          console.log("[WebRTC] Processing", pendingCandidatesRef.current.length, "pending candidates")
          for (const candidate of pendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          }
          pendingCandidatesRef.current = []

          // Create and send answer
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          console.log("[WebRTC] Created and set local description (answer)")

          channelRef.current?.send({
            type: "broadcast",
            event: "answer",
            payload: {
              sdp: answer,
              from: userId,
            },
          })
          console.log("[WebRTC] Sent answer")
        } else if (payload.type === "answer" && payload.from === partnerId) {
          console.log("[WebRTC] Received answer from partner, current signaling state:", pc.signalingState)

          if (pc.signalingState !== "have-local-offer") {
            console.log("[WebRTC] Ignoring answer, signaling state not have-local-offer")
            return
          }

          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          hasRemoteDescriptionRef.current = true
          console.log("[WebRTC] Set remote description (answer)")

          // Process pending candidates
          console.log("[WebRTC] Processing", pendingCandidatesRef.current.length, "pending candidates")
          for (const candidate of pendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          }
          pendingCandidatesRef.current = []
        } else if (payload.candidate && payload.from === partnerId) {
          console.log("[WebRTC] Received ICE candidate from partner")
          if (hasRemoteDescriptionRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
            console.log("[WebRTC] Added ICE candidate")
          } else {
            // Queue the candidate for later
            pendingCandidatesRef.current.push(payload.candidate)
            console.log("[WebRTC] Queued ICE candidate for later")
          }
        }
      } catch (err) {
        console.error("[WebRTC] Error handling signaling message:", err)
      }
    },
    [partnerId, userId],
  )

  // Start the WebRTC connection
  const startConnection = useCallback(async () => {
    if (hasStartedRef.current) {
      console.log("[WebRTC] Connection already started, ignoring")
      return true
    }
    hasStartedRef.current = true

    console.log("[WebRTC] Starting connection for room:", roomId, "user:", userId, "partner:", partnerId)
    setIsConnecting(true)
    setError(null)
    hasRemoteDescriptionRef.current = false
    pendingCandidatesRef.current = []

    try {
      // Get local stream
      const stream = await getLocalStream(true, true, "user")
      if (!stream) {
        setIsConnecting(false)
        hasStartedRef.current = false
        return false
      }

      // Create peer connection
      const pc = createPeerConnection(stream)

      // Setup Supabase Realtime channel for signaling
      const channel = supabase.channel(`video-room-${roomId}`, {
        config: {
          broadcast: { self: false },
        },
      })

      channel
        .on("broadcast", { event: "offer" }, ({ payload }) => {
          console.log("[WebRTC] Received offer broadcast")
          handleSignalingMessage({ type: "offer", ...payload })
        })
        .on("broadcast", { event: "answer" }, ({ payload }) => {
          console.log("[WebRTC] Received answer broadcast")
          handleSignalingMessage({ type: "answer", ...payload })
        })
        .on("broadcast", { event: "ice-candidate" }, ({ payload }) => {
          console.log("[WebRTC] Received ice-candidate broadcast")
          handleSignalingMessage(payload)
        })
        .on("broadcast", { event: "end-call" }, ({ payload }) => {
          console.log("[WebRTC] Received end-call broadcast")
          if (payload.from === partnerId) {
            onPartnerDisconnected?.()
          }
        })
        .subscribe(async (status) => {
          console.log("[WebRTC] Channel subscription status:", status)
          if (status === "SUBSCRIBED") {
            console.log("[WebRTC] Channel subscribed, isInitiator:", isInitiatorRef.current)

            // Only the initiator creates the offer
            if (isInitiatorRef.current) {
              // Small delay to ensure both parties are subscribed
              await new Promise((resolve) => setTimeout(resolve, 1500))

              try {
                console.log("[WebRTC] Creating offer...")
                const offer = await pc.createOffer()
                await pc.setLocalDescription(offer)
                console.log("[WebRTC] Set local description (offer)")

                channel.send({
                  type: "broadcast",
                  event: "offer",
                  payload: {
                    sdp: offer,
                    from: userId,
                  },
                })
                console.log("[WebRTC] Sent offer to partner")
              } catch (err) {
                console.error("[WebRTC] Error creating offer:", err)
              }
            }
          }
        })

      channelRef.current = channel
      setIsConnecting(false)
      return true
    } catch (err) {
      console.error("[WebRTC] Error starting connection:", err)
      setError("Erro ao iniciar conexão de vídeo")
      setIsConnecting(false)
      hasStartedRef.current = false
      return false
    }
  }, [
    roomId,
    userId,
    partnerId,
    getLocalStream,
    createPeerConnection,
    handleSignalingMessage,
    supabase,
    onPartnerDisconnected,
  ])

  // End the connection
  const endConnection = useCallback(() => {
    console.log("[WebRTC] Ending connection")

    // Notify partner
    channelRef.current?.send({
      type: "broadcast",
      event: "end-call",
      payload: { from: userId },
    })

    // Cleanup
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop()
        console.log("[WebRTC] Stopped local track:", track.kind)
      })
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      console.log("[WebRTC] Closed peer connection")
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      console.log("[WebRTC] Removed channel")
    }

    setLocalStream(null)
    setRemoteStream(null)
    setConnectionState("closed")
    peerConnectionRef.current = null
    channelRef.current = null
    hasRemoteDescriptionRef.current = false
    pendingCandidatesRef.current = []
    hasStartedRef.current = false
  }, [localStream, supabase, userId])

  // Toggle camera
  const toggleCamera = useCallback(
    (enabled: boolean) => {
      if (localStream) {
        localStream.getVideoTracks().forEach((track) => {
          track.enabled = enabled
          console.log("[WebRTC] Camera track enabled:", enabled)
        })
      }
    },
    [localStream],
  )

  // Toggle microphone
  const toggleMic = useCallback(
    (enabled: boolean) => {
      if (localStream) {
        localStream.getAudioTracks().forEach((track) => {
          track.enabled = enabled
          console.log("[WebRTC] Mic track enabled:", enabled)
        })
      }
    },
    [localStream],
  )

  // Switch camera (front/back)
  const switchCamera = useCallback(
    async (facingMode: "user" | "environment") => {
      if (!localStream || !peerConnectionRef.current) return

      try {
        console.log("[WebRTC] Switching camera to:", facingMode)
        // Get new stream with different camera
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false, // Keep existing audio track
        })

        const newVideoTrack = newStream.getVideoTracks()[0]
        const oldVideoTrack = localStream.getVideoTracks()[0]

        // Replace track in peer connection
        const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === "video")

        if (sender) {
          await sender.replaceTrack(newVideoTrack)
          console.log("[WebRTC] Replaced video track in sender")
        }

        // Update local stream
        oldVideoTrack.stop()
        localStream.removeTrack(oldVideoTrack)
        localStream.addTrack(newVideoTrack)

        // Update local stream state to trigger re-render
        setLocalStream(new MediaStream(localStream.getTracks()))

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream
        }
      } catch (err) {
        console.error("[WebRTC] Error switching camera:", err)
      }
    },
    [localStream],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endConnection()
    }
  }, []) // Intentionally not including endConnection to avoid issues

  return {
    localStream,
    remoteStream,
    localVideoRef,
    remoteVideoRef,
    connectionState,
    isConnecting,
    error,
    startConnection,
    endConnection,
    toggleCamera,
    toggleMic,
    switchCamera,
  }
}
