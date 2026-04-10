import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import User from '@/models/User'

// GET — fetch all cashiers for this bar
export async function GET(request) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const staff = await User.find({ bar: user.barId, role: 'cashier' })
      .select('-password')
      .sort({ createdAt: -1 })

    return NextResponse.json({ success: true, staff })
  } catch (error) {
    console.error('Get staff error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// POST — create a new cashier account
export async function POST(request) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { name, email, password } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: 'Name is required' }, { status: 400 })
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ success: false, message: 'Email is required' }, { status: 400 })
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ success: false, message: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Enforce 1 cashier limit for admin
    const cashierCount = await User.countDocuments({ bar: user.barId, role: 'cashier' })
    if (cashierCount >= 1) {
      return NextResponse.json(
        { success: false, message: 'You can only have 1 cashier. Contact superadmin to add more staff.' },
        { status: 403 }
      )
    }

    // Check if email already exists anywhere in the system
    const existing = await User.findOne({ email: email.toLowerCase().trim() })
    if (existing) {
      return NextResponse.json({ success: false, message: 'A user with this email already exists' }, { status: 400 })
    }

    const cashier = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'cashier',
      bar: user.barId,
    })

    // Return without password
    const cashierObj = cashier.toObject()
    delete cashierObj.password

    return NextResponse.json({
      success: true,
      message: 'Cashier account created successfully',
      staff: cashierObj,
    }, { status: 201 })

  } catch (error) {
    console.error('Create staff error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}