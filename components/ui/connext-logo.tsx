"use client"

import { cn } from "@/lib/utils"

interface ConnextLogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
  className?: string
}

export function ConnextLogo({ size = "md", showText = true, className }: ConnextLogoProps) {
  const sizes = {
    sm: { icon: "w-7 h-7", text: "text-lg", tagline: "text-[9px]" },
    md: { icon: "w-9 h-9", text: "text-xl", tagline: "text-[10px]" },
    lg: { icon: "w-12 h-12", text: "text-2xl", tagline: "text-xs" },
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* Minimalist Logo Mark */}
      <div className={cn("relative", sizes[size].icon)}>
        <svg viewBox="0 0 40 40" className="w-full h-full" fill="none">
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>

          {/* Main C shape - clean and minimal */}
          <path
            d="M28 10C24.5 6.5 19.5 5 15 6C8 8 4 14 5 22C6 30 12 35 20 35C25 35 29 32 32 28"
            stroke="url(#logoGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />

          {/* Connection node - represents networking */}
          <circle cx="32" cy="10" r="4" fill="url(#logoGradient)" />
          <circle cx="32" cy="28" r="4" fill="url(#logoGradient)" />

          {/* Connection line */}
          <path
            d="M32 14L32 24"
            stroke="url(#logoGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="2 3"
          />
        </svg>
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
