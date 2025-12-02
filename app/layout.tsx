import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SiteProtection } from "@/components/site-protection"
import "./globals.css"

const _inter = Inter({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Connext - Networking Profissional via Videochamadas",
  description:
    "Conecte-se instantaneamente com profissionais da sua área através de videochamadas 1v1. Faça networking de verdade, expanda sua rede e crie oportunidades de negócio em tempo real.",
  generator: "v0.app",
  manifest: "/manifest.json",
  keywords: ["networking", "profissional", "videochamada", "negócios", "conexões", "carreira", "empreendedorismo"],
  authors: [{ name: "Connext App" }],
  creator: "Connext",
  publisher: "Connext",
  metadataBase: new URL("https://www.connextapp.com.br"),
  alternates: {
    canonical: "https://www.connextapp.com.br",
  },
  // Open Graph - para Facebook, WhatsApp, LinkedIn, etc.
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://www.connextapp.com.br",
    siteName: "Connext",
    title: "Connext - Networking Profissional via Videochamadas",
    description:
      "Conecte-se instantaneamente com profissionais da sua área através de videochamadas 1v1. Faça networking de verdade e crie oportunidades de negócio.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Connext - Networking Profissional",
      },
    ],
  },
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Connext - Networking Profissional via Videochamadas",
    description: "Conecte-se instantaneamente com profissionais através de videochamadas 1v1.",
    images: ["/og-image.jpg"],
    creator: "@connextapp",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Connext",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.jpg", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.jpg", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.jpg", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.jpg", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.jpg",
    shortcut: "/favicon.ico",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={`font-sans antialiased`}>
        <SiteProtection />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
