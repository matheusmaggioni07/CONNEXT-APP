"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { User, MapPin, Phone, Mail, Edit2, Save, X, Camera, Crown, Loader2, AlertCircle } from "lucide-react"
import { getProfile } from "@/app/actions/auth"
import { updateProfile } from "@/app/actions/profile"
import type { Profile } from "@/lib/types"
import Link from "next/link"

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setPhotoError("")

    if (!file.type.startsWith("image/")) {
      setPhotoError("Por favor, selecione uma imagem válida (JPG, PNG, GIF, etc).")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("A imagem deve ter no máximo 5MB.")
      return
    }

    setIsUploadingPhoto(true)

    try {
      const formDataUpload = new FormData()
      formDataUpload.append("file", file)

      const response = await fetch("/api/upload-avatar", {
        method: "POST",
        body: formDataUpload,
      })

      const result = await response.json()

      if (result.success && result.url) {
        setProfile((prev) => (prev ? { ...prev, avatar_url: result.url } : null))
        setPhotoError("")
      } else {
        setPhotoError(result.error || "Erro ao fazer upload da foto")
      }
    } catch (error) {
      console.error("Error uploading photo:", error)
      setPhotoError("Erro ao fazer upload da foto. Tente novamente.")
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
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
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
            <p className="text-muted-foreground">Gerencie suas informações profissionais</p>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline" className="flex items-center gap-2">
              <Edit2 className="w-4 h-4" />
              Editar
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={() => setIsEditing(false)} variant="outline" className="flex items-center gap-2">
                <X className="w-4 h-4" />
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 gradient-bg text-primary-foreground"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar
              </Button>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-muted border-4 border-muted">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url || "/placeholder.svg"}
                    alt={profile.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
                    <User className="w-16 h-16 text-white/50" />
                  </div>
                )}
              </div>
              <button
                onClick={triggerFileInput}
                disabled={isUploadingPhoto}
                className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isUploadingPhoto ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              </button>
              {!profile.avatar_url && (
                <div className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500">
                  <span className="text-xs font-bold text-white">!</span>
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold text-foreground">{profile.full_name}</h2>
                {profile.subscription_tier && profile.subscription_tier !== "free" && (
                  <Crown className="w-5 h-5 text-yellow-500" />
                )}
              </div>
              <p className="text-muted-foreground mb-4">
                {profile.position || "Cargo não informado"} {profile.company ? `• ${profile.company}` : ""}
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {profile.city || "Cidade não informada"}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {profile.email}
                </span>
                {profile.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {profile.phone}
                  </span>
                )}
              </div>

              {photoError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-500">{photoError}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Informações</h3>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label className="text-muted-foreground">Nome Completo</Label>
              {isEditing ? (
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="text-foreground mt-1">{profile.full_name || "-"}</p>
              )}
            </div>

            <div>
              <Label className="text-muted-foreground">Telefone / WhatsApp</Label>
              {isEditing ? (
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="mt-1"
                />
              ) : (
                <p className="text-foreground mt-1">{profile.phone || "-"}</p>
              )}
            </div>

            <div>
              <Label className="text-muted-foreground">Empresa</Label>
              {isEditing ? (
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="text-foreground mt-1">{profile.company || "-"}</p>
              )}
            </div>

            <div>
              <Label className="text-muted-foreground">Cargo</Label>
              {isEditing ? (
                <Input
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="text-foreground mt-1">{profile.position || "-"}</p>
              )}
            </div>

            <div>
              <Label className="text-muted-foreground">Cidade</Label>
              {isEditing ? (
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="text-foreground mt-1">{profile.city || "-"}</p>
              )}
            </div>

            <div>
              <Label className="text-muted-foreground">Indústria</Label>
              <p className="text-foreground mt-1">{profile.industry || "-"}</p>
            </div>
          </div>

          <div className="mt-6">
            <Label className="text-muted-foreground">Bio</Label>
            {isEditing ? (
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Conte um pouco sobre você..."
                className="mt-1"
                rows={4}
              />
            ) : (
              <p className="text-foreground mt-1">{profile.bio || "Nenhuma bio adicionada"}</p>
            )}
          </div>

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="mt-6">
              <Label className="text-muted-foreground">Interesses</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {profile.interests.map((interest, index) => (
                  <span key={index} className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Looking For */}
          {profile.looking_for && profile.looking_for.length > 0 && (
            <div className="mt-6">
              <Label className="text-muted-foreground">Buscando</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {profile.looking_for.map((item, index) => (
                  <span key={index} className="px-3 py-1 bg-secondary text-secondary-foreground text-sm rounded-full">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Subscription */}
        <div className="bg-card rounded-xl border border-border p-6 mt-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Assinatura</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-foreground font-medium capitalize">
                {profile.subscription_tier === "free"
                  ? "Plano Gratuito"
                  : profile.subscription_tier === "pro"
                    ? "Plano Pro"
                    : "Plano Premium"}
              </p>
              <p className="text-sm text-muted-foreground">
                {profile.subscription_tier === "free"
                  ? "5 videochamadas e 10 likes por dia"
                  : profile.subscription_tier === "pro"
                    ? "15 videochamadas e likes ilimitados"
                    : "Videochamadas e likes ilimitados"}
              </p>
            </div>
            {profile.subscription_tier === "free" && (
              <Link href="/dashboard/planos">
                <Button className="gradient-bg text-primary-foreground">
                  <Crown className="w-4 h-4 mr-2" />
                  Fazer Upgrade
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
