"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  role: "user" | "assistant"
  content: string
}

const FAQ_RESPONSES: Record<string, string> = {
  // Perguntas sobre o Connext
  "o que é o connext":
    "O Connext é a primeira plataforma de networking profissional via video chamada, matches e criação de sites com IA. Conectamos profissionais em tempo real e oferecemos o Connext Builder para criar sites profissionais em segundos.",
  "o que é connext":
    "O Connext é a primeira plataforma de networking profissional via video chamada, matches e criação de sites com IA. Conectamos profissionais em tempo real e oferecemos o Connext Builder para criar sites profissionais em segundos.",
  "como funciona":
    "É simples! 1) Crie seu perfil, 2) Entre na videochamada para encontrar matches, 3) Quando der match mútuo, você recebe o WhatsApp, 4) Use o Connext Builder para criar sites incríveis com IA!",
  "como usar":
    "Para usar o Connext: faça login, vá em 'Videochamada' para matches ou 'Builder' para criar sites. Se gostar de alguém na videochamada, clique em 'Connect' para dar match!",

  // Sobre o Builder
  builder:
    "O Connext Builder é nossa ferramenta de criação de sites com IA. Você descreve o que quer criar e a IA gera um site profissional completo em segundos! Sites escuros por padrão, design premium tipo Apple/Stripe.",
  "connext builder":
    "O Connext Builder é a ferramenta mais poderosa de criação de sites com IA. Descreva sua ideia e receba um site profissional instantaneamente. Você pode visualizar, editar e publicar!",
  "criar site":
    "Para criar um site: vá em 'Builder' no menu, descreva o que deseja (ex: 'landing page para startup de IA') e a IA cria instantaneamente. Sites com design premium, fundo escuro e totalmente profissionais!",
  "como criar site":
    "É muito fácil! Acesse o Builder, digite o que deseja criar (ex: 'site para restaurante japonês') e clique em enviar. Em segundos você terá um site profissional completo!",
  "publicar site":
    "No plano Pro você pode publicar seus sites diretamente na web. No plano Free, você pode baixar o código e hospedar onde preferir. Use o botão 'Publicar' no Builder!",
  sites:
    "O Connext Builder cria sites profissionais com IA. Design premium com fundo escuro, animações, gradientes e tudo que você precisa. Perfeito para landing pages, portfolios, startups e mais!",

  // Sobre planos - atualizado com Builder
  "plano free":
    "O plano Free inclui: 5 videochamadas/dia, 10 matches/dia, 20 créditos/mês no Builder para criar sites, e integração WhatsApp. 100% gratuito, sem cartão de crédito!",
  "plano pro":
    "O plano Pro (R$49/mês) oferece: videochamadas e matches ilimitados, Builder ilimitado, publicação de sites, perfil verificado, prioridade no matching, filtros avançados e suporte 24/7.",
  "quanto custa":
    "O Connext tem plano gratuito com 5 videochamadas/dia e 20 créditos/mês no Builder. O plano Pro custa R$49/mês com tudo ilimitado. Teste 7 dias grátis!",
  créditos:
    "Créditos são usados no Builder. No plano Free você tem 20/mês. Cada geração de site consome 1 crédito. No Pro é ilimitado!",

  // Sobre videochamada
  videochamada:
    "A videochamada funciona direto no navegador, sem downloads. Permita câmera e microfone. Você vê profissionais em tempo real e pode dar match!",
  camera:
    "Para usar a câmera, permita o acesso quando o navegador solicitar. Se não funcionar, verifique as configurações do seu navegador.",
  microfone: "O microfone é ativado automaticamente. Você pode mutar/desmutar clicando no ícone durante a chamada.",
  "não funciona":
    "Se algo não está funcionando, tente: 1) Permitir câmera e microfone, 2) Usar Chrome ou Firefox, 3) Recarregar a página. Ainda com problemas? Email: connextapp.oficial@gmail.com",

  // Sobre match
  match:
    "O match acontece quando você e outra pessoa clicam em 'Connect'. Quando isso acontece, vocês recebem o WhatsApp um do outro para continuar conversando e fazer negócios!",
  whatsapp:
    "Após um match mútuo, um botão aparece para iniciar conversa no WhatsApp usando o número cadastrado na plataforma.",

  // Sobre indicação
  indicar:
    "Indique amigos e ganhe R$10 em créditos por cadastro! Acesse 'Indicar Amigos' no menu para pegar seu link exclusivo. Acumule até R$200/mês!",
  indicação:
    "O programa de indicação está em 'Indicar Amigos' no menu. Compartilhe seu link e ganhe R$10 por cada amigo que se cadastrar!",

  // Contato
  contato: "Você pode entrar em contato pelo email: connextapp.oficial@gmail.com. Respondemos em até 24 horas!",
  suporte: "Para suporte, envie email para connextapp.oficial@gmail.com. Usuários Pro têm prioridade no atendimento!",
  ajuda:
    "Posso ajudar com: como usar o Connext, videochamadas, matches, Builder (criação de sites), planos, indicações e muito mais. O que você precisa saber?",

  // Sobre o criador
  "quem criou":
    "O Connext foi desenvolvido por Matheus Maggioni. Uma plataforma brasileira de networking profissional e criação de sites com IA.",
  desenvolvedor:
    "O Connext foi desenvolvido por Matheus Maggioni, empreendedor brasileiro que criou a plataforma para revolucionar o networking profissional.",
}

