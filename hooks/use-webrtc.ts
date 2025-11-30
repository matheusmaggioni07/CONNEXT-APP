"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { rtcConfig, videoConstraints, audioConstraints } from "@/lib/webrtc-config"
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
  const reconnectAttemptsRef = useRef(0)
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
        return null
      }
    },
    [],
  )

  const createPeerConnection = useCallback(
    (stream: MediaStream) => {
      console.log("[WebRTC] Creating peer connection with config:", JSON.stringify(rtcConfig, null, 2))
      const pc = new RTCPeerConnection(rtcConfig)

      // Add local tracks to connection with proper transceiver configuration
      stream.getTracks().forEach((track) => {
        console.log("[WebRTC] Adding local track:", track.kind, "enabled:", track.enabled, "id:", track.id)
        const sender = pc.addTrack(track, stream)
        console.log("[WebRTC] Sender created for track:", track.kind)
      })

      // Handle remote tracks - this is crucial for receiving video/audio
      pc.ontrack = (event) => {
        console.log("[WebRTC] *** Received remote track ***:", event.track.kind, "enabled:", event.track.enabled)
        console.log("[WebRTC] Remote streams count:", event.streams.length)

        if (event.streams && event.streams[0]) {
          const remoteStreamObj = event.streams[0]

          // Log all tracks in the remote stream
          remoteStreamObj.getTracks().forEach((track) => {
            console.log(`[WebRTC] Remote stream track: ${track.kind}, enabled: ${track.enabled}, muted: ${track.muted}`)
            // Ensure track is enabled
            track.enabled = true
          })

          setRemoteStream(remoteStreamObj)

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamObj
            remoteVideoRef.current.muted = false // We want to hear the remote user

            // Force play with user interaction handling
            const playVideo = async () => {
              try {
                await remoteVideoRef.current?.play()
                console.log("[WebRTC] Remote video playing successfully")
              } catch (e: any) {
                console.log("[WebRTC] Remote video play error:", e.message)
                // Try again after a short delay
                setTimeout(playVideo, 500)
              }
            }
            playVideo()
          }
        }
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && channelReadyRef.current) {
          console.log("[WebRTC] Sending ICE candidate:", event.candidate.type, event.candidate.protocol)
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
        console.log("[WebRTC] Connection state changed to:", pc.connectionState)
        setConnectionState(pc.connectionState)
        onConnectionStateChange?.(pc.connectionState)

        if (pc.connectionState === "connected") {
          reconnectAttemptsRef.current = 0
          console.log("[WebRTC] *** CONNECTION ESTABLISHED ***")

          // Log stats after connection
          setTimeout(() => {
            pc.getStats().then((stats) => {
              stats.forEach((report) => {
                if (report.type === "inbound-rtp" && report.kind === "video") {
                  console.log("[WebRTC] Inbound video stats:", report)
                }
                if (report.type === "outbound-rtp" && report.kind === "video") {
                  console.log("[WebRTC] Outbound video stats:", report)
                }
              })
            })
          }, 2000)
        }

        if (pc.connectionState === "disconnected") {
          setTimeout(() => {
            if (peerConnectionRef.current?.connectionState === "disconnected") {
              console.log("[WebRTC] Still disconnected, notifying partner disconnected")
              onPartnerDisconnected?.()
            }
          }, 5000)
        }

        if (pc.connectionState === "failed") {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++
            console.log("[WebRTC] Connection failed, attempting restart ICE", reconnectAttemptsRef.current)
            pc.restartIce()
          } else {
            onPartnerDisconnected?.()
          }
        }
      }

      pc.oniceconnectionstatechange = () => {
        console.log("[WebRTC] ICE connection state:", pc.iceConnectionState)
        if (pc.iceConnectionState === "failed") {
          console.log("[WebRTC] ICE connection failed, attempting restart")
          pc.restartIce()
        }
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          console.log("[WebRTC] ICE connected successfully!")
        }
      }

      pc.onicegatheringstatechange = () => {
        console.log("[WebRTC] ICE gathering state:", pc.iceGatheringState)
      }

      pc.onsignalingstatechange = () => {
        console.log("[WebRTC] Signaling state:", pc.signalingState)
      }

      pc.onnegotiationneeded = () => {
        console.log("[WebRTC] Negotiation needed")
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

        console.log("[WebRTC] Offer SDP created, setting local description...")
        await pc.setLocalDescription(offer)
        console.log("[WebRTC] Local description set successfully")

        channel.send({
          type: "broadcast",
          event: "offer",
          payload: {
            sdp: offer,
            from: userId,
          },
        })
        console.log("[WebRTC] Offer sent to partner via signaling channel")
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
          console.log("[WebRTC] Remote description (offer) set successfully")

          // Process pending candidates
          console.log("[WebRTC] Processing", pendingCandidatesRef.current.length, "pending candidates")
          for (const candidate of pendingCandidatesRef.current) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (e) {
              console.warn("[WebRTC] Failed to add pending candidate:", e)
            }
          }
          pendingCandidatesRef.current = []

          // Create and send answer
          console.log("[WebRTC] Creating answer...")
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          console.log("[WebRTC] Answer created and local description set")

          channelRef.current?.send({
            type: "broadcast",
            event: "answer",
            payload: {
              sdp: answer,
              from: userId,
            },
          })
          console.log("[WebRTC] Answer sent to partner")
        } else if (payload.type === "answer" && payload.from === partnerId) {
          console.log("[WebRTC] Received answer from partner, current signaling state:", pc.signalingState)

          if (pc.signalingState !== "have-local-offer") {
            console.log("[WebRTC] Ignoring answer, signaling state not have-local-offer")
            return
          }

          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          hasRemoteDescriptionRef.current = true
          console.log("[WebRTC] Remote description (answer) set successfully")

          // Process pending candidates
          console.log("[WebRTC] Processing", pendingCandidatesRef.current.length, "pending candidates")
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
              console.log("[WebRTC] Added ICE candidate successfully")
            } catch (e) {
              console.warn("[WebRTC] Failed to add ICE candidate:", e)
            }
          } else {
            pendingCandidatesRef.current.push(payload.candidate)
            console.log("[WebRTC] Queued ICE candidate for later, total queued:", pendingCandidatesRef.current.length)
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

    console.log("[WebRTC] Connection ended and cleaned up")
  }, [supabase, userId])

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
  const switchCamera = useCallback(async (facingMode: "user" | "environment") => {
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
