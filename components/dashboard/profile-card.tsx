"use client"

import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { MapPin, Building2, Heart, X, MessageCircle, Sparkles } from "lucide-react"

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
            src={
              user.avatar || `/placeholder.svg?height=500&width=400&query=professional person ${user.name} futuristic`
            }
            alt={user.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />

          {/* Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">{user.interests.slice(0, 2).join(" • ")}</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-1">{user.name}</h2>
            <p className="text-muted-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              {user.position} • {user.company}
            </p>
            <p className="text-muted-foreground flex items-center gap-2 mt-1">
              <MapPin className="w-4 h-4" />
              {user.city}, {user.country}
            </p>
          </div>
        </div>

        {/* Bio */}
        <div className="p-6 pt-0">
          {user.bio && <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{user.bio}</p>}

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {user.lookingFor.slice(0, 3).map((item) => (
              <span key={item} className="px-3 py-1 gradient-border rounded-full text-xs text-foreground bg-card/50">
                {item}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-4">
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
