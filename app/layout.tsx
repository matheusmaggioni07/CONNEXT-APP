import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SiteProtection } from "@/components/site-protection"
import "./globals.css"

const _inter = Inter({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Connext - 1° Plataforma Web de Networking Profissional via Videochamada",
  description:
    "1° plataforma web de networking profissional via videochamada. Conecte-se instantaneamente com profissionais da sua área e crie oportunidades de negócio em tempo real.",
  generator: "v0.app",
  manifest: "/manifest.json",
  keywords: [
    "networking",
    "profissional",
    "videochamada",
    "negócios",
    "conexões",
    "carreira",
    "empreendedorismo",
    "connext",
  ],
  authors: [{ name: "Connext App" }],
  creator: "Connext",
  publisher: "Connext",
  metadataBase: new URL("https://www.connextapp.com.br"),
  alternates: {
    canonical: "https://www.connextapp.com.br",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://www.connextapp.com.br",
    siteName: "Connext",
    title: "Connext - 1° Plataforma Web de Networking Profissional via Videochamada",
    description:
      "1° plataforma web de networking profissional via videochamada. Conecte-se instantaneamente com profissionais e crie oportunidades de negócio.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Connext - Networking Profissional via Videochamada",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Connext - 1° Plataforma Web de Networking Profissional via Videochamada",
    description: "1° plataforma web de networking profissional via videochamada.",
    images: ["/og-image.png"],
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
      { url: "/connext-logo-icon.png", sizes: "32x32", type: "image/png" },
      { url: "/connext-logo-icon.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/connext-logo-icon.png",
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
    <html lang="pt-BR" className="dark">
      <body className={`font-sans antialiased`}>
        <SiteProtection />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
