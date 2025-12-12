/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  productionBrowserSourceMaps: false,
  
  poweredByHeader: false,
  
  compress: true,

  // Headers and redirects are handled in proxy.ts
}

export default nextConfig
