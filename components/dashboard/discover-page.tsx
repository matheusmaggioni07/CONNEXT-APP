"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  X,
  Heart,
  Undo2,
  MapPin,
  Sparkles,
  MessageCircle,
  Crown,
  Loader2,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Video,
  User,
  ArrowLeft,
  Rocket,
} from "lucide-react"
import { likeUser, checkLikeLimit } from "@/app/actions/likes"
import { getProfilesToDiscover } from "@/app/actions/profile"
import { getOnlineUserIds, updatePresence } from "@/app/actions/presence"
import type { Profile } from "@/lib/types"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function DiscoverPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLiking, setIsLiking] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [skippedHistory, setSkippedHistory] = useState<number[]>([])
  const [likeStatus, setLikeStatus] = useState<{ canLike: boolean; remaining: number; isPro?: boolean }>({
    canLike: true,
    remaining: 5,
  })
  const [imageError, setImageError] = useState(false)
  const router = useRouter()

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [fetchedProfiles, online, limitStatus] = await Promise.all([
        getProfilesToDiscover(),
        getOnlineUserIds(),
        checkLikeLimit(),
      ])
      setProfiles(fetchedProfiles)
      setOnlineUsers(online)
      setLikeStatus(limitStatus as { canLike: boolean; remaining: number; isPro?: boolean })
      setSkippedHistory([])
    } catch (error) {
      console.error("Error fetching data:", error)
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

  useEffect(() => {
    setImageError(false)
  }, [currentIndex])

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
    setSkippedHistory((prev) => [...prev, currentIndex])
    nextProfile()
  }

  const handleUndo = () => {
    if (skippedHistory.length > 0) {
      const lastIndex = skippedHistory[skippedHistory.length - 1]
      setSkippedHistory((prev) => prev.slice(0, -1))
      setCurrentIndex(lastIndex)
      setShowDetails(false)
    }
  }

  const nextProfile = () => {
    setShowDetails(false)
    setImageError(false)
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

    let cleanPhone = phone.replace(/\D/g, "")

    if (cleanPhone.length === 11 || cleanPhone.length === 10) {
      cleanPhone = "55" + cleanPhone
    }

    const message = encodeURIComponent(`Olá ${name}! Nos conectamos pelo Connext e gostaria de conversar com você.`)
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank")
    setShowMatchModal(false)
  }

  const isOnline = (userId: string) => onlineUsers.includes(userId)

  const getAvatarUrl = (profile: Profile): string => {
    // Priority 1: Check for avatar_url
    if (profile.avatar_url && profile.avatar_url.length > 0) {
      // Ensure it's a valid URL
      if (profile.avatar_url.startsWith("http")) {
        return profile.avatar_url
      }
      // If it looks like a Supabase Storage path (doesn't start with slash)
      if (!profile.avatar_url.startsWith("/")) {
        // Try to construct the public URL for the Supabase 'avatars' bucket
        // Note: NEXT_PUBLIC_SUPABASE_URL should be set in environment
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ovqxtrjofmrtxtxjtjtx.supabase.co"
        return `${supabaseUrl}/storage/v1/object/public/avatars/${profile.avatar_url}`
      }
      return profile.avatar_url
    }

    // Fallback to UI Avatars with initials
    const name = profile.full_name || "User"
    const initials = getInitials(name)
    const colors = [
      { bg: "6366f1", fg: "ffffff" }, // Indigo
      { bg: "8b5cf6", fg: "ffffff" }, // Violet
      { bg: "ec4899", fg: "ffffff" }, // Pink
      { bg: "f43f5e", fg: "ffffff" }, // Rose
      { bg: "f97316", fg: "ffffff" }, // Orange
      { bg: "eab308", fg: "000000" }, // Yellow
      { bg: "22c55e", fg: "ffffff" }, // Green
      { bg: "06b6d4", fg: "ffffff" }, // Cyan
    ]

    const colorIndex = profile.id ? profile.id.charCodeAt(0) % colors.length : 0
    const color = colors[colorIndex]

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${color.bg}&color=${color.fg}&size=256&bold=true&format=svg`
  }

  const getInitials = (name: string): string => {
    if (!name) return "?"
    const parts = name.trim().split(" ")
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0][0].toUpperCase()
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

  const avatarUrl = getAvatarUrl(currentProfile)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/80 flex flex-col p-2 md:p-4">
      {/* Header - Desktop only */}
      <div className="hidden md:flex items-center justify-between p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Descobrir</h1>
            <p className="text-muted-foreground">Encontre empreendedores compatíveis</p>
          </div>
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

      {/* Mobile Header with back button */}
      <div className="flex md:hidden items-center justify-between p-2 md:p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Descobrir</h1>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="ghost" size="icon" className="text-muted-foreground">
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Like Limit - Only show when low */}
      {!likeStatus.isPro && likeStatus.remaining <= 2 && (
        <div className="mx-2 md:mx-6 mb-2 bg-secondary/50 border border-border rounded-xl p-3 flex items-center justify-between">
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

      {/* Profile Card - RESPONSIVE */}
      <div className="flex-1 flex items-center justify-center py-2 md:py-4">
        {profiles.length > 0 ? (
          <div className="w-full max-w-sm md:max-w-2xl px-2 md:px-0">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-b from-slate-900/40 to-slate-900/20 border border-border/50 backdrop-blur-sm aspect-[3/4] md:aspect-[9/16]">
              {/* Full Photo or Initials */}
              <div className="absolute inset-0">
                {avatarUrl && !imageError ? (
                  <img
                    src={avatarUrl || "/placeholder.svg"}
                    alt={currentProfile.full_name}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500 flex items-center justify-center">
                    <span className="text-6xl md:text-8xl font-bold text-white/90">
                      {getInitials(currentProfile.full_name)}
                    </span>
                  </div>
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
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
              <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 z-10">
                {/* Basic Info - Always visible */}
                <div className="mb-2">
                  <h2 className="text-xl md:text-3xl font-bold text-white">{currentProfile.full_name}</h2>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-white/90 text-xs md:text-base font-medium">
                      {currentProfile.position || currentProfile.situation || "Empreendedor"}{" "}
                      {currentProfile.company ? `@ ${currentProfile.company}` : ""}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-white/80 text-xs md:text-sm">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary" />
                        {currentProfile.city || "Brasil"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  {currentProfile.journey_stage && (
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] text-white/50 uppercase tracking-wider font-bold">Momento da Jornada</p>
                      <span className="px-2 py-1 bg-amber-500/30 text-white border border-amber-500/20 rounded-lg text-[10px] font-medium backdrop-blur-md">
                        {currentProfile.journey_stage}
                      </span>
                    </div>
                  )}

                  {currentProfile.objectives && currentProfile.objectives.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {currentProfile.objectives.slice(0, 2).map((obj, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-pink-500/30 text-white border border-pink-500/20 rounded-lg text-[9px] font-medium backdrop-blur-md"
                        >
                          {obj}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expand button */}
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-1 text-white/70 text-xs mb-3 hover:text-white transition-colors"
                >
                  {showDetails ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  {showDetails ? "Ver menos" : "Ver mais"}
                </button>

                {showDetails && (
                  <div className="space-y-3 mb-3 bg-black/50 rounded-xl p-4 backdrop-blur-sm max-h-[40vh] overflow-y-auto">
                    {currentProfile.journey_stage && (
                      <div>
                        <p className="text-white/60 text-xs mb-1 flex items-center gap-1">
                          <Rocket className="w-3 h-3" />
                          Momento da Jornada:
                        </p>
                        <p className="text-white/90 text-sm font-medium">{currentProfile.journey_stage}</p>
                      </div>
                    )}
                    {/* Bio */}
                    {currentProfile.bio && (
                      <div>
                        <p className="text-white/60 text-xs mb-1 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Sobre:
                        </p>
                        <p className="text-white/90 text-sm leading-relaxed">{currentProfile.bio}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-2 md:gap-4">
                  <Button
                    size="lg"
                    variant="outline"
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full border-2 transition-all duration-200 ${
                      skippedHistory.length > 0
                        ? "border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-white bg-white/10 backdrop-blur-sm"
                        : "border-gray-500 text-gray-500 bg-white/5 cursor-not-allowed opacity-50"
                    }`}
                    onClick={handleUndo}
                    disabled={skippedHistory.length === 0}
                    title="Voltar ao perfil anterior"
                  >
                    <Undo2 className="w-5 h-5 md:w-6 md:h-6" />
                  </Button>

                  <Button
                    size="lg"
                    variant="outline"
                    className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white bg-white/10 backdrop-blur-sm"
                    onClick={handleSkip}
                    disabled={isLiking}
                  >
                    <X className="w-6 h-6 md:w-7 md:h-7" />
                  </Button>

                  <Button
                    size="lg"
                    className={`w-14 h-14 md:w-16 md:h-16 rounded-full transition-all duration-200 ${
                      likeStatus.canLike && !isLiking
                        ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:scale-110 active:scale-95 shadow-lg shadow-pink-500/30"
                        : "bg-gray-500 text-gray-300 cursor-not-allowed"
                    }`}
                    onClick={handleLike}
                    disabled={!likeStatus.canLike || isLiking}
                    title={likeStatus.canLike ? "Curtir este perfil" : `Limite diário atingido - Faça upgrade para Pro`}
                  >
                    {isLiking ? (
                      <Loader2 className="w-7 h-7 md:w-8 md:h-8 animate-spin" />
                    ) : (
                      <Heart className={`w-7 h-7 md:w-8 md:h-8 transition-all fill-white`} />
                    )}
                  </Button>

                  {/* Video call button */}
                  <Link href="/dashboard/video">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white bg-white/10 backdrop-blur-sm"
                      title="Videochamada"
                    >
                      <Video className="w-5 h-5 md:w-6 md:h-6" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Nenhum perfil disponível no momento</p>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Voltar
            </Button>
          </div>
        )}
      </div>

      {/* Match Modal */}
      {showMatchModal && matchedProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 md:p-8 max-w-md w-full text-center animate-in zoom-in-95 duration-300">
            <div className="relative mb-6">
              <div className="flex justify-center -space-x-4">
                <div className="w-24 h-24 rounded-full border-4 border-primary overflow-hidden z-10 bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">Você</span>
                </div>
                <div className="w-24 h-24 rounded-full border-4 border-pink-500 overflow-hidden bg-gradient-to-br from-purple-600 to-pink-500">
                  {getAvatarUrl(matchedProfile) ? (
                    <img
                      src={getAvatarUrl(matchedProfile) || ""}
                      alt={matchedProfile.full_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = "none"
                        target.parentElement!.innerHTML = `<span class="text-2xl font-bold text-white flex items-center justify-center w-full h-full">${getInitials(matchedProfile.full_name)}</span>`
                      }}
                    />
                  ) : (
                    <span className="text-2xl font-bold text-white flex items-center justify-center w-full h-full">
                      {getInitials(matchedProfile.full_name)}
                    </span>
                  )}
                </div>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 animate-bounce">
                <div className="relative">
                  <div className="absolute inset-0 bg-pink-500/30 blur-xl rounded-full animate-pulse" />
                  <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-full p-3 shadow-2xl shadow-pink-500/50">
                    <Heart className="w-8 h-8 text-white fill-white animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent mb-2 animate-in fade-in zoom-in duration-500">
              É um Match!
            </h2>
            <p className="text-muted-foreground mb-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
              Você e {matchedProfile?.full_name} têm interesse mútuo!
            </p>

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
