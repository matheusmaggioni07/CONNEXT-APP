"use client"

import { useAuth } from "@/lib/auth-context"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { ConnextLogo } from "@/components/ui/connext-logo"
import { User, LogOut, Compass, Heart, Video, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/dashboard", icon: Compass, label: "Descobrir" },
  { href: "/dashboard/matches", icon: Heart, label: "Matches" },
  { href: "/dashboard/video", icon: Video, label: "Videochamada" },
  { href: "/dashboard/profile", icon: User, label: "Perfil" },
]

export function Sidebar() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  // Get user metadata from Supabase user object
  const userMetadata = user?.user_metadata || {}
  const userName = userMetadata.full_name || user?.email?.split("@")[0] || "Usuário"
  const userPosition = userMetadata.position || "Profissional"
  const userAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${userName}`

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <aside className="w-64 bg-card/50 backdrop-blur-xl border-r border-border/50 h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border/50">
        <Link href="/dashboard">
          <ConnextLogo size="md" />
        </Link>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted overflow-hidden ring-2 ring-primary/50">
            <img src={userAvatar || "/placeholder.svg"} alt={userName} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{userName}</p>
            <p className="text-sm text-muted-foreground truncate">{userPosition}</p>
          </div>
          <div className="relative">
            <Bell className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
            <span className="absolute -top-1 -right-1 w-2 h-2 gradient-bg rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? "gradient-bg text-primary-foreground glow-orange"
                      : "text-muted-foreground hover:bg-card hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-border/50">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-card"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sair
        </Button>
      </div>
    </aside>
  )
}
