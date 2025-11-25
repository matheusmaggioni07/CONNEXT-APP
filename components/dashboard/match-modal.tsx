"use client"

import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { MessageCircle, X, Sparkles, Zap } from "lucide-react"

interface MatchModalProps {
  user: User
  currentUser: User
  onClose: () => void
  onWhatsApp: () => void
}

export function MatchModal({ user, currentUser, onClose, onWhatsApp }: MatchModalProps) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      {/* Ambient glow effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
        <div
          className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-secondary/20 rounded-full blur-[100px] animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="gradient-border rounded-3xl bg-card/90 backdrop-blur-sm max-w-md w-full p-8 text-center relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Match Animation */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Zap className="w-8 h-8 text-primary animate-bounce" />
          <h2 className="text-4xl font-bold gradient-text">Match!</h2>
          <Sparkles className="w-8 h-8 text-secondary animate-bounce" style={{ animationDelay: "0.2s" }} />
        </div>

        {/* Avatars */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="relative">
            <div className="absolute inset-0 gradient-bg rounded-full blur-md opacity-60 animate-pulse" />
            <div className="relative w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary/50">
              <img
                src={
                  currentUser.avatar ||
                  `/placeholder.svg?height=96&width=96&query=professional person ${currentUser.name}`
                }
                alt={currentUser.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="gradient-bg rounded-full p-2 glow-orange">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-secondary rounded-full blur-md opacity-60 animate-pulse" />
            <div className="relative w-24 h-24 rounded-full overflow-hidden ring-4 ring-secondary/50">
              <img
                src={user.avatar || `/placeholder.svg?height=96&width=96&query=professional person ${user.name}`}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        <p className="text-foreground text-lg mb-2">
          Você e <span className="font-bold gradient-text">{user.name}</span> deram match!
        </p>
        <p className="text-muted-foreground mb-6">Vocês compartilham interesses em comum. Conectem-se agora!</p>

        {/* Common Interests */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {user.interests.slice(0, 3).map((interest) => (
            <span key={interest} className="px-3 py-1 gradient-border rounded-full text-sm text-foreground bg-card/50">
              {interest}
            </span>
          ))}
        </div>

        <Button
          onClick={onWhatsApp}
          className="w-full gradient-bg text-primary-foreground hover:opacity-90 glow-orange"
          size="lg"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          Conversar no WhatsApp
        </Button>

        <button
          onClick={onClose}
          className="mt-4 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          Continuar explorando
        </button>
      </div>
    </div>
  )
}
