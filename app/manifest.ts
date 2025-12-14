import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Connext - Networking Profissional",
    short_name: "Connext",
    description:
      "1ª plataforma web de networking profissional via videochamada. Conecte-se instantaneamente com profissionais da sua área.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#d946ef",
    orientation: "portrait-primary",
    scope: "/",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["business", "social", "productivity", "networking"],
    icons: [
      {
        src: "/connext-logo-icon.png",
        sizes: "48x48",
        type: "image/png",
      },
      {
        src: "/connext-logo-icon.png",
        sizes: "72x72",
        type: "image/png",
      },
      {
        src: "/connext-logo-icon.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: "/connext-logo-icon.png",
        sizes: "128x128",
        type: "image/png",
      },
      {
        src: "/icon-192.jpg",
        sizes: "192x192",
        type: "image/jpeg",
        purpose: "maskable",
      },
      {
        src: "/icon-512.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/og-image.png",
        sizes: "1200x630",
        type: "image/png",
        form_factor: "wide",
      },
    ],
    shortcuts: [
      {
        name: "Descobrir",
        short_name: "Descobrir",
        description: "Descobrir novos profissionais",
        url: "/dashboard",
        icons: [{ src: "/connext-logo-icon.png", sizes: "96x96" }],
      },
      {
        name: "Videochamada",
        short_name: "Video",
        description: "Iniciar videochamada",
        url: "/dashboard/video",
        icons: [{ src: "/connext-logo-icon.png", sizes: "96x96" }],
      },
      {
        name: "Matches",
        short_name: "Matches",
        description: "Ver seus matches",
        url: "/dashboard/matches",
        icons: [{ src: "/connext-logo-icon.png", sizes: "96x96" }],
      },
      {
        name: "Builder",
        short_name: "Builder",
        description: "Criar sites com IA",
        url: "/dashboard/builder",
        icons: [{ src: "/connext-logo-icon.png", sizes: "96x96" }],
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  }
}
