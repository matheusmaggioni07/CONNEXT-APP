"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { MessageCircle, Video, MapPin, Clock, Heart } from "lucide-react"

interface Match {
  id: string
  matchedUser: User
  createdAt: string
}

export function MatchesPage() {
  const { user } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("proconnect_matches") || "[]")
    setMatches(stored)
  }, [])

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "")
    window.open(`https://wa.me/${cleanPhone}`, "_blank")
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

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Seus Matches</h1>
          <p className="text-muted-foreground">Profissionais que demonstraram interesse mútuo</p>
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Nenhum match ainda</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Continue explorando perfis na página Descobrir para encontrar profissionais compatíveis com seus
              interesses.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {matches.map((match) => (
              <div
                key={match.id}
                className="bg-card rounded-xl border border-border p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full overflow-hidden">
                      <img
                        src={match.matchedUser.avatar || "/placeholder.svg"}
                        alt={match.matchedUser.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {match.matchedUser.isOnline && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-primary border-2 border-card rounded-full" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{match.matchedUser.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {match.matchedUser.position} • {match.matchedUser.company}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {match.matchedUser.location.city}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(match.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interests */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {match.matchedUser.interests.slice(0, 3).map((interest) => (
                    <span key={interest} className="px-2 py-0.5 bg-secondary text-foreground rounded-full text-xs">
                      {interest}
                    </span>
                  ))}
                  {match.matchedUser.interests.length > 3 && (
                    <span className="px-2 py-0.5 text-muted-foreground text-xs">
                      +{match.matchedUser.interests.length - 3}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    className="flex-1 bg-[#25D366] hover:bg-[#25D366]/90 text-white"
                    onClick={() => openWhatsApp(match.matchedUser.phone)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border text-foreground hover:bg-secondary bg-transparent"
                  >
                    <Video className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
