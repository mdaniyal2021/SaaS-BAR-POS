import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Bar from '@/models/Bar'
import User from '@/models/User'
import { getUserFromRequest } from '@/lib/auth'

function isSuperAdmin(request) {
  const user = getUserFromRequest(request)
  return user?.role === 'superadmin' ? user : null
}

// GET — fetch all bars
export async function GET(request) {
  try {
    if (!isSuperAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const bars = await Bar.find().sort({ createdAt: -1 })

    const barsWithStats = await Promise.all(
      bars.map(async (bar) => {
        const staffCount = await User.countDocuments({ bar: bar._id })
        return {
          ...bar.toObject(),
          staffCount,
        }
      })
    )

    return NextResponse.json({ success: true, bars: barsWithStats })
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// POST — create new bar + admin user
export async function POST(request) {
  try {
    if (!isSuperAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { name, email, phone, address, adminName, adminEmail, adminPassword, plan, taxRate } = await request.json()

    if (!name || !email || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { success: false, message: 'All required fields must be filled' },
        { status: 400 }
      )
    }

    // Check if bar email already exists
    const existingBar = await Bar.findOne({ email })
    if (existingBar) {
      return NextResponse.json(
        { success: false, message: 'A bar with this email already exists' },
        { status: 400 }
      )
    }

    // Check if admin email already exists
    const existingUser = await User.findOne({ email: adminEmail })
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    // Set subscription dates
    const startDate = new Date()
    const expiryDate = new Date()
    if (plan === 'yearly') {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)
    } else {
      expiryDate.setMonth(expiryDate.getMonth() + 1)
    }

    // Create bar
    const bar = await Bar.create({
      name,
      email,
      phone: phone || '',
      address: address || '',
      taxRate: taxRate || 0,
      subscription: {
        status: 'active',
        plan: plan || 'monthly',
        startDate,
        expiryDate,
      },
    })

    // Create bar admin user — use new+save so the pre-save password-hashing hook fires
    const adminUser = new User({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      bar: bar._id,
    })
    await adminUser.save()

    return NextResponse.json({
      success: true,
      message: 'Bar created successfully',
      bar,
    }, { status: 201 })

  } catch (error) {
    console.error('Create bar error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}