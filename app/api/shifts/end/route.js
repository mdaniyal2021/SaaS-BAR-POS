import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import Shift from '@/models/Shift'
import Order from '@/models/Order'

export async function POST(request) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'cashier') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const shift = await Shift.findOne({
    cashier: user.id,
    bar:     user.barId,
    status:  'active',
  })
  if (!shift) {
    return NextResponse.json({ success: false, message: 'No active shift found' }, { status: 404 })
  }

  const { closingCash, notes } = await request.json()
  if (closingCash === undefined || closingCash === null || isNaN(closingCash) || Number(closingCash) < 0) {
    return NextResponse.json({ success: false, message: 'Valid closing cash amount is required' }, { status: 400 })
  }

  // Calculate all paid orders placed by this cashier during this shift
  const orders = await Order.find({
    bar:           user.barId,
    cashier:       user.id,
    paymentStatus: 'paid',
    createdAt:     { $gte: shift.startTime },
  })

  const cashOrders     = orders.filter(o => o.paymentMethod === 'cash')
  const cardOrders     = orders.filter(o => o.paymentMethod === 'card')
  const totalCashSales = parseFloat(cashOrders.reduce((s, o) => s + o.total, 0).toFixed(2))
  const totalCardSales = parseFloat(cardOrders.reduce((s, o) => s + o.total, 0).toFixed(2))
  const totalOrders    = orders.length
  const grossSales     = parseFloat(orders.reduce((s, o) => s + o.subtotal, 0).toFixed(2))
  const totalDiscount  = parseFloat(orders.reduce((s, o) => s + (o.discount || 0), 0).toFixed(2))
  const expectedCash   = parseFloat((shift.openingCash + totalCashSales).toFixed(2))
  const cashDifference = parseFloat((Number(closingCash) - expectedCash).toFixed(2))

  shift.status         = 'closed'
  shift.endTime        = new Date()
  shift.closingCash    = Number(closingCash)
  shift.totalCashSales = totalCashSales
  shift.totalCardSales = totalCardSales
  shift.cashOrderCount = cashOrders.length
  shift.cardOrderCount = cardOrders.length
  shift.totalOrders    = totalOrders
  shift.grossSales     = grossSales
  shift.totalDiscount  = totalDiscount
  shift.expectedCash   = expectedCash
  shift.cashDifference = cashDifference
  shift.notes          = notes?.trim() || ''
  await shift.save()

  return NextResponse.json({ success: true, shift })
}
