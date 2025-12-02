"use client"

import { useEffect, useState } from "react"

export function SiteProtection() {
  const [devToolsOpen, setDevToolsOpen] = useState(false)

  useEffect(() => {
    const isDevEnvironment =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname.includes("vercel.app") ||
        window.location.hostname.includes("v0.dev") ||
        window.location.hostname.includes("vusercontent.net") ||
        window.location.hostname.includes("lite.vusercontent.net") ||
        process.env.NODE_ENV === "development")

    // Skip all protections in dev environment
    if (isDevEnvironment) {
      return
    }

    // 1. Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }

    // 2. Disable keyboard shortcuts for dev tools
    const handleKeyDown = (e: KeyboardEvent) => {
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
      // Ctrl+S (Save page)
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
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

    // 4. Disable drag
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault()
      return false
    }

    // 5. Detect dev tools with size difference
    const detectDevTools = () => {
      const threshold = 160
      const widthThreshold = window.outerWidth - window.innerWidth > threshold
      const heightThreshold = window.outerHeight - window.innerHeight > threshold

      if (widthThreshold || heightThreshold) {
        setDevToolsOpen(true)
        console.clear()
      } else {
        setDevToolsOpen(false)
      }
    }

    // 6. Console warnings
    const showConsoleWarnings = () => {
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
      console.log(
        "%cFeche esta janela imediatamente se você não sabe o que está fazendo.",
        "color: #ffffff; font-size: 14px; background: #e74c3c; padding: 10px;",
      )
    }

    // 7. Disable copy on sensitive elements
    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-protected="true"]')) {
        e.preventDefault()
        return false
      }
    }

    // Apply protections
    document.addEventListener("contextmenu", handleContextMenu)
    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("selectstart", handleSelectStart)
    document.addEventListener("dragstart", handleDragStart)
    document.addEventListener("copy", handleCopy)

    // Initial warning
    showConsoleWarnings()

    // Periodic checks
    const devToolsInterval = setInterval(detectDevTools, 500)
    const warningInterval = setInterval(showConsoleWarnings, 5000)

    // Disable certain window features
    const originalOpen = window.open
    window.open = (...args) => {
      const url = args[0]?.toString() || ""
      if (url.includes("wa.me") || url.includes("whatsapp") || url.includes("connext")) {
        return originalOpen.apply(window, args)
      }
      console.warn("[Connext] Popup bloqueado por segurança")
      return null
    }

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("selectstart", handleSelectStart)
      document.removeEventListener("dragstart", handleDragStart)
      document.removeEventListener("copy", handleCopy)
      clearInterval(devToolsInterval)
      clearInterval(warningInterval)
      window.open = originalOpen
    }
  }, [])

  if (typeof window !== "undefined") {
    const isDevEnvironment =
      window.location.hostname === "localhost" ||
      window.location.hostname.includes("vercel.app") ||
      window.location.hostname.includes("v0.dev") ||
      window.location.hostname.includes("vusercontent.net") ||
      window.location.hostname.includes("lite.vusercontent.net")

    if (isDevEnvironment) {
      return null
    }
  }

  // Show overlay when dev tools detected (only in production)
  if (devToolsOpen) {
    return (
      <div className="fixed inset-0 bg-black/95 z-[99999] flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Ferramentas de Desenvolvedor Detectadas</h2>
          <p className="text-gray-400 mb-6">
            Por motivos de segurança, o Connext não pode ser usado com as ferramentas de desenvolvedor abertas. Por
            favor, feche-as para continuar.
          </p>
          <p className="text-sm text-gray-500">
            Se você é um desenvolvedor e precisa acessar o código, entre em contato conosco.
          </p>
        </div>
      </div>
    )
  }

  return null
}
