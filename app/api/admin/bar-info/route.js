import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import Bar from '@/models/Bar'

// GET — returns bar info needed by POS (name, taxRate, taxType, currency)
export async function GET(request) {
  try {
    const user = getUserFromRequest(request)
    if (!user || !['admin', 'cashier'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const bar = await Bar.findById(user.barId).select('name address taxRate taxType currency')
    if (!bar) {
      return NextResponse.json({ success: false, message: 'Bar not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, bar })
  } catch (error) {
    console.error('Bar info error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}