"use client"

import { useEffect } from "react"

export function SiteProtection() {
  useEffect(() => {
    const isDevEnvironment =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname.includes("vercel.app") ||
        window.location.hostname.includes("v0.dev") ||
        window.location.hostname.includes("vusercontent.net") ||
        window.location.hostname.includes("lite.vusercontent.net"))

    if (isDevEnvironment) {
      return
    }

    const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

    // 1. Disable right-click context menu (only on desktop)
    const handleContextMenu = (e: MouseEvent) => {
      if (!isMobile) {
        e.preventDefault()
        return false
      }
    }

    // 2. Disable keyboard shortcuts for dev tools (desktop only)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isMobile) return

      // F12
      if (e.key === "F12") {
        e.preventDefault()
        return false
      }
      // Ctrl+Shift+I or Cmd+Shift+I (Dev Tools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i")) {
        e.preventDefault()
        return false
      }
      // Ctrl+Shift+J or Cmd+Shift+J (Console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "J" || e.key === "j")) {
        e.preventDefault()
        return false
      }
      // Ctrl+Shift+C or Cmd+Shift+C (Element Inspector)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "C" || e.key === "c")) {
        e.preventDefault()
        return false
      }
      // Ctrl+U or Cmd+U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === "u" || e.key === "U")) {
        e.preventDefault()
        return false
      }
    }

    // 3. Disable text selection on sensitive areas
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-protected="true"]')) {
        e.preventDefault()
        return false
      }
    }

    // 4. Console warnings (desktop only)
    const showConsoleWarnings = () => {
      if (isMobile) return

      console.clear()
      console.log("%c⛔ PARE!", "color: red; font-size: 60px; font-weight: bold; text-shadow: 2px 2px black;")
      console.log(
        "%cIsto é um recurso do navegador para desenvolvedores.",
        "color: #ffffff; font-size: 16px; background: #1a1a1a; padding: 10px;",
      )
      console.log(
        "%c⚠️ Se alguém pediu para você copiar e colar algo aqui, você está sendo vítima de um GOLPE!",
        "color: #ff6b6b; font-size: 18px; font-weight: bold; background: #1a1a1a; padding: 10px;",
      )
      console.log(
        "%cIsso pode dar acesso total à sua conta do Connext.",
        "color: #ffa94d; font-size: 14px; background: #1a1a1a; padding: 10px;",
      )
    }

    // Apply protections
    document.addEventListener("contextmenu", handleContextMenu)
    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("selectstart", handleSelectStart)

    // Initial warning (desktop only)
    if (!isMobile) {
      showConsoleWarnings()
    }

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("selectstart", handleSelectStart)
    }
  }, [])

  return null
}
