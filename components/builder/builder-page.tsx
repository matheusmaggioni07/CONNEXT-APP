"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import type { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Send,
  Plus,
  FolderOpen,
  Settings,
  Zap,
  Code,
  Eye,
  Smartphone,
  Monitor,
  Tablet,
  Loader2,
  FileCode,
  Copy,
  Download,
  Sparkles,
  Brain,
  CheckCircle2,
  Trash2,
  Save,
  RefreshCw,
  X,
  Check,
  AlertCircle,
  ImageIcon,
  Camera,
  FileText,
  Globe,
  Crown,
  Share2,
  Upload,
  ExternalLink,
  MessageSquare,
  Maximize2,
  Minimize2,
  Play,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Profile {
  id: string
  full_name: string
  plan: string
  avatar_url?: string
}

interface BuilderPageProps {
  user: User
  profile: Profile | null
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  code?: string
}

interface ThoughtStep {
  id: string
  type: "thinking" | "scanning" | "reading" | "fixing" | "applying" | "completed"
  message: string
  duration?: number
  status: "pending" | "active" | "done"
}

interface ProjectFile {
  id?: string
  name: string
  path: string
  content: string
  language: string
  created_at?: string
  updated_at?: string
}

interface Project {
  id: string
  name: string
  description: string
  user_id: string
  created_at: string
  updated_at: string
  builder_files?: ProjectFile[]
}

