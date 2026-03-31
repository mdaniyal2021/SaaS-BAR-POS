import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'

export async function GET() {
  try {
    await connectDB()

    const existing = await User.findOne({ role: 'superadmin' })
    if (existing) {
      return NextResponse.json({ message: 'Super admin already exists' })
    }

    await User.create({
      name: 'Super Admin',
      email: 'admin@barpos.com',
      password: 'admin123',
      role: 'superadmin',
    })

    return NextResponse.json({
      success: true,
      message: 'Super admin created successfully.',
      credentials: {
        email: 'admin@barpos.com',
        password: 'admin123'
      }
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
