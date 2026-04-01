import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import Bar from '@/models/Bar'
import User from '@/models/User'
import Category from '@/models/Category'
import Product from '@/models/Product'
import Order from '@/models/Order'

export async function PATCH(request, { params }) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const { id } = await params
    const body = await request.json()
    const { action } = body

    const bar = await Bar.findById(id)
    if (!bar) {
      return NextResponse.json({ success: false, message: 'Bar not found.' }, { status: 404 })
    }

    if (action === 'toggle') {
      bar.isActive = !bar.isActive
      await bar.save()
      return NextResponse.json({
        success: true,
        message: `Bar ${bar.isActive ? 'activated' : 'deactivated'} successfully.`,
        bar,
      })
    }

    if (action === 'renew') {
      const { plan } = body
      bar.subscription.status = 'active'
      bar.subscription.plan = plan || bar.subscription.plan
      bar.subscription.startDate = new Date()
      bar.subscription.expiryDate = new Date(
        Date.now() + (plan === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000
      )
      await bar.save()
      return NextResponse.json({ success: true, message: 'Subscription renewed successfully.', bar })
    }

    if (action === 'update') {
      const { name, email, phone, taxRate } = body
      if (name) bar.name = name
      if (email) bar.email = email
      if (phone !== undefined) bar.phone = phone
      if (taxRate !== undefined) bar.taxRate = taxRate
      await bar.save()
      return NextResponse.json({ success: true, message: 'Bar updated successfully.', bar })
    }

    return NextResponse.json({ success: false, message: 'Invalid action.' }, { status: 400 })
  } catch (error) {
    console.error('Patch bar error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const { id } = await params

    const bar = await Bar.findById(id)
    if (!bar) {
      return NextResponse.json({ success: false, message: 'Bar not found.' }, { status: 404 })
    }

    // CASCADE DELETE — remove everything belonging to this bar
    await Promise.all([
      User.deleteMany({ bar: id }),
      Category.deleteMany({ bar: id }),
      Product.deleteMany({ bar: id }),
      Order.deleteMany({ bar: id }),
    ])

    await Bar.findByIdAndDelete(id)

    return NextResponse.json({
      success: true,
      message: 'Bar and all associated data deleted successfully.'
    })
  } catch (error) {
    console.error('Delete bar error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}