export function BuilderPage({ user, profile }: BuilderPageProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [thoughts, setThoughts] = useState<ThoughtStep[]>([])
  const [activeTab, setActiveTab] = useState("chat")
  const [previewMode, setPreviewMode] = useState<"preview" | "code">("preview")
  const [deviceView, setDeviceView] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [generatedCode, setGeneratedCode] = useState("")
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingProjectName, setEditingProjectName] = useState("")
  const [copiedCode, setCopiedCode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [userCredits, setUserCredits] = useState(20)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  const [mobileView, setMobileView] = useState<"chat" | "preview">("chat")

  const loadProjects = useCallback(async () => {
    setIsLoadingProjects(true)
    try {
      const res = await fetch("/api/builder/projects")
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || [])
      }
    } catch (err) {
      console.error("Error loading projects:", err)
    } finally {
      setIsLoadingProjects(false)
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (profile?.plan === "pro") {
      setUserCredits(999999)
    } else {
      const savedCredits = localStorage.getItem(`builder_credits_${user.id}`)
      if (savedCredits) {
        setUserCredits(Number.parseInt(savedCredits))
      }
    }
  }, [profile, user.id])

  useEffect(() => {
    if (profile?.plan !== "pro") {
      localStorage.setItem(`builder_credits_${user.id}`, userCredits.toString())
    }
  }, [userCredits, user.id, profile])

  useEffect(() => {
    if (generatedCode && window.innerWidth < 1024) {
      setMobileView("preview")
    }
  }, [generatedCode])

  useEffect(() => {
    if (activeProject?.builder_files && activeProject.builder_files.length > 0) {
      const sortedFiles = [...activeProject.builder_files].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime(),
      )
      const latestFile = sortedFiles[0]
      if (latestFile?.content) {
        setGeneratedCode(latestFile.content)
      }
    }
  }, [activeProject])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange)
    document.addEventListener("msfullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
      document.removeEventListener("msfullscreenchange", handleFullscreenChange)
    }
  }, [])

  const addThought = (type: ThoughtStep["type"], message: string) => {
    const id = Math.random().toString(36).substring(7)
    setThoughts((prev) => [...prev, { id, type, message, status: "active" }])
    return id
  }

  const updateThought = (id: string, status: ThoughtStep["status"], duration?: number) => {
    setThoughts((prev) => prev.map((t) => (t.id === id ? { ...t, status, duration } : t)))
  }

  const generateFallbackCode = (prompt: string): string => {
    const lowerPrompt = prompt.toLowerCase()
    if (
      lowerPrompt.includes("landing") ||
      lowerPrompt.includes("página inicial") ||
      lowerPrompt.includes("home") ||
      lowerPrompt.includes("site") ||
      lowerPrompt.includes("startup")
    ) {
      return `export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030014] text-white overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-pulse"></div>
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse"></div>
      </div>
      <nav className="relative z-50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">SeuBrand</span>
          </div>
          <div className="hidden md:flex items-center gap-10">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Recursos</a>
            <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Preços</a>
          </div>
          <div className="flex items-center gap-4">
            <button className="hidden sm:block text-sm text-gray-400 hover:text-white transition-colors">Entrar</button>
            <button className="px-5 py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-gray-100 transition-all hover:scale-105 shadow-lg shadow-white/10">Começar Grátis</button>
          </div>
        </div>
      </nav>
      <section className="relative z-10 pt-20 lg:pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
              </span>
              <span className="text-sm text-purple-300">Disponível em todo Brasil</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.1] tracking-tight mb-8">
              Crie produtos<br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">incríveis</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
              A plataforma completa que ajuda você a criar, lançar e escalar seus produtos digitais.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <button className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full font-semibold text-lg overflow-hidden transition-all hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Começar Agora
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </button>
              <button className="px-8 py-4 border border-white/10 rounded-full font-semibold text-lg hover:bg-white/5 transition-all backdrop-blur-sm flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Ver Demo
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto pt-8 border-t border-white/5">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">10K+</div>
                <div className="text-sm text-gray-500 mt-1">Usuários Ativos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">99.9%</div>
                <div className="text-sm text-gray-500 mt-1">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">150+</div>
                <div className="text-sm text-gray-500 mt-1">Países</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">4.9</div>
                <div className="text-sm text-gray-500 mt-1">Avaliação</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="features" className="relative z-10 py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-purple-400 text-sm font-semibold tracking-wider uppercase mb-4 block">Recursos</span>
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">Tudo que você precisa</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">Ferramentas poderosas para construir, lançar e crescer seu negócio.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="group p-8 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-white/5 hover:border-purple-500/30 transition-all duration-500 hover:-translate-y-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Ultra Rápido</h3>
              <p className="text-gray-400 leading-relaxed">Otimizado para velocidade. Resultados instantâneos.</p>
            </div>
            <div className="group p-8 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-white/5 hover:border-purple-500/30 transition-all duration-500 hover:-translate-y-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Segurança Total</h3>
              <p className="text-gray-400 leading-relaxed">Criptografia de nível bancário mantém seus dados seguros.</p>
            </div>
            <div className="group p-8 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-white/5 hover:border-purple-500/30 transition-all duration-500 hover:-translate-y-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Analytics Avançado</h3>
              <p className="text-gray-400 leading-relaxed">Insights profundos e dados em tempo real.</p>
            </div>
          </div>
        </div>
      </section>
      <footer className="relative z-10 border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500"></div>
              <span className="font-bold">SeuBrand</span>
            </div>
            <p className="text-sm text-gray-500">© 2025 SeuBrand. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}`
    }
    return `export default function Component() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Componente Gerado</h1>
        <p className="text-gray-400">Descreva o que você quer criar com mais detalhes.</p>
      </div>
    </div>
  )
}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    if (profile?.plan !== "pro" && userCredits <= 0) {
      setShowUpgradeModal(true)
      return
    }

    setError(null)
    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setThoughts([])

    const thinkingId = addThought("thinking", "Analisando sua solicitação...")
    await new Promise((r) => setTimeout(r, 800))
    updateThought(thinkingId, "done", 800)

    const scanningId = addThought("scanning", "Processando requisitos...")
    await new Promise((r) => setTimeout(r, 600))
    updateThought(scanningId, "done", 600)

    const readingId = addThought("reading", "Gerando código com Claude Sonnet 4...")

    try {
      const response = await fetch("/api/builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: input.trim(),
          projectContext: activeProject?.builder_files || [],
          history: messages.slice(-6),
          userId: user.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setError("Limite atingido. Aguarde " + (data.remainingTime || 60) + " minutos.")
        }
        throw new Error(data.error || "API Error")
      }

      updateThought(readingId, "done", 1500)

      if (profile?.plan !== "pro") {
        setUserCredits((prev) => Math.max(0, prev - 1))
      }

      const applyingId = addThought("applying", "Aplicando mudanças...")
      await new Promise((r) => setTimeout(r, 400))
      updateThought(applyingId, "done", 400)

      const completedId = addThought("completed", "Código gerado com sucesso!")
      updateThought(completedId, "done")

      setGeneratedCode(data.code)

      if (activeProject) {
        autoSaveToProject(data.code)
      }

      const assistantMessage: Message = {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content: data.explanation || "Código gerado com sucesso! Veja o preview ao lado.",
        timestamp: new Date(),
        code: data.code,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error: unknown) {
      updateThought(readingId, "done", 1000)

      const fallbackId = addThought("fixing", "Usando geração local...")
      await new Promise((r) => setTimeout(r, 500))
      updateThought(fallbackId, "done", 500)

      const code = generateFallbackCode(userMessage.content)
      setGeneratedCode(code)

      if (profile?.plan !== "pro") {
        setUserCredits((prev) => Math.max(0, prev - 1))
      }

      if (activeProject) {
        autoSaveToProject(code)
      }

      const completedId = addThought("completed", "Código gerado com sucesso!")
      updateThought(completedId, "done")

      const assistantMessage: Message = {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content: "Código gerado! Veja o preview ao lado.",
        timestamp: new Date(),
        code: code,
      }

      setMessages((prev) => [...prev, assistantMessage])
    }

    setIsLoading(false)
  }

  const autoSaveToProject = async (code: string) => {
    if (!activeProject) return
    try {
      await fetch("/api/builder/projects/" + activeProject.id + "/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "component.tsx",
          path: "/component.tsx",
          content: code,
          language: "tsx",
        }),
      })
    } catch (err) {
      console.error("Auto-save error:", err)
    }
  }

  const createNewProject = async () => {
    try {
      const res = await fetch("/api/builder/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Projeto " + (projects.length + 1),
          description: "Novo projeto criado com Connext Builder",
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setProjects((prev) => [data.project, ...prev])
        setActiveProject(data.project)
        setGeneratedCode("")
        setMessages([])
      }
    } catch (err) {
      console.error("Error creating project:", err)
    }
  }

  const deleteProject = async (id: string) => {
    try {
      const res = await fetch("/api/builder/projects/" + id, { method: "DELETE" })
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id))
        if (activeProject?.id === id) {
          setActiveProject(null)
          setGeneratedCode("")
        }
      }
    } catch (err) {
      console.error("Error deleting project:", err)
    }
  }

  const saveCodeToProject = async () => {
    if (!activeProject || !generatedCode) return
    setIsSaving(true)
    try {
      await fetch("/api/builder/projects/" + activeProject.id + "/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "component.tsx",
          path: "/component.tsx",
          content: generatedCode,
          language: "tsx",
        }),
      })
      await loadProjects()
    } catch (err) {
      console.error("Error saving file:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const saveProjectName = async (id: string) => {
    if (!editingProjectName.trim()) {
      setEditingProjectId(null)
      return
    }
    try {
      const res = await fetch("/api/builder/projects/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingProjectName.trim() }),
      })
      if (res.ok) {
        setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name: editingProjectName.trim() } : p)))
      }
    } catch (err) {
      console.error("Error updating project name:", err)
    }
    setEditingProjectId(null)
    setEditingProjectName("")
  }

  const selectProject = async (project: Project) => {
    setActiveProject(project)
    if (!project.builder_files || project.builder_files.length === 0) {
      try {
        const res = await fetch("/api/builder/projects/" + project.id)
        if (res.ok) {
          const data = await res.json()
          setActiveProject(data.project)
        }
      } catch (err) {
        console.error("Error loading project:", err)
      }
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const downloadCode = () => {
    const blob = new Blob([generatedCode], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "component.tsx"
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearChat = () => {
    setMessages([])
    setThoughts([])
    setGeneratedCode("")
    setError(null)
  }

  const shareProject = () => {
    setShowShareModal(true)
  }

  const publishProject = () => {
    setShowPublishModal(true)
  }

  const copyShareLink = () => {
    const link = window.location.origin + "/share/" + (activeProject?.id || "preview")
    navigator.clipboard.writeText(link)
    setShareLinkCopied(true)
    setTimeout(() => setShareLinkCopied(false), 2000)
  }

  const toggleFullscreen = async () => {
    const container = previewContainerRef.current
    if (!container) return
    try {
      if (!document.fullscreenElement) {
        if (container.requestFullscreen) {
          await container.requestFullscreen()
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen()
        }
        setIsFullscreen(true)
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen()
        }
        setIsFullscreen(false)
      }
    } catch (err) {
      console.error("Fullscreen error:", err)
      setIsFullscreen(!isFullscreen)
    }
  }

  const getDeviceWidth = () => {
    switch (deviceView) {
      case "mobile":
        return "max-w-[375px]"
      case "tablet":
        return "max-w-[768px]"
      default:
        return "w-full"
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setUploadedFiles((prev) => [...prev, ...Array.from(files)])
    }
  }

  const removeFile = (idx: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const generatePreviewHtml = () => {
    if (!generatedCode) return ""

    let jsxContent = generatedCode

    const returnMatch = jsxContent.match(/return\s*$$\s*([\s\S]*)\s*$$\s*;?\s*\}[\s\S]*$/)
    if (returnMatch) {
      jsxContent = returnMatch[1]
    } else {
      jsxContent = jsxContent.replace(/^[\s\S]*?(?=<div|<section|<main|<nav|<header)/m, "")
    }

    let html = jsxContent
      .replace(/className=/g, "class=")
      .replace(/\{`([^`]*)`\}/g, "$1")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/onClick=\{[^}]*\}/g, "")
      .replace(/onChange=\{[^}]*\}/g, "")
      .replace(/onSubmit=\{[^}]*\}/g, "")
      .replace(/key=\{[^}]*\}/g, "")
      .replace(/style=\{\{([^}]*)\}\}/g, (match, styles) => {
        const cssStyles = styles.replace(/animationDelay:\s*'([^']+)'/g, "animation-delay: $1").replace(/,\s*/g, "; ")
        return 'style="' + cssStyles + '"'
      })
      .replace(/<>/g, "<div>")
      .replace(/<\/>/g, "</div>")

    html = html.replace(/\{[^}]*\}/g, "")

    return (
      '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><script src="https://cdn.tailwindcss.com"></script><script>tailwind.config = { theme: { extend: { fontFamily: { sans: ["Inter", "system-ui", "-apple-system", "sans-serif"] } } } }</script><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"><style>* { box-sizing: border-box; margin: 0; padding: 0; } html, body { font-family: "Inter", system-ui, -apple-system, sans-serif; min-height: 100%; background: #030014; color: white; } @keyframes pulse { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.3; } } .animate-pulse { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; } @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } } .animate-ping { animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; } img { max-width: 100%; height: auto; } a { color: inherit; text-decoration: none; } button { cursor: pointer; }</style></head><body class="bg-[#030014] text-white min-h-screen">' +
      html +
      "</body></html>"
    )
  }

  const startEditingProject = (id: string, name: string) => {
    setEditingProjectId(id)
    setEditingProjectName(name)
  }

  const getPlanDisplayName = () => {
    if (!profile?.plan) return "Gratuito"
    switch (profile.plan) {
      case "pro":
        return "PRO"
      case "premium":
        return "Premium"
      default:
        return "Gratuito"
    }
  }

  const getPlanDescription = () => {
    if (!profile?.plan) return "20 créditos/mês"
    switch (profile.plan) {
      case "pro":
        return "Créditos ilimitados"
      case "premium":
        return "Videochamadas, likes e Builder ilimitados"
      default:
        return userCredits + " créditos restantes"
    }
  }

  const renderChatContent = () => (
    <>
      <div className="p-4 border-b border-purple-500/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">Connext Builder</span>
          </div>
          <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded-full flex items-center gap-1">
            {profile?.plan === "pro" || profile?.plan === "premium" ? (
              <>
                <Crown className="w-3 h-3" />
                {getPlanDisplayName()}
              </>
            ) : (
              <>
                <Zap className="w-3 h-3" />
                {userCredits} créditos
              </>
            )}
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="break-words">{error}</span>
          </div>
        )}

        {profile?.plan !== "pro" && profile?.plan !== "premium" && userCredits <= 5 && userCredits > 0 && (
          <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <p className="text-xs text-orange-400 mb-2">Poucos créditos restantes!</p>
            <Button
              size="sm"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90"
              onClick={() => setShowUpgradeModal(true)}
            >
              <Crown className="w-3 h-3 mr-1" />
              Upgrade para PRO
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-[#1a1a2e] border border-purple-500/20">
            <TabsTrigger value="chat" className="flex-1 data-[state=active]:bg-purple-600">
              <Sparkles className="w-4 h-4 mr-1" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex-1 data-[state=active]:bg-purple-600">
              <FolderOpen className="w-4 h-4 mr-1" />
              Projetos
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 data-[state=active]:bg-purple-600">
              <Settings className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1 p-4">
        {activeTab === "chat" && (
          <div className="space-y-4">
            {activeProject && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-white font-medium truncate">{activeProject.name}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs text-gray-400 hover:text-white"
                    onClick={() => {
                      setActiveProject(null)
                      setGeneratedCode("")
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {activeProject.builder_files?.length || 0} arquivo(s) • Alterações salvas automaticamente
                </p>
              </div>
            )}

            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 font-medium">EXEMPLOS</p>
                {[
                  "Crie uma landing page moderna para minha startup de tecnologia",
                  "Crie um site completo com navbar, hero, features e footer",
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => setInput(example)}
                    className="w-full p-3 bg-[#1a1a2e] border border-purple-500/20 rounded-lg text-left hover:border-purple-500/50 transition-colors text-sm text-gray-400 hover:text-gray-300"
                  >
                    "{example}"
                  </button>
                ))}
              </div>
            )}

            {thoughts.length > 0 && (
              <div className="mb-4 p-3 bg-[#1a1a2e] rounded-lg border border-purple-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-white">Pensamentos</span>
                </div>
                <div className="space-y-2">
                  {thoughts.map((thought) => (
                    <div key={thought.id} className="flex items-center gap-2 text-sm">
                      {thought.status === "active" ? (
                        <Loader2 className="w-3 h-3 text-purple-400 animate-spin flex-shrink-0" />
                      ) : thought.status === "done" ? (
                        <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-gray-500 flex-shrink-0" />
                      )}
                      <span className={cn("break-words", thought.status === "done" ? "text-gray-400" : "text-white")}>
                        {thought.message}
                      </span>
                      {thought.duration && (
                        <span className="text-xs text-gray-500 flex-shrink-0">{thought.duration}ms</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "p-3 rounded-lg",
                  message.role === "user"
                    ? "bg-purple-600/20 border border-purple-500/30"
                    : "bg-[#1a1a2e] border border-purple-500/20",
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  {message.role === "user" ? (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
                      {profile?.full_name?.[0] || "U"}
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <span className="text-xs text-gray-400">{message.timestamp.toLocaleTimeString()}</span>
                </div>
                <p className="text-sm text-gray-200 break-words whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {activeTab === "projects" && (
          <div className="space-y-4">
            <Button onClick={createNewProject} className="w-full bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Projeto
            </Button>

            {isLoadingProjects ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Nenhum projeto ainda</p>
                <p className="text-gray-500 text-xs mt-1">Crie seu primeiro projeto para começar</p>
              </div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all",
                    activeProject?.id === project.id
                      ? "bg-purple-600/20 border-purple-500"
                      : "bg-[#1a1a2e] border-purple-500/20 hover:border-purple-500/50",
                  )}
                  onClick={() => selectProject(project)}
                >
                  <div className="flex items-center justify-between">
                    {editingProjectId === project.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingProjectName}
                          onChange={(e) => setEditingProjectName(e.target.value)}
                          className="h-7 text-sm bg-[#0d0d14] border-purple-500/30"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveProjectName(project.id)
                            if (e.key === "Escape") setEditingProjectId(null)
                          }}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            saveProjectName(project.id)
                          }}
                        >
                          <Check className="w-4 h-4 text-green-400" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div
                          className="flex items-center gap-2 flex-1 min-w-0"
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            startEditingProject(project.id, project.name)
                          }}
                        >
                          <FileCode className="w-4 h-4 text-purple-400 flex-shrink-0" />
                          <span className="text-sm text-white truncate">{project.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 hover:bg-purple-500/20 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              selectProject(project)
                              setActiveTab("chat")
                            }}
                            title="Continuar editando"
                          >
                            <Play className="w-4 h-4 text-green-400" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 hover:bg-red-500/20 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteProject(project.id)
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <span>{project.builder_files?.length || 0} arquivos</span>
                    <span>•</span>
                    <span>{new Date(project.updated_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-4">
            <div className="p-4 bg-[#1a1a2e] rounded-lg border border-purple-500/20">
              <h3 className="font-medium text-white mb-2">Modelo de IA</h3>
              <p className="text-sm text-gray-400">Claude Sonnet 4</p>
            </div>
            <div className="p-4 bg-[#1a1a2e] rounded-lg border border-purple-500/20">
              <h3 className="font-medium text-white mb-2">Plano</h3>
              <p className="text-sm text-white font-semibold">{getPlanDisplayName()}</p>
              <p className="text-sm text-gray-400 mb-3">{getPlanDescription()}</p>
              {profile?.plan !== "pro" && profile?.plan !== "premium" && (
                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90"
                  onClick={() => setShowUpgradeModal(true)}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade para PRO
                </Button>
              )}
            </div>
            <Button onClick={clearChat} variant="outline" className="w-full border-purple-500/30 bg-transparent">
              <RefreshCw className="w-4 h-4 mr-2" />
              Limpar Conversa
            </Button>
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t border-purple-500/20">
        {uploadedFiles.length > 0 && (
          <div className="mb-3 space-y-2">
            {uploadedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 bg-[#1a1a2e] border border-purple-500/20 rounded text-sm"
              >
                <FileText className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span className="flex-1 text-gray-300 truncate">{file.name}</span>
                <button onClick={() => removeFile(idx)} className="text-gray-500 hover:text-red-400 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.tsx,.ts,.jsx,.js"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Descreva o que deseja criar..."
              className="w-full min-h-[80px] max-h-[200px] px-4 py-3 pr-12 bg-[#1a1a2e] border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="icon"
              className="absolute right-2 bottom-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 h-8 w-8"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-white hover:bg-purple-500/20"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-[#1a1a2e] border-purple-500/30">
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Enviar Imagem
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                  <Camera className="w-4 h-4 mr-2" />
                  Clonar Screenshot
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar Projeto
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setInput("Crie uma landing page moderna com hero, features e pricing")}
                  className="cursor-pointer"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Landing Page
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1a1a2e]/50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M16.5 3L21 12L16.5 21H7.5L3 12L7.5 3H16.5Z" fill="#D97706" fillOpacity="0.9" />
              </svg>
              <span className="text-xs text-gray-400">Claude Sonnet 4</span>
            </div>
          </div>
        </form>
      </div>
    </>
  )

  const renderPreviewContent = () => (
    <>
      <div className="h-14 border-b border-purple-500/20 flex items-center justify-between px-4 gap-2 overflow-x-auto">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant={previewMode === "preview" ? "default" : "ghost"}
            size="sm"
            onClick={() => setPreviewMode("preview")}
            className={previewMode === "preview" ? "bg-purple-600" : ""}
          >
            <Eye className="w-4 h-4 mr-1" />
            Preview
          </Button>
          <Button
            variant={previewMode === "code" ? "default" : "ghost"}
            size="sm"
            onClick={() => setPreviewMode("code")}
            className={previewMode === "code" ? "bg-purple-600" : ""}
          >
            <Code className="w-4 h-4 mr-1" />
            Código
          </Button>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="hidden md:flex items-center gap-1 bg-[#0d0d14] rounded-lg p-1">
            <button
              onClick={() => setDeviceView("desktop")}
              className={cn(
                "p-1.5 rounded transition-colors",
                deviceView === "desktop" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white",
              )}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeviceView("tablet")}
              className={cn(
                "p-1.5 rounded transition-colors",
                deviceView === "tablet" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white",
              )}
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeviceView("mobile")}
              className={cn(
                "p-1.5 rounded transition-colors",
                deviceView === "mobile" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white",
              )}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          {generatedCode && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleFullscreen}
                className="text-gray-400 hover:text-white"
                title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={shareProject} className="text-gray-400 hover:text-white">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={publishProject}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90"
              >
                <ExternalLink className="w-4 h-4 md:mr-1" />
                <span className="hidden md:inline">Publicar</span>
              </Button>
              {activeProject && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={saveCodeToProject}
                  className="text-gray-400 hover:text-white"
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={copyCode} className="text-gray-400 hover:text-white">
                {copiedCode ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={downloadCode} className="text-gray-400 hover:text-white">
                <Download className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div
        ref={previewContainerRef}
        className={cn("flex-1 p-2 md:p-4 overflow-auto bg-[#1a1a2e]", isFullscreen && "fixed inset-0 z-50 p-0")}
      >
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="fixed top-4 right-4 z-50 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
          >
            <Minimize2 className="w-6 h-6" />
          </button>
        )}

        <div
          className={cn(
            "mx-auto h-full transition-all duration-300",
            isFullscreen ? "w-full max-w-none" : getDeviceWidth(),
          )}
        >
          {previewMode === "preview" ? (
            <div className="w-full h-full bg-white rounded-lg overflow-hidden shadow-2xl">
              {generatedCode ? (
                <iframe
                  srcDoc={generatePreviewHtml()}
                  className="w-full h-full border-0"
                  title="Preview"
                  sandbox="allow-scripts"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#030014] via-[#0d0d14] to-[#030014] p-4 md:p-8">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 flex items-center justify-center border border-purple-500/30">
                      <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-purple-400" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-3">Bem-vindo ao Connext Builder</h3>
                    <p className="text-gray-400 mb-6 text-sm md:text-base">Descreva o que você quer criar</p>
                    <div className="space-y-3">
                      {["Crie uma landing page...", "Crie um site completo..."].map((example) => (
                        <button
                          key={example}
                          onClick={() => {
                            setInput(example.replace("...", " moderno e profissional"))
                            setMobileView("chat")
                          }}
                          className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-left hover:border-purple-500/50 transition text-sm text-gray-400 hover:text-white"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full bg-[#0d0d14] rounded-lg overflow-auto p-4 font-mono text-sm">
              {generatedCode ? (
                <pre className="text-gray-300 whitespace-pre-wrap break-words">{generatedCode}</pre>
              ) : (
                <p className="text-gray-500">O código gerado aparecerá aqui...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )

  return (
    <div className="flex flex-col h-screen bg-[#0d0d14] overflow-hidden">
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0d0d14] rounded-2xl border border-purple-500/30 p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Créditos Esgotados</h3>
              <p className="text-gray-400 mb-6">
                Você usou todos os seus créditos gratuitos. Faça upgrade para o plano PRO!
              </p>
              <div className="space-y-3">
                <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-lg py-6">
                  <Crown className="w-5 h-5 mr-2" />
                  Upgrade para PRO - R$19/mês
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-gray-400 hover:text-white"
                  onClick={() => setShowUpgradeModal(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0d0d14] rounded-2xl border border-purple-500/30 p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Compartilhar Projeto</h3>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-400 mb-4 text-sm">Compartilhe seu projeto com outras pessoas</p>
            <div className="flex gap-2 mb-4">
              <Input
                value={
                  (typeof window !== "undefined" ? window.location.origin : "") +
                  "/share/" +
                  (activeProject?.id || "preview")
                }
                readOnly
                className="bg-[#0d0d14] border-purple-500/30"
              />
              <Button onClick={copyShareLink} className="bg-purple-600 hover:bg-purple-700">
                {shareLinkCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            {shareLinkCopied && (
              <p className="text-green-400 text-sm mb-4">Link copiado para a área de transferência!</p>
            )}
            <Button
              variant="outline"
              className="w-full border-purple-500/30 bg-transparent"
              onClick={() => setShowShareModal(false)}
            >
              Fechar
            </Button>
          </div>
        </div>
      )}

      {showPublishModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0d0d14] rounded-2xl border border-purple-500/30 p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Publicar Projeto</h3>
              <button onClick={() => setShowPublishModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {publishSuccess ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Publicado com Sucesso!</h4>
                <p className="text-gray-400 text-sm mb-4">Seu projeto está disponível em:</p>
                <div className="p-3 bg-[#0d0d14] rounded-lg border border-purple-500/20 mb-4">
                  <p className="text-purple-400 text-sm break-all">
                    {typeof window !== "undefined" ? window.location.origin : ""}/share/{activeProject?.id || "preview"}
                  </p>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                  onClick={() => {
                    setShowPublishModal(false)
                    setPublishSuccess(false)
                  }}
                >
                  Fechar
                </Button>
              </div>
            ) : (
              <>
                <p className="text-gray-400 mb-4 text-sm">Publique seu projeto para o mundo ver</p>
                <div className="p-4 bg-[#0d0d14] rounded-lg border border-purple-500/20 mb-4">
                  <p className="text-white font-medium mb-1">{activeProject?.name || "Meu Projeto"}</p>
                  <p className="text-gray-500 text-sm">
                    {typeof window !== "undefined" ? window.location.host : "connext.app"}/share/
                    {activeProject?.id || "preview"}
                  </p>
                </div>
                <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20 mb-4">
                  <p className="text-purple-300 font-medium mb-2 text-sm">Quer um domínio personalizado?</p>
                  <p className="text-gray-400 text-xs mb-3">
                    Compre seu domínio .com.br ou .com no Registro BR e conecte ao seu projeto.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-purple-500/30 bg-transparent text-purple-300 hover:bg-purple-500/20"
                    onClick={() => window.open("https://registro.br", "_blank")}
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Comprar Domínio no Registro BR
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-purple-500/30 bg-transparent"
                    onClick={() => setShowPublishModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90"
                    onClick={async () => {
                      if (activeProject && generatedCode) {
                        await saveCodeToProject()
                      }
                      setPublishSuccess(true)
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Publicar
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="hidden lg:flex flex-1 overflow-hidden">
        <div className="w-96 bg-[#0d0d14] border-r border-purple-500/20 flex flex-col">{renderChatContent()}</div>
        <div className="flex-1 flex flex-col bg-[#1a1a2e] overflow-hidden">{renderPreviewContent()}</div>
      </div>

      <div className="lg:hidden flex flex-col flex-1 overflow-hidden">
        <div className="flex border-b border-purple-500/20 bg-[#0d0d14]">
          <button
            onClick={() => setMobileView("chat")}
            className={cn(
              "flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors",
              mobileView === "chat" ? "text-white bg-purple-600/20 border-b-2 border-purple-500" : "text-gray-400",
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </button>
          <button
            onClick={() => setMobileView("preview")}
            className={cn(
              "flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors",
              mobileView === "preview" ? "text-white bg-purple-600/20 border-b-2 border-purple-500" : "text-gray-400",
            )}
          >
            <Eye className="w-4 h-4" />
            Preview
            {generatedCode && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {mobileView === "chat" ? (
            <div className="h-full flex flex-col bg-[#0d0d14]">{renderChatContent()}</div>
          ) : (
            <div className="h-full flex flex-col bg-[#1a1a2e]">{renderPreviewContent()}</div>
          )}
        </div>
      </div>
    </div>
  )
}
