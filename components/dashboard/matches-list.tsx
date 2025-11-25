"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { mockUsers } from "@/lib/mock-users"
import type { User } from "@/lib/types"
import { MessageCircle, MapPin, Building2, Heart, Sparkles, Zap } from "lucide-react"

export function MatchesList() {
  const [matches] = useState<User[]>(mockUsers.slice(0, 5))

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "")
    window.open(`https://wa.me/${cleanPhone}`, "_blank")
  }

  return (
    <div className="h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Heart className="w-6 h-6 text-primary" />
          Seus Matches
        </h1>
        <p className="text-muted-foreground">Conecte-se com seus matches via WhatsApp</p>
      </div>

      {/* Matches Grid */}
      {matches.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((match) => (
            <div
              key={match.id}
              className="gradient-border rounded-2xl bg-card/50 backdrop-blur-sm overflow-hidden hover:bg-card/70 transition-all group"
            >
              <div className="relative aspect-[4/3]">
                <img
                  src={
                    match.avatar ||
                    `/placeholder.svg?height=200&width=300&query=professional person ${match.name} futuristic`
                  }
                  alt={match.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 gradient-bg rounded-full">
                  <Zap className="w-3 h-3 text-primary-foreground" />
                  <span className="text-xs text-primary-foreground font-medium">Match</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-xs text-primary">{match.interests.slice(0, 2).join(" • ")}</span>
                </div>
                <h3 className="font-semibold text-foreground text-lg">{match.name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                  <Building2 className="w-3 h-3" />
                  {match.position} • {match.company}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-4">
                  <MapPin className="w-3 h-3" />
                  {match.city}
                </p>
                <Button
                  className="w-full gradient-bg text-primary-foreground hover:opacity-90"
                  onClick={() => openWhatsApp(match.phone)}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="gradient-border rounded-3xl bg-card/50 backdrop-blur-sm p-12 text-center">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 gradient-bg rounded-full blur-xl opacity-40" />
            <div className="relative w-20 h-20 gradient-bg rounded-full flex items-center justify-center mx-auto">
              <Heart className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum match ainda</h3>
          <p className="text-muted-foreground mb-6">
            Continue explorando para encontrar profissionais compatíveis com seus interesses.
          </p>
          <Button className="gradient-bg text-primary-foreground hover:opacity-90 glow-orange">
            <Sparkles className="w-4 h-4 mr-2" />
            Descobrir Profissionais
          </Button>
        </div>
      )}
    </div>
  )
}
