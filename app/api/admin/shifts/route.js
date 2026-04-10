import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import Shift from '@/models/Shift'
import '@/models/User'

export async function GET(request) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const { searchParams } = new URL(request.url)
  const cashierId = searchParams.get('cashier')   // optional filter
  const dateFrom  = searchParams.get('from')      // optional ISO date
  const dateTo    = searchParams.get('to')        // optional ISO date

  const query = { bar: user.barId }
  if (cashierId) query.cashier = cashierId
  if (dateFrom || dateTo) {
    query.startTime = {}
    if (dateFrom) query.startTime.$gte = new Date(dateFrom)
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      query.startTime.$lte = end
    }
  }

  const shifts = await Shift.find(query)
    .populate('cashier', 'name email')
    .sort({ startTime: -1 })
    .limit(200)
    .lean()

  return NextResponse.json({ success: true, shifts })
}
