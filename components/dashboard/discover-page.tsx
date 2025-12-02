"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  X,
  Heart,
  Video,
  MapPin,
  Building2,
  Sparkles,
  MessageCircle,
  Crown,
  Loader2,
  ChevronUp,
  ChevronDown,
  RefreshCw,
} from "lucide-react"
import { likeUser, checkLikeLimit } from "@/app/actions/likes"
import { getProfilesToDiscover } from "@/app/actions/profile"
import { getOnlineUserIds, updatePresence } from "@/app/actions/presence"
import type { Profile } from "@/lib/types"
import Link from "next/link"

export function DiscoverPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLiking, setIsLiking] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [likeStatus, setLikeStatus] = useState<{ canLike: boolean; remaining: number; isPro?: boolean }>({
    canLike: true,
    remaining: 5,
  })

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      console.log("[v0] Fetching profiles...")
      const [fetchedProfiles, online, limitStatus] = await Promise.all([
        getProfilesToDiscover(),
        getOnlineUserIds(),
        checkLikeLimit(),
      ])
      console.log("[v0] Fetched profiles:", fetchedProfiles.length)
      setProfiles(fetchedProfiles)
      setOnlineUsers(online)
      setLikeStatus(limitStatus as { canLike: boolean; remaining: number; isPro?: boolean })
    } catch (error) {
      console.error("[v0] Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    const presenceInterval = setInterval(() => {
      updatePresence()
    }, 30000)

    updatePresence()

    return () => clearInterval(presenceInterval)
  }, [fetchData])

  const currentProfile = profiles[currentIndex]

  const handleLike = async () => {
    if (!currentProfile || isLiking) return
    if (!likeStatus.canLike) return

    setIsLiking(true)

    try {
      const result = await likeUser(currentProfile.id)

      if (result.error) {
        console.error(result.error)
        setIsLiking(false)
        return
      }

      if (result.isMatch && result.matchedProfile) {
        setMatchedProfile(result.matchedProfile)
        setShowMatchModal(true)
      }

      const newStatus = await checkLikeLimit()
      setLikeStatus(newStatus as { canLike: boolean; remaining: number; isPro?: boolean })

      nextProfile()
    } catch (error) {
      console.error("Like error:", error)
    } finally {
      setIsLiking(false)
    }
  }

  const handleSkip = () => {
    nextProfile()
  }

  const nextProfile = () => {
    setShowDetails(false)
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      setCurrentIndex(0)
    }
  }

  const openWhatsApp = (phone: string | undefined | null, name: string) => {
    if (!phone) {
      alert(`${name} ainda não adicionou o número de WhatsApp ao perfil.`)
      return
    }

    // Clean phone number - remove all non-digits
    let cleanPhone = phone.replace(/\D/g, "")

    // Add Brazil country code if not present
    if (cleanPhone.length === 11 || cleanPhone.length === 10) {
      cleanPhone = "55" + cleanPhone
    }

    const message = encodeURIComponent(`Olá ${name}! Nos conectamos pelo Connext e gostaria de conversar com você.`)
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank")
    setShowMatchModal(false)
  }

  const isOnline = (userId: string) => onlineUsers.includes(userId)

  const getAvatarUrl = (profile: Profile) => {
    if (profile.avatar_url && profile.avatar_url.startsWith("http")) {
      return profile.avatar_url
    }
    // Generate placeholder based on name
    const initials = profile.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
    return `/placeholder.svg?height=600&width=400&query=${encodeURIComponent(profile.full_name || "professional")} portrait photo`
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando perfis...</p>
        </div>
      </div>
    )
  }

  if (!currentProfile || profiles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Nenhum perfil encontrado</h2>
          <p className="text-muted-foreground mb-4">Volte mais tarde para encontrar novos empreendedores.</p>
          <Button onClick={fetchData} variant="outline" className="gap-2 bg-transparent">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header - Desktop only */}
      <div className="hidden md:flex items-center justify-between p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Descobrir</h1>
          <p className="text-muted-foreground">Encontre empreendedores compatíveis</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchData} variant="ghost" size="icon" className="text-muted-foreground">
            <RefreshCw className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-full">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm text-foreground">{onlineUsers.length} online</span>
          </div>
        </div>
      </div>

      {/* Like Limit - Only show when low */}
      {!likeStatus.isPro && likeStatus.remaining <= 2 && (
        <div className="mx-4 md:mx-6 mb-2 bg-secondary/50 border border-border rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" />
            <span className="text-xs text-foreground">
              {likeStatus.canLike ? `${likeStatus.remaining} likes restantes` : "Limite atingido"}
            </span>
          </div>
          <Link href="/dashboard/upgrade">
            <Button size="sm" className="gradient-bg text-primary-foreground h-7 text-xs">
              <Crown className="w-3 h-3 mr-1" />
              Pro
            </Button>
          </Link>
        </div>
      )}

      {/* Tinder-style Card */}
      <div className="flex-1 flex flex-col px-4 md:px-6 pb-4 md:pb-6 min-h-0">
        <div className="relative flex-1 max-w-lg mx-auto w-full">
          {/* Card */}
          <div className="absolute inset-0 bg-card rounded-2xl border border-border overflow-hidden shadow-2xl">
            {/* Full Photo - Use proper avatar URL */}
            <div className="absolute inset-0">
              <img
                src={getAvatarUrl(currentProfile) || "/placeholder.svg"}
                alt={currentProfile.full_name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = `/placeholder.svg?height=600&width=400&query=professional person`
                }}
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            </div>

            {/* Online Status Badge */}
            {isOnline(currentProfile.id) && (
              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-green-500 px-2.5 py-1 rounded-full z-10">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-xs text-white font-medium">Online</span>
              </div>
            )}

            {/* Profile counter */}
            <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full z-10">
              <span className="text-xs text-white">
                {currentIndex + 1} / {profiles.length}
              </span>
            </div>

            {/* Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
              {/* Basic Info - Always visible */}
              <div className="mb-3">
                <h2 className="text-2xl md:text-3xl font-bold text-white">{currentProfile.full_name}</h2>
                <p className="text-white/90 text-sm md:text-base">
                  {currentProfile.position || currentProfile.situation || "Empreendedor"}{" "}
                  {currentProfile.company ? `@ ${currentProfile.company}` : ""}
                </p>
                <div className="flex items-center gap-3 mt-1 text-white/70 text-xs md:text-sm">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {currentProfile.city || "Brasil"}
                  </span>
                  {currentProfile.industry && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {currentProfile.industry}
                    </span>
                  )}
                </div>
              </div>

              {/* Expand button */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-white/70 text-xs mb-3 hover:text-white transition-colors"
              >
                {showDetails ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                {showDetails ? "Ver menos" : "Ver mais"}
              </button>

              {/* Extended Details */}
              {showDetails && (
                <div className="space-y-3 mb-3 bg-black/40 rounded-xl p-3 backdrop-blur-sm">
                  {currentProfile.bio && <p className="text-white/90 text-sm leading-relaxed">{currentProfile.bio}</p>}

                  {currentProfile.interests && currentProfile.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {currentProfile.interests.slice(0, 4).map((interest) => (
                        <span key={interest} className="px-2 py-0.5 bg-white/20 text-white rounded-full text-xs">
                          {interest}
                        </span>
                      ))}
                    </div>
                  )}

                  {currentProfile.looking_for && currentProfile.looking_for.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {currentProfile.looking_for.slice(0, 3).map((item) => (
                        <span key={item} className="px-2 py-0.5 bg-primary/50 text-white rounded-full text-xs">
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-14 h-14 rounded-full border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white bg-white/10 backdrop-blur-sm"
                  onClick={handleSkip}
                  disabled={isLiking}
                >
                  <X className="w-7 h-7" />
                </Button>

                <Button
                  size="lg"
                  className={`w-16 h-16 rounded-full transition-all duration-200 ${
                    likeStatus.canLike && !isLiking
                      ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:scale-110 active:scale-95 shadow-lg shadow-pink-500/30"
                      : "bg-gray-500 text-gray-300 cursor-not-allowed"
                  }`}
                  onClick={handleLike}
                  disabled={!likeStatus.canLike || isLiking}
                >
                  {isLiking ? <Loader2 className="w-8 h-8 animate-spin" /> : <Heart className="w-8 h-8" />}
                </Button>

                <Link href="/dashboard/video">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-14 h-14 rounded-full border-2 border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white bg-white/10 backdrop-blur-sm"
                  >
                    <Video className="w-7 h-7" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Match Modal - Use proper phone from matchedProfile */}
      {showMatchModal && matchedProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 md:p-8 max-w-md w-full text-center animate-in zoom-in-95 duration-300">
            <div className="relative mb-6">
              <div className="flex justify-center -space-x-4">
                <div className="w-24 h-24 rounded-full border-4 border-primary overflow-hidden z-10 bg-secondary flex items-center justify-center">
                  <span className="text-2xl font-bold text-foreground">Você</span>
                </div>
                <div className="w-24 h-24 rounded-full border-4 border-pink-500 overflow-hidden bg-secondary">
                  <img
                    src={getAvatarUrl(matchedProfile) || "/placeholder.svg"}
                    alt={matchedProfile.full_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = `/placeholder.svg?height=96&width=96&query=professional`
                    }}
                  />
                </div>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full p-2 shadow-lg">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
            </div>

            <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent mb-2">
              É um Match!
            </h2>
            <p className="text-muted-foreground mb-6">Você e {matchedProfile.full_name} têm interesse mútuo!</p>

            <div className="space-y-3">
              <Button
                className={`w-full h-12 ${matchedProfile.phone ? "bg-[#25D366] hover:bg-[#25D366]/90" : "bg-gray-500"} text-white`}
                onClick={() => openWhatsApp(matchedProfile.phone, matchedProfile.full_name)}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                {matchedProfile.phone ? "Conversar no WhatsApp" : "WhatsApp não disponível"}
              </Button>
              <Link href="/dashboard/video" className="block">
                <Button
                  variant="outline"
                  className="w-full border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white h-12 bg-transparent"
                  onClick={() => setShowMatchModal(false)}
                >
                  <Video className="w-5 h-5 mr-2" />
                  Iniciar Videochamada
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground h-12"
                onClick={() => setShowMatchModal(false)}
              >
                Continuar Explorando
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
