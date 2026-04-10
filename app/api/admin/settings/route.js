import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { checkBarSubscription } from '@/lib/subscription'
import Bar from '@/models/Bar'

export async function GET(request) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const sub = await checkBarSubscription(user.barId)
    if (!sub.ok) return NextResponse.json({ success: false, message: sub.message }, { status: 403 })

    await connectDB()
    const bar = await Bar.findById(user.barId).select('-__v')
    if (!bar) return NextResponse.json({ success: false, message: 'Bar not found' }, { status: 404 })
    return NextResponse.json({ success: true, bar })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const sub = await checkBarSubscription(user.barId)
    if (!sub.ok) return NextResponse.json({ success: false, message: sub.message }, { status: 403 })

    await connectDB()

    const { name, phone, address, taxRate, taxType, currency } = await request.json()

    const bar = await Bar.findById(user.barId)
    if (!bar) return NextResponse.json({ success: false, message: 'Bar not found' }, { status: 404 })

    if (name !== undefined)     { if (!name.trim()) return NextResponse.json({ success: false, message: 'Bar name cannot be empty' }, { status: 400 }); bar.name = name.trim() }
    if (phone !== undefined)    bar.phone    = phone.trim()
    if (address !== undefined)  bar.address  = address.trim()
    if (taxRate !== undefined)  { const r = parseFloat(taxRate); if (!isNaN(r) && r >= 0 && r <= 100) bar.taxRate = r }
    if (taxType !== undefined)  bar.taxType  = taxType
    if (currency !== undefined) bar.currency = currency.trim()

    await bar.save()
    return NextResponse.json({ success: true, message: 'Settings saved successfully', bar })
  } catch (error) {
    console.error('Settings PATCH error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}