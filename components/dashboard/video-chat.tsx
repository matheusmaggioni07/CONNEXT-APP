"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { mockUsers } from "@/lib/mock-users"
import type { User } from "@/lib/types"
import { MatchModal } from "./match-modal"
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  SkipForward,
  Heart,
  MapPin,
  Building2,
  Users,
  Sparkles,
  Zap,
} from "lucide-react"

export function VideoChat() {
  const { user: currentUser } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [currentMatch, setCurrentMatch] = useState<User | null>(null)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [callTime, setCallTime] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isConnected) {
      interval = setInterval(() => {
        setCallTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isConnected])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const startSearching = () => {
    setIsSearching(true)
    setCallTime(0)

    setTimeout(() => {
      const availableUsers = mockUsers.filter((u) => u.id !== currentUser?.id)
      const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)]
      setCurrentMatch(randomUser)
      setIsSearching(false)
      setIsConnected(true)
    }, 2000)
  }

  const endCall = () => {
    setIsConnected(false)
    setCurrentMatch(null)
    setCallTime(0)
  }

  const skipToNext = () => {
    setIsConnected(false)
    setCurrentMatch(null)
    setCallTime(0)
    startSearching()
  }

  const handleLike = () => {
    if (Math.random() > 0.5) {
      setShowMatchModal(true)
    } else {
      skipToNext()
    }
  }

  const openWhatsApp = () => {
    if (currentMatch?.phone) {
      const phone = currentMatch.phone.replace(/\D/g, "")
      window.open(`https://wa.me/${phone}`, "_blank")
    }
    setShowMatchModal(false)
    endCall()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Video className="w-6 h-6 text-primary" />
            Videochamada
          </h1>
          <p className="text-muted-foreground">Conecte-se com empreendedores em tempo real</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 gradient-border rounded-full bg-card/50 backdrop-blur-sm">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm text-foreground">{Math.floor(Math.random() * 500) + 300} online</span>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 gradient-border rounded-3xl bg-card/50 backdrop-blur-sm overflow-hidden relative">
        {!isConnected && !isSearching ? (
          /* Idle State */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
            <div className="relative mb-8">
              <div className="absolute inset-0 gradient-bg rounded-full blur-xl opacity-40 animate-pulse" />
              <div className="relative w-32 h-32 gradient-bg rounded-full flex items-center justify-center">
                <Video className="w-16 h-16 text-primary-foreground" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Pronto para conectar?</h2>
            <p className="text-muted-foreground text-center mb-8 max-w-md">
              Clique no botão abaixo para iniciar uma videochamada com um empreendedor que compartilha seus interesses.
            </p>
            <Button
              onClick={startSearching}
              size="lg"
              className="gradient-bg text-primary-foreground hover:opacity-90 px-8 glow-orange animate-pulse-glow"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Iniciar Videochamada
            </Button>
          </div>
        ) : isSearching ? (
          /* Searching State */
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="relative">
              <div
                className="w-24 h-24 gradient-border rounded-full animate-spin"
                style={{ animationDuration: "3s" }}
              />
              <div className="absolute inset-2 bg-card rounded-full flex items-center justify-center">
                <Users className="w-10 h-10 text-primary animate-pulse" />
              </div>
            </div>
            <p className="text-foreground mt-6 text-lg">Buscando empreendedor...</p>
            <p className="text-muted-foreground text-sm">Baseado nos seus interesses e localização</p>
          </div>
        ) : (
          /* Connected State */
          <>
            {/* Remote Video (Full) */}
            <div className="absolute inset-0">
              <img
                src={
                  currentMatch?.avatar ||
                  `/placeholder.svg?height=600&width=800&query=professional person video call futuristic` ||
                  "/placeholder.svg"
                }
                alt={currentMatch?.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-card/40" />
            </div>

            {/* Call Timer */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 gradient-border rounded-full bg-card/80 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-foreground font-mono">{formatTime(callTime)}</span>
              </div>
            </div>

            {/* Local Video (PiP) */}
            <div className="absolute top-4 right-4 w-40 aspect-video gradient-border rounded-xl overflow-hidden bg-card/80 backdrop-blur-sm">
              <img
                src={currentUser?.avatar || `/placeholder.svg?height=90&width=160&query=professional person self`}
                alt="You"
                className="w-full h-full object-cover"
              />
              {!videoEnabled && (
                <div className="absolute inset-0 bg-card flex items-center justify-center">
                  <VideoOff className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="absolute bottom-28 left-6 right-6">
              <div className="gradient-border rounded-2xl bg-card/80 backdrop-blur-sm p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="text-sm text-primary">{currentMatch?.interests.slice(0, 2).join(" • ")}</span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{currentMatch?.name}</h3>
                    <p className="text-muted-foreground flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {currentMatch?.position} • {currentMatch?.company}
                    </p>
                    <p className="text-muted-foreground flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {currentMatch?.city}
                    </p>
                  </div>
                  <Button
                    onClick={handleLike}
                    className="gradient-bg text-primary-foreground hover:opacity-90 glow-orange"
                  >
                    <Heart className="w-5 h-5 mr-2" />
                    Match
                  </Button>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-4 px-6 py-4 gradient-border rounded-full bg-card/80 backdrop-blur-sm">
                <Button
                  size="lg"
                  variant={audioEnabled ? "outline" : "destructive"}
                  className={`rounded-full w-14 h-14 ${audioEnabled ? "border-border/50 hover:bg-card" : ""}`}
                  onClick={() => setAudioEnabled(!audioEnabled)}
                >
                  {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                </Button>
                <Button
                  size="lg"
                  variant={videoEnabled ? "outline" : "destructive"}
                  className={`rounded-full w-14 h-14 ${videoEnabled ? "border-border/50 hover:bg-card" : ""}`}
                  onClick={() => setVideoEnabled(!videoEnabled)}
                >
                  {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                </Button>
                <Button size="lg" variant="destructive" className="rounded-full w-14 h-14" onClick={endCall}>
                  <Phone className="w-6 h-6 rotate-[135deg]" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full w-14 h-14 border-border/50 hover:bg-card bg-transparent"
                  onClick={skipToNext}
                >
                  <SkipForward className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Match Modal */}
      {showMatchModal && currentMatch && currentUser && (
        <MatchModal
          user={currentMatch}
          currentUser={currentUser}
          onClose={() => {
            setShowMatchModal(false)
            skipToNext()
          }}
          onWhatsApp={openWhatsApp}
        />
      )}
    </div>
  )
}
