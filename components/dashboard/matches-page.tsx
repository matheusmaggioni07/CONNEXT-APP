"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MessageCircle, MapPin, Clock, Heart, AlertCircle, RefreshCw, ArrowLeft, User, Rocket } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { getOnlineUserIds } from "@/app/actions/presence"
import type { Match, Profile } from "@/lib/types"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function MatchesPage() {
  const { user } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const router = useRouter()

  const fetchData = async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()

      // Get matches where user is either user1 or user2
      const { data: matchesData, error } = await supabase
        .from("matches")
        .select("id, user1_id, user2_id, created_at")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[v0] Get matches error:", error)
        setMatches([])
        setIsLoading(false)
        return
      }

      if (!matchesData || matchesData.length === 0) {
        setMatches([])
        const online = await getOnlineUserIds()
        setOnlineUsers(online)
        setIsLoading(false)
        return
      }

      // Get the other user's profile for each match
      const matchesWithProfiles = await Promise.all(
        matchesData.map(async (match) => {
          const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id
          const { data: profile } = await supabase.from("profiles").select("*").eq("id", otherUserId).single()

          return {
            ...match,
            matched_profile: profile,
          }
        }),
      )

      setMatches(matchesWithProfiles)
      const online = await getOnlineUserIds()
      setOnlineUsers(online)
    } catch (error) {
      console.error("Error fetching matches:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
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
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (hours < 1) return "Agora mesmo"
    if (hours < 24) return `Há ${hours}h`
    if (days < 7) return `Há ${days} dias`
    return date.toLocaleDateString("pt-BR")
  }

  const isOnline = (userId: string) => onlineUsers.includes(userId)

  const getAvatarUrl = (profile: Profile): string => {
    if (profile.avatar_url) {
      if (profile.avatar_url.startsWith("http://") || profile.avatar_url.startsWith("https://")) {
        return profile.avatar_url
      }
      if (profile.avatar_url.startsWith("/")) {
        return profile.avatar_url
      }
      return profile.avatar_url
    }

    // Fallback to UI Avatars - always returns a working URL
    const name = profile.full_name || "User"
    const initials = getInitials(name)
    const colors = [
      { bg: "6366f1", fg: "ffffff" },
      { bg: "8b5cf6", fg: "ffffff" },
      { bg: "ec4899", fg: "ffffff" },
      { bg: "f43f5e", fg: "ffffff" },
      { bg: "f97316", fg: "ffffff" },
      { bg: "eab308", fg: "000000" },
      { bg: "22c55e", fg: "ffffff" },
      { bg: "06b6d4", fg: "ffffff" },
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
    return name.substring(0, 2).toUpperCase()
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando matches...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
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
              <h1 className="text-2xl font-bold text-foreground">Seus Matches</h1>
              <p className="text-muted-foreground">Empreendedores que demonstraram interesse mútuo</p>
            </div>
          </div>
          <Button onClick={fetchData} variant="ghost" size="icon" className="text-muted-foreground">
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Nenhum match ainda</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Continue explorando perfis na página Descobrir para encontrar empreendedores compatíveis com seus
              interesses.
            </p>
            <Link href="/dashboard">
              <Button className="gradient-bg text-primary-foreground">Descobrir Empreendedores</Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {matches.map((match) => {
              const profile = match.matched_profile as Profile | undefined
              if (!profile) return null

              const hasPhone = !!profile.phone
              const avatarUrl = getAvatarUrl(profile)
              const isExpanded = expandedCards.has(match.id)

              return (
                <div
                  key={match.id}
                  className="bg-card rounded-xl border border-border p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex gap-4">
                    <div className="relative flex-shrink-0">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-[#ec4899] to-[#ff6b35]">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl || "/placeholder.svg"}
                            alt={profile.full_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = "none"
                              const parent = target.parentElement
                              if (parent) {
                                parent.innerHTML = `<span class="text-xl font-bold text-white flex items-center justify-center w-full h-full">${getInitials(profile.full_name)}</span>`
                              }
                            }}
                          />
                        ) : (
                          <span className="text-xl font-bold text-white flex items-center justify-center w-full h-full">
                            {getInitials(profile.full_name)}
                          </span>
                        )}
                      </div>
                      {isOnline(profile.id) && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-card rounded-full" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{profile.full_name}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {profile.position || profile.situation || "Empreendedor"}{" "}
                        {profile.company ? `• ${profile.company}` : ""}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {profile.city || "Brasil"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(match.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {profile.journey_stage && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Rocket className="w-3 h-3" />
                        Momento da Jornada:
                      </p>
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-500 rounded-lg text-xs inline-block">
                        {profile.journey_stage}
                      </span>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2">
                      {profile.bio && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <User className="w-4 h-4 mr-2" />
                            Bio:
                          </p>
                          <p className="text-sm text-foreground">{profile.bio}</p>
                        </div>
                      )}
                      {profile.country && (
                        <div className="flex items-center gap-1 text-xs">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-foreground">
                            {profile.city}, {profile.country}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <button onClick={() => toggleExpand(match.id)} className="text-xs text-primary hover:underline mt-2">
                    {isExpanded ? "Ver menos" : "Ver mais detalhes"}
                  </button>

                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      className={`w-full ${hasPhone ? "bg-[#25D366] hover:bg-[#25D366]/90" : "bg-gray-500 hover:bg-gray-600"} text-white`}
                      onClick={() => openWhatsApp(profile.phone, profile.full_name)}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                      {!hasPhone && <AlertCircle className="w-3 h-3 ml-1" />}
                    </Button>
                  </div>

                  {/* Phone warning */}
                  {!hasPhone && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Este usuário ainda não adicionou WhatsApp
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
