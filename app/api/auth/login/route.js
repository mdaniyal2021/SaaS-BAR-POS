import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import '@/models/Bar'
import { generateToken } from '@/lib/auth'

// ── Simple in-memory rate limiter (per IP) ────────────────────────────────────
// Resets on server restart — sufficient for a single-server POS deployment
const loginAttempts = new Map() // ip → { count, firstAttempt }
const MAX_ATTEMPTS  = 10        // max failed attempts
const WINDOW_MS     = 15 * 60 * 1000 // 15-minute window

function getRealIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function isRateLimited(ip) {
  const now  = Date.now()
  const data = loginAttempts.get(ip)

  if (!data) return false

  // Window expired — reset
  if (now - data.firstAttempt > WINDOW_MS) {
    loginAttempts.delete(ip)
    return false
  }

  return data.count >= MAX_ATTEMPTS
}

function recordFailedAttempt(ip) {
  const now  = Date.now()
  const data = loginAttempts.get(ip)

  if (!data || now - data.firstAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now })
  } else {
    data.count++
  }
}

function clearAttempts(ip) {
  loginAttempts.delete(ip)
}

export async function POST(request) {
  try {
    const ip = getRealIp(request)

    // ── Rate limit check ───────────────────────────────────────────────────────
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
        { status: 429 }
      )
    }

    await connectDB()

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      )
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).populate('bar')

    if (!user) {
      recordFailedAttempt(ip)
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: 'Your account has been deactivated. Please contact admin.' },
        { status: 403 }
      )
    }

    if (user.role !== 'superadmin' && user.bar) {
      if (!user.bar.isActive) {
        return NextResponse.json(
          { success: false, message: 'This bar account has been deactivated. Please contact super admin.' },
          { status: 403 }
        )
      }

      const now = new Date()
      const expired =
        user.bar.subscription.status === 'expired' ||
        (user.bar.subscription.expiryDate && new Date(user.bar.subscription.expiryDate) < now)

      if (expired) {
        await user.bar.updateOne({ 'subscription.status': 'expired' })
        return NextResponse.json(
          { success: false, message: 'Bar subscription has expired. Please contact super admin.' },
          { status: 403 }
        )
      }
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      recordFailedAttempt(ip)
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Successful login — clear failed attempts for this IP
    clearAttempts(ip)

    user.lastLogin = new Date()
    await user.save()

    const token = generateToken({
      id:      user._id,
      name:    user.name,
      email:   user.email,
      role:    user.role,
      barId:   user.bar?._id  || null,
      barName: user.bar?.name || null,
    })

    let redirectUrl = '/dashboard'
    if (user.role === 'superadmin') redirectUrl = '/superadmin/dashboard'
    if (user.role === 'cashier')    redirectUrl = '/cashier/pos'

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id:      user._id,
        name:    user.name,
        email:   user.email,
        role:    user.role,
        barId:   user.bar?._id  || null,
        barName: user.bar?.name || null,
      },
      redirectUrl,
    })

    response.cookies.set('token', token, {
      httpOnly: true,                                         // JS cannot read this cookie
      secure:   process.env.NODE_ENV === 'production',       // HTTPS only in prod
      sameSite: 'strict',                                    // No cross-site requests
      maxAge:   7 * 24 * 60 * 60,
      path:     '/',
    })

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, message: 'Server error. Please try again.' },
      { status: 500 }
    )
  }
}