function findBestResponse(query: string): string {
  const normalizedQuery = query.toLowerCase().trim()

  // Check for exact or partial matches
  for (const [key, response] of Object.entries(FAQ_RESPONSES)) {
    if (normalizedQuery.includes(key) || key.includes(normalizedQuery)) {
      return response
    }
  }

  // Check for keywords
  if (normalizedQuery.includes("preço") || normalizedQuery.includes("valor")) {
    return FAQ_RESPONSES["quanto custa"]
  }
  if (normalizedQuery.includes("grátis") || normalizedQuery.includes("gratuito")) {
    return FAQ_RESPONSES["plano free"]
  }
  if (normalizedQuery.includes("video") || normalizedQuery.includes("chamada")) {
    return FAQ_RESPONSES["videochamada"]
  }
  if (normalizedQuery.includes("funciona") || normalizedQuery.includes("usar")) {
    return FAQ_RESPONSES["como funciona"]
  }
  if (normalizedQuery.includes("problema") || normalizedQuery.includes("erro") || normalizedQuery.includes("bug")) {
    return FAQ_RESPONSES["não funciona"]
  }
  if (normalizedQuery.includes("site") || normalizedQuery.includes("criar") || normalizedQuery.includes("landing")) {
    return FAQ_RESPONSES["criar site"]
  }
  if (normalizedQuery.includes("builder") || normalizedQuery.includes("ia") || normalizedQuery.includes("gerar")) {
    return FAQ_RESPONSES["builder"]
  }
  if (normalizedQuery.includes("publicar") || normalizedQuery.includes("hospeda")) {
    return FAQ_RESPONSES["publicar site"]
  }
  if (
    normalizedQuery.includes("matheus") ||
    normalizedQuery.includes("maggioni") ||
    normalizedQuery.includes("criou") ||
    normalizedQuery.includes("fez")
  ) {
    return FAQ_RESPONSES["quem criou"]
  }

  // Default response
  return "Não entendi completamente sua pergunta. Posso ajudar com: como usar o Connext, videochamadas, matches, Connext Builder (criação de sites com IA), planos (Free e Pro), indicação de amigos, e suporte técnico. Pode reformular sua pergunta?"
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Olá! Sou o assistente do Connext. Como posso ajudar você hoje? Posso responder sobre videochamadas, matches, o Connext Builder (criar sites com IA), planos e muito mais!",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    // Simulate typing delay
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500))

    const response = findBestResponse(userMessage)
    setMessages((prev) => [...prev, { role: "assistant", content: response }])
    setIsLoading(false)
  }

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full gradient-bg text-white shadow-lg hover:scale-110 transition-all flex items-center justify-center",
          isOpen && "hidden",
        )}
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)] h-[500px] max-h-[calc(100vh-120px)] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">Assistente Connext</p>
                <p className="text-xs text-muted-foreground">Online agora</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, i) => (
              <div key={i} className={cn("flex gap-2", message.role === "user" ? "flex-row-reverse" : "flex-row")}>
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    message.role === "user" ? "bg-primary text-white" : "gradient-bg text-white",
                  )}
                >
                  {message.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                    message.role === "user" ? "bg-primary text-white rounded-tr-none" : "bg-muted rounded-tl-none",
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border bg-card">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
