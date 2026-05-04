import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import { ThemeRegistry } from '@/components/berry/ThemeRegistry'
import { AuthProvider } from '@/hooks/useAuth'
import { CompareProvider } from '@/context/CompareContext'

export const metadata: Metadata = {
  title: 'PartyHub – Premium Party Hall Booking',
  description: 'Book the perfect party hall with premium packages, real-time availability, and seamless payments. Your celebration, perfectly planned.',
  keywords: 'party hall booking, birthday celebration, private party venue, event hall rental India',
  manifest: '/manifest.json',
  openGraph: {
    title: 'PartyHub – Premium Party Hall Booking',
    description: 'Book your celebration venue in minutes. Choose from 6 curated packages, premium amenities & instant confirmation.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Blocking script: restores dark class BEFORE React hydrates — prevents flash & hydration mismatch */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var saved = localStorage.getItem('theme-mode');
              var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              if (saved === 'dark' || (!saved && prefersDark)) {
                document.documentElement.classList.add('dark');
                document.documentElement.setAttribute('data-theme', 'dark');
              } else {
                document.documentElement.classList.remove('dark');
                document.documentElement.setAttribute('data-theme', 'light');
              }
            } catch(e) {}
          })();
        `}} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeRegistry>
          <AuthProvider>
            <CompareProvider>
              {children}
              <Toaster position="top-right" richColors expand />
            </CompareProvider>
          </AuthProvider>
        </ThemeRegistry>
        {/* PWA service worker - Network-First for HTML, Cache-First for static assets */}
        <script dangerouslySetInnerHTML={{ __html: `
          if('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(reg => {
              // Force update check on page load
              reg.update();
              // If a new SW is waiting, activate it immediately
              if(reg.waiting) { reg.waiting.postMessage({type:'SKIP_WAITING'}); }
              reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if(newWorker) {
                  newWorker.addEventListener('statechange', () => {
                    if(newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                      newWorker.postMessage({type:'SKIP_WAITING'});
                    }
                  });
                }
              });
            });
          }
        `}} />
      </body>
    </html>
  )
}

