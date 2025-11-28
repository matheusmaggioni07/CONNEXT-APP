"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { User, Building2, Briefcase, MapPin, Phone, Mail, Edit2, Save, X, Camera, Crown } from "lucide-react"
import { getProfile } from "@/app/actions/auth"
import { updateProfile } from "@/app/actions/profile"
import type { Profile } from "@/lib/types"
import Link from "next/link"

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    company: "",
    position: "",
    bio: "",
    city: "",
  })

  useEffect(() => {
    async function fetchProfile() {
      setIsLoading(true)
      const profileData = await getProfile()
      if (profileData) {
        setProfile(profileData)
        setFormData({
          full_name: profileData.full_name || "",
          phone: profileData.phone || "",
          company: profileData.company || "",
          position: profileData.position || "",
          bio: profileData.bio || "",
          city: profileData.city || "",
        })
      }
      setIsLoading(false)
    }

    fetchProfile()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    const result = await updateProfile(formData)

    if (result.success) {
      setProfile((prev) => (prev ? { ...prev, ...formData } : null))
      setIsEditing(false)
    } else {
      alert(result.error || "Erro ao salvar perfil")
    }

    setIsSaving(false)
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Perfil não encontrado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
            <p className="text-muted-foreground">Gerencie suas informações profissionais</p>
          </div>
          {!isEditing ? (
            <Button
              variant="outline"
              className="border-border text-foreground bg-transparent"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Editar Perfil
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-border text-foreground bg-transparent"
                onClick={() => setIsEditing(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button className="bg-primary text-primary-foreground" onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          )}
        </div>

        {/* Plan Badge */}
        <div
          className={`rounded-xl border p-4 mb-6 flex items-center justify-between ${
            profile.plan === "pro" ? "bg-primary/10 border-primary/30" : "bg-secondary/50 border-border"
          }`}
        >
          <div className="flex items-center gap-3">
            <Crown className={`w-6 h-6 ${profile.plan === "pro" ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <p className="font-semibold text-foreground">Plano {profile.plan === "pro" ? "Pro" : "Gratuito"}</p>
              <p className="text-sm text-muted-foreground">
                {profile.plan === "pro"
                  ? "Acesso ilimitado a todas as funcionalidades"
                  : "5 likes e 5 chamadas por dia"}
              </p>
            </div>
          </div>
          {profile.plan !== "pro" && (
            <Link href="/dashboard/upgrade">
              <Button className="gradient-bg text-primary-foreground">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade
              </Button>
            </Link>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {/* Cover & Avatar */}
          <div className="relative h-32 bg-gradient-to-r from-primary/20 to-primary/5">
            <div className="absolute -bottom-12 left-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-card overflow-hidden bg-muted">
                  <img
                    src={profile.avatar_url || "/placeholder.svg?height=96&width=96&query=professional headshot"}
                    alt={profile.full_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {isEditing && (
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                    <Camera className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="pt-16 p-6">
            {isEditing ? (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="pl-10 bg-secondary border-border text-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground">WhatsApp</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="pl-10 bg-secondary border-border text-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground">Empresa</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="pl-10 bg-secondary border-border text-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground">Cargo</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="pl-10 bg-secondary border-border text-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground">Cidade</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="pl-10 bg-secondary border-border text-foreground"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Bio</Label>
                  <Textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="bg-secondary border-border text-foreground resize-none"
                    rows={4}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-foreground">{profile.full_name}</h2>
                  <p className="text-muted-foreground">
                    {profile.position} • {profile.company}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Mail className="w-5 h-5" />
                    <span>{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Phone className="w-5 h-5" />
                    <span>{profile.phone || "Não informado"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="w-5 h-5" />
                    <span>
                      {profile.city || "Não informado"}, {profile.country}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Building2 className="w-5 h-5" />
                    <span>{profile.industry || "Não informado"}</span>
                  </div>
                </div>

                {profile.bio && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Sobre</h3>
                    <p className="text-foreground">{profile.bio}</p>
                  </div>
                )}

                {profile.interests && profile.interests.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Interesses</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.map((interest) => (
                        <span key={interest} className="px-3 py-1 bg-secondary text-foreground rounded-full text-sm">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {profile.looking_for && profile.looking_for.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Buscando</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.looking_for.map((item) => (
                        <span key={item} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
