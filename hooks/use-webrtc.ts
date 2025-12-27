"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { rtcConfig, videoConstraints, audioConstraints, generateCandidateHash } from "@/lib/webrtc-config"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface UseWebRTCProps {
  roomId: string
  userId: string
  partnerId: string
  onLocalStream?: (stream: MediaStream | null) => void
  onRemoteStream?: (stream: MediaStream | null) => void
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void
  onPartnerDisconnected?: () => void
  onError?: (error: string) => void
}

export function useWebRTC({
  roomId,
  userId,
  partnerId,
  onLocalStream,
  onRemoteStream,
  onConnectionStateChange,
  onPartnerDisconnected,
  onError,
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
  const processedCandidatesRef = useRef<Set<string>>(new Set())
  const hasRemoteDescriptionRef = useRef(false)
  const isInitiatorRef = useRef(false)
  const hasStartedRef = useRef(false)
  const channelReadyRef = useRef(false)
  const localStreamRef = useRef<MediaStream | null>(null)
  const partnerReadyRef = useRef(false)
  const offerSentRef = useRef(false)
  const reconnectAttemptsRef = useRef(0)
  const negotiationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const maxReconnectAttempts = 3

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

        // First try with ideal constraints
        let stream: MediaStream | null = null

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: video ? { ...videoConstraints, facingMode } : false,
            audio: audio ? audioConstraints : false,
          })
        } catch (constraintError) {
          console.warn("[WebRTC] Ideal constraints failed, trying basic:", constraintError)
          // Fallback to basic constraints
          stream = await navigator.mediaDevices.getUserMedia({
            video: video ? { facingMode } : false,
            audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
          })
        }

        if (stream) {
          console.log(
            "[WebRTC] Got local stream with tracks:",
            stream
              .getTracks()
              .map((t) => `${t.kind}:${t.enabled}`)
              .join(", "),
          )

          // Ensure all tracks are enabled
          stream.getTracks().forEach((track) => {
            track.enabled = true
            console.log(`[WebRTC] Track ${track.kind} enabled:`, track.enabled, "muted:", track.muted)
          })

          localStreamRef.current = stream
          setLocalStream(stream)
          onLocalStream?.(stream)

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream
            localVideoRef.current.muted = true // Prevent echo
            try {
              await localVideoRef.current.play()
            } catch (e) {
              console.log("[WebRTC] Local video autoplay:", e)
            }
          }

          return stream
        }

        return null
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
        }

        setError(errorMsg)
        onError?.(errorMsg)
        return null
      }
    },
    [onLocalStream, onError],
  )

  const createPeerConnection = useCallback(
    (stream: MediaStream) => {
      const pc = new RTCPeerConnection(rtcConfig)

      stream.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, stream)
      })

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          const remoteStreamObj = event.streams[0]

          remoteStreamObj.getTracks().forEach((track) => {
            track.enabled = true
          })

          setRemoteStream(remoteStreamObj)
          onRemoteStream?.(remoteStreamObj)

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamObj
            remoteVideoRef.current.muted = false

            const playVideo = async () => {
              try {
                await remoteVideoRef.current?.play()
              } catch (e) {
                setTimeout(playVideo, 500)
              }
            }
            playVideo()
          }
        }
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && channelReadyRef.current) {
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

      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState)
        onConnectionStateChange?.(pc.connectionState)

        if (pc.connectionState === "connected") {
          reconnectAttemptsRef.current = 0
        }

        if (pc.connectionState === "disconnected") {
          setTimeout(() => {
            if (peerConnectionRef.current?.connectionState === "disconnected") {
              onPartnerDisconnected?.()
            }
          }, 5000)
        }

        if (pc.connectionState === "failed") {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++
            pc.restartIce()
          } else {
            onPartnerDisconnected?.()
          }
        }
      }

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed") {
          pc.restartIce()
        }
      }

      peerConnectionRef.current = pc
      return pc
    },
    [userId, channelReadyRef, onRemoteStream, onConnectionStateChange, onPartnerDisconnected],
  )

  const handleIceCandidate = useCallback(
    async (pc: RTCPeerConnection, candidate: RTCIceCandidateInit, from: string) => {
      if (from !== partnerId) return

      const candidateHash = generateCandidateHash(candidate)
      if (processedCandidatesRef.current.has(candidateHash)) {
        return
      }

      processedCandidatesRef.current.add(candidateHash)

      if (hasRemoteDescriptionRef.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (e) {
          // Silently fail for non-critical candidate errors
        }
      } else {
        pendingCandidatesRef.current.push(candidate)
      }
    },
    [partnerId],
  )

  const handleSignalingMessage = useCallback(
    async (payload: any) => {
      const pc = peerConnectionRef.current
      if (!pc) {
        return
      }

      try {
        if (payload.type === "offer" && payload.from === partnerId) {
          if (pc.signalingState !== "stable") {
            return
          }

          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          hasRemoteDescriptionRef.current = true

          for (const candidate of pendingCandidatesRef.current) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (e) {
              // Continue on error
            }
          }
          pendingCandidatesRef.current = []

          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)

          channelRef.current?.send({
            type: "broadcast",
            event: "answer",
            payload: {
              sdp: answer,
              from: userId,
            },
          })
        } else if (payload.type === "answer" && payload.from === partnerId) {
          if (pc.signalingState !== "have-local-offer") {
            return
          }

          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          hasRemoteDescriptionRef.current = true

          for (const candidate of pendingCandidatesRef.current) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (e) {
              // Continue on error
            }
          }
          pendingCandidatesRef.current = []

          if (negotiationTimeoutRef.current) {
            clearTimeout(negotiationTimeoutRef.current)
            negotiationTimeoutRef.current = null
          }
        } else if (payload.candidate && payload.from === partnerId) {
          await handleIceCandidate(pc, payload.candidate, payload.from)
        }
      } catch (err) {
        onError?.(err instanceof Error ? err.message : "Signaling error")
      }
    },
    [partnerId, userId, handleIceCandidate, onError],
  )

  const createAndSendOffer = useCallback(
    async (pc: RTCPeerConnection, channel: RealtimeChannel) => {
      if (offerSentRef.current) {
        return
      }

      try {
        if (pc.signalingState !== "stable") {
          setTimeout(() => {
            if (pc.signalingState === "stable" && !offerSentRef.current) {
              createAndSendOffer(pc, channel)
            }
          }, 500)
          return
        }

        offerSentRef.current = true

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        })

        await pc.setLocalDescription(offer)

        channel.send({
          type: "broadcast",
          event: "offer",
          payload: {
            sdp: offer,
            from: userId,
          },
        })

        negotiationTimeoutRef.current = setTimeout(() => {
          if (pc.signalingState === "have-local-offer") {
            onError?.("Parceiro não respondeu. Tente novamente.")
          }
        }, 30000)
      } catch (err) {
        onError?.(err instanceof Error ? err.message : "Connection error")
      }
    },
    [userId, onError],
  )

  // Start the WebRTC connection
  const startConnection = useCallback(async () => {
    if (hasStartedRef.current) {
      console.log("[WebRTC] Connection already started, ignoring")
      return true
    }
    hasStartedRef.current = true

    console.log("[WebRTC] ========================================")
    console.log("[WebRTC] Starting connection")
    console.log("[WebRTC] Room:", roomId)
    console.log("[WebRTC] User:", userId)
    console.log("[WebRTC] Partner:", partnerId)
    console.log("[WebRTC] Is Initiator:", userId < partnerId)
    console.log("[WebRTC] ========================================")

    setIsConnecting(true)
    setError(null)
    hasRemoteDescriptionRef.current = false
    pendingCandidatesRef.current = []
    channelReadyRef.current = false
    partnerReadyRef.current = false
    offerSentRef.current = false
    reconnectAttemptsRef.current = 0

    try {
      // Get local stream first
      const stream = await getLocalStream(true, true, "user")
      if (!stream) {
        setIsConnecting(false)
        hasStartedRef.current = false
        return false
      }

      console.log("[WebRTC] Local stream acquired, creating peer connection...")

      // Create peer connection
      const pc = createPeerConnection(stream)

      // Setup Supabase Realtime channel for signaling
      console.log("[WebRTC] Setting up signaling channel for room:", roomId)
      const channel = supabase.channel(`video-room-${roomId}`, {
        config: {
          broadcast: { self: false },
        },
      })

      channel
        .on("broadcast", { event: "offer" }, ({ payload }) => {
          console.log("[WebRTC] Received offer broadcast from:", payload.from)
          handleSignalingMessage({ type: "offer", ...payload })
        })
        .on("broadcast", { event: "answer" }, ({ payload }) => {
          console.log("[WebRTC] Received answer broadcast from:", payload.from)
          handleSignalingMessage({ type: "answer", ...payload })
        })
        .on("broadcast", { event: "ice-candidate" }, ({ payload }) => {
          handleSignalingMessage(payload)
        })
        .on("broadcast", { event: "end-call" }, ({ payload }) => {
          console.log("[WebRTC] Received end-call broadcast from:", payload.from)
          if (payload.from === partnerId) {
            onPartnerDisconnected?.()
          }
        })
        .on("broadcast", { event: "ready" }, ({ payload }) => {
          console.log("[WebRTC] Received ready signal from:", payload.from)
          if (payload.from === partnerId) {
            partnerReadyRef.current = true
            if (isInitiatorRef.current && channelReadyRef.current && !offerSentRef.current) {
              console.log("[WebRTC] Partner ready, I am initiator, creating offer...")
              createAndSendOffer(pc, channel)
            }
          }
        })
        .subscribe(async (status) => {
          console.log("[WebRTC] Channel subscription status:", status)
          if (status === "SUBSCRIBED") {
            channelReadyRef.current = true
            console.log("[WebRTC] Channel ready, sending ready signal...")

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
                console.log("[WebRTC] Waiting for partner ready signal...")
                setTimeout(async () => {
                  if (!offerSentRef.current && peerConnectionRef.current) {
                    console.log("[WebRTC] Timeout reached, creating offer anyway")
                    await createAndSendOffer(pc, channel)
                  }
                }, 2000)
              }
            } else {
              console.log("[WebRTC] I am not initiator, waiting for offer from partner...")
            }
          }
        })

      channelRef.current = channel
      setIsConnecting(false)
      console.log("[WebRTC] Connection setup complete, waiting for signaling...")
      return true
    } catch (err) {
      console.error("[WebRTC] Error starting connection:", err)
      setError("Erro ao iniciar conexão de vídeo. Verifique sua conexão com a internet.")
      onError?.("Erro ao iniciar conexão de vídeo. Verifique sua conexão com a internet.")
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
    onError,
  ])

  // End the connection
  const endConnection = useCallback(() => {
    console.log("[WebRTC] Ending connection...")

    // Notify partner
    if (channelReadyRef.current && channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "end-call",
        payload: { from: userId },
      })
    }

    // Cleanup local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop()
        console.log("[WebRTC] Stopped track:", track.kind)
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
    reconnectAttemptsRef.current = 0

    if (negotiationTimeoutRef.current) {
      clearTimeout(negotiationTimeoutRef.current)
      negotiationTimeoutRef.current = null
    }

    console.log("[WebRTC] Connection ended and cleaned up")
  }, [supabase, userId, onError])

  // Toggle camera
  const toggleCamera = useCallback((enabled: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = enabled
        console.log("[WebRTC] Camera toggled:", enabled)
      })
    }
  }, [])

  // Toggle microphone
  const toggleMic = useCallback((enabled: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = enabled
        console.log("[WebRTC] Mic toggled:", enabled)
      })
    }
  }, [])

  // Switch camera (front/back)
  const switchCamera = useCallback(
    async (facingMode: "user" | "environment") => {
      if (!localStreamRef.current || !peerConnectionRef.current) return

      try {
        console.log("[WebRTC] Switching camera to:", facingMode)
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })

        const newVideoTrack = newStream.getVideoTracks()[0]
        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0]

        const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === "video")

        if (sender) {
          await sender.replaceTrack(newVideoTrack)
          console.log("[WebRTC] Replaced video track successfully")
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
        onError?.("Erro ao trocar câmera.")
      }
    },
    [onError],
  )

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

      if (negotiationTimeoutRef.current) {
        clearTimeout(negotiationTimeoutRef.current)
        negotiationTimeoutRef.current = null
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
