"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
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
  Menu,
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

interface Project {
  id: string
  name: string
  description: string
  files: ProjectFile[]
  createdAt: Date
  updatedAt: Date
}

interface ProjectFile {
  name: string
  path: string
  content: string
  language: string
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingProjectName, setEditingProjectName] = useState("")
  const [copiedCode, setCopiedCode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [userCredits, setUserCredits] = useState(20)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const saved = localStorage.getItem("connext_builder_projects")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setProjects(
          parsed.map((p: any) => ({
            ...p,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
          })),
        )
      } catch (e) {
        console.error("Failed to load projects:", e)
      }
    }
  }, [])

  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem("connext_builder_projects", JSON.stringify(projects))
    }
  }, [projects])

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
    <div className="min-h-screen bg-[#030014]">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-40 right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>
      
      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/5 backdrop-blur-xl bg-[#030014]/80">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">Brand</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a>
              <a href="#about" className="text-gray-400 hover:text-white transition-colors">About</a>
              <a href="#contact" className="text-gray-400 hover:text-white transition-colors">Contact</a>
            </div>
            <div className="flex items-center gap-4">
              <button className="text-gray-400 hover:text-white transition-colors">Sign in</button>
              <button className="px-5 py-2.5 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-all hover:scale-105">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-sm text-purple-300">Now in public beta</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-8 leading-[1.1] tracking-tight">
            Build the future
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              with AI power
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            The next generation platform that helps you create, scale, and succeed. 
            Join thousands of innovators building the future.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-semibold text-lg hover:shadow-2xl hover:shadow-purple-500/25 transition-all hover:scale-105">
              Start Free Trial
              <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </button>
            <button className="px-8 py-4 border border-white/10 rounded-full text-white font-semibold text-lg hover:bg-white/5 transition-all backdrop-blur-sm">
              Watch Demo
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { value: '10K+', label: 'Active Users' },
              { value: '99.9%', label: 'Uptime' },
              { value: '150+', label: 'Countries' },
              { value: '4.9/5', label: 'Rating' }
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">{stat.value}</div>
                <div className="text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Everything you need
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Powerful features to help you manage, track, and grow your business.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: '⚡', title: 'Lightning Fast', desc: 'Optimized for speed and performance. Get results in milliseconds.' },
              { icon: '🔒', title: 'Secure by Default', desc: 'Enterprise-grade security with end-to-end encryption.' },
              { icon: '🎨', title: 'Beautiful Design', desc: 'Stunning interfaces that your users will love.' },
              { icon: '📊', title: 'Analytics', desc: 'Deep insights into your data with real-time dashboards.' },
              { icon: '🔗', title: 'Integrations', desc: 'Connect with 100+ tools you already use.' },
              { icon: '🌍', title: 'Global Scale', desc: 'Deploy worldwide with our edge network.' }
            ].map((feature) => (
              <div key={feature.title} className="group p-8 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-white/5 hover:border-purple-500/30 transition-all duration-500 hover:-translate-y-1">
                <div className="text-4xl mb-6">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-b from-purple-500/10 to-transparent border border-purple-500/20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to get started?
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Join thousands of companies already growing with us.
            </p>
            <button className="px-8 py-4 bg-white text-black font-semibold rounded-full text-lg hover:bg-gray-100 transition-all hover:scale-105">
              Start your free trial
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600"></div>
              <span className="font-bold text-white">Brand</span>
            </div>
            <p className="text-gray-500 text-sm">© 2025 Brand. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}`
    }

    if (lowerPrompt.includes("botão") || lowerPrompt.includes("button")) {
      return `export default function Buttons() {
  return (
    <div className="min-h-screen bg-[#030014] flex items-center justify-center p-8">
      <div className="flex flex-wrap gap-6 justify-center">
        <button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-semibold hover:shadow-2xl hover:shadow-purple-500/25 transition-all hover:scale-105">
          Primary Button
        </button>
        <button className="px-8 py-4 border border-white/20 rounded-full text-white font-semibold hover:bg-white/5 transition-all">
          Secondary Button
        </button>
        <button className="px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-all">
          White Button
        </button>
      </div>
    </div>
  )
}`
    }

    // Default professional dark template
    return `export default function Component() {
  return (
    <div className="min-h-screen bg-[#030014] flex items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-5xl font-bold text-white mb-6">Welcome</h1>
        <p className="text-xl text-gray-400 mb-8">
          Describe what you want to create and the AI will generate it for you.
        </p>
        <button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-semibold hover:shadow-2xl hover:shadow-purple-500/25 transition-all hover:scale-105">
          Get Started
        </button>
      </div>
    </div>
  )
}`
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadedFiles((prev) => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
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
          projectContext: activeProject?.files || [],
          history: messages.slice(-6),
          userId: user.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setError(`Limite atingido. Aguarde ${data.remainingTime || 60} minutos.`)
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

      const assistantMessage: Message = {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content: data.explanation || "Código gerado com sucesso! Veja o preview ao lado.",
        timestamp: new Date(),
        code: data.code,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error: any) {
      updateThought(readingId, "done", 1000)

      const fallbackId = addThought("fixing", "Usando geração local...")
      await new Promise((r) => setTimeout(r, 500))
      updateThought(fallbackId, "done", 500)

      const code = generateFallbackCode(userMessage.content)
      setGeneratedCode(code)

      if (profile?.plan !== "pro") {
        setUserCredits((prev) => Math.max(0, prev - 1))
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

  const createNewProject = () => {
    const newProject: Project = {
      id: Math.random().toString(36).substring(7),
      name: `Projeto ${projects.length + 1}`,
      description: "Novo projeto",
      files: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setProjects((prev) => [...prev, newProject])
    setActiveProject(newProject)
  }

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id))
    if (activeProject?.id === id) {
      setActiveProject(null)
    }
  }

  const saveCodeToProject = () => {
    if (!activeProject || !generatedCode) return

    const fileName = `component-${Date.now()}.tsx`
    const newFile: ProjectFile = {
      name: fileName,
      path: `/${fileName}`,
      content: generatedCode,
      language: "tsx",
    }

    setProjects((prev) =>
      prev.map((p) => (p.id === activeProject.id ? { ...p, files: [...p.files, newFile], updatedAt: new Date() } : p)),
    )

    setActiveProject((prev) => (prev ? { ...prev, files: [...prev.files, newFile], updatedAt: new Date() } : null))
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
    const link = `https://connext.app/share/${activeProject?.id || "preview"}`
    navigator.clipboard.writeText(link)
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

  const generatePreviewHtml = () => {
    if (!generatedCode) return ""

    let jsxContent = generatedCode

    // Remove ALL import statements completely
    jsxContent = jsxContent.replace(/^import\s+.*?['"].*?['"];?\s*$/gm, "")
    jsxContent = jsxContent.replace(/^import\s*\{[^}]*\}\s*from\s*['"][^'"]+['"];?\s*$/gm, "")
    jsxContent = jsxContent.replace(/^import\s+\w+\s*,?\s*\{?[^}]*\}?\s*from\s*['"][^'"]+['"];?\s*$/gm, "")

    // Remove export and function declaration, keep only the return content
    const returnMatch = jsxContent.match(/return\s*$$\s*([\s\S]*)\s*$$\s*;?\s*\}[\s\S]*$/)
    if (returnMatch) {
      jsxContent = returnMatch[1]
    }

    // Convert JSX to HTML
    let html = jsxContent
      .replace(/className=/g, "class=")
      .replace(/\{`([^`]*)`\}/g, "$1")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/onClick=\{[^}]*\}/g, "")
      .replace(/onChange=\{[^}]*\}/g, "")
      .replace(/onSubmit=\{[^}]*\}/g, "")
      .replace(/key=\{[^}]*\}/g, "")
      .replace(/style=\{\{[^}]*\}\}/g, "")
      .replace(/<>/g, "<div>")
      .replace(/<\/>/g, "</div>")
      // Handle map functions - convert to static HTML
      .replace(/\{[\w\s[\]{},'":]+\.map$$[^)]*$$\s*=>\s*\(/g, "")
      .replace(/\)\s*\)\s*\}/g, "")

    // Clean up any remaining JSX expressions
    html = html.replace(/\{[^}]*\}/g, "")

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    @keyframes pulse { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.3; } }
    .animate-pulse { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
  </style>
</head>
<body>
${html}
</body>
</html>`
  }

  const startEditingProject = (id: string, name: string) => {
    setEditingProjectId(id)
    setEditingProjectName(name)
  }

  const saveProjectName = (id: string) => {
    if (editingProjectName.trim()) {
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name: editingProjectName.trim() } : p)))
    }
    setEditingProjectId(null)
    setEditingProjectName("")
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#0d0d14] overflow-hidden">
      {/* Upgrade Modal */}
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

      {/* Share Modal */}
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
                value={`https://connext.app/share/${activeProject?.id || "preview"}`}
                readOnly
                className="bg-[#0d0d14] border-purple-500/30"
              />
              <Button onClick={copyShareLink} className="bg-purple-600 hover:bg-purple-700">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
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

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-[#1a1a2e] to-[#0d0d14] rounded-2xl border border-purple-500/30 p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Publicar Projeto</h3>
              <button onClick={() => setShowPublishModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-400 mb-4 text-sm">Publique seu projeto para o mundo ver</p>
            <div className="p-4 bg-[#0d0d14] rounded-lg border border-purple-500/20 mb-4">
              <p className="text-white font-medium mb-1">{activeProject?.name || "Meu Projeto"}</p>
              <p className="text-gray-500 text-sm">connext.app/{activeProject?.id || "meu-projeto"}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-purple-500/30 bg-transparent"
                onClick={() => setShowPublishModal(false)}
              >
                Cancelar
              </Button>
              <Button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90">
                <ExternalLink className="w-4 h-4 mr-2" />
                Publicar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-purple-600/20 rounded-lg border border-purple-500/30"
      >
        {sidebarOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
      </button>

      {/* Left Sidebar */}
      <div
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-40 w-full sm:w-96 lg:w-80 bg-[#0d0d14] border-r border-purple-500/20 flex flex-col transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-purple-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white">Connext Builder</span>
            </div>
            <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded-full flex items-center gap-1">
              {profile?.plan === "pro" ? (
                <>
                  <Crown className="w-3 h-3" />
                  PRO
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

          {profile?.plan !== "pro" && userCredits <= 5 && userCredits > 0 && (
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

        {/* Content */}
        <ScrollArea className="flex-1 p-4">
          {activeTab === "chat" && (
            <div className="space-y-4">
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

              {/* Timeline */}
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

              {/* Messages */}
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

              {projects.map((project) => (
                <div
                  key={project.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all",
                    activeProject?.id === project.id
                      ? "bg-purple-600/20 border-purple-500"
                      : "bg-[#1a1a2e] border-purple-500/20 hover:border-purple-500/50",
                  )}
                  onClick={() => setActiveProject(project)}
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
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <span>{project.files.length} arquivos</span>
                    <span>•</span>
                    <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
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
                <p className="text-sm text-gray-400 mb-3">
                  {profile?.plan === "pro" ? "PRO - Ilimitado" : `Gratuito - ${userCredits} créditos restantes`}
                </p>
                {profile?.plan !== "pro" && (
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
                    Upload Image
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                    <Camera className="w-4 h-4 mr-2" />
                    Clone Screenshot
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Project
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

              {/* Claude Sonnet 4 with official Anthropic logo */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1a1a2e]/50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M16.5 3L21 12L16.5 21H7.5L3 12L7.5 3H16.5Z" fill="#D97706" fillOpacity="0.9" />
                </svg>
                <span className="text-xs text-gray-400">Claude Sonnet 4</span>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="flex-1 flex flex-col bg-[#1a1a2e] overflow-hidden">
        {/* Toolbar */}
        <div className="h-14 border-b border-purple-500/20 flex items-center justify-between px-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant={previewMode === "preview" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreviewMode("preview")}
              className={previewMode === "preview" ? "bg-purple-600" : ""}
            >
              <Eye className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
            <Button
              variant={previewMode === "code" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreviewMode("code")}
              className={previewMode === "code" ? "bg-purple-600" : ""}
            >
              <Code className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Código</span>
            </Button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Device toggles */}
            <div className="hidden sm:flex items-center gap-1 bg-[#0d0d14] rounded-lg p-1">
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
                <Button size="sm" variant="ghost" onClick={shareProject} className="text-gray-400 hover:text-white">
                  <Share2 className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Compartilhar</span>
                </Button>
                <Button
                  size="sm"
                  onClick={publishProject}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90"
                >
                  <ExternalLink className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Publicar</span>
                </Button>
              </>
            )}

            {generatedCode && (
              <>
                {activeProject && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={saveCodeToProject}
                    className="text-gray-400 hover:text-white"
                  >
                    <Save className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Salvar</span>
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

        {/* Preview Area */}
        <div className="flex-1 p-2 sm:p-4 overflow-auto">
          <div className={cn("mx-auto h-full transition-all duration-300", getDeviceWidth())}>
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
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#030014] via-[#0d0d14] to-[#030014] p-4 sm:p-8">
                    <div className="text-center max-w-md">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 flex items-center justify-center border border-purple-500/30">
                        <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">Bem-vindo ao Connext Builder</h3>
                      <p className="text-gray-400 mb-6 text-sm sm:text-base">Descreva o que você quer criar</p>

                      <div className="space-y-3">
                        {["Crie uma landing page...", "Crie um site completo..."].map((example) => (
                          <button
                            key={example}
                            onClick={() => setInput(example.replace("...", " moderno e profissional"))}
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
      </div>
    </div>
  )
}
