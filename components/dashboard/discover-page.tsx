"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { mockUsers } from "@/lib/mock-users"
import type { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { X, Heart, Video, MapPin, Building2, Sparkles, MessageCircle } from "lucide-react"

export function DiscoverPage() {
  const { user } = useAuth()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [users, setUsers] = useState<User[]>([])
  const [matches, setMatches] = useState<string[]>([])
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [matchedUser, setMatchedUser] = useState<User | null>(null)

  useEffect(() => {
    // Filter out current user and already matched users
    const filtered = mockUsers.filter((u) => u.id !== user?.id && !matches.includes(u.id))
    setUsers(filtered)
  }, [user, matches])

  const currentUser = users[currentIndex]

  const handleLike = () => {
    if (!currentUser) return

    // Simulate match (50% chance)
    if (Math.random() > 0.5) {
      setMatchedUser(currentUser)
      setShowMatchModal(true)
      setMatches((prev) => [...prev, currentUser.id])

      // Save match to localStorage
      const storedMatches = JSON.parse(localStorage.getItem("proconnect_matches") || "[]")
      storedMatches.push({
        id: crypto.randomUUID(),
        users: [user?.id, currentUser.id],
        matchedUser: currentUser,
        createdAt: new Date().toISOString(),
      })
      localStorage.setItem("proconnect_matches", JSON.stringify(storedMatches))
    }

    nextUser()
  }

  const handleSkip = () => {
    nextUser()
  }

  const nextUser = () => {
    if (currentIndex < users.length - 1) {
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

  if (!currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Você viu todos os perfis!</h2>
          <p className="text-muted-foreground">Volte mais tarde para encontrar novos profissionais.</p>
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
          <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-full">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm text-foreground">{users.filter((u) => u.isOnline).length} online</span>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xl">
          {/* Cover Image */}
          <div className="relative h-72">
            <img
              src={currentUser.avatar || "/placeholder.svg"}
              alt={currentUser.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

            {/* Online Status */}
            {currentUser.isOnline && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-primary/90 px-3 py-1 rounded-full">
                <span className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse" />
                <span className="text-sm text-primary-foreground font-medium">Online</span>
              </div>
            )}

            {/* Basic Info */}
            <div className="absolute bottom-4 left-4 right-4">
              <h2 className="text-2xl font-bold text-foreground">{currentUser.name}</h2>
              <p className="text-foreground/80">
                {currentUser.position} • {currentUser.company}
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
                  {currentUser.location.city}, {currentUser.location.country}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span>{currentUser.industry}</span>
              </div>
            </div>

            {/* Bio */}
            <p className="text-foreground leading-relaxed">{currentUser.bio}</p>

            {/* Interests */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Interesses</h3>
              <div className="flex flex-wrap gap-2">
                {currentUser.interests.map((interest) => (
                  <span key={interest} className="px-3 py-1 bg-secondary text-foreground rounded-full text-sm">
                    {interest}
                  </span>
                ))}
              </div>
            </div>

            {/* Looking For */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Buscando</h3>
              <div className="flex flex-wrap gap-2">
                {currentUser.lookingFor.map((item) => (
                  <span key={item} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-border flex items-center justify-center gap-6">
            <Button
              size="lg"
              variant="outline"
              className="w-16 h-16 rounded-full border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent"
              onClick={handleSkip}
            >
              <X className="w-8 h-8" />
            </Button>
            <Button
              size="lg"
              className="w-20 h-20 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleLike}
            >
              <Heart className="w-10 h-10" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-16 h-16 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
              onClick={() => {}}
            >
              <Video className="w-8 h-8" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} de {users.length}
          </span>
        </div>
      </div>

      {/* Match Modal */}
      {showMatchModal && matchedUser && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-8 max-w-md w-full text-center">
            <div className="relative mb-6">
              <div className="flex justify-center gap-4">
                <div className="w-24 h-24 rounded-full border-4 border-primary overflow-hidden">
                  <img
                    src={user?.avatar || "/placeholder.svg"}
                    alt={user?.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="w-24 h-24 rounded-full border-4 border-primary overflow-hidden">
                  <img
                    src={matchedUser.avatar || "/placeholder.svg"}
                    alt={matchedUser.name}
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
              Você e {matchedUser.name} têm interesse mútuo. Conecte-se agora!
            </p>

            <div className="space-y-3">
              <Button
                className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white"
                onClick={() => openWhatsApp(matchedUser.phone)}
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
