"use client"

import { cn } from "@/lib/utils"
import Image from "next/image"

interface ConnextLogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
  className?: string
}

export function ConnextLogo({ size = "md", showText = true, className }: ConnextLogoProps) {
  const sizes = {
    sm: { icon: 28, text: "text-lg", tagline: "text-[9px]" },
    md: { icon: 36, text: "text-xl", tagline: "text-[10px]" },
    lg: { icon: 48, text: "text-2xl", tagline: "text-xs" },
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* New 3D Crystal C Logo */}
      <div className={cn("relative flex-shrink-0")}>
        <Image
          src="/connext-logo-icon.png"
          alt="Connext Logo"
          width={sizes[size].icon}
          height={sizes[size].icon}
          className="object-contain"
          priority
        />
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={cn("font-semibold tracking-tight", sizes[size].text)}>
            <span className="text-foreground">Conn</span>
            <span className="gradient-text">ext</span>
          </span>
          {size === "lg" && (
            <span className={cn("text-muted-foreground tracking-widest uppercase mt-0.5", sizes[size].tagline)}>
              Professional Network
            </span>
          )}
        </div>
      )}
    </div>
  )
}
