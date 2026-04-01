import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import User from '@/models/User'

// Helper — find cashier that belongs to this bar only
async function getCashier(id, barId) {
  return await User.findOne({ _id: id, bar: barId, role: 'cashier' })
}

// PATCH — update name/email/password OR toggle active status
export async function PATCH(request, { params }) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const { id } = await params
    const cashier = await getCashier(id, user.barId)

    if (!cashier) {
      return NextResponse.json({ success: false, message: 'Staff member not found' }, { status: 404 })
    }

    const body = await request.json()
    const { action, name, email, password } = body

    // Toggle active/inactive
    if (action === 'toggle') {
      cashier.isActive = !cashier.isActive
      await cashier.save()
      return NextResponse.json({
        success: true,
        message: `Account ${cashier.isActive ? 'activated' : 'deactivated'} successfully`,
        staff: { ...cashier.toObject(), password: undefined },
      })
    }

    // Update details
    if (name !== undefined) {
      if (!name.trim()) return NextResponse.json({ success: false, message: 'Name cannot be empty' }, { status: 400 })
      cashier.name = name.trim()
    }

    if (email !== undefined) {
      if (!email.trim()) return NextResponse.json({ success: false, message: 'Email cannot be empty' }, { status: 400 })
      // Check email not taken by someone else
      const taken = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: id } })
      if (taken) return NextResponse.json({ success: false, message: 'Email already in use' }, { status: 400 })
      cashier.email = email.toLowerCase().trim()
    }

    if (password !== undefined) {
      if (password.length < 6) return NextResponse.json({ success: false, message: 'Password must be at least 6 characters' }, { status: 400 })
      cashier.password = password // pre-save hook will hash it
    }

    await cashier.save()

    const updated = cashier.toObject()
    delete updated.password

    return NextResponse.json({ success: true, message: 'Staff member updated successfully', staff: updated })

  } catch (error) {
    console.error('Update staff error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// DELETE — remove cashier account
export async function DELETE(request, { params }) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const { id } = await params
    const cashier = await getCashier(id, user.barId)

    if (!cashier) {
      return NextResponse.json({ success: false, message: 'Staff member not found' }, { status: 404 })
    }

    await cashier.deleteOne()

    return NextResponse.json({ success: true, message: 'Staff member deleted successfully' })

  } catch (error) {
    console.error('Delete staff error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}