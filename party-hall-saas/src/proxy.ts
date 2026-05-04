import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that NEVER need auth — skip the auth check entirely
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/about',
  '/halls',
  '/offline',
]

// Path prefixes that are always public
const PUBLIC_PREFIXES = [
  '/halls/',         // /halls/<slug> — public detail pages
  '/api/auth/',      // login / register / refresh endpoints
  '/api/halls/',     // public hall listing API
  '/api/reviews/',   // public reviews
  '/_next/',         // Next.js internals — always skip
  '/media/',         // uploaded images — always public, never need auth
  '/favicon',
  '/static',
  '/sw.js',
  '/manifest.json',
]

function isPublic(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true
  return PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always skip public routes — explicitly prevents the /login redirect loop
  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  // Only /admin, /partner, /account, /book, /booking, /review, /user need auth
  const token = request.cookies.get('ph_access')?.value

  if (!token) {
    // Guard: never redirect /login back to /login
    if (pathname === '/login') return NextResponse.next()

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Use 'redirect' — matches what the login page reads via searchParams.get('redirect')
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Authenticated — set private cache for protected pages
  const response = NextResponse.next()
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')
  return response
}

export const config = {
  matcher: [
    // Match everything except Next.js static files, images, and media
    '/((?!_next/static|_next/image|favicon.ico|media/|.*\.png$|.*\.ico$|sw\.js|manifest\.json).*)',
  ],
}
