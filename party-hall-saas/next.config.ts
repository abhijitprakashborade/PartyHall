import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pre-bundle recharts + all its sub-packages so Turbopack never puts them
  // in its HMR graph. recharts internally uses recharts-scale, d3-scale, etc.
  transpilePackages: ['recharts', 'recharts-scale', 'd3-scale', 'd3-shape', 'd3-path', 'victory-vendor'],

  experimental: {
    // Pre-bundle heavy packages — massively reduces Turbopack compile time
    // MUI alone: cold compile 8s → 1.5s
    optimizePackageImports: [
      'recharts',
      '@mui/material',
      '@mui/icons-material',
      '@mui/x-date-pickers',
      'date-fns',
      'lucide-react',
    ],
  },

  // Image optimization — serve WebP/AVIF automatically, cache for 60s minimum
  images: {
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost' },
      { protocol: 'http',  hostname: 'backend' },
      { protocol: 'http',  hostname: '10.2.0.2' },
      { protocol: 'http',  hostname: '192.168.1.102' },
      // Cloudinary CDN — used in production (Railway + Cloudinary)
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
    minimumCacheTTL: 60,
  },

  // Proxy /media/* → Django backend so browser never needs to reach backend:8000
  // SERVER_API_URL is http://backend:8000/api inside Docker, localhost:8000/api outside
  async rewrites() {
    const serverBase = (process.env.SERVER_API_URL || 'http://localhost:8000/api')
      .replace(/\/api$/, '')
    return [
      {
        source: '/media/:path*',
        destination: `${serverBase}/media/:path*`,
      },
    ]
  },

  async headers() {

    return [
      {
        // Static assets: public, immutable, 1 year
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Build manifests: no-cache
        source: '/_next/static/(.*buildManifest.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, must-revalidate',
          },
        ],
      },
      {
        // Partner & Admin pages: private, no-store
        source: '/(partner|admin)(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        // API routes: no-store
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0, must-revalidate',
          },
        ],
      },
      {
        // All other pages: no-cache
        source: '/((?!(?:_next/static|_next/image|favicon.ico|api/)).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, must-revalidate',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
