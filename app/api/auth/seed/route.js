import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'

export async function GET() {
  // SECURITY: Seed route is disabled in production
  // Only works in development mode
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, message: 'Not available in production.' },
      { status: 403 }
    )
  }

  try {
    await connectDB()

    const existing = await User.findOne({ role: 'superadmin' })
    if (existing) {
      return NextResponse.json({
        success: false,
        message: 'Super admin already exists. Use the login page.'
      })
    }

    await User.create({
      name: 'Super Admin',
      email: process.env.SUPERADMIN_EMAIL || 'admin@barpos.com',
      password: process.env.SUPERADMIN_PASSWORD || 'admin123',
      role: 'superadmin',
    })

    return NextResponse.json({
      success: true,
      message: 'Super admin created successfully. Check your .env.local for credentials.',
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}