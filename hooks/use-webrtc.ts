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
  const channelReadyRef = useRef(false)
  const localStreamRef = useRef<MediaStream | null>(null)
  const partnerReadyRef = useRef(false)
  const offerSentRef = useRef(false)

  const supabase = createClient()

  // Determine if this user is the initiator (user1)
  useEffect(() => {
    isInitiatorRef.current = userId < partnerId
    console.log("[WebRTC] User is initiator:", isInitiatorRef.current, "userId:", userId, "partnerId:", partnerId)
  }, [userId, partnerId])

  const getLocalStream = useCallback(
    async (video = true, audio = true, facingMode: "user" | "environment" = "user") => {
      try {
        // Stop existing tracks
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => track.stop())
        }

        console.log("[WebRTC] Requesting media with video:", video, "audio:", audio)

        const stream = await navigator.mediaDevices.getUserMedia({
          video: video ? { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } } : false,
          audio: audio ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
        })

        console.log(
          "[WebRTC] Got local stream with tracks:",
          stream
            .getTracks()
            .map((t) => `${t.kind}:${t.enabled}`)
            .join(", "),
        )
        localStreamRef.current = stream
        setLocalStream(stream)

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }

        return stream
      } catch (err: any) {
        console.error("[WebRTC] Error getting local stream:", err)

        let errorMsg = "Não foi possível acessar câmera/microfone."

        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          errorMsg =
            "Permissão negada. Por favor, permita o acesso à câmera e microfone nas configurações do navegador."
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          errorMsg = "Câmera ou microfone não encontrado. Verifique se estão conectados."
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          errorMsg = "Câmera ou microfone já está em uso por outro aplicativo."
        } else if (err.name === "OverconstrainedError") {
          errorMsg = "Sua câmera não suporta as configurações solicitadas."
        }

        setError(errorMsg)
        return null
      }
    },
    [],
  )

  // Create peer connection
  const createPeerConnection = useCallback(
    (stream: MediaStream) => {
      console.log("[WebRTC] Creating peer connection")
      const pc = new RTCPeerConnection(rtcConfig)

      // Add local tracks to connection
      stream.getTracks().forEach((track) => {
        console.log("[WebRTC] Adding local track:", track.kind, "enabled:", track.enabled)
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
            remoteVideoRef.current.play().catch((e) => console.log("[WebRTC] Remote video play error:", e))
          }
        }
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && channelReadyRef.current) {
          console.log("[WebRTC] Sending ICE candidate")
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
        if (pc.iceConnectionState === "failed") {
          console.log("[WebRTC] ICE connection failed, attempting restart")
          pc.restartIce()
        }
      }

      peerConnectionRef.current = pc
      return pc
    },
    [userId, onConnectionStateChange, onPartnerDisconnected],
  )

  const createAndSendOffer = useCallback(
    async (pc: RTCPeerConnection, channel: RealtimeChannel) => {
      if (offerSentRef.current) {
        console.log("[WebRTC] Offer already sent, skipping")
        return
      }

      try {
        if (pc.signalingState !== "stable") {
          console.log("[WebRTC] Cannot create offer, signaling state:", pc.signalingState)
          return
        }

        console.log("[WebRTC] Creating offer...")
        offerSentRef.current = true

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        })
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
        offerSentRef.current = false
      }
    },
    [userId],
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
          for (const candidate of pendingCandidatesRef.current) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (e) {
              console.warn("[WebRTC] Failed to add pending candidate:", e)
            }
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
          for (const candidate of pendingCandidatesRef.current) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (e) {
              console.warn("[WebRTC] Failed to add pending candidate:", e)
            }
          }
          pendingCandidatesRef.current = []
        } else if (payload.candidate && payload.from === partnerId) {
          console.log("[WebRTC] Received ICE candidate from partner")
          if (hasRemoteDescriptionRef.current) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
              console.log("[WebRTC] Added ICE candidate")
            } catch (e) {
              console.warn("[WebRTC] Failed to add ICE candidate:", e)
            }
          } else {
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
    channelReadyRef.current = false
    partnerReadyRef.current = false
    offerSentRef.current = false

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
          handleSignalingMessage(payload)
        })
        .on("broadcast", { event: "end-call" }, ({ payload }) => {
          console.log("[WebRTC] Received end-call broadcast")
          if (payload.from === partnerId) {
            onPartnerDisconnected?.()
          }
        })
        .on("broadcast", { event: "ready" }, ({ payload }) => {
          console.log("[WebRTC] Received ready from:", payload.from)
          if (payload.from === partnerId) {
            partnerReadyRef.current = true
            if (isInitiatorRef.current && channelReadyRef.current && !offerSentRef.current) {
              console.log("[WebRTC] Partner ready, creating offer...")
              createAndSendOffer(pc, channel)
            }
          }
        })
        .subscribe(async (status) => {
          console.log("[WebRTC] Channel subscription status:", status)
          if (status === "SUBSCRIBED") {
            channelReadyRef.current = true

            // Send ready signal
            channel.send({
              type: "broadcast",
              event: "ready",
              payload: { from: userId },
            })

            if (isInitiatorRef.current) {
              if (partnerReadyRef.current) {
                console.log("[WebRTC] Partner already ready, creating offer immediately")
                await createAndSendOffer(pc, channel)
              } else {
                // Wait for partner ready signal, but also try after timeout
                setTimeout(async () => {
                  if (!offerSentRef.current && peerConnectionRef.current) {
                    console.log("[WebRTC] Timeout: creating offer anyway")
                    await createAndSendOffer(pc, channel)
                  }
                }, 2000)
              }
            }
          }
        })

      channelRef.current = channel
      setIsConnecting(false)
      return true
    } catch (err) {
      console.error("[WebRTC] Error starting connection:", err)
      setError("Erro ao iniciar conexão de vídeo. Verifique sua conexão com a internet.")
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
    createAndSendOffer,
    supabase,
    onPartnerDisconnected,
  ])

  // End the connection
  const endConnection = useCallback(() => {
    console.log("[WebRTC] Ending connection")

    // Notify partner
    if (channelReadyRef.current && channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "end-call",
        payload: { from: userId },
      })
    }

    // Cleanup local stream using ref
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      localStreamRef.current = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    setLocalStream(null)
    setRemoteStream(null)
    setConnectionState("closed")
    peerConnectionRef.current = null
    channelRef.current = null
    hasRemoteDescriptionRef.current = false
    pendingCandidatesRef.current = []
    hasStartedRef.current = false
    channelReadyRef.current = false
    partnerReadyRef.current = false
    offerSentRef.current = false
  }, [supabase, userId])

  // Toggle camera
  const toggleCamera = useCallback((enabled: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = enabled
      })
    }
  }, [])

  // Toggle microphone
  const toggleMic = useCallback((enabled: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = enabled
      })
    }
  }, [])

  // Switch camera (front/back)
  const switchCamera = useCallback(async (facingMode: "user" | "environment") => {
    if (!localStreamRef.current || !peerConnectionRef.current) return

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })

      const newVideoTrack = newStream.getVideoTracks()[0]
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0]

      const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === "video")

      if (sender) {
        await sender.replaceTrack(newVideoTrack)
      }

      oldVideoTrack.stop()
      localStreamRef.current.removeTrack(oldVideoTrack)
      localStreamRef.current.addTrack(newVideoTrack)

      const updatedStream = new MediaStream(localStreamRef.current.getTracks())
      localStreamRef.current = updatedStream
      setLocalStream(updatedStream)

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = updatedStream
      }
    } catch (err) {
      console.error("[WebRTC] Error switching camera:", err)
      setError("Erro ao trocar câmera.")
    }
  }, [])

  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [supabase])

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
