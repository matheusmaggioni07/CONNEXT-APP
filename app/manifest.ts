import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Connext - Networking Profissional",
    short_name: "Connext",
    description:
      "Conecte-se com profissionais da sua área via videochamadas em tempo real. Match por interesses e filtros de localização.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#d946ef",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.jpg",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.jpg",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/screenshot-mobile.png",
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow",
      },
      {
        src: "/screenshot-desktop.png",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
      },
    ],
    categories: ["business", "social", "productivity"],
    lang: "pt-BR",
    dir: "ltr",
  }
}
