import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import User from '@/models/User'

// PATCH — superadmin apna email ya password change kare
export async function PATCH(request) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { currentPassword, newEmail, newPassword } = await request.json()

    // Current password confirm karna zaroori hai
    if (!currentPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password is required to make changes' },
        { status: 400 }
      )
    }

    // Kuch to change karna hoga
    if (!newEmail && !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Provide a new email or new password to update' },
        { status: 400 }
      )
    }

    const superadmin = await User.findById(user.id)
    if (!superadmin) {
      return NextResponse.json({ success: false, message: 'Account not found' }, { status: 404 })
    }

    // Current password verify karo
    const isMatch = await superadmin.comparePassword(currentPassword)
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Email update
    if (newEmail) {
      const emailTrimmed = newEmail.toLowerCase().trim()
      const emailRegex   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(emailTrimmed)) {
        return NextResponse.json(
          { success: false, message: 'Invalid email format' },
          { status: 400 }
        )
      }
      // Check if email already in use by someone else
      const existing = await User.findOne({ email: emailTrimmed, _id: { $ne: superadmin._id } })
      if (existing) {
        return NextResponse.json(
          { success: false, message: 'This email is already in use' },
          { status: 400 }
        )
      }
      superadmin.email = emailTrimmed
    }

    // Password update
    if (newPassword) {
      if (newPassword.length < 8) {
        return NextResponse.json(
          { success: false, message: 'New password must be at least 8 characters' },
          { status: 400 }
        )
      }
      if (newPassword === currentPassword) {
        return NextResponse.json(
          { success: false, message: 'New password must be different from current password' },
          { status: 400 }
        )
      }
      superadmin.password = newPassword // pre-save hook will hash it
    }

    await superadmin.save()

    const updated = []
    if (newEmail)    updated.push('email')
    if (newPassword) updated.push('password')

    return NextResponse.json({
      success: true,
      message: `Successfully updated: ${updated.join(' and ')}. Please log in again with your new credentials.`,
    })

  } catch (error) {
    console.error('Change credentials error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
