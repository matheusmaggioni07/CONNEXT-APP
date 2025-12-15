import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Connext - Networking Profissional via Videochamada"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default async function TwitterImage() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Background decoration */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "radial-gradient(circle at 20% 80%, rgba(236, 72, 153, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(249, 115, 22, 0.15) 0%, transparent 50%)",
          display: "flex",
        }}
      />

      {/* Main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px",
          zIndex: 10,
        }}
      >
        {/* Logo icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "120px",
            height: "120px",
            borderRadius: "24px",
            background: "linear-gradient(135deg, #ec4899 0%, #f97316 100%)",
            boxShadow: "0 20px 40px rgba(236, 72, 153, 0.3)",
          }}
        >
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>

        {/* Brand name */}
        <div
          style={{
            display: "flex",
            fontSize: "72px",
            fontWeight: 800,
            background: "linear-gradient(135deg, #ec4899 0%, #f97316 100%)",
            backgroundClip: "text",
            color: "transparent",
            letterSpacing: "-2px",
          }}
        >
          Connext
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            fontSize: "28px",
            color: "rgba(255,255,255,0.9)",
            fontWeight: 500,
            textAlign: "center",
            maxWidth: "800px",
          }}
        >
          1ª Plataforma de Networking Profissional via Videochamada
        </div>
      </div>

      {/* URL */}
      <div
        style={{
          position: "absolute",
          bottom: "40px",
          display: "flex",
          fontSize: "20px",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        connextapp.com.br
      </div>
    </div>,
    {
      ...size,
    },
  )
}
