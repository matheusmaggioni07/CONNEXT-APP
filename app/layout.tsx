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
  title: "Connext - Plataforma de Networking para Jovens Empreendedores",
  description:
    "Conecte-se com jovens empreendedores, estudantes universitários, criadores de startups e estagiários. Videochamadas ao vivo, matches inteligentes e ferramentas para transformar ideias em realidade.",
  generator: "v0.app",
  manifest: "/manifest.json",
  keywords: [
    "jovens empreendedores",
    "startup networking",
    "estudantes universitários",
    "criadores de startup",
    "MVP",
    "empreendedorismo",
    "networking jovem",
    "videochamada",
    "connext",
    "plataforma startup",
    "estagiários",
    "mentalidade empreendedora",
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
    title: "Connext - Plataforma de Networking para Jovens Empreendedores",
    description:
      "Conecte-se com estudantes, criadores de startups e jovens empreendedores. Videochamadas, matches e ferramentas para executar ideias.",
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Connext - Networking para Jovens Empreendedores",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Connext - Plataforma de Networking para Jovens Empreendedores",
    description: "Conecte com jovens empreendedores e transforme ideias em negócios.",
    images: [`${siteUrl}/og-image.png`],
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
