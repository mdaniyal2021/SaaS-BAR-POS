import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import Shift from '@/models/Shift'

export async function POST(request) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'cashier') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  // If an active shift already exists, return it (handles logout → re-login)
  const existing = await Shift.findOne({
    cashier: user.id,
    bar:     user.barId,
    status:  'active',
  }).lean()
  if (existing) {
    return NextResponse.json({ success: true, shift: existing })
  }

  const { openingCash } = await request.json()
  if (openingCash === undefined || openingCash === null || isNaN(openingCash) || Number(openingCash) < 0) {
    return NextResponse.json({ success: false, message: 'Valid opening cash amount is required' }, { status: 400 })
  }

  const shift = await Shift.create({
    cashier:     user.id,
    bar:         user.barId,
    openingCash: Number(openingCash),
  })

  return NextResponse.json({ success: true, shift }, { status: 201 })
}
