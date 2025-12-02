"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MessageCircle, Video, MapPin, Clock, Heart, AlertCircle, RefreshCw } from "lucide-react"
import { getMatches } from "@/app/actions/likes"
import { getOnlineUserIds } from "@/app/actions/presence"
import type { Match, Profile } from "@/lib/types"
import Link from "next/link"

export function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [fetchedMatches, online] = await Promise.all([getMatches(), getOnlineUserIds()])
      console.log("[v0] Matches fetched:", fetchedMatches.length)
      setMatches(fetchedMatches)
      setOnlineUsers(online)
    } catch (error) {
      console.error("[v0] Error fetching matches:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

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

    // Create message
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

  const getAvatarUrl = (profile: Profile) => {
    if (profile.avatar_url && profile.avatar_url.startsWith("http")) {
      return profile.avatar_url
    }
    return `/placeholder.svg?height=64&width=64&query=${encodeURIComponent(profile.full_name || "professional")} portrait`
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
          <div>
            <h1 className="text-2xl font-bold text-foreground">Seus Matches</h1>
            <p className="text-muted-foreground">Empreendedores que demonstraram interesse mútuo</p>
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

              return (
                <div
                  key={match.id}
                  className="bg-card rounded-xl border border-border p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex gap-4">
                    {/* Avatar - Show actual profile photo */}
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-secondary">
                        <img
                          src={getAvatarUrl(profile) || "/placeholder.svg"}
                          alt={profile.full_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = `/placeholder.svg?height=64&width=64&query=professional`
                          }}
                        />
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

                  {/* Interests */}
                  {profile.interests && profile.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {profile.interests.slice(0, 3).map((interest) => (
                        <span key={interest} className="px-2 py-0.5 bg-secondary text-foreground rounded-full text-xs">
                          {interest}
                        </span>
                      ))}
                      {profile.interests.length > 3 && (
                        <span className="px-2 py-0.5 text-muted-foreground text-xs">
                          +{profile.interests.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions - Fixed WhatsApp and camera buttons */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      className={`flex-1 ${hasPhone ? "bg-[#25D366] hover:bg-[#25D366]/90" : "bg-gray-500 hover:bg-gray-600"} text-white`}
                      onClick={() => openWhatsApp(profile.phone, profile.full_name)}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                      {!hasPhone && <AlertCircle className="w-3 h-3 ml-1" />}
                    </Button>
                    <Link href="/dashboard/video">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white bg-transparent"
                      >
                        <Video className="w-4 h-4" />
                      </Button>
                    </Link>
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
