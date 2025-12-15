import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SiteProtection } from "@/components/site-protection"
import "./globals.css"

const _inter = Inter({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

const siteUrl = "https://www.connextapp.com.br"

export const metadata: Metadata = {
  title: "Connext - 1ª Plataforma de Networking Profissional via Videochamada",
  description:
    "A primeira plataforma de networking profissional via videochamada do Brasil. Conecte-se instantaneamente com empreendedores, investidores e profissionais. Match por interesses, videochamadas HD e criação de sites com IA.",
  generator: "v0.app",
  manifest: "/manifest.json",
  keywords: [
    "networking profissional",
    "videochamada",
    "networking via video",
    "conexões profissionais",
    "negócios",
    "empreendedorismo",
    "investidores",
    "connext",
    "primeira plataforma",
    "networking brasil",
  ],
  authors: [{ name: "Connext App" }],
  creator: "Connext",
  publisher: "Connext",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "Connext",
    title: "Connext - 1ª Plataforma de Networking Profissional via Videochamada",
    description:
      "A primeira plataforma de networking profissional via videochamada do Brasil. Conecte-se com empreendedores e investidores em tempo real.",
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Connext - Networking Profissional via Videochamada",
        type: "image/png",
      },
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "Connext - Networking Profissional via Videochamada",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Connext - 1ª Plataforma de Networking Profissional via Videochamada",
    description: "A primeira plataforma de networking profissional via videochamada do Brasil.",
    images: [`${siteUrl}/og-image.png`],
    creator: "@connextapp",
    site: "@connextapp",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Connext",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/connext-logo-icon.png", sizes: "32x32", type: "image/png" },
      { url: "/connext-logo-icon.png", sizes: "96x96", type: "image/png" },
      { url: "/connext-logo-icon.png", sizes: "192x192", type: "image/png" },
      { url: "/connext-logo-icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/connext-logo-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/connext-logo-icon.png",
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
  verification: {
    google: "google-site-verification-code", // Replace with your actual verification code
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
