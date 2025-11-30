"use client"

import { useState, useEffect } from "react"
import { Bell, Check, Trash2, Heart, Video, Zap, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Notification {
  id: string
  type: "match" | "like" | "video_call" | "system"
  title: string
  message: string
  data: Record<string, unknown>
  read: boolean
  created_at: string
}

export function NotificationsDropdown() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const unreadCount = notifications.filter((n) => !n.read).length

  // Fetch notifications
  useEffect(() => {
    if (!user?.id) return

    const fetchNotifications = async () => {
      setLoading(true)
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)

      if (data) setNotifications(data)
      setLoading(false)
    }

    fetchNotifications()

    // Subscribe to realtime notifications
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev])
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, supabase])

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const markAllAsRead = async () => {
    if (!user?.id) return
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const clearAll = async () => {
    if (!user?.id) return
    await supabase.from("notifications").delete().eq("user_id", user.id)
    setNotifications([])
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "match":
        return <Heart className="w-4 h-4 text-pink-500" />
      case "like":
        return <Heart className="w-4 h-4 text-red-500" />
      case "video_call":
        return <Video className="w-4 h-4 text-green-500" />
      default:
        return <Zap className="w-4 h-4 text-primary" />
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-muted/50 rounded-full transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white gradient-bg rounded-full px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[70vh] bg-card border border-border/50 rounded-xl shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <h3 className="font-semibold">Notificações</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Marcar lidas
                  </Button>
                )}
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-muted rounded-md">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[50vh]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="w-12 h-12 mb-3 opacity-50" />
                  <p className="font-medium">Nenhuma notificação</p>
                  <p className="text-sm">Você está em dia!</p>
                </div>
              ) : (
                <ul>
                  {notifications.map((notification) => (
                    <li
                      key={notification.id}
                      className={`flex items-start gap-3 p-4 border-b border-border/30 hover:bg-muted/30 transition-colors ${
                        !notification.read ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{notification.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground"
                            title="Marcar como lida"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-1.5 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="w-full text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar todas
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
