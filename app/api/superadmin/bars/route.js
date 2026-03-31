import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import Bar from '@/models/Bar'
import User from '@/models/User'

export async function GET(request) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const bars = await Bar.find().sort({ createdAt: -1 })

    const barsWithStaff = await Promise.all(
      bars.map(async (bar) => {
        const staffCount = await User.countDocuments({ bar: bar._id })
        return { ...bar.toObject(), staffCount }
      })
    )

    return NextResponse.json({ success: true, bars: barsWithStaff })
  } catch (error) {
    console.error('Get bars error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { barName, barEmail, phone, taxRate, plan, adminName, adminEmail, adminPassword } = await request.json()

    if (!barName || !barEmail || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json({ success: false, message: 'All required fields must be filled.' }, { status: 400 })
    }

    const existingBar = await Bar.findOne({ email: barEmail })
    if (existingBar) {
      return NextResponse.json({ success: false, message: 'A bar with this email already exists.' }, { status: 400 })
    }

    const existingUser = await User.findOne({ email: adminEmail })
    if (existingUser) {
      return NextResponse.json({ success: false, message: 'A user with this email already exists.' }, { status: 400 })
    }

    const bar = await Bar.create({
      name: barName,
      email: barEmail,
      phone: phone || '',
      taxRate: taxRate || 10,
      subscription: {
        status: plan === 'trial' ? 'trial' : 'active',
        plan: plan || 'trial',
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      bar: bar._id,
    })

    return NextResponse.json({ success: true, message: 'Bar and admin created successfully.', bar })
  } catch (error) {
    console.error('Create bar error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
