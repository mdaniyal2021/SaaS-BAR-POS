import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import Shift from '@/models/Shift'
import '@/models/User'

export async function GET(request, { params }) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  await connectDB()

  const shift = await Shift.findOne({ _id: id, bar: user.barId })
    .populate('cashier', 'name email')
    .lean()

  if (!shift) {
    return NextResponse.json({ success: false, message: 'Shift not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, shift })
}
