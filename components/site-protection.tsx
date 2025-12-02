"use client"

import { useEffect } from "react"

export function SiteProtection() {
  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }

    // Disable keyboard shortcuts for dev tools
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault()
        return false
      }
      // Ctrl+Shift+I or Cmd+Shift+I (Dev Tools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "I") {
        e.preventDefault()
        return false
      }
      // Ctrl+Shift+J or Cmd+Shift+J (Console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "J") {
        e.preventDefault()
        return false
      }
      // Ctrl+Shift+C or Cmd+Shift+C (Element Inspector)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "C") {
        e.preventDefault()
        return false
      }
      // Ctrl+U or Cmd+U (View Source)
      if ((e.ctrlKey || e.metaKey) && e.key === "u") {
        e.preventDefault()
        return false
      }
    }

    // Detect if dev tools is open (basic detection)
    const detectDevTools = () => {
      const threshold = 160
      const widthThreshold = window.outerWidth - window.innerWidth > threshold
      const heightThreshold = window.outerHeight - window.innerHeight > threshold

      if (widthThreshold || heightThreshold) {
        // Dev tools might be open - you could redirect or show warning
        console.clear()
        console.log("%c⚠️ ATENÇÃO", "color: red; font-size: 40px; font-weight: bold;")
        console.log("%cEste é um recurso do navegador destinado a desenvolvedores.", "color: gray; font-size: 14px;")
        console.log(
          "%cSe alguém pediu para você colar algo aqui, é uma tentativa de golpe.",
          "color: red; font-size: 14px; font-weight: bold;",
        )
      }
    }

    // Add console warning
    console.clear()
    console.log("%c⚠️ PARE!", "color: red; font-size: 50px; font-weight: bold; text-shadow: 2px 2px black;")
    console.log(
      '%cEste é um recurso do navegador destinado a desenvolvedores. Se alguém pediu para você copiar e colar algo aqui para ativar um recurso do Connext ou "hackear" a conta de alguém, isso é uma fraude e dará acesso à sua conta.',
      "color: gray; font-size: 16px;",
    )

    document.addEventListener("contextmenu", handleContextMenu)
    document.addEventListener("keydown", handleKeyDown)

    // Check periodically
    const interval = setInterval(detectDevTools, 1000)

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("keydown", handleKeyDown)
      clearInterval(interval)
    }
  }, [])

  return null
}
