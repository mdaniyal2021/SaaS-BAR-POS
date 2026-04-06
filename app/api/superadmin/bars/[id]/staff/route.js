import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import User from '@/models/User'
import Bar from '@/models/Bar'

function isSuperAdmin(request) {
  const user = getUserFromRequest(request)
  return user?.role === 'superadmin' ? user : null
}

// GET — fetch all staff for a bar
export async function GET(request, { params }) {
  try {
    if (!isSuperAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const { id } = await params

    const staff = await User.find({ bar: id, role: 'cashier' })
      .select('-password')
      .sort({ createdAt: -1 })

    return NextResponse.json({ success: true, staff })
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// POST — superadmin adds a cashier to any bar (no limit)
export async function POST(request, { params }) {
  try {
    if (!isSuperAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const { id } = await params

    const bar = await Bar.findById(id)
    if (!bar) {
      return NextResponse.json({ success: false, message: 'Bar not found' }, { status: 404 })
    }

    const { name, email, password } = await request.json()

    if (!name?.trim()) return NextResponse.json({ success: false, message: 'Name is required' }, { status: 400 })
    if (!email?.trim()) return NextResponse.json({ success: false, message: 'Email is required' }, { status: 400 })
    if (!password || password.length < 6) return NextResponse.json({ success: false, message: 'Password must be at least 6 characters' }, { status: 400 })

    const existing = await User.findOne({ email: email.toLowerCase().trim() })
    if (existing) {
      return NextResponse.json({ success: false, message: 'A user with this email already exists' }, { status: 400 })
    }

    const cashier = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'cashier',
      bar: id,
    })

    const cashierObj = cashier.toObject()
    delete cashierObj.password

    return NextResponse.json({ success: true, message: 'Cashier added successfully', staff: cashierObj }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// DELETE — superadmin removes a cashier from a bar
export async function DELETE(request, { params }) {
  try {
    if (!isSuperAdmin(request)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const { id } = await params
    const { cashierId } = await request.json()

    await User.findOneAndDelete({ _id: cashierId, bar: id, role: 'cashier' })

    return NextResponse.json({ success: true, message: 'Cashier removed successfully' })
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
