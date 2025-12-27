"use client"

import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { MapPin, Rocket, Zap, Heart, X, MessageCircle } from "lucide-react"

interface ProfileCardProps {
  user: User
  onLike: () => void
  onSkip: () => void
}

export function ProfileCard({ user, onLike, onSkip }: ProfileCardProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="gradient-border rounded-3xl bg-card/80 backdrop-blur-sm overflow-hidden shadow-2xl">
        {/* Image */}
        <div className="relative aspect-[4/5]">
          <img
            src={user.avatar || `/placeholder.svg?height=500&width=400&query=entrepreneur${user.name}`}
            alt={user.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />

          {/* Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">{user.name}</h2>
            {user.phone && <p className="text-sm text-primary/90 font-medium mb-1">📱 {user.phone}</p>}
            <p className="text-muted-foreground flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4" />
              {user.situation || "Empreendedor"}
            </p>
            <p className="text-muted-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {user.location.city}, {user.location.country}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 pt-4 space-y-4">
          {/* Journey Stage */}
          {user.journey_stage && (
            <div className="bg-secondary/50 rounded-lg p-3 border border-border/50">
              <div className="flex items-start gap-2">
                <Rocket className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Estágio</p>
                  <p className="text-sm text-foreground">{user.journey_stage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Bio */}
          {user.bio && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Sobre</p>
              <p className="text-sm text-foreground line-clamp-3">{user.bio}</p>
            </div>
          )}

          {/* Business Info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {user.company && (
              <div className="bg-secondary/50 rounded p-2 border border-border/50">
                <p className="text-muted-foreground">Empresa</p>
                <p className="text-foreground font-medium truncate">{user.company}</p>
              </div>
            )}
            {user.position && (
              <div className="bg-secondary/50 rounded p-2 border border-border/50">
                <p className="text-muted-foreground">Posição</p>
                <p className="text-foreground font-medium truncate">{user.position}</p>
              </div>
            )}
            {user.industry && (
              <div className="bg-secondary/50 rounded p-2 border border-border/50">
                <p className="text-muted-foreground">Indústria</p>
                <p className="text-foreground font-medium truncate">{user.industry}</p>
              </div>
            )}
            {user.business_area && (
              <div className="bg-secondary/50 rounded p-2 border border-border/50">
                <p className="text-muted-foreground">Área de Negócios</p>
                <p className="text-foreground font-medium truncate">{user.business_area}</p>
              </div>
            )}
          </div>

          {/* Tags */}
          {user.lookingFor && user.lookingFor.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {user.lookingFor.slice(0, 3).map((item) => (
                <span key={item} className="px-2 py-1 gradient-border rounded-full text-xs text-foreground bg-card/50">
                  {item}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <Button
              size="lg"
              variant="outline"
              className="w-16 h-16 rounded-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive bg-transparent"
              onClick={onSkip}
            >
              <X className="w-8 h-8" />
            </Button>
            <Button
              size="lg"
              className="w-20 h-20 rounded-full gradient-bg text-primary-foreground hover:opacity-90 glow-orange animate-pulse-glow"
              onClick={onLike}
            >
              <Heart className="w-10 h-10" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-16 h-16 rounded-full border-secondary/50 text-secondary hover:bg-secondary/10 hover:border-secondary bg-transparent"
            >
              <MessageCircle className="w-8 h-8" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
