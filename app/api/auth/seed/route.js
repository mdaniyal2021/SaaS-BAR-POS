import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'

export async function GET() {
  // This route is disabled in production — only for initial local dev setup
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, message: 'Not found' },
      { status: 404 }
    )
  }

  const email    = process.env.SUPERADMIN_EMAIL
  const password = process.env.SUPERADMIN_PASSWORD

  // Refuse to run if env vars are missing — never use hardcoded defaults
  if (!email || !password) {
    return NextResponse.json(
      { success: false, message: 'SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set in .env.local' },
      { status: 500 }
    )
  }

  try {
    await connectDB()

    const existing = await User.findOne({ role: 'superadmin' })
    if (existing) {
      return NextResponse.json({
        success: false,
        message: 'Super admin already exists. Use the login page.',
      })
    }

    await User.create({
      name:     'Super Admin',
      email,
      password,
      role:     'superadmin',
    })

    return NextResponse.json({
      success: true,
      message: 'Super admin created successfully.',
    })
  } catch {
    // Never expose raw error messages
    return NextResponse.json(
      { success: false, message: 'Failed to create super admin.' },
      { status: 500 }
    )
  }
}
