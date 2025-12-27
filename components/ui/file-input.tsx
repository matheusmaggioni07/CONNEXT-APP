"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { uploadAvatar } from "@/app/actions/profile"
import { Upload } from "lucide-react"

interface FileInputProps {
  value: string
  onChange: (url: string) => void
  className?: string
}

export function FileInput({ value, onChange, className }: FileInputProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [preview, setPreview] = useState<string>(value)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setPreview(base64)
      }
      reader.readAsDataURL(file)

      // Upload to server
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = (event) => {
          resolve(event.target?.result as string)
        }
        reader.readAsDataURL(file)
      })

      const result = await uploadAvatar(base64, file.type)
      if (result.success && result.url) {
        onChange(result.url)
      }
    } catch (error) {
      console.error("Upload error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {preview && (
        <div className="relative w-full h-48 rounded-lg overflow-hidden bg-secondary">
          <img src={preview || "/placeholder.svg"} alt="Preview" className="w-full h-full object-cover" />
        </div>
      )}
      <label className="flex items-center justify-center w-full px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
        <div className="flex flex-col items-center gap-2">
          <Upload className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{isLoading ? "Enviando..." : "Clique para enviar foto"}</span>
        </div>
        <Input type="file" accept="image/*" onChange={handleFileChange} disabled={isLoading} className="hidden" />
      </label>
    </div>
  )
}
