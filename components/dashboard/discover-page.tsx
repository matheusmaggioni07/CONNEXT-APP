"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { X, Heart, Video, MapPin, Building2, Sparkles, MessageCircle, Crown, Loader2 } from "lucide-react"
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
  const [likeStatus, setLikeStatus] = useState<{ canLike: boolean; remaining: number; isPro?: boolean }>({
    canLike: true,
    remaining: 5,
  })

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
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    // Update presence every 30 seconds
    const presenceInterval = setInterval(() => {
      updatePresence()
    }, 30000)

    // Initial presence update
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
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      setCurrentIndex(0)
    }
  }

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "")
    window.open(`https://wa.me/${cleanPhone}`, "_blank")
    setShowMatchModal(false)
  }

  const isOnline = (userId: string) => onlineUsers.includes(userId)

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
          <p className="text-muted-foreground mb-4">Volte mais tarde para encontrar novos profissionais.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Descobrir</h1>
            <p className="text-muted-foreground">Encontre profissionais compatíveis com você</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-full">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm text-foreground">{onlineUsers.length} online</span>
            </div>
          </div>
        </div>

        {/* Like Limit Warning */}
        {!likeStatus.isPro && (
          <div className="bg-secondary/50 border border-border rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-primary" />
              <span className="text-sm text-foreground">
                {likeStatus.canLike ? `${likeStatus.remaining} likes restantes hoje` : "Limite diário atingido"}
              </span>
            </div>
            <Link href="/dashboard/upgrade">
              <Button size="sm" className="gradient-bg text-primary-foreground">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade Pro
              </Button>
            </Link>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xl">
          {/* Cover Image */}
          <div className="relative h-72">
            <img
              src={currentProfile.avatar_url || "/placeholder.svg?height=300&width=400&query=professional headshot"}
              alt={currentProfile.full_name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

            {/* Online Status */}
            {isOnline(currentProfile.id) && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-primary/90 px-3 py-1 rounded-full">
                <span className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse" />
                <span className="text-sm text-primary-foreground font-medium">Online</span>
              </div>
            )}

            {/* Basic Info */}
            <div className="absolute bottom-4 left-4 right-4">
              <h2 className="text-2xl font-bold text-foreground">{currentProfile.full_name}</h2>
              <p className="text-foreground/80">
                {currentProfile.position} • {currentProfile.company}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-6">
            {/* Location & Industry */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>
                  {currentProfile.city}, {currentProfile.country}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span>{currentProfile.industry}</span>
              </div>
            </div>

            {/* Bio */}
            {currentProfile.bio && <p className="text-foreground leading-relaxed">{currentProfile.bio}</p>}

            {/* Interests */}
            {currentProfile.interests && currentProfile.interests.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Interesses</h3>
                <div className="flex flex-wrap gap-2">
                  {currentProfile.interests.map((interest) => (
                    <span key={interest} className="px-3 py-1 bg-secondary text-foreground rounded-full text-sm">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Looking For */}
            {currentProfile.looking_for && currentProfile.looking_for.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Buscando</h3>
                <div className="flex flex-wrap gap-2">
                  {currentProfile.looking_for.map((item) => (
                    <span key={item} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-border flex items-center justify-center gap-6">
            <Button
              size="lg"
              variant="outline"
              className="w-16 h-16 rounded-full border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent"
              onClick={handleSkip}
              disabled={isLiking}
            >
              <X className="w-8 h-8" />
            </Button>
            <Button
              size="lg"
              className={`w-20 h-20 rounded-full transition-all duration-200 ${
                likeStatus.canLike && !isLiking
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-110 active:scale-95"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
              onClick={handleLike}
              disabled={!likeStatus.canLike || isLiking}
            >
              {isLiking ? <Loader2 className="w-10 h-10 animate-spin" /> : <Heart className="w-10 h-10" />}
            </Button>
            <Link href="/dashboard/video">
              <Button
                size="lg"
                variant="outline"
                className="w-16 h-16 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
              >
                <Video className="w-8 h-8" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} de {profiles.length}
          </span>
        </div>
      </div>

      {/* Match Modal */}
      {showMatchModal && matchedProfile && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-8 max-w-md w-full text-center">
            <div className="relative mb-6">
              <div className="flex justify-center gap-4">
                <div className="w-24 h-24 rounded-full border-4 border-primary overflow-hidden">
                  <img src="/my-profile.png" alt="Você" className="w-full h-full object-cover" />
                </div>
                <div className="w-24 h-24 rounded-full border-4 border-primary overflow-hidden">
                  <img
                    src={matchedProfile.avatar_url || "/placeholder.svg?height=96&width=96&query=professional"}
                    alt={matchedProfile.full_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary rounded-full p-3">
                <Heart className="w-6 h-6 text-primary-foreground fill-primary-foreground" />
              </div>
            </div>

            <h2 className="text-3xl font-bold text-primary mb-2">É um Match!</h2>
            <p className="text-muted-foreground mb-6">
              Você e {matchedProfile.full_name} têm interesse mútuo. Conecte-se agora!
            </p>

            <div className="space-y-3">
              <Button
                className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white"
                onClick={() => openWhatsApp(matchedProfile.phone || "")}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Conversar no WhatsApp
              </Button>
              <Button
                variant="outline"
                className="w-full border-border text-foreground bg-transparent"
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
