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
  Zap,
  Code,
  Eye,
  Smartphone,
  Monitor,
  Tablet,
  Loader2,
  Copy,
  Download,
  Sparkles,
  CheckCircle2,
  Trash2,
  RefreshCw,
  X,
  Check,
  ImageIcon,
  Globe,
  Crown,
  Share2,
  ExternalLink,
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

  const [userCredits, setUserCredits] = useState(20)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
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
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
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

  function generateFallbackCode(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase()

    // Bijuterias / Joias
    if (
      lowerPrompt.includes("bijuteria") ||
      lowerPrompt.includes("joia") ||
      lowerPrompt.includes("acessório") ||
      lowerPrompt.includes("manuella") ||
      lowerPrompt.includes("semijoias")
    ) {
      const nomeMatch = prompt.match(/(?:da|de)\s+([A-Z][a-záàãéêíóôúç]+(?:\s+[A-Z][a-záàãéêíóôúç]+)*)/i)
      const nome = nomeMatch ? nomeMatch[1] : "Elegância"

      return `export default function ${nome.replace(/\s/g, "")}Joias() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <style>{\`
        @keyframes shimmer { to { background-position: 200% center; } }
        .shimmer { animation: shimmer 3s linear infinite; background-size: 200% auto; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .float { animation: float 4s ease-in-out infinite; }
      \`}</style>
      
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-2xl font-light tracking-[0.2em] bg-gradient-to-r from-rose-300 to-amber-300 bg-clip-text text-transparent">${nome.toUpperCase()}</span>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#colecoes" className="text-gray-300 hover:text-white transition">Coleções</a>
            <a href="#aneis" className="text-gray-300 hover:text-white transition">Anéis</a>
            <a href="#colares" className="text-gray-300 hover:text-white transition">Colares</a>
            <a href="#brincos" className="text-gray-300 hover:text-white transition">Brincos</a>
            <a href="#sobre" className="text-gray-300 hover:text-white transition">Sobre</a>
          </div>
          <a href="https://wa.me/5551999999999" className="px-5 py-2 bg-gradient-to-r from-rose-500 to-amber-500 rounded-full text-sm font-medium hover:opacity-90 transition">
            WhatsApp
          </a>
        </div>
      </nav>
      
      <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-20">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-[128px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[128px]"></div>
        </div>
        <div className="text-center z-10 px-6">
          <p className="text-rose-300 tracking-widest text-sm mb-6 uppercase">Joias & Bijuterias Exclusivas</p>
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-light mb-8 bg-gradient-to-r from-rose-200 via-amber-200 to-rose-200 bg-clip-text text-transparent shimmer">
            ${nome.toUpperCase()}
          </h1>
          <p className="text-xl text-gray-400 max-w-xl mx-auto mb-12 leading-relaxed">
            Peças únicas que contam histórias e realçam sua beleza natural. Feitas com amor e dedicação.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#colecoes" className="px-8 py-4 bg-gradient-to-r from-rose-500 to-amber-500 rounded-full font-medium hover:scale-105 transition-transform">
              Ver Coleções
            </a>
            <a href="https://instagram.com" target="_blank" className="px-8 py-4 border border-white/20 rounded-full font-medium hover:bg-white/10 transition flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              @${nome.toLowerCase().replace(/\s/g, "")}
            </a>
          </div>
        </div>
      </section>
      
      <section id="colecoes" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-rose-300 tracking-widest text-sm mb-4">NOSSOS DESTAQUES</p>
            <h2 className="text-4xl md:text-5xl font-light">Coleções Exclusivas</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Anel Aurora', price: 'R$ 89,90', emoji: '💍' },
              { name: 'Colar Estrela', price: 'R$ 129,90', emoji: '📿' },
              { name: 'Brinco Pérola', price: 'R$ 69,90', emoji: '✨' },
              { name: 'Pulseira Luxo', price: 'R$ 99,90', emoji: '💎' },
            ].map((item, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="aspect-square bg-gradient-to-br from-rose-900/30 via-black to-amber-900/30 rounded-2xl mb-4 flex items-center justify-center border border-white/10 group-hover:border-rose-500/50 transition-all duration-300 group-hover:scale-[1.02]">
                  <span className="text-7xl float" style={{ animationDelay: i * 0.2 + 's' }}>{item.emoji}</span>
                </div>
                <h3 className="text-lg font-medium mb-1 group-hover:text-rose-300 transition">{item.name}</h3>
                <p className="text-rose-300 font-medium">{item.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      <section id="sobre" className="py-24 px-6 bg-gradient-to-b from-transparent via-rose-950/10 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-rose-300 tracking-widest text-sm mb-4">NOSSA HISTÓRIA</p>
          <h2 className="text-4xl md:text-5xl font-light mb-8">Sobre ${nome}</h2>
          <p className="text-gray-400 text-lg leading-relaxed mb-8">
            Com mais de 5 anos de experiência criando peças exclusivas, ${nome} transforma sonhos em realidade.
            Cada bijuteria é cuidadosamente selecionada para realçar a beleza única de cada pessoa.
            Trabalhamos com materiais de alta qualidade para garantir durabilidade e brilho.
          </p>
          <div className="grid sm:grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <div className="text-4xl font-light text-rose-300 mb-2">500+</div>
              <p className="text-gray-500">Clientes Felizes</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-light text-rose-300 mb-2">1000+</div>
              <p className="text-gray-500">Peças Vendidas</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-light text-rose-300 mb-2">5⭐</div>
              <p className="text-gray-500">Avaliação</p>
            </div>
          </div>
        </div>
      </section>
      
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-rose-900/40 via-black to-amber-900/40 rounded-3xl p-8 sm:p-12 text-center border border-white/10">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </div>
            <h3 className="text-2xl sm:text-3xl font-light mb-4">Quer uma peça exclusiva?</h3>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Entre em contato pelo WhatsApp e receba atendimento personalizado. Enviamos para todo o Brasil!
            </p>
            <a href="https://wa.me/5551999999999" target="_blank" className="inline-flex items-center gap-3 px-8 py-4 bg-emerald-600 rounded-full font-medium hover:bg-emerald-500 transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>
      
      <footer className="py-12 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xl font-light tracking-widest bg-gradient-to-r from-rose-300 to-amber-300 bg-clip-text text-transparent">${nome.toUpperCase()}</span>
          <p className="text-gray-500 text-sm">© 2025 ${nome} - Todos os direitos reservados</p>
          <p className="text-gray-600 text-xs">Criado com Connext Builder</p>
        </div>
      </footer>
    </div>
  )
}
`
    }

    // Grenal
    if (lowerPrompt.includes("grenal") || (lowerPrompt.includes("gremio") && lowerPrompt.includes("inter"))) {
      return `export default function Grenal() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0047AB] via-black to-[#E31B23] text-white overflow-hidden">
      <style>{\`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .pulse { animation: pulse 2s infinite; }
      \`}</style>
      
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#0047AB] flex items-center justify-center border-2 border-white font-bold">G</div>
            <span className="font-bold">GRÊMIO</span>
          </div>
          <span className="text-2xl font-black text-yellow-400">VS</span>
          <div className="flex items-center gap-2">
            <span className="font-bold">INTER</span>
            <div className="w-10 h-10 rounded-full bg-[#E31B23] flex items-center justify-center border-2 border-white font-bold">I</div>
          </div>
        </div>
      </nav>
      
      <section className="min-h-screen flex items-center justify-center pt-20 px-6">
        <div className="text-center">
          <p className="text-yellow-400 tracking-widest mb-4 pulse">O MAIOR CLÁSSICO DO SUL</p>
          <h1 className="text-6xl sm:text-7xl md:text-9xl font-black mb-8">GRE-NAL</h1>
          <p className="text-2xl text-gray-300 mb-12">Rivalidade centenária que move o Rio Grande do Sul</p>
          
          <div className="grid grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="bg-[#0047AB]/50 backdrop-blur p-8 rounded-2xl border border-white/20">
              <div className="text-5xl font-black mb-2">441</div>
              <div className="text-sm text-gray-300">Vitórias do Grêmio</div>
            </div>
            <div className="bg-[#E31B23]/50 backdrop-blur p-8 rounded-2xl border border-white/20">
              <div className="text-5xl font-black mb-2">423</div>
              <div className="text-sm text-gray-300">Vitórias do Inter</div>
            </div>
          </div>
        </div>
      </section>
      
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8">Números do Clássico</h2>
          <div className="grid sm:grid-cols-4 gap-6">
            <div className="bg-white/5 p-6 rounded-2xl">
              <div className="text-3xl font-bold text-yellow-400">436</div>
              <div className="text-sm text-gray-400">Empates</div>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl">
              <div className="text-3xl font-bold text-yellow-400">1909</div>
              <div className="text-sm text-gray-400">Primeiro Jogo</div>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl">
              <div className="text-3xl font-bold text-yellow-400">1300+</div>
              <div className="text-sm text-gray-400">Jogos</div>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl">
              <div className="text-3xl font-bold text-yellow-400">2</div>
              <div className="text-sm text-gray-400">Maiores do Sul</div>
            </div>
          </div>
        </div>
      </section>
      
      <footer className="py-8 px-6 border-t border-white/10 text-center">
        <p className="text-gray-500">Criado com Connext Builder</p>
      </footer>
    </div>
  )
}`
    }

    // Grêmio
    if (lowerPrompt.includes("grêmio") || lowerPrompt.includes("gremio") || lowerPrompt.includes("tricolor")) {
      return `export default function GremioFBPA() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0047AB] via-[#001a3a] to-black text-white">
      <style>{\`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .float { animation: float 3s ease-in-out infinite; }
      \`}</style>
      
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#0047AB]/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
              <span className="text-[#0047AB] font-black text-xl">G</span>
            </div>
            <span className="text-xl font-bold tracking-wide">GRÊMIO FBPA</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm">
            <a href="#" className="hover:text-sky-300 transition">Títulos</a>
            <a href="#" className="hover:text-sky-300 transition">Elenco</a>
            <a href="#" className="hover:text-sky-300 transition">Arena</a>
            <a href="#" className="hover:text-sky-300 transition">Loja</a>
          </div>
          <button className="px-5 py-2 bg-white text-[#0047AB] rounded-full font-bold text-sm hover:bg-sky-100 transition">
            Sócio Torcedor
          </button>
        </div>
      </nav>
      
      <section className="min-h-screen flex items-center justify-center pt-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-400 rounded-full blur-[128px]"></div>
        </div>
        <div className="text-center z-10">
          <p className="text-sky-300 tracking-[0.3em] text-sm mb-6 uppercase">Imortal Tricolor</p>
          <h1 className="text-6xl sm:text-7xl md:text-9xl font-black mb-8 float">GRÊMIO</h1>
          <p className="text-2xl text-sky-200 mb-12">Desde 1903 fazendo história</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
            <div className="bg-white/10 backdrop-blur p-6 rounded-2xl border border-white/20">
              <div className="text-4xl font-black text-yellow-400">3</div>
              <div className="text-sm text-sky-200">Libertadores</div>
            </div>
            <div className="bg-white/10 backdrop-blur p-6 rounded-2xl border border-white/20">
              <div className="text-4xl font-black text-yellow-400">2</div>
              <div className="text-sm text-sky-200">Mundiais</div>
            </div>
            <div className="bg-white/10 backdrop-blur p-6 rounded-2xl border border-white/20">
              <div className="text-4xl font-black text-yellow-400">5</div>
              <div className="text-sm text-sky-200">Copa do Brasil</div>
            </div>
            <div className="bg-white/10 backdrop-blur p-6 rounded-2xl border border-white/20">
              <div className="text-4xl font-black text-yellow-400">42+</div>
              <div className="text-sm text-sky-200">Gauchões</div>
            </div>
          </div>
        </div>
      </section>
      
      <section className="py-24 px-6 bg-black/50">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-12">Arena do Grêmio</h2>
          <div className="aspect-video bg-gradient-to-br from-[#0047AB]/50 to-black rounded-3xl flex items-center justify-center border border-white/10">
            <span className="text-8xl">🏟️</span>
          </div>
          <p className="text-gray-400 mt-6">Capacidade: 55.662 torcedores</p>
        </div>
      </section>
      
      <footer className="py-8 px-6 border-t border-white/10 text-center">
        <p className="text-gray-500">© 2025 Grêmio FBPA - Criado com Connext Builder</p>
      </footer>
    </div>
  )
}`
    }

    // Internacional
    if (lowerPrompt.includes("internacional") || lowerPrompt.includes("inter") || lowerPrompt.includes("colorado")) {
      return `export default function Internacional() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E31B23] via-[#8B0000] to-black text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#E31B23]/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
              <span className="text-[#E31B23] font-black text-xl">I</span>
            </div>
            <span className="text-xl font-bold tracking-wide">INTERNACIONAL</span>
          </div>
          <button className="px-5 py-2 bg-white text-[#E31B23] rounded-full font-bold text-sm">
            Sócio Colorado
          </button>
        </div>
      </nav>
      
      <section className="min-h-screen flex items-center justify-center pt-20 px-6">
        <div className="text-center">
          <p className="text-red-200 tracking-[0.3em] text-sm mb-6 uppercase">Clube do Povo</p>
          <h1 className="text-6xl sm:text-7xl md:text-9xl font-black mb-8">INTER</h1>
          <p className="text-2xl text-red-200 mb-12">Desde 1909 fazendo história</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
            <div className="bg-white/10 backdrop-blur p-6 rounded-2xl border border-white/20">
              <div className="text-4xl font-black text-yellow-400">3</div>
              <div className="text-sm text-red-200">Libertadores</div>
            </div>
            <div className="bg-white/10 backdrop-blur p-6 rounded-2xl border border-white/20">
              <div className="text-4xl font-black text-yellow-400">1</div>
              <div className="text-sm text-red-200">Mundial</div>
            </div>
            <div className="bg-white/10 backdrop-blur p-6 rounded-2xl border border-white/20">
              <div className="text-4xl font-black text-yellow-400">3</div>
              <div className="text-sm text-red-200">Copa do Brasil</div>
            </div>
            <div className="bg-white/10 backdrop-blur p-6 rounded-2xl border border-white/20">
              <div className="text-4xl font-black text-yellow-400">45+</div>
              <div className="text-sm text-red-200">Gauchões</div>
            </div>
          </div>
        </div>
      </section>
      
      <footer className="py-8 px-6 border-t border-white/10 text-center">
        <p className="text-gray-500">© 2025 Internacional - Criado com Connext Builder</p>
      </footer>
    </div>
  )
}`
    }

    // Landing page / startup / SaaS
    if (
      lowerPrompt.includes("landing") ||
      lowerPrompt.includes("startup") ||
      lowerPrompt.includes("saas") ||
      lowerPrompt.includes("empresa") ||
      lowerPrompt.includes("negócio") ||
      lowerPrompt.includes("produto")
    ) {
      return `export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030014] text-white overflow-x-hidden">
      <style>{\`
        @keyframes gradient { to { background-position: 200% center; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        .animate-gradient { animation: gradient 8s linear infinite; background-size: 200% auto; }
        .animate-float { animation: float 6s ease-in-out infinite; }
      \`}</style>
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-[128px]"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-[128px]"></div>
      </div>
      
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-6xl">
        <div className="backdrop-blur-2xl bg-white/[0.02] border border-white/[0.08] rounded-2xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-semibold">SuaMarca</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition">Features</a>
            <a href="#" className="hover:text-white transition">Pricing</a>
            <a href="#" className="hover:text-white transition">About</a>
          </div>
          <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-medium hover:opacity-90 transition">
            Começar Grátis
          </button>
        </div>
      </nav>

      <section className="min-h-screen flex items-center justify-center pt-20 px-6">
        <div className="text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span className="text-sm text-violet-300">Disponível em todo Brasil</span>
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-8 leading-tight">
            <span className="bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">Crie produtos</span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent animate-gradient">incríveis</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            A plataforma completa que ajuda você a criar, lançar e escalar seus produtos digitais com facilidade.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-semibold hover:scale-105 transition-transform">
              Começar Agora
            </button>
            <button className="px-8 py-4 rounded-xl border border-white/10 font-semibold hover:bg-white/5 transition flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              Ver Demo
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mt-20 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">99.9%</div>
              <div className="text-sm text-gray-500">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">10M+</div>
              <div className="text-sm text-gray-500">Usuários</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">150+</div>
              <div className="text-sm text-gray-500">Países</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">24/7</div>
              <div className="text-sm text-gray-500">Suporte</div>
            </div>
          </div>
        </div>
      </section>
      
      <footer className="py-12 px-6 border-t border-white/5 text-center">
        <p className="text-gray-600">© 2025 SuaMarca - Criado com Connext Builder</p>
      </footer>
    </div>
  )
}`
    }

    // Portfolio
    if (
      lowerPrompt.includes("portfolio") ||
      lowerPrompt.includes("portfólio") ||
      lowerPrompt.includes("designer") ||
      lowerPrompt.includes("desenvolvedor")
    ) {
      const nomeMatch = prompt.match(/(?:de|do|da)\s+([A-Z][a-záàãéêíóôúç]+(?:\s+[A-Z][a-záàãéêíóôúç]+)*)/i)
      const nome = nomeMatch ? nomeMatch[1] : "João Silva"

      return `export default function Portfolio() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold">${nome.split(" ")[0]}.</span>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition">Projetos</a>
            <a href="#" className="hover:text-white transition">Sobre</a>
            <a href="#" className="hover:text-white transition">Contato</a>
          </div>
          <a href="#contato" className="px-5 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-gray-200 transition">
            Contratar
          </a>
        </div>
      </nav>
      
      <section className="min-h-screen flex items-center justify-center pt-20 px-6">
        <div className="text-center max-w-3xl">
          <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-5xl">
            👨‍💻
          </div>
          <p className="text-violet-400 text-sm tracking-widest mb-4 uppercase">Designer & Developer</p>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6">${nome}</h1>
          <p className="text-xl text-gray-400 mb-10 leading-relaxed">
            Criando experiências digitais únicas e memoráveis. Especializado em design de interfaces e desenvolvimento web.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {['React', 'Next.js', 'Figma', 'Tailwind', 'TypeScript'].map((skill) => (
              <span key={skill} className="px-4 py-2 bg-white/5 rounded-full text-sm border border-white/10">{skill}</span>
            ))}
          </div>
        </div>
      </section>
      
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Projetos Recentes</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {['App Fintech', 'E-commerce', 'Dashboard SaaS', 'Landing Page'].map((project, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="aspect-video bg-gradient-to-br from-violet-900/30 to-fuchsia-900/30 rounded-2xl mb-4 flex items-center justify-center border border-white/10 group-hover:border-violet-500/50 transition">
                  <span className="text-4xl">🎨</span>
                </div>
                <h3 className="text-lg font-medium group-hover:text-violet-400 transition">{project}</h3>
                <p className="text-sm text-gray-500">UI/UX Design & Development</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      <footer className="py-12 px-6 border-t border-white/5 text-center">
        <p className="text-gray-600">© 2025 ${nome} - Criado com Connext Builder</p>
      </footer>
    </div>
  )
}`
    }

    // Default fallback
    return `export default function Site() {
  return (
    <div className="min-h-screen bg-[#030014] text-white flex items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Descreva seu site
        </h1>
        <p className="text-xl text-gray-400 mb-8">
          Seja específico! Por exemplo: "Crie um site de bijuterias da Maria" ou "Landing page para minha startup de IA"
        </p>
      </div>
    </div>
  )
}`
  }

  const generatePreviewHtml = (code: string): string => {
    console.log("[v0] generatePreviewHtml received code length:", code?.length)

    if (!code || code.trim().length < 50) {
      console.log("[v0] Code is empty or too short, using fallback")
      return `<!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex items-center justify-center">
          <div class="text-center text-white">
            <h1 class="text-4xl font-bold mb-4">Erro na Geração</h1>
            <p class="text-gray-300">O código não foi gerado corretamente. Tente novamente.</p>
          </div>
        </body>
        </html>`
    }

    // Convert JSX to plain HTML by extracting the content inside return()
    let htmlContent = ""

    try {
      // Find the return statement and extract JSX
      const returnMatch = code.match(/return\s*$$\s*([\s\S]*?)\s*$$\s*;?\s*\}?\s*$/)

      if (returnMatch && returnMatch[1]) {
        htmlContent = returnMatch[1]
          // Convert className to class
          .replace(/className=/g, "class=")
          // Convert self-closing tags
          .replace(/<(\w+)([^>]*?)\/>/g, "<$1$2></$1>")
          // Remove JSX expressions {something} - replace with empty or handle common patterns
          .replace(/\{\/\*[\s\S]*?\*\/\}/g, "") // Remove JSX comments
          .replace(/\{`([^`]*)`\}/g, "$1") // Template literals
          .replace(/\{"([^"]*)"\}/g, "$1") // String literals
          .replace(/\{'([^']*)'\}/g, "$1") // Single quote strings
          .replace(/\{(\d+)\}/g, "$1") // Numbers
          .replace(/\{[^}]*\}/g, "") // Remove remaining JSX expressions
          // Fix common React patterns
          .replace(/onClick=\{[^}]*\}/g, "")
          .replace(/onChange=\{[^}]*\}/g, "")
          .replace(/onSubmit=\{[^}]*\}/g, "")
          .replace(/href=\{[^}]*\}/g, 'href="#"')
          .replace(/src=\{[^}]*\}/g, 'src="/placeholder.svg?height=400&width=600"')
          // Remove Fragment syntax
          .replace(/<>/g, "")
          .replace(/<\/>/g, "")
          .replace(/<React\.Fragment>/g, "")
          .replace(/<\/React\.Fragment>/g, "")

        console.log("[v0] Converted HTML length:", htmlContent.length)
      } else {
        console.log("[v0] Could not find return statement in code")
        // Try alternative: find JSX directly
        const jsxMatch = code.match(/<([a-zA-Z][a-zA-Z0-9]*)[\s\S]*<\/\1>/)
        if (jsxMatch) {
          htmlContent = jsxMatch[0].replace(/className=/g, "class=").replace(/\{[^}]*\}/g, "")
        }
      }
    } catch (e) {
      console.error("[v0] Error converting JSX to HTML:", e)
    }

    // If we couldn't extract content, try to render the whole thing as JSX
    if (!htmlContent || htmlContent.trim().length < 20) {
      console.log("[v0] Falling back to Babel approach")
      return generatePreviewWithBabel(code)
    }

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
          animation: {
            "gradient": "gradient 8s linear infinite",
            "float": "float 6s ease-in-out infinite",
            "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite"
          }
        }
      }
    }
  </script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @keyframes gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
    .animate-gradient { animation: gradient 8s ease infinite; background-size: 200% 200%; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { font-family: "Inter", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
    img { max-width: 100%; height: auto; }
    a { color: inherit; text-decoration: none; }
    button { cursor: pointer; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`
  }

  const generatePreviewWithBabel = (code: string): string => {
    // Encode to base64 safely
    let base64Code = ""
    try {
      // Use TextEncoder for better unicode support
      const encoder = new TextEncoder()
      const data = encoder.encode(code)
      base64Code = btoa(String.fromCharCode(...data))
    } catch (e) {
      console.error("[v0] Base64 encoding failed:", e)
      // Fallback: escape special chars
      try {
        base64Code = btoa(unescape(encodeURIComponent(code)))
      } catch (e2) {
        console.error("[v0] Fallback encoding also failed")
        base64Code = btoa(code.replace(/[^\x00-\x7F]/g, ""))
      }
    }

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Inter", system-ui, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script type="text/babel" data-presets="react">
    const { useState, useEffect, useRef } = React;
    
    window.onerror = function(msg) {
      document.getElementById("root").innerHTML = 
        '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1a1a2e;color:white;text-align:center;padding:2rem;">' +
        '<div><h1 style="font-size:1.5rem;margin-bottom:1rem;">Erro no Preview</h1><p style="color:#888;">' + msg + '</p></div></div>';
      return true;
    };
    
    try {
      const encodedCode = "${base64Code}";
      const decodedBytes = atob(encodedCode);
      const bytes = new Uint8Array(decodedBytes.length);
      for (let i = 0; i < decodedBytes.length; i++) {
        bytes[i] = decodedBytes.charCodeAt(i);
      }
      const decodedCode = new TextDecoder().decode(bytes);
      
      const wrappedCode = "(function() { " + decodedCode.replace("export default function", "return function") + " })()";
      const ComponentFunction = eval(Babel.transform(wrappedCode, { presets: ["react"] }).code);
      
      if (ComponentFunction) {
        ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(ComponentFunction));
      }
    } catch (err) {
      console.error("Render error:", err);
      document.getElementById("root").innerHTML = 
        '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1a1a2e;color:white;text-align:center;padding:2rem;">' +
        '<div><h1 style="font-size:1.5rem;margin-bottom:1rem;">Erro no Preview</h1><p style="color:#888;">' + err.message + '</p></div></div>';
    }
  </script>
</body>
</html>`
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

      console.log("[v0] API response status:", response.status)
      console.log("[v0] API response data:", JSON.stringify(data).substring(0, 500))
      console.log("[v0] Code received length:", data.code?.length)

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

      if (data.code && data.code.includes("export default function")) {
        console.log("[v0] Setting generated code - valid component found")
        setGeneratedCode(data.code)
      } else {
        console.log("[v0] Invalid code received, using fallback")
        const fallbackCode = generateFallbackCode(input.trim())
        setGeneratedCode(fallbackCode)
      }

      if (activeProject) {
        autoSaveToProject(data.code)
      }

      const assistantMessage: Message = {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content: data.explanation || "Site profissional gerado com sucesso! Veja o preview ao lado.",
        timestamp: new Date(),
        code: data.code,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
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
        content: "Site profissional gerado! Veja o preview ao lado.",
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

  const toggleFullscreen = async () => {
    if (!previewContainerRef.current) return
    try {
      if (!document.fullscreenElement) {
        await previewContainerRef.current.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      setIsFullscreen(!isFullscreen)
    }
  }

  const handleShare = () => {
    if (activeProject) {
      const shareUrl = window.location.origin + "/share/" + activeProject.id
      navigator.clipboard.writeText(shareUrl)
      setShareLinkCopied(true)
      setTimeout(() => setShareLinkCopied(false), 2000)
    }
    setShowShareModal(false)
  }

  const handlePublish = () => {
    setPublishSuccess(true)
    setTimeout(() => {
      setPublishSuccess(false)
      setShowPublishModal(false)
    }, 2000)
  }

  const isPro = profile?.plan === "pro"

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] bg-[#0a0a0f]">
      {/* Mobile Toggle */}
      <div className="lg:hidden flex border-b border-white/10">
        <button
          onClick={() => setMobileView("chat")}
          className={cn(
            "flex-1 py-3 text-sm font-medium transition-colors",
            mobileView === "chat" ? "bg-purple-600 text-white" : "text-gray-400",
          )}
        >
          Chat
        </button>
        <button
          onClick={() => setMobileView("preview")}
          className={cn(
            "flex-1 py-3 text-sm font-medium transition-colors",
            mobileView === "preview" ? "bg-purple-600 text-white" : "text-gray-400",
          )}
        >
          Preview
        </button>
      </div>

      {/* Left Panel - Chat */}
      <div
        className={cn(
          "w-full lg:w-[400px] xl:w-[450px] flex flex-col border-r border-white/10 bg-[#0a0a0f]",
          mobileView !== "chat" && "hidden lg:flex",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white">Connext Builder</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {isPro ? "Ilimitado" : userCredits + " créditos"}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="p-2 border-b border-white/10">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full bg-white/5">
              <TabsTrigger value="chat" className="flex-1 data-[state=active]:bg-purple-600">
                <Sparkles className="w-4 h-4 mr-2" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="projects" className="flex-1 data-[state=active]:bg-purple-600">
                <FolderOpen className="w-4 h-4 mr-2" />
                Projetos
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "chat" ? (
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* Thoughts */}
                {thoughts.length > 0 && (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-purple-400 text-sm font-medium">
                      <Sparkles className="w-4 h-4" />
                      Pensamentos
                    </div>
                    {thoughts.map((thought) => (
                      <div key={thought.id} className="flex items-center gap-2 text-sm">
                        {thought.status === "active" ? (
                          <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                        )}
                        <span className="text-gray-400">{thought.message}</span>
                        {thought.duration && <span className="text-gray-600 text-xs">{thought.duration}ms</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Messages */}
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Bem-vindo ao Connext Builder</h3>
                    <p className="text-gray-400 text-sm mb-6">Descreva o que você quer criar</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => setInput("Crie uma landing page para uma startup de tecnologia")}
                        className="w-full p-3 text-left rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 transition-colors"
                      >
                        Crie uma landing page...
                      </button>
                      <button
                        onClick={() => setInput("Crie um site completo com navbar, hero, features e footer")}
                        className="w-full p-3 text-left rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 transition-colors"
                      >
                        Crie um site completo...
                      </button>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] p-4 rounded-2xl",
                          msg.role === "user" ? "bg-purple-600 text-white" : "bg-white/10 text-gray-200",
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <span className="text-xs opacity-60 mt-2 block">
                          {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                {error && (
                  <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                <Button onClick={createNewProject} className="w-full bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Projeto
                </Button>
                {isLoadingProjects ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">Nenhum projeto ainda</div>
                ) : (
                  projects.map((project) => (
                    <div
                      key={project.id}
                      className={cn(
                        "p-4 rounded-xl border transition-all cursor-pointer",
                        activeProject?.id === project.id
                          ? "bg-purple-600/20 border-purple-500"
                          : "bg-white/5 border-white/10 hover:bg-white/10",
                      )}
                      onClick={() => selectProject(project)}
                    >
                      <div className="flex items-center justify-between">
                        {editingProjectId === project.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editingProjectName}
                              onChange={(e) => setEditingProjectName(e.target.value)}
                              className="h-8 text-sm bg-white/10 border-white/20"
                              autoFocus
                              onKeyDown={(e) => e.key === "Enter" && saveProjectName(project.id)}
                            />
                            <Button size="sm" variant="ghost" onClick={() => saveProjectName(project.id)}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingProjectId(null)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <FolderOpen className="w-5 h-5 text-purple-400" />
                              <span className="font-medium text-white">{project.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  selectProject(project)
                                }}
                              >
                                <Play className="w-4 h-4 text-green-400" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingProjectId(project.id)
                                  setEditingProjectName(project.name)
                                }}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
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
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/10">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Descreva o que deseja criar..."
              className="w-full min-h-[80px] max-h-[200px] p-4 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !input.trim()}
              className="absolute right-3 bottom-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
          <div className="flex items-center justify-between mt-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <Plus className="w-4 h-4 mr-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#1a1a2e] border-white/10">
                <DropdownMenuItem className="text-gray-300 hover:bg-white/10">
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Enviar Imagem
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:bg-white/10">
                  <Globe className="w-4 h-4 mr-2" />
                  Landing Page
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500" />
              Claude Sonnet 4
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div
        ref={previewContainerRef}
        className={cn(
          "flex-1 flex flex-col bg-[#0f0f1a]",
          mobileView !== "preview" && "hidden lg:flex",
          isFullscreen && "fixed inset-0 z-50",
        )}
      >
        {/* Preview Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/10 bg-[#0a0a0f]">
          <div className="flex items-center gap-2">
            <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as "preview" | "code")}>
              <TabsList className="bg-white/5">
                <TabsTrigger value="preview" className="data-[state=active]:bg-purple-600">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="code" className="data-[state=active]:bg-purple-600">
                  <Code className="w-4 h-4 mr-2" />
                  Código
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5">
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", deviceView === "desktop" && "bg-white/10")}
                onClick={() => setDeviceView("desktop")}
              >
                <Monitor className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", deviceView === "tablet" && "bg-white/10")}
                onClick={() => setDeviceView("tablet")}
              >
                <Tablet className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", deviceView === "mobile" && "bg-white/10")}
                onClick={() => setDeviceView("mobile")}
              >
                <Smartphone className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowShareModal(true)}>
              <Share2 className="w-4 h-4" />
            </Button>
            <Button onClick={() => setShowPublishModal(true)} className="bg-purple-600 hover:bg-purple-700">
              <ExternalLink className="w-4 h-4 mr-2" />
              Publicar
            </Button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden p-4 bg-[#0f0f1a]">
          <div
            className={cn(
              "h-full mx-auto transition-all duration-300 rounded-xl overflow-hidden border border-white/10 bg-white",
              deviceView === "desktop" && "w-full",
              deviceView === "tablet" && "max-w-[768px]",
              deviceView === "mobile" && "max-w-[375px]",
            )}
          >
            {previewMode === "preview" ? (
              generatedCode ? (
                <iframe
                  srcDoc={generatePreviewHtml(generatedCode)}
                  className="w-full h-full border-0"
                  title="Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#030014]">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Bem-vindo ao Connext Builder</h3>
                    <p className="text-gray-400 text-sm">Descreva o que você quer criar</p>
                  </div>
                </div>
              )
            ) : (
              <div className="h-full bg-[#0d0d12] p-4 overflow-auto">
                <div className="flex items-center justify-end gap-2 mb-4">
                  <Button variant="ghost" size="sm" onClick={copyCode} className="text-gray-400 hover:text-white">
                    {copiedCode ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                    {copiedCode ? "Copiado!" : "Copiar"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={downloadCode} className="text-gray-400 hover:text-white">
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
                <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                  {generatedCode || "// Código será exibido aqui..."}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-[#1a1a2e] rounded-2xl p-6 max-w-md w-full mx-4 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-4">Compartilhar Projeto</h3>
            <p className="text-gray-400 text-sm mb-6">
              {activeProject
                ? "Copie o link para compartilhar seu projeto."
                : "Salve um projeto primeiro para compartilhar."}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowShareModal(false)} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={handleShare}
                disabled={!activeProject}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {shareLinkCopied ? "Link Copiado!" : "Copiar Link"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-[#1a1a2e] rounded-2xl p-6 max-w-md w-full mx-4 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-4">Publicar Site</h3>
            <p className="text-gray-400 text-sm mb-4">Seu site será publicado e ficará disponível online.</p>
            <a
              href="https://registro.br"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-xl bg-white/5 border border-white/10 text-purple-400 text-sm mb-6 hover:bg-white/10 transition-colors"
            >
              Compre seu domínio em Registro.BR
            </a>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowPublishModal(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handlePublish} className="flex-1 bg-purple-600 hover:bg-purple-700">
                {publishSuccess ? "Publicado!" : "Publicar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-[#1a1a2e] rounded-2xl p-6 max-w-md w-full mx-4 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Créditos Esgotados</h3>
                <p className="text-sm text-gray-400">Faça upgrade para continuar criando</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              Com o plano PRO você tem créditos ilimitados, acesso a todos os modelos de IA e suporte prioritário.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowUpgradeModal(false)} className="flex-1">
                Depois
              </Button>
              <Button
                asChild
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
              >
                <a href="/dashboard/upgrade">Upgrade para PRO</a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
