"use client"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { mockUsers } from "@/lib/mock-users"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  SkipForward,
  Heart,
  MessageCircle,
  Users,
  Sparkles,
} from "lucide-react"

export function VideoPage() {
  const { user } = useAuth()
  const [isInCall, setIsInCall] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [currentPartner, setCurrentPartner] = useState<User | null>(null)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  const [callDuration, setCallDuration] = useState(0)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (isInCall) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      setCallDuration(0)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isInCall])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const startSearching = async () => {
    setIsSearching(true)

    // Request camera access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
    } catch (err) {
      console.log("Camera access denied")
    }

    // Simulate finding a partner after 2-4 seconds
    setTimeout(
      () => {
        const availableUsers = mockUsers.filter((u) => u.id !== user?.id && u.isOnline)
        const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)]
        setCurrentPartner(randomUser)
        setIsSearching(false)
        setIsInCall(true)
      },
      2000 + Math.random() * 2000,
    )
  }

  const endCall = () => {
    setIsInCall(false)
    setCurrentPartner(null)
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      localVideoRef.current.srcObject = null
    }
  }

  const skipPartner = () => {
    setIsInCall(false)
    setCurrentPartner(null)
    startSearching()
  }

  const likePartner = () => {
    if (!currentPartner) return

    // Save match
    const storedMatches = JSON.parse(localStorage.getItem("proconnect_matches") || "[]")
    storedMatches.push({
      id: crypto.randomUUID(),
      users: [user?.id, currentPartner.id],
      matchedUser: currentPartner,
      createdAt: new Date().toISOString(),
    })
    localStorage.setItem("proconnect_matches", JSON.stringify(storedMatches))

    setShowMatchModal(true)
  }

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "")
    window.open(`https://wa.me/${cleanPhone}`, "_blank")
    setShowMatchModal(false)
    endCall()
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Videochamada</h1>
            <p className="text-muted-foreground">Conecte-se instantaneamente com profissionais</p>
          </div>
          {isInCall && (
            <div className="flex items-center gap-2 bg-destructive/10 px-4 py-2 rounded-full">
              <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
              <span className="text-sm text-destructive font-medium">{formatDuration(callDuration)}</span>
            </div>
          )}
        </div>

        {/* Video Area */}
        <div className="relative bg-card rounded-2xl border border-border overflow-hidden aspect-video">
          {!isInCall && !isSearching ? (
            /* Idle State */
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Video className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Pronto para conectar?</h2>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                Clique no botão abaixo para ser conectado com um profissional aleatório baseado nos seus interesses.
              </p>
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={startSearching}
              >
                <Video className="w-5 h-5 mr-2" />
                Iniciar Videochamada
              </Button>
            </div>
          ) : isSearching ? (
            /* Searching State */
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <Users className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Procurando profissionais...</h2>
              <p className="text-muted-foreground mb-6">Conectando você com alguém compatível</p>
              <Button
                variant="outline"
                className="border-border text-foreground bg-transparent"
                onClick={() => {
                  setIsSearching(false)
                  endCall()
                }}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            /* In Call State */
            <>
              {/* Remote Video (Partner) */}
              <div className="w-full h-full bg-muted">
                <img
                  src={currentPartner?.avatar || "/placeholder.svg"}
                  alt={currentPartner?.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Partner Info */}
              <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm rounded-xl p-4">
                <h3 className="font-semibold text-foreground">{currentPartner?.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {currentPartner?.position} • {currentPartner?.company}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {currentPartner?.interests.slice(0, 2).map((interest) => (
                    <span key={interest} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>

              {/* Local Video (Self) */}
              <div className="absolute bottom-4 right-4 w-48 h-36 bg-muted rounded-xl overflow-hidden border-2 border-border">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${!isCameraOn ? "hidden" : ""}`}
                />
                {!isCameraOn && (
                  <div className="w-full h-full flex items-center justify-center">
                    <VideoOff className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
                <Button
                  size="lg"
                  variant="outline"
                  className={`w-14 h-14 rounded-full ${
                    isMicOn
                      ? "border-border text-foreground"
                      : "bg-destructive text-destructive-foreground border-destructive"
                  }`}
                  onClick={() => setIsMicOn(!isMicOn)}
                >
                  {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className={`w-14 h-14 rounded-full ${
                    isCameraOn
                      ? "border-border text-foreground"
                      : "bg-destructive text-destructive-foreground border-destructive"
                  }`}
                  onClick={() => setIsCameraOn(!isCameraOn)}
                >
                  {isCameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                </Button>

                <Button
                  size="lg"
                  className="w-14 h-14 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={endCall}
                >
                  <PhoneOff className="w-6 h-6" />
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="w-14 h-14 rounded-full border-border text-foreground hover:bg-secondary bg-transparent"
                  onClick={skipPartner}
                >
                  <SkipForward className="w-6 h-6" />
                </Button>

                <Button
                  size="lg"
                  className="w-14 h-14 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={likePartner}
                >
                  <Heart className="w-6 h-6" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Tips */}
        {!isInCall && !isSearching && (
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            {[
              {
                icon: Video,
                title: "Câmera ligada",
                description: "Mantenha sua câmera ligada para melhor conexão",
              },
              {
                icon: Sparkles,
                title: "Seja profissional",
                description: "Apresente-se e fale sobre seus objetivos",
              },
              {
                icon: Heart,
                title: "Match mútuo",
                description: "Curta para conectar no WhatsApp após a chamada",
              },
            ].map((tip, index) => (
              <div key={index} className="bg-card rounded-xl border border-border p-4 flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <tip.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{tip.title}</h3>
                  <p className="text-sm text-muted-foreground">{tip.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Match Modal */}
      {showMatchModal && currentPartner && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-8 max-w-md w-full text-center">
            <div className="relative mb-6">
              <div className="flex justify-center gap-4">
                <div className="w-24 h-24 rounded-full border-4 border-primary overflow-hidden">
                  <img
                    src={user?.avatar || "/placeholder.svg"}
                    alt={user?.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="w-24 h-24 rounded-full border-4 border-primary overflow-hidden">
                  <img
                    src={currentPartner.avatar || "/placeholder.svg"}
                    alt={currentPartner.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary rounded-full p-3">
                <Heart className="w-6 h-6 text-primary-foreground fill-primary-foreground" />
              </div>
            </div>

            <h2 className="text-3xl font-bold text-primary mb-2">Conexão feita!</h2>
            <p className="text-muted-foreground mb-6">
              Você curtiu {currentPartner.name}. Continue a conversa no WhatsApp!
            </p>

            <div className="space-y-3">
              <Button
                className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white"
                onClick={() => openWhatsApp(currentPartner.phone)}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Abrir WhatsApp
              </Button>
              <Button
                variant="outline"
                className="w-full border-border text-foreground bg-transparent"
                onClick={() => {
                  setShowMatchModal(false)
                  skipPartner()
                }}
              >
                Continuar Chamadas
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
