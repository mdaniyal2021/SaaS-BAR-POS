import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl

  // Public routes — freely accessible
  // NOTE: /api/auth/seed is intentionally excluded — it must never be publicly accessible
  const publicRoutes = ['/login', '/api/auth/login', '/api/auth/logout']
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Skip static files and PWA assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/icons/') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js'
  ) {
    return NextResponse.next()
  }

  // Check for auth token
  const token = request.cookies.get('token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Decode JWT payload for routing decisions only.
  // Edge Runtime cannot run the full jsonwebtoken library, so we decode here
  // and verify signature in every API route via getUserFromRequest().
  // Even if someone forges the token, they see an empty UI — all API calls
  // will be rejected because getUserFromRequest() verifies the signature.
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid token format')
    }

    const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded        = base64Payload + '='.repeat((4 - base64Payload.length % 4) % 4)
    const payload       = JSON.parse(atob(padded))

    // Check token expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('token')
      return response
    }

    // Validate required fields exist in payload
    if (!payload.role || !payload.id) {
      throw new Error('Invalid token payload')
    }

    const role = payload.role

    // Superadmin-only routes
    if (pathname.startsWith('/superadmin') && role !== 'superadmin') {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Cashier-only routes — block everyone else
    if (pathname.startsWith('/cashier') && role !== 'cashier') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Admin routes — only admin role allowed
    const adminRoutes = ['/dashboard', '/pos', '/products', '/categories', '/inventory', '/staff', '/reports', '/settings']
    if (adminRoutes.some(route => pathname.startsWith(route))) {
      if (role === 'cashier') {
        return NextResponse.redirect(new URL('/cashier/pos', request.url))
      }
      if (role === 'superadmin') {
        return NextResponse.redirect(new URL('/superadmin/dashboard', request.url))
      }
    }

    return NextResponse.next()

  } catch (error) {
    // Invalid token — clear and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('token')
    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}