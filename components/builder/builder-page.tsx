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

  const generateFallbackCode = (prompt: string): string => {
    const lowerPrompt = prompt.toLowerCase()

    // Detectar times de futebol brasileiros
    const isGremio = lowerPrompt.includes("grêmio") || lowerPrompt.includes("gremio")
    const isInter = lowerPrompt.includes("inter") || lowerPrompt.includes("internacional")
    const isFlamengo = lowerPrompt.includes("flamengo") || lowerPrompt.includes("mengão")
    const isCorinthians = lowerPrompt.includes("corinthians") || lowerPrompt.includes("timão")
    const isPalmeiras = lowerPrompt.includes("palmeiras") || lowerPrompt.includes("verdão")
    const isSantos = lowerPrompt.includes("santos") || lowerPrompt.includes("peixe")
    const isSaoPaulo =
      lowerPrompt.includes("são paulo") || lowerPrompt.includes("spfc") || lowerPrompt.includes("tricolor paulista")
    const isVasco = lowerPrompt.includes("vasco") || lowerPrompt.includes("vascão")
    const isBotafogo = lowerPrompt.includes("botafogo") || lowerPrompt.includes("fogão")
    const isFluminense = lowerPrompt.includes("fluminense") || lowerPrompt.includes("flu")
    const isAtleticoMG =
      lowerPrompt.includes("atlético") || lowerPrompt.includes("atletico") || lowerPrompt.includes("galo")
    const isCruzeiro = lowerPrompt.includes("cruzeiro") || lowerPrompt.includes("raposa")

    // Detectar clássicos
    const isGrenal = (isGremio && isInter) || lowerPrompt.includes("grenal")
    const isFlaFlu = (isFlamengo && isFluminense) || lowerPrompt.includes("fla-flu") || lowerPrompt.includes("flaflu")
    const isClassico = lowerPrompt.includes("clássico") || lowerPrompt.includes("classico")

    // Se for Grenal (Grêmio vs Inter)
    if (isGrenal) {
      return `export default function Grenal() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0047AB] via-[#1a1a2e] to-[#E31B23] text-white">
      <style>{\`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-pulse-slow { animation: pulse 3s ease-in-out infinite; }
        .animate-float { animation: float 4s ease-in-out infinite; }
      \`}</style>
      
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-[#0047AB] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">G</div>
              <span className="text-3xl font-black text-white/80">×</span>
              <div className="w-12 h-12 rounded-full bg-[#E31B23] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-red-500/30">I</div>
            </div>
            <div>
              <span className="text-2xl font-black tracking-wider">GRENAL</span>
              <p className="text-xs text-gray-400">O Maior Clássico do Sul</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#historia" className="text-gray-300 hover:text-white transition font-medium">História</a>
            <a href="#estatisticas" className="text-gray-300 hover:text-white transition font-medium">Estatísticas</a>
            <a href="#jogos" className="text-gray-300 hover:text-white transition font-medium">Próximo Jogo</a>
          </div>
        </div>
      </nav>

      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#0047AB]/40 rounded-full blur-[150px] animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#E31B23]/40 rounded-full blur-[150px] animate-pulse-slow"></div>
        </div>
        
        <div className="relative z-10 text-center px-6 max-w-6xl">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 border border-white/20 mb-10 backdrop-blur-sm">
            <span className="text-2xl">⚽</span>
            <span className="text-sm font-semibold tracking-wide">RIVALIDADE CENTENÁRIA</span>
          </div>
          
          <h1 className="text-7xl md:text-9xl font-black mb-8 leading-none">
            <span className="text-[#0047AB] drop-shadow-lg">GRÊMIO</span>
            <span className="mx-6 text-white/60">vs</span>
            <span className="text-[#E31B23] drop-shadow-lg">INTER</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-16 max-w-3xl mx-auto leading-relaxed">
            Mais de <strong className="text-white">100 anos</strong> de rivalidade, paixão e história no futebol gaúcho. 
            O clássico que para o Rio Grande do Sul.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm animate-float" style={{animationDelay: '0s'}}>
              <div className="text-5xl font-black bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent mb-2">440+</div>
              <div className="text-gray-400 font-medium">Confrontos</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm animate-float" style={{animationDelay: '0.2s'}}>
              <div className="text-5xl font-black text-white mb-2">1909</div>
              <div className="text-gray-400 font-medium">Primeiro Jogo</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm animate-float" style={{animationDelay: '0.4s'}}>
              <div className="text-5xl font-black text-[#0047AB] mb-2">3</div>
              <div className="text-gray-400 font-medium">Libertadores Grêmio</div>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm animate-float" style={{animationDelay: '0.6s'}}>
              <div className="text-5xl font-black text-[#E31B23] mb-2">3</div>
              <div className="text-gray-400 font-medium">Libertadores Inter</div>
            </div>
          </div>
        </div>
      </section>

      <section id="historia" className="py-32 px-6 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-sm font-semibold text-purple-400 tracking-wider uppercase mb-4 block">Dois Gigantes</span>
            <h2 className="text-5xl md:text-6xl font-black">História do Clássico</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-gradient-to-br from-[#0047AB]/30 to-transparent p-10 rounded-3xl border border-[#0047AB]/40 hover:border-[#0047AB]/60 transition-all hover:transform hover:scale-[1.02]">
              <div className="w-20 h-20 rounded-full bg-[#0047AB] flex items-center justify-center text-3xl font-black mb-8 shadow-lg shadow-blue-500/30">G</div>
              <h3 className="text-3xl font-bold mb-4">Grêmio FBPA</h3>
              <p className="text-gray-400 mb-6 text-lg leading-relaxed">Fundado em 1903, o Imortal Tricolor é um dos clubes mais vitoriosos do Brasil, com títulos internacionais e uma torcida apaixonada.</p>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center gap-3"><span className="text-yellow-400 text-xl">🏆</span> 3x Libertadores da América</li>
                <li className="flex items-center gap-3"><span className="text-yellow-400 text-xl">🌍</span> 2x Mundial de Clubes</li>
                <li className="flex items-center gap-3"><span className="text-yellow-400 text-xl">🏅</span> 5x Copa do Brasil</li>
                <li className="flex items-center gap-3"><span className="text-yellow-400 text-xl">⭐</span> 42+ Campeonatos Gaúchos</li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-[#E31B23]/30 to-transparent p-10 rounded-3xl border border-[#E31B23]/40 hover:border-[#E31B23]/60 transition-all hover:transform hover:scale-[1.02]">
              <div className="w-20 h-20 rounded-full bg-[#E31B23] flex items-center justify-center text-3xl font-black mb-8 shadow-lg shadow-red-500/30">I</div>
              <h3 className="text-3xl font-bold mb-4">Internacional</h3>
              <p className="text-gray-400 mb-6 text-lg leading-relaxed">Fundado em 1909, o Colorado é conhecido como o Clube do Povo, com conquistas históricas e uma das maiores torcidas do país.</p>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center gap-3"><span className="text-yellow-400 text-xl">🏆</span> 3x Libertadores da América</li>
                <li className="flex items-center gap-3"><span className="text-yellow-400 text-xl">🌍</span> 1x Mundial de Clubes</li>
                <li className="flex items-center gap-3"><span className="text-yellow-400 text-xl">🏅</span> 3x Copa do Brasil</li>
                <li className="flex items-center gap-3"><span className="text-yellow-400 text-xl">⭐</span> 45+ Campeonatos Gaúchos</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="jogos" className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-sm font-semibold text-purple-400 tracking-wider uppercase mb-4 block">Aguardado</span>
          <h2 className="text-5xl md:text-6xl font-black mb-16">Próximo Grenal</h2>
          
          <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-12 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-center gap-12 mb-10">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-[#0047AB] flex items-center justify-center text-4xl font-black mb-4 shadow-lg shadow-blue-500/30 mx-auto">G</div>
                <span className="font-bold text-xl">Grêmio</span>
              </div>
              <div className="text-center">
                <div className="text-5xl font-black text-gray-500 mb-2">VS</div>
                <div className="text-sm text-gray-500">Clássico 445</div>
              </div>
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-[#E31B23] flex items-center justify-center text-4xl font-black mb-4 shadow-lg shadow-red-500/30 mx-auto">I</div>
                <span className="font-bold text-xl">Inter</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold">Arena do Grêmio</p>
              <p className="text-gray-400 text-lg">Campeonato Gaúcho 2025</p>
              <p className="text-purple-400 font-semibold">Em breve</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 px-6 border-t border-white/10 bg-black/30">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#0047AB] flex items-center justify-center text-sm font-bold">G</div>
            <span className="text-xl font-bold">GRENAL</span>
            <div className="w-8 h-8 rounded-full bg-[#E31B23] flex items-center justify-center text-sm font-bold">I</div>
          </div>
          <p className="text-gray-500">© 2025 - O Maior Clássico do Sul. Criado com Connext Builder.</p>
        </div>
      </footer>
    </div>
  )
}
`
    }

    // Se for apenas Grêmio
    if (isGremio && !isInter) {
      return `export default function SiteGremio() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0047AB] via-[#003380] to-[#001a40] text-white">
      <style>{\`
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .animate-shimmer { animation: shimmer 3s linear infinite; background-size: 200% 100%; }
      \`}</style>
      
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#0047AB]/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg">
              <span className="text-[#0047AB] font-black text-2xl">G</span>
            </div>
            <div>
              <span className="text-xl font-bold tracking-wide">GRÊMIO FBPA</span>
              <p className="text-xs text-blue-200">Imortal Tricolor</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#" className="hover:text-blue-200 transition font-medium">História</a>
            <a href="#" className="hover:text-blue-200 transition font-medium">Elenco</a>
            <a href="#" className="hover:text-blue-200 transition font-medium">Títulos</a>
            <button className="px-6 py-2 bg-white text-[#0047AB] font-bold rounded-full hover:bg-blue-100 transition">
              Seja Sócio
            </button>
          </div>
        </div>
      </nav>
      
      <section className="min-h-screen flex items-center justify-center pt-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/gremio-arena-stadium-night.jpg')] bg-cover bg-center opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#001a40] via-transparent to-transparent"></div>
        
        <div className="relative z-10 text-center px-6 max-w-5xl">
          <div className="w-40 h-40 mx-auto mb-10 rounded-full bg-white flex items-center justify-center shadow-2xl shadow-black/50">
            <span className="text-[#0047AB] font-black text-7xl">G</span>
          </div>
          
          <h1 className="text-7xl md:text-9xl font-black mb-6 tracking-tight">GRÊMIO</h1>
          <p className="text-2xl md:text-3xl font-light mb-2 text-blue-100">Foot-Ball Porto Alegrense</p>
          <p className="text-lg text-blue-300 mb-12">Fundado em 15 de setembro de 1903</p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <button className="px-10 py-4 bg-white text-[#0047AB] font-bold rounded-xl hover:bg-blue-100 transition shadow-lg shadow-black/20">
              Seja Sócio Torcedor
            </button>
            <button className="px-10 py-4 border-2 border-white rounded-xl hover:bg-white/10 transition">
              Conheça a Arena
            </button>
          </div>
          
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 border border-white/20">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-sm">Próximo jogo: Grêmio vs Juventude - Gauchão 2025</span>
          </div>
        </div>
      </section>
      
      <section className="py-24 px-6 bg-black/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">Títulos e Conquistas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-8 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/10 hover:border-yellow-500/50 transition-all hover:transform hover:scale-105">
              <div className="text-6xl font-black text-yellow-400 mb-4 drop-shadow-lg">3</div>
              <div className="font-bold text-lg">Libertadores</div>
              <div className="text-sm text-gray-400">1983, 1995, 2017</div>
            </div>
            <div className="text-center p-8 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/10 hover:border-yellow-500/50 transition-all hover:transform hover:scale-105">
              <div className="text-6xl font-black text-yellow-400 mb-4 drop-shadow-lg">2</div>
              <div className="font-bold text-lg">Mundiais</div>
              <div className="text-sm text-gray-400">1983, 2017</div>
            </div>
            <div className="text-center p-8 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/10 hover:border-yellow-500/50 transition-all hover:transform hover:scale-105">
              <div className="text-6xl font-black text-yellow-400 mb-4 drop-shadow-lg">5</div>
              <div className="font-bold text-lg">Copa do Brasil</div>
              <div className="text-sm text-gray-400">89, 94, 97, 01, 16</div>
            </div>
            <div className="text-center p-8 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/10 hover:border-yellow-500/50 transition-all hover:transform hover:scale-105">
              <div className="text-6xl font-black text-yellow-400 mb-4 drop-shadow-lg">42</div>
              <div className="font-bold text-lg">Gauchões</div>
              <div className="text-sm text-gray-400">Recordista</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">Lendas Imortais</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {["Renato Portaluppi", "Mário Sérgio", "Hugo de León", "Jardel"].map((player, i) => (
              <div key={i} className="text-center p-6 bg-white/5 rounded-2xl border border-white/10">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-2xl font-bold">
                  {player.charAt(0)}
                </div>
                <div className="font-bold">{player}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      <footer className="py-12 px-6 border-t border-white/10 bg-[#001a40]">
        <div className="max-w-7xl mx-auto text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white flex items-center justify-center">
            <span className="text-[#0047AB] font-black text-2xl">G</span>
          </div>
          <p className="text-blue-300 font-semibold mb-2">Grêmio Foot-Ball Porto Alegrense</p>
          <p className="text-gray-500 text-sm">© 2025 - Imortal Tricolor. Criado com Connext Builder.</p>
        </div>
      </footer>
    </div>
  )
}
`
    }

    // Se for apenas Inter
    if (isInter && !isGremio) {
      return `export default function SiteInter() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E31B23] via-[#b01820] to-[#5a0000] text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#E31B23]/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg">
              <span className="text-[#E31B23] font-black text-2xl">I</span>
            </div>
            <div>
              <span className="text-xl font-bold tracking-wide">INTERNACIONAL</span>
              <p className="text-xs text-red-200">Clube do Povo</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#" className="hover:text-red-200 transition font-medium">História</a>
            <a href="#" className="hover:text-red-200 transition font-medium">Elenco</a>
            <a href="#" className="hover:text-red-200 transition font-medium">Títulos</a>
            <button className="px-6 py-2 bg-white text-[#E31B23] font-bold rounded-full hover:bg-red-100 transition">
              Seja Sócio
            </button>
          </div>
        </div>
      </nav>
      
      <section className="min-h-screen flex items-center justify-center pt-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/beira-rio-stadium-inter-night.jpg')] bg-cover bg-center opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#5a0000] via-transparent to-transparent"></div>
        
        <div className="relative z-10 text-center px-6 max-w-5xl">
          <div className="w-40 h-40 mx-auto mb-10 rounded-full bg-white flex items-center justify-center shadow-2xl shadow-black/50">
            <span className="text-[#E31B23] font-black text-7xl">I</span>
          </div>
          
          <h1 className="text-7xl md:text-9xl font-black mb-6 tracking-tight">INTER</h1>
          <p className="text-2xl md:text-3xl font-light mb-2 text-red-100">Sport Club Internacional</p>
          <p className="text-lg text-red-300 mb-12">Fundado em 4 de abril de 1909</p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <button className="px-10 py-4 bg-white text-[#E31B23] font-bold rounded-xl hover:bg-red-100 transition shadow-lg shadow-black/20">
              Seja Sócio Colorado
            </button>
            <button className="px-10 py-4 border-2 border-white rounded-xl hover:bg-white/10 transition">
              Conheça o Beira-Rio
            </button>
          </div>
        </div>
      </section>
      
      <section className="py-24 px-6 bg-black/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">Títulos e Conquistas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-8 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/10 hover:border-yellow-500/50 transition-all hover:transform hover:scale-105">
              <div className="text-6xl font-black text-yellow-400 mb-4">3</div>
              <div className="font-bold text-lg">Libertadores</div>
              <div className="text-sm text-gray-400">2006, 2010, 2025</div>
            </div>
            <div className="text-center p-8 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/10 hover:border-yellow-500/50 transition-all hover:transform hover:scale-105">
              <div className="text-6xl font-black text-yellow-400 mb-4">1</div>
              <div className="font-bold text-lg">Mundial</div>
              <div className="text-sm text-gray-400">2006</div>
            </div>
            <div className="text-center p-8 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/10 hover:border-yellow-500/50 transition-all hover:transform hover:scale-105">
              <div className="text-6xl font-black text-yellow-400 mb-4">3</div>
              <div className="font-bold text-lg">Copa do Brasil</div>
              <div className="text-sm text-gray-400">1992, 2022, 2023</div>
            </div>
            <div className="text-center p-8 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/10 hover:border-yellow-500/50 transition-all hover:transform hover:scale-105">
              <div className="text-6xl font-black text-yellow-400 mb-4">45</div>
              <div className="font-bold text-lg">Gauchões</div>
              <div className="text-sm text-gray-400">Maior campeão</div>
            </div>
          </div>
        </div>
      </section>
      
      <footer className="py-12 px-6 border-t border-white/10 bg-[#5a0000]">
        <div className="max-w-7xl mx-auto text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white flex items-center justify-center">
            <span className="text-[#E31B23] font-black text-2xl">I</span>
          </div>
          <p className="text-red-300 font-semibold mb-2">Sport Club Internacional</p>
          <p className="text-gray-500 text-sm">© 2025 - Colorado. Criado com Connext Builder.</p>
        </div>
      </footer>
    </div>
  )
}
`
    }

    // Se for Flamengo
    if (isFlamengo) {
      return `export default function SiteFlamengo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#BF0000] via-[#8B0000] to-black text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#BF0000] flex items-center justify-center border-2 border-white">
              <span className="font-black text-xl">F</span>
            </div>
            <span className="text-xl font-bold">FLAMENGO</span>
          </div>
        </div>
      </nav>
      
      <section className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center px-6">
          <h1 className="text-7xl md:text-9xl font-black mb-6">MENGÃO</h1>
          <p className="text-2xl text-red-200 mb-12">A Maior Torcida do Mundo</p>
          <div className="grid grid-cols-3 gap-8 max-w-xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-black text-yellow-400">3</div>
              <div className="text-sm text-gray-400">Libertadores</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-yellow-400">1</div>
              <div className="text-sm text-gray-400">Mundial</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-yellow-400">8</div>
              <div className="text-sm text-gray-400">Brasileirões</div>
            </div>
          </div>
        </div>
      </section>
      
      <footer className="py-8 text-center border-t border-white/10">
        <p className="text-gray-500">© 2025 Flamengo - Criado com Connext Builder</p>
      </footer>
    </div>
  )
}`
    }

    // Fallback genérico para outros casos
    if (
      lowerPrompt.includes("landing") ||
      lowerPrompt.includes("página") ||
      lowerPrompt.includes("home") ||
      lowerPrompt.includes("startup") ||
      lowerPrompt.includes("empresa") ||
      lowerPrompt.includes("negócio") ||
      lowerPrompt.includes("produto") ||
      lowerPrompt.includes("site")
    ) {
      return `export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030014] text-white overflow-x-hidden">
      <style>{\`
        @keyframes gradient { to { background-position: 200% center; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        .animate-gradient { animation: gradient 8s linear infinite; }
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
          <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-medium">Começar</button>
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
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-8">
            <span className="bg-gradient-to-b from-white to-gray-600 bg-clip-text text-transparent">Crie produtos</span>
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">incríveis</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-12">
            A plataforma completa que ajuda você a criar, lançar e escalar seus produtos digitais.
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
        </div>
      </section>
      
      <footer className="py-12 px-6 border-t border-white/5 text-center">
        <p className="text-gray-600">Criado com Connext Builder</p>
      </footer>
    </div>
  )
}`
    }

    // Fallback padrão
    return `export default function Component() {
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
          Seja específico! Por exemplo: "Crie um site do Grêmio" ou "Landing page para minha startup de IA"
        </p>
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

  const generatePreviewHtml = (code: string) => {
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
          animation: {
            'gradient': 'gradient 8s linear infinite',
            'float': 'float 6s ease-in-out infinite',
            'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            'ping': 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
          }
        }
      }
    }
  </script>
  <style>
    @keyframes gradient { to { background-position: 200% center; } }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
    .animate-gradient { animation: gradient 8s linear infinite; background-size: 200% auto; }
    .animate-float { animation: float 6s ease-in-out infinite; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { min-height: 100%; background: #030014; }
    body { font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script type="text/babel">
    const { useState, useEffect, useRef, useCallback } = React;
    ${code}
    const ComponentToRender = typeof Component !== 'undefined' ? Component : 
                              typeof LandingPage !== 'undefined' ? LandingPage :
                              typeof Page !== 'undefined' ? Page :
                              typeof App !== 'undefined' ? App : 
                              (() => <div className="min-h-screen bg-[#030014] flex items-center justify-center text-white">Preview</div>);
    ReactDOM.createRoot(document.getElementById('root')).render(<ComponentToRender />);
  </script>
</body>
</html>`
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
