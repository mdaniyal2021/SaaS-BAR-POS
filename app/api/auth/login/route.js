import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import '@/models/Bar'
import { generateToken } from '@/lib/auth'

export async function POST(request) {
  try {
    await connectDB()

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      )
    }

    const user = await User.findOne({ email }).populate('bar')

    if (!user) {
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
        // Auto-update status in DB so dashboard reflects correctly
        await user.bar.updateOne({ 'subscription.status': 'expired' })
        return NextResponse.json(
          { success: false, message: 'Bar subscription has expired. Please contact super admin.' },
          { status: 403 }
        )
      }
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    user.lastLogin = new Date()
    await user.save()

    const token = generateToken({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      barId: user.bar?._id || null,
      barName: user.bar?.name || null,
    })

    let redirectUrl = '/dashboard'
    if (user.role === 'superadmin') redirectUrl = '/superadmin/dashboard'
    if (user.role === 'cashier') redirectUrl = '/cashier/pos'

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        barId: user.bar?._id || null,
        barName: user.bar?.name || null,
      },
      redirectUrl,
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
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