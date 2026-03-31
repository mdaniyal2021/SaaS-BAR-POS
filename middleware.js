import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl

  // Public routes — freely accessible
  const publicRoutes = ['/login', '/api/auth/login', '/api/auth/seed']
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Skip static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next()
  }

  // Check for auth token
  const token = request.cookies.get('token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Manually decode JWT (jsonwebtoken is not supported in the Edge runtime)
  try {
    const base64Payload = token.split('.')[1]
    const payload = JSON.parse(atob(base64Payload))

    // Check token expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('token')
      return response
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

    // Admin routes — only admin role allowed (cashier and superadmin are blocked)
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
