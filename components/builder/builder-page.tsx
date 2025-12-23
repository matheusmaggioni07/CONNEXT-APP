"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import type { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Crown,
  Share2,
  ExternalLink,
  Maximize2,
  Minimize2,
  ImageIcon,
  Clipboard,
  Link,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu" // Added

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

export default function BuilderPage({ user, profile }: BuilderPageProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [thoughts, setThoughts] = useState<ThoughtStep[]>([])
  const [activeTab, setActiveTab] = useState("chat")
  const [previewMode, setPreviewMode] = useState<"preview" | "code">("preview")
  const [deviceView, setDeviceView] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [generatedCode, setGeneratedCode] = useState("")
  const [previewHtml, setPreviewHtml] = useState("") // Added state for preview HTML
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingProjectName, setEditingProjectName] = useState("")
  const [copiedCode, setCopiedCode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false) // Added state for publish success
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [userCredits, setUserCredits] = useState(20)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  const [mobileView, setMobileView] = useState<"chat" | "preview">("chat")

  const [attachedImage, setAttachedImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadChatHistory = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/builder/chat-history?projectId=${projectId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.messages && data.messages.length > 0) {
          // Convert database format to message format
          const loadedMessages = data.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            code: msg.code,
            timestamp: new Date(msg.created_at),
          }))
          setMessages(loadedMessages)
        }
      }
    } catch (err) {
      console.error("Error loading chat history:", err)
    }
  }, [])

  const saveChatMessage = useCallback(
    async (role: "user" | "assistant", content: string, code?: string) => {
      if (!activeProject?.id) return

      try {
        if (typeof window !== "undefined" && window.JSON) {
          await fetch("/api/builder/chat-history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: window.JSON.stringify({
              projectId: activeProject.id,
              role,
              content,
              code,
            }),
          })
        }
      } catch (err) {
        console.error("Error saving chat message:", err)
      }
    },
    [activeProject?.id],
  )

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
    if (activeProject?.id) {
      loadChatHistory(activeProject.id)
    } else {
      setMessages([])
    }
  }, [activeProject?.id, loadChatHistory])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const isAdmin =
      user.email?.toLowerCase() === "matheus.maggioni07@gmail.com" ||
      user.email?.toLowerCase() === "matheus.maggioni@edu.pucrs.br"

    if (profile?.plan === "pro" || isAdmin) {
      setUserCredits(-1) // -1 represents unlimited
    } else {
      if (typeof window !== "undefined") {
        const savedCredits = localStorage.getItem(`builder_credits_${user.id}`)
        if (savedCredits) {
          setUserCredits(Number.parseInt(savedCredits))
        } else {
          // Set default credits if none found
          setUserCredits(20)
        }
      }
    }
  }, [profile, user.id])

  useEffect(() => {
    // Save credits only if not unlimited
    if (userCredits !== -1 && typeof window !== "undefined") {
      localStorage.setItem(`builder_credits_${user.id}`, userCredits.toString())
    }
  }, [userCredits, user.id])

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

  const generatePreviewHtml = useCallback((code: string): string => {
    if (!code) return ""

    try {
      // Extract the return statement content
      let jsxContent = ""

      // Find return ( and extract balanced parentheses content
      const returnIndex = code.indexOf("return (")
      if (returnIndex !== -1) {
        let depth = 0
        let start = returnIndex + 7
        let foundStart = false

        for (let i = start; i < code.length; i++) {
          if (code[i] === "(") {
            if (!foundStart) {
              start = i + 1
              foundStart = true
            }
            depth++
          } else if (code[i] === ")") {
            depth--
            if (depth === 0 && foundStart) {
              jsxContent = code.substring(start, i).trim()
              break
            }
          }
        }
      }

      if (!jsxContent) {
        // Try alternative extraction method without problematic regex
        const returnMatch = code.indexOf("return")
        if (returnMatch !== -1) {
          const afterReturn = code.substring(returnMatch + 6).trim()
          if (afterReturn.startsWith("(")) {
            // Already handled above
          } else if (afterReturn.startsWith("<")) {
            // Direct JSX return without parentheses
            const endMatch = code.lastIndexOf("}")
            if (endMatch > returnMatch) {
              jsxContent = afterReturn.substring(0, endMatch - returnMatch - 6).trim()
            }
          }
        }
      }

      if (!jsxContent) {
        return getErrorHtml("Não foi possível extrair o JSX do código")
      }

      let html = jsxContent

      // Step 1: Remove ALL JSX comments {/* ... */} - handle multiline
      html = html.replace(/\{\/\*[\s\S]*?\*\/\}/g, "")

      // Step 2: Remove conditional rendering completely
      // Handle patterns like {menuOpen && <div>...</div>}
      // Handle patterns like {!condition && <div>...</div>}
      // Process multiple times to handle nested conditionals
      for (let pass = 0; pass < 10; pass++) {
        const prevHtml = html

        // Remove simple boolean conditionals {variable && ...}
        html = html.replace(/\{[a-zA-Z_][a-zA-Z0-9_]*\s*&&\s*(<[^>]*>[\s\S]*?<\/[^>]*>|<[^/>]*\/>)\}/g, "")
        html = html.replace(/\{![a-zA-Z_][a-zA-Z0-9_]*\s*&&\s*(<[^>]*>[\s\S]*?<\/[^>]*>|<[^/>]*\/>)\}/g, "")

        // Remove comparison conditionals {var === val && ...}
        html = html.replace(
          /\{[a-zA-Z_][a-zA-Z0-9_.]*\s*[=!<>]+\s*[^&]*&&\s*(<[^>]*>[\s\S]*?<\/[^>]*>|<[^/>]*\/>)\}/g,
          "",
        )

        // Remove remaining conditional starts {variable &&
        html = html.replace(/\{[a-zA-Z_!][a-zA-Z0-9_]*\s*&&\s*/g, "")

        // If no changes were made, break
        if (html === prevHtml) break
      }

      // Clean orphaned closing braces
      let result = ""
      let braceDepth = 0
      let inTag = false
      let inString = false
      let stringChar = ""

      for (let i = 0; i < html.length; i++) {
        const char = html[i]
        const prevChar = i > 0 ? html[i - 1] : ""

        // Track string state
        if ((char === '"' || char === "'") && prevChar !== "\\") {
          if (!inString) {
            inString = true
            stringChar = char
          } else if (char === stringChar) {
            inString = false
          }
        }

        // Track tag state
        if (!inString) {
          if (char === "<") inTag = true
          if (char === ">") inTag = false
        }

        // Handle braces outside of tags and strings
        if (!inString && !inTag) {
          if (char === "{") {
            // Check if this looks like a JSX expression (not HTML)
            const remaining = html.substring(i + 1, i + 50)
            if (remaining.match(/^[a-zA-Z_!]/)) {
              braceDepth++
              continue // Skip this opening brace
            }
          }
          if (char === "}" && braceDepth > 0) {
            braceDepth--
            continue // Skip this closing brace
          }
        }

        result += char
      }
      html = result

      // Step 3: Remove .map expressions - multiple approaches
      for (let i = 0; i < 5; i++) {
        // Remove {array.map(...)}
        html = html.replace(/\{[^{}]*\.map[^{}]*\}/g, "")
        // Remove {[...].map(...)}
        html = html.replace(/\{\s*\[[^\]]*\][^{}]*\}/g, "")
      }

      // Step 4: Remove ternary expressions {a ? b : c}
      html = html.replace(/\{[^{}]*\?[^{}]*:[^{}]*\}/g, "")

      // Step 5: Remove remaining JSX expressions
      html = html.replace(/\{[a-zA-Z_][a-zA-Z0-9_.]*\}/g, "")
      html = html.replace(/\{\s*`[^`]*`\s*\}/g, "")

      // Step 6: Clean up any remaining curly braces
      html = html.replace(/\{\s*\}/g, "")
      html = html.replace(/\{\s*\n\s*\}/g, "")

      // Step 7: Convert React attributes to HTML
      html = html.replace(/className=/g, "class=")
      html = html.replace(/htmlFor=/g, "for=")
      html = html.replace(/tabIndex=/g, "tabindex=")
      html = html.replace(/autoFocus/g, "autofocus")
      html = html.replace(/autoComplete=/g, "autocomplete=")
      html = html.replace(/spellCheck=/g, "spellcheck=")
      html = html.replace(/contentEditable=/g, "contenteditable=")
      html = html.replace(/crossOrigin=/g, "crossorigin=")
      html = html.replace(/dateTime=/g, "datetime=")
      html = html.replace(/encType=/g, "enctype=")
      html = html.replace(/formAction=/g, "formaction=")
      html = html.replace(/formEncType=/g, "formenctype=")
      html = html.replace(/formMethod=/g, "formmethod=")
      html = html.replace(/formNoValidate=/g, "formnovalidate=")
      html = html.replace(/formTarget=/g, "formtarget=")
      html = html.replace(/hrefLang=/g, "hreflang=")
      html = html.replace(/inputMode=/g, "inputmode=")
      html = html.replace(/maxLength=/g, "maxlength=")
      html = html.replace(/minLength=/g, "minlength=")
      html = html.replace(/noValidate=/g, "novalidate=")
      html = html.replace(/readOnly=/g, "readonly=")
      html = html.replace(/srcDoc=/g, "srcdoc=")
      html = html.replace(/srcLang=/g, "srclang=")
      html = html.replace(/srcSet=/g, "srcset=")
      html = html.replace(/useMap=/g, "usemap=")
      // SVG attributes
      html = html.replace(/strokeWidth=/g, "strokeWidth=")
      html = html.replace(/strokeLinecap=/g, "strokeLinecap=")
      html = html.replace(/strokeLinejoin=/g, "strokeLinejoin=")
      html = html.replace(/fillRule=/g, "fillRule=")
      html = html.replace(/clipRule=/g, "clipRule=")
      html = html.replace(/clipPath=/g, "clipPath=")

      // Convert buttons with scrollTo to anchor links
      html = html.replace(
        /<button([^>]*)onClick=\{[^}]*scrollTo[^}]*['"]([^'"]+)['"][^}]*\}([^>]*)>([^<]*)<\/button>/gi,
        '<a href="#$2"$1$3 style="cursor: pointer;">$4</a>',
      )

      // Convert buttons/links with WhatsApp to functional WhatsApp links
      html = html.replace(
        /<button([^>]*)onClick=\{[^}]*whatsapp[^}]*\}([^>]*)>([^<]*)<\/button>/gi,
        '<a href="https://wa.me/5500000000000" target="_blank"$1$2>$3</a>',
      )
      html = html.replace(
        /<button([^>]*)onClick=\{[^}]*window\.open[^}]*wa\.me[^}]*\}([^>]*)>([^<]*)<\/button>/gi,
        '<a href="https://wa.me/5500000000000" target="_blank"$1$2>$3</a>',
      )

      // Convert buttons with tel: to phone links
      html = html.replace(
        /<button([^>]*)onClick=\{[^}]*tel:[^}]*\}([^>]*)>([^<]*)<\/button>/gi,
        '<a href="tel:+5500000000000"$1$2>$3</a>',
      )

      // Convert buttons with mailto: to email links
      html = html.replace(
        /<button([^>]*)onClick=\{[^}]*mailto:[^}]*\}([^>]*)>([^<]*)<\/button>/gi,
        '<a href="mailto:contato@exemplo.com"$1$2>$3</a>',
      )

      // Step 8: Remove ALL event handlers - comprehensive list
      const eventHandlers = [
        "onClick",
        "onChange",
        "onSubmit",
        "onFocus",
        "onBlur",
        "onKeyDown",
        "onKeyUp",
        "onKeyPress",
        "onMouseDown",
        "onMouseUp",
        "onMouseMove",
        "onMouseEnter",
        "onMouseLeave",
        "onMouseOver",
        "onMouseOut",
        "onTouchStart",
        "onTouchMove",
        "onTouchEnd",
        "onScroll",
        "onWheel",
        "onDrag",
        "onDragStart",
        "onDragEnd",
        "onDragEnter",
        "onDragLeave",
        "onDragOver",
        "onDrop",
        "onInput",
        "onInvalid",
        "onReset",
        "onSelect",
        "onLoad",
        "onError",
        "onAnimationStart",
        "onAnimationEnd",
        "onTransitionEnd",
        "onContextMenu",
        "onDoubleClick",
        "onCopy",
        "onCut",
        "onPaste",
      ]
      eventHandlers.forEach((handler) => {
        // Match handler={...} or handler={() => ...}
        const regex = new RegExp(`\\s*${handler}=\\{[^}]*\\}`, "g")
        html = html.replace(regex, "")
      })

      // Step 9: Remove React-specific props
      const reactProps = [
        "key",
        "ref",
        "dangerouslySetInnerHTML",
        "suppressContentEditableWarning",
        "suppressHydrationWarning",
      ]
      reactProps.forEach((prop) => {
        const regex = new RegExp(`\\s*${prop}=\\{[^}]*\\}`, "g")
        html = html.replace(regex, "")
      })

      // Step 10: Remove value props from inputs (keep placeholder)
      html = html.replace(/\s+value=\{[^}]*\}/g, "")
      html = html.replace(/\s+checked=\{[^}]*\}/g, "")
      html = html.replace(/\s+selected=\{[^}]*\}/g, "")
      html = html.replace(/\s+disabled=\{[^}]*\}/g, "")

      // Step 11: Convert style={{...}} to style="..."
      html = html.replace(/style=\{\{([^}]+)\}\}/g, (_, styles) => {
        try {
          const cssStyles = styles
            .split(",")
            .map((s: string) => {
              const colonIdx = s.indexOf(":")
              if (colonIdx === -1) return ""
              const key = s.substring(0, colonIdx).trim()
              const value = s
                .substring(colonIdx + 1)
                .trim()
                .replace(/['"]/g, "")
                .replace(/}$/, "")
              const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase()
              return `${cssKey}: ${value}`
            })
            .filter(Boolean)
            .join("; ")
          return `style="${cssStyles}"`
        } catch {
          return ""
        }
      })

      // Step 12: Clean up any remaining curly braces
      // Do multiple passes to catch nested patterns
      for (let i = 0; i < 3; i++) {
        html = html.replace(/\{[^{}]*\}/g, "")
      }

      // Step 13: Fix self-closing tags for HTML5
      html = html.replace(/<(img|input|br|hr|meta|link)([^>]*)\s*\/>/gi, "<$1$2>")

      // Step 14: Clean up whitespace
      html = html.replace(/\s+/g, " ")
      html = html.replace(/>\s+</g, "><")
      html = html.replace(/\s+>/g, ">")
      html = html.replace(/<\s+/g, "<")

      // Step 15: Ensure proper HTML structure
      html = html.trim()

      // Wrap in complete HTML document
      return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    html { scroll-behavior: smooth; }
    a { cursor: pointer; text-decoration: none; color: inherit; transition: all 0.2s ease; }
    /* Make buttons functional with hover effects */
    button, a.btn { 
      cursor: pointer; 
      border: none; 
      font-family: inherit; 
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    button:hover, a.btn:hover { 
      transform: translateY(-2px); 
      filter: brightness(1.1);
    }
    button:active, a.btn:active { 
      transform: translateY(0); 
    }
    /* Smooth scroll for anchor links */
    [href^="#"] {
      scroll-behavior: smooth;
    }
    input, textarea, select { 
      outline: none; 
      font-family: inherit; 
      transition: all 0.2s ease;
    }
    input:focus, textarea:focus, select:focus { 
      border-color: #8B5CF6 !important; 
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    }
    img { max-width: 100%; height: auto; }
    
    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    @keyframes gradient {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    
    .animate-fadeIn { animation: fadeIn 0.6s ease-out forwards; }
    .animate-slideIn { animation: slideIn 0.6s ease-out forwards; }
    .animate-pulse { animation: pulse 2s ease-in-out infinite; }
    .animate-float { animation: float 3s ease-in-out infinite; }
    .animate-gradient { 
      background-size: 200% auto;
      animation: gradient 3s ease infinite;
    }
    .animate-shimmer {
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
      background-size: 200% 100%;
      animation: shimmer 2s infinite;
    }
    
    /* Hover effects */
    .hover-lift:hover { transform: translateY(-4px); box-shadow: 0 10px 40px rgba(0,0,0,0.15); }
    .hover-glow:hover { box-shadow: 0 0 30px rgba(139, 92, 246, 0.3); }
    .hover-scale:hover { transform: scale(1.02); }
    
    /* Utility classes */
    .glass { 
      background: rgba(255, 255, 255, 0.1); 
      backdrop-filter: blur(10px); 
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .gradient-text {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  </style>
</head>
<body class="antialiased">
  ${html}
  <script>
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').slice(1);
        const target = document.getElementById(targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
    
    // Mobile menu toggle
    document.querySelectorAll('[data-mobile-menu-toggle]').forEach(btn => {
      btn.addEventListener('click', function() {
        const menu = document.querySelector('[data-mobile-menu]');
        if (menu) {
          menu.classList.toggle('hidden');
        }
      });
    });
    
    // Form handling
    document.querySelectorAll('form').forEach(form => {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        if (btn) {
          const originalText = btn.innerHTML;
          btn.innerHTML = 'Enviado!';
          btn.style.background = '#10B981';
          setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
            form.reset();
          }, 2000);
        }
      });
    });
    
    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fadeIn');
        }
      });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('section').forEach(section => {
      observer.observe(section);
    });
  <\/script>
</body>
</html>`
    } catch (error) {
      console.error("[v0] Preview generation error:", error)
      return getErrorHtml("Erro ao processar o código")
    }
  }, [])

  const getErrorHtml = (message: string) => `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: system-ui;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #1a1a1a;
      color: #fff;
      text-align: center;
      padding: 20px;
    }
    .error {
      background: #2a2a2a;
      padding: 40px;
      border-radius: 16px;
      border: 1px solid #333;
    }
    h2 { color: #f87171; margin-bottom: 16px; }
    p { opacity: 0.7; }
  </style>
</head>
<body>
  <div class="error">
    <h2>Erro no Preview</h2>
    <p>${message}</p>
    <p style="margin-top: 16px;">Clique em "Código" para ver o código gerado.</p>
  </div>
</body>
</html>`

  useEffect(() => {
    if (generatedCode) {
      const html = generatePreviewHtml(generatedCode)
      setPreviewHtml(html)
    }
  }, [generatedCode, generatePreviewHtml])

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
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-black to-[#1a1a2e] text-white overflow-hidden">
      <style>{\`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .pulse { animation: pulse 2s infinite; }
      \`}</style>
      
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#0a0a0f] flex items-center justify-center border-2 border-white font-bold">G</div>
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
            <div className="bg-[#0a0a0f]/50 backdrop-blur p-8 rounded-2xl border border-white/20">
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
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#001a3a] to-black text-white">
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
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
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
    <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Descreva o que você quer criar
        </h1>
        <p className="text-xl text-gray-400 mb-8">
          Seja específico! Por exemplo: "Crie um site de bijuterias da Maria" ou "Landing page para minha startup de IA"
        </p>
      </div>
    </div>
  )
}`
  }

  const saveProject = async (name: string, code: string) => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/builder/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: `Projeto criado em ${new Date().toLocaleDateString("pt-BR")}`,
          files: [
            {
              name: "Site.tsx",
              path: "/Site.tsx",
              content: code,
              language: "tsx",
            },
          ],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        await loadProjects()
        setActiveProject(data.project)
        // Save the initial message after creating a project
        if (data.project) {
          await saveChatMessage("assistant", `Projeto "${data.project.name}" criado com sucesso!`, code)
        }
        return data.project
      }
    } catch (err) {
      console.error("Error saving project:", err)
    } finally {
      setIsSaving(false)
    }
    return null
  }

  const updateProject = async (projectId: string, code: string) => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/builder/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: [
            {
              name: "Site.tsx",
              path: "/Site.tsx",
              content: code,
              language: "tsx",
            },
          ],
        }),
      })

      if (res.ok) {
        await loadProjects()
      }
    } catch (err) {
      console.error("Error updating project:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendMessage = async () => {
    if ((!input.trim() && !attachedImage) || isLoading) return

    // Handle unlimited credits display
    const creditsNeeded = 1 // Assuming each generation costs 1 credit
    if (userCredits !== -1 && userCredits < creditsNeeded && profile?.plan !== "pro") {
      setError("Créditos insuficientes. Faça upgrade para Pro ou aguarde amanhã.")
      setShowUpgradeModal(true) // Show upgrade modal
      return
    }

    const currentInput = input
    const currentImage = attachedImage

    setInput("")
    setAttachedImage(null)

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: currentInput,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setError(null)
    setIsLoading(true)
    setThoughts([{ id: "initial", type: "thinking", message: "Pensando em como criar seu site...", status: "active" }])

    // Save user message to chat history
    await saveChatMessage("user", currentInput)

    let lastError: Error | null = null
    let retries = 0
    const MAX_RETRIES = 3
    const TIMEOUT_MS = 120000 // 2 minutos timeout
    let fullResponse = ""

    while (retries < MAX_RETRIES) {
      try {
        const projectContext = activeProject?.builder_files || []
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

        const res = await fetch("/api/builder/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: currentInput,
            image_url: currentImage,
            projectContext, // Use the correctly scoped projectContext
            history: messages.slice(-4).map((m) => ({ role: m.role, content: m.content })),
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!res.ok) {
          const errorText = await res.text().catch(() => "Erro desconhecido")
          lastError = new Error(`Erro ${res.status}: ${errorText}`)
          retries++

          if (retries < MAX_RETRIES) {
            setError(`Tentando novamente... (${retries}/${MAX_RETRIES})`)
            updateThought(
              "initial",
              "thinking",
              `Erro: ${lastError.message}. Tentando novamente (${retries}/${MAX_RETRIES})...`,
            )
            await new Promise((resolve) => setTimeout(resolve, 2000 * retries))
            continue
          } else {
            throw lastError
          }
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error("Failed to get response reader")

        let thoughtId: string | null = null
        let thoughtStarted = false

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = new TextDecoder().decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.substring(6)
              if (data === "[DONE]") break // End of stream

              try {
                const parsedData = JSON.JSON.parse(data) // Use JSON.parse for better error handling
                const delta = parsedData.choices?.[0]?.delta?.content
                const toolCalls = parsedData.choices?.[0]?.delta?.tool_calls

                if (toolCalls) {
                  // Handle tool calls for thoughts, etc.
                  for (const call of toolCalls) {
                    if (call.type === "function" && call.function.name === "add_thought") {
                      const args = JSON.parse(call.function.arguments)
                      if (!thoughtStarted) {
                        thoughtId = addThought(args.type, args.message)
                        thoughtStarted = true
                      } else {
                        // Update existing thought if needed, or add another
                        updateThought(thoughtId!, args.type, args.message)
                      }
                    } else if (call.type === "function" && call.function.name === "update_thought") {
                      const args = JSON.parse(call.function.arguments)
                      updateThought(args.id, args.status, args.duration)
                    }
                  }
                }

                if (delta) {
                  fullResponse += delta
                  // Update message content incrementally
                  setMessages((prev) => {
                    const updatedMessages = [...prev]
                    const lastMessage = updatedMessages[updatedMessages.length - 1]
                    if (lastMessage && lastMessage.role === "assistant") {
                      lastMessage.content = fullResponse
                    } else {
                      // If no assistant message yet, create one
                      updatedMessages.push({
                        id: (Date.now() + 1).toString(),
                        role: "assistant",
                        content: fullResponse,
                        timestamp: new Date(),
                      })
                    }
                    return updatedMessages
                  })
                }
              } catch (e) {
                console.error("Error parsing chunk:", e, data)
              }
            }
          }
        }

        // After the loop finishes, the fullResponse is complete
        if (fullResponse) {
          // Extract code block using regex, ensuring it handles various code block styles
          const codeBlockMatch = fullResponse.match(/```(?:tsx|jsx|javascript|html|css)\n([\s\S]*?)\n```/s)
          setGeneratedCode(codeBlockMatch ? codeBlockMatch[1] : "")

          // Auto-save to project
          if (activeProject) {
            await updateProject(activeProject.id, generatedCode || "")
          } else {
            // Create new project
            const projectName =
              currentInput
                .substring(0, 50)
                .replace(/[^a-zA-Z0-9 ]/g, "")
                .trim() || "Novo Projeto"
            const newProject = await saveProject(projectName, generatedCode || "")
            if (!newProject) throw new Error("Falha ao criar novo projeto.")
          }

          // Save assistant message to database
          if (fullResponse) {
            await saveChatMessage("assistant", fullResponse, generatedCode || "")
          }

          // Update credits
          if (userCredits !== -1) {
            // Only deduct if not unlimited
            const newCredits = userCredits - creditsNeeded
            setUserCredits(newCredits)
            if (typeof window !== "undefined") {
              localStorage.setItem(`builder_credits_${user.id}`, newCredits.toString())
            }
          }

          if (window.innerWidth < 1024) {
            setMobileView("preview")
          }
          return // Success - exit retry loop
        } else {
          throw new Error("Resposta vazia da API")
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        retries++

        if (retries < MAX_RETRIES) {
          if (lastError.name === "AbortError") {
            setError(`Tempo limite excedido... Tentando novamente (${retries}/${MAX_RETRIES})`)
            updateThought(
              "initial",
              "thinking",
              `Tempo limite excedido. Tentando novamente (${retries}/${MAX_RETRIES})...`,
            )
          } else {
            setError(`Erro: ${lastError.message}. Tentando novamente (${retries}/${MAX_RETRIES})`)
            updateThought(
              "initial",
              "thinking",
              `Erro: ${lastError.message}. Tentando novamente (${retries}/${MAX_RETRIES})...`,
            )
          }
          await new Promise((resolve) => setTimeout(resolve, 2000 * retries))
        }
      } finally {
        setIsLoading(false)
        setThoughts([]) // Clear thoughts after processing
        if (retries >= MAX_RETRIES) {
          if (lastError) {
            if (lastError.name === "AbortError") {
              setError(
                "Tempo limite excedido mesmo após 3 tentativas. Tente um prompt mais simples ou verifique sua conexão.",
              )
            } else {
              setError(lastError.message || "Erro ao gerar o site após 3 tentativas.")
            }
          } else {
            setError("Erro ao gerar o site. Tente novamente.")
          }
        }
      }
    }
  }

  const handleLoadProject = (project: Project) => {
    setActiveProject(project)
    setActiveTab("chat")

    const mainFile = project.builder_files?.find((f) => f.name === "Site.tsx" || f.path === "/Site.tsx")
    if (mainFile) {
      setGeneratedCode(mainFile.content)
    }

    setMessages([
      {
        id: "loaded",
        role: "assistant",
        content: `Projeto "${project.name}" carregado! Você pode continuar editando ou fazer modificações.`,
        timestamp: new Date(),
      },
    ])
  }

  const handleDeleteProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/builder/projects/${projectId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId))
        if (activeProject?.id === projectId) {
          setActiveProject(null)
          setGeneratedCode("")
          setPreviewHtml("")
          setMessages([])
        }
      }
    } catch (err) {
      console.error("Error deleting project:", err)
    }
  }

  const handleRenameProject = async (projectId: string, newName: string) => {
    setIsSaving(true) // Set saving state
    try {
      const res = await fetch(`/api/builder/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      })

      if (res.ok) {
        setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, name: newName } : p)))
        if (activeProject?.id === projectId) {
          setActiveProject((prev) => (prev ? { ...prev, name: newName } : null))
        }
      }
    } catch (err) {
      console.error("Error renaming project:", err)
    } finally {
      setEditingProjectId(null)
      setIsSaving(false) // Reset saving state
    }
  }

  const handleNewProject = () => {
    setActiveProject(null)
    setGeneratedCode("")
    setPreviewHtml("")
    setMessages([])
    setInput("") // Clear input on new project
    setAttachedImage(null) // Clear attachment on new project
    setActiveTab("chat")
  }

  const handleCopyCode = () => {
    if (!generatedCode) return
    navigator.clipboard.writeText(generatedCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleDownloadCode = () => {
    if (!generatedCode) return
    const blob = new Blob([generatedCode], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${activeProject?.name || "site"}.tsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getDeviceWidth = () => {
    switch (deviceView) {
      case "mobile":
        return "375px"
      case "tablet":
        return "768px"
      default:
        return "100%"
    }
  }

  // Submit handler for the chat input
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault() // Prevent default form submission
    await handleSendMessage() // Call the actual message sending logic
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setAttachedImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read()
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type)
            const reader = new FileReader()
            reader.onload = (e) => {
              setAttachedImage(e.target?.result as string)
            }
            reader.readAsDataURL(blob)
            return
          }
        }
      }
    } catch (err) {
      console.error("Failed to read clipboard")
      setError("Não foi possível ler a área de transferência. Verifique as permissões.")
    }
  }

  const handleRemoveAttachment = () => {
    setAttachedImage(null)
  }

  const isPro = profile?.plan === "pro"

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50 bg-card/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium">Connext Builder</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 rounded-full text-xs">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            {/* Display unlimited credits with -1 */}
            <span className="text-purple-300">{userCredits === -1 ? "∞" : userCredits} créditos</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Preview/Code Toggle */}
          <div className="flex items-center bg-muted/50 rounded-lg p-1">
            <Button
              variant={previewMode === "preview" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreviewMode("preview")}
              className={cn("gap-1.5", previewMode === "preview" && "bg-purple-600")}
            >
              <Eye className="w-4 h-4" />
              Preview
            </Button>
            <Button
              variant={previewMode === "code" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreviewMode("code")}
              className={cn("gap-1.5", previewMode === "code" && "bg-purple-600")}
            >
              <Code className="w-4 h-4" />
              Código
            </Button>
          </div>

          {/* Device View */}
          <div className="hidden md:flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            <Button
              variant={deviceView === "desktop" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setDeviceView("desktop")}
            >
              <Monitor className="w-4 h-4" />
            </Button>
            <Button
              variant={deviceView === "tablet" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setDeviceView("tablet")}
            >
              <Tablet className="w-4 h-4" />
            </Button>
            <Button
              variant={deviceView === "mobile" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setDeviceView("mobile")}
            >
              <Smartphone className="w-4 h-4" />
            </Button>
          </div>

          {/* Fullscreen */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>

          {/* Share */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowShareModal(true)}
            disabled={!activeProject?.id}
          >
            <Share2 className="w-4 h-4" />
          </Button>

          {/* Publish */}
          <Button
            onClick={() => setShowPublishModal(true)}
            className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            disabled={!generatedCode}
          >
            <ExternalLink className="w-4 h-4" />
            Publicar
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Chat/Projects */}
        <div
          className={cn(
            "w-full md:w-[400px] flex flex-col border-r border-border/50 bg-card/30",
            isFullscreen && "hidden",
          )}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start px-3 py-2 bg-transparent border-b border-border/50">
              <TabsTrigger value="chat" className="gap-2 data-[state=active]:bg-purple-500/20">
                <Sparkles className="w-4 h-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="projects" className="gap-2 data-[state=active]:bg-purple-500/20">
                <FolderOpen className="w-4 h-4" />
                Projetos
              </TabsTrigger>
            </TabsList>

            {/* Chat Tab */}
            {activeTab === "chat" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {/* Thinking steps */}
                    {thoughts.length > 0 && (
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3 text-purple-400">
                          <Sparkles className="w-4 h-4" />
                          <span className="font-medium text-sm">Pensamentos</span>
                        </div>
                        <div className="space-y-2">
                          {thoughts.map((step) => (
                            <div key={step.id} className="flex items-center gap-3 text-sm">
                              {step.status === "active" ? (
                                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                              ) : step.status === "done" ? (
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-muted-foreground/30" />
                              )}
                              <span className={step.status === "active" ? "text-purple-300" : "text-muted-foreground"}>
                                {step.message}
                              </span>
                              {step.duration && (
                                <span className="text-xs text-muted-foreground ml-auto">{step.duration}ms</span>
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
                          "rounded-xl p-4",
                          message.role === "user"
                            ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white ml-8"
                            : "bg-muted/50 mr-8",
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <span className="text-xs opacity-60 mt-2 block">
                          {message.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-4 border-t border-border/50">
                  {error && (
                    <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  {/* Attachment Preview */}
                  {attachedImage && (
                    <div className="mb-3 relative inline-block">
                      <img
                        src={attachedImage || "/placeholder.svg"}
                        alt="Attached"
                        className="h-20 rounded-lg border border-border/50"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={handleRemoveAttachment}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit(e)}
                      disabled={isLoading}
                      placeholder="Descreva o que deseja criar..."
                      className="flex-1 bg-muted/50 border-purple-500/30 focus:border-purple-500 transition-colors"
                    />
                    <Button
                      type="submit" // Ensure it's a submit button
                      disabled={isLoading || (!input.trim() && !attachedImage)}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </form>

                  {/* Bottom options */}
                  <div className="flex items-center gap-3 mt-3">
                    {/* Attachment Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 gap-2 bg-transparent border-border/50 hover:bg-purple-500/10 hover:border-purple-500/30"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-xs">Anexar</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56 bg-card border-border/50">
                        <DropdownMenuItem
                          className="gap-3 cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <ImageIcon className="w-4 h-4 text-purple-400" />
                          <div>
                            <p className="font-medium text-sm">Upload de imagem</p>
                            <p className="text-xs text-muted-foreground">PNG, JPG, WebP</p>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-3 cursor-pointer" onClick={handlePasteFromClipboard}>
                          <Clipboard className="w-4 h-4 text-blue-400" />
                          <div>
                            <p className="font-medium text-sm">Colar da área de transferência</p>
                            <p className="text-xs text-muted-foreground">Ctrl+V ou Cmd+V</p>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-3 cursor-pointer"
                          onClick={() => {
                            const url = prompt("Digite a URL do site para copiar:")
                            if (url) setInput(`Crie um site similar a: ${url}`)
                          }}
                        >
                          <Link className="w-4 h-4 text-orange-400" />
                          <div>
                            <p className="font-medium text-sm">Copiar de URL</p>
                            <p className="text-xs text-muted-foreground">Clone um site existente</p>
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />

                    {/* Model indicator */}
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Claude Sonnet 4
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Projects Tab */}
            {activeTab === "projects" && (
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-2">
                  <Button
                    onClick={handleNewProject}
                    variant="outline"
                    className="w-full justify-start gap-2 mb-4 bg-transparent"
                  >
                    <Plus className="w-4 h-4" />
                    Novo Projeto
                  </Button>

                  {isLoadingProjects ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Nenhum projeto ainda</p>
                      <p className="text-sm">Crie seu primeiro site com IA!</p>
                    </div>
                  ) : (
                    projects.map((project) => (
                      <div
                        key={project.id}
                        className={cn(
                          "group flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 cursor-pointer transition-all",
                          activeProject?.id === project.id && "bg-purple-500/10 border-purple-500/30",
                        )}
                        onClick={() => handleLoadProject(project)}
                      >
                        <div className="flex-1 min-w-0">
                          {editingProjectId === project.id ? (
                            <Input
                              value={editingProjectName}
                              onChange={(e) => setEditingProjectName(e.target.value)}
                              onBlur={() => handleRenameProject(project.id, editingProjectName)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRenameProject(project.id, editingProjectName)
                                if (e.key === "Escape") setEditingProjectId(null)
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              className="h-7 text-sm"
                            />
                          ) : (
                            <>
                              <p className="font-medium text-sm truncate">{project.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(project.updated_at).toLocaleDateString("pt-BR")}
                              </p>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingProjectId(project.id)
                              setEditingProjectName(project.name)
                            }}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-300"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteProject(project.id)
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </Tabs>
        </div>

        {/* Right Panel - Preview/Code */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden" ref={previewContainerRef}>
          {previewMode === "preview" ? (
            <div className="flex-1 flex items-center justify-center p-4 bg-neutral-100">
              <div
                className="h-full bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300"
                style={{ width: getDeviceWidth(), maxWidth: "100%" }}
              >
                {previewHtml ? (
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-full border-0"
                    title="Preview"
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gradient-to-b from-neutral-50 to-neutral-100">
                    <div className="text-center max-w-md px-8">
                      <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                        <Sparkles className="w-12 h-12 text-purple-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-neutral-800 mb-3">Crie seu site com IA</h3>
                      <p className="text-neutral-500 mb-8">
                        Descreva o site que você deseja e o Connext Builder irá criar para você em segundos
                      </p>

                      {/* Quick suggestions */}
                      <div className="space-y-2">
                        <p className="text-xs text-neutral-400 uppercase tracking-wide mb-3">Sugestões rápidas</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {[
                            "Landing page moderna",
                            "Portfolio criativo",
                            "Loja virtual",
                            "Blog pessoal",
                            "Site de restaurante",
                          ].map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => setInput(suggestion)}
                              className="px-3 py-1.5 text-sm bg-white border border-neutral-200 rounded-full hover:border-purple-400 hover:bg-purple-50 transition-colors text-neutral-600 hover:text-purple-600"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
              <div className="flex items-center justify-end gap-2 p-2 border-b border-border/20">
                <Button variant="ghost" size="sm" onClick={handleCopyCode} className="gap-2 text-muted-foreground">
                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedCode ? "Copiado!" : "Copiar"}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDownloadCode} className="gap-2 text-muted-foreground">
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <pre className="p-4 text-sm text-green-400 font-mono">
                  <code>{generatedCode || "// O código gerado aparecerá aqui..."}</code>
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Upgrade para Pro</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowUpgradeModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="text-center py-6">
              <Crown className="w-16 h-16 mx-auto text-amber-400 mb-4" />
              <p className="text-muted-foreground mb-6">
                Você usou todos os seus créditos gratuitos. Faça upgrade para o plano Pro e tenha créditos ilimitados!
              </p>
              <Button
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500"
                onClick={() => (window.location.href = "/dashboard/upgrade")}
              >
                Fazer Upgrade
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal &&
        activeProject?.id && ( // Only show if an active project exists
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-2xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Compartilhar</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowShareModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">Compartilhe o link para visualização do seu projeto:</p>
                <div className="flex gap-2">
                  <Input
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/shared/${activeProject.id}`}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${typeof window !== "undefined" ? window.location.origin : ""}/shared/${activeProject.id}`,
                      )
                      setShareLinkCopied(true)
                      setTimeout(() => setShareLinkCopied(false), 2000)
                    }}
                  >
                    {shareLinkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Publicar Site</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowPublishModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Para publicar seu site com um domínio próprio, registre seu domínio .com.br no Registro.br.
              </p>
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Registrar Domínio:</h4>
                <a
                  href="https://registro.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  registro.br - Registre seu domínio .com.br
                </a>
                <p className="text-xs text-muted-foreground mt-2">
                  Após registrar seu domínio, você pode usar serviços como Vercel ou Netlify para hospedar seu site
                  gratuitamente.
                </p>
              </div>
              <Button
                onClick={handleCopyCode}
                className="w-full gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedCode ? "Código Copiado!" : "Copiar Código HTML"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
