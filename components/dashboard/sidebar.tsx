"use client"

import { useAuth } from "@/lib/auth-context"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { ConnextLogo } from "@/components/ui/connext-logo"
import { User, LogOut, Compass, Heart, Video, Menu, X, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { NotificationsDropdown } from "@/components/notifications-dropdown"

const navItems = [
  { href: "/dashboard", icon: Compass, label: "Descobrir" },
  { href: "/dashboard/matches", icon: Heart, label: "Matches" },
  { href: "/dashboard/video", icon: Video, label: "Videochamada" },
  { href: "/dashboard/referral", icon: Gift, label: "Indicar Amigos" },
  { href: "/dashboard/profile", icon: User, label: "Perfil" },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  const mobileNavItems = [
    { href: "/dashboard", icon: Compass, label: "Descobrir" },
    { href: "/dashboard/matches", icon: Heart, label: "Matches" },
    { href: "/dashboard/video", icon: Video, label: "Videochamada" },
    { href: "/dashboard/profile", icon: User, label: "Perfil" },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50 md:hidden safe-area-bottom">
      <ul className="flex justify-around items-center h-16 px-2">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                <span className="text-xs">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function MobileHeader() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const userMetadata = user?.user_metadata || {}
  const userName = userMetadata.full_name || user?.email?.split("@")[0] || "Usuário"

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border/50 md:hidden safe-area-top">
      <div className="flex items-center justify-between px-4 h-14">
        <Link href="/dashboard">
          <ConnextLogo size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          <NotificationsDropdown />
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-1">
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Dropdown menu */}
      {menuOpen && (
        <div className="absolute top-14 right-4 bg-card border border-border/50 rounded-xl shadow-lg p-4 min-w-[200px]">
          <div className="flex items-center gap-3 pb-3 border-b border-border/50 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-semibold">{userName.charAt(0).toUpperCase()}</span>
            </div>
            <span className="font-medium truncate">{userName}</span>
          </div>
          <Link
            href="/dashboard/referral"
            className="flex items-center gap-2 px-2 py-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors mb-2"
            onClick={() => setMenuOpen(false)}
          >
            <Gift className="w-4 h-4" />
            Indicar Amigos
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      )}
    </header>
  )
}

export function Sidebar() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const userMetadata = user?.user_metadata || {}
  const userName = userMetadata.full_name || user?.email?.split("@")[0] || "Usuário"
  const userPosition = userMetadata.position || "Empreendedor"
  const userAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${userName}`

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <aside className="hidden md:flex w-64 bg-card/50 backdrop-blur-xl border-r border-border/50 h-screen flex-col">
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
          <NotificationsDropdown />
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
                      ? "gradient-bg text-white shadow-lg"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
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
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sair
        </Button>
      </div>
    </aside>
  )
}
