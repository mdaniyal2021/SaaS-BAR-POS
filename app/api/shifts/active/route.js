import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import Shift from '@/models/Shift'
import Order from '@/models/Order'

export async function GET(request) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'cashier') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const shift = await Shift.findOne({
    cashier: user.id,
    bar:     user.barId,
    status:  'active',
  }).lean()

  let currentCashBalance = shift ? shift.openingCash : 0

  if (shift) {
    const cashOrders = await Order.find({
      bar:           user.barId,
      cashier:       user.id,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      createdAt:     { $gte: shift.startTime },
    }).select('total').lean()

    const cashSalesTotal = cashOrders.reduce((s, o) => s + o.total, 0)
    currentCashBalance = parseFloat((shift.openingCash + cashSalesTotal).toFixed(2))
  }

  return NextResponse.json({
    success: true,
    shift: shift || null,
    cashierName: user.name || '',
    currentCashBalance,
  })
}
