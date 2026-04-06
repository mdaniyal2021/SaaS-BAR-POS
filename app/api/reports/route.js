import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import Order from '@/models/Order'

export async function GET(request) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '7' // days: 7, 30, 90

    const now   = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - parseInt(range))
    start.setHours(0, 0, 0, 0)

    const barId = user.barId

    // ── All paid orders in range ───────────────────────────────────────────────
    const orders = await Order.find({
      bar:           barId,
      paymentStatus: 'paid',
      createdAt:     { $gte: start },
    }).sort({ createdAt: -1 })

    // ── Summary stats ──────────────────────────────────────────────────────────
    const totalRevenue  = orders.reduce((s, o) => s + o.total, 0)
    const totalOrders   = orders.length
    const totalTax      = orders.reduce((s, o) => s + o.tax, 0)
    const totalDiscount = orders.reduce((s, o) => s + (o.discount || 0), 0)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // ── Payment method breakdown ───────────────────────────────────────────────
    const cashOrders = orders.filter(o => o.paymentMethod === 'cash')
    const cardOrders = orders.filter(o => o.paymentMethod === 'card')

    const paymentBreakdown = {
      cash: { count: cashOrders.length, revenue: cashOrders.reduce((s, o) => s + o.total, 0) },
      card: { count: cardOrders.length, revenue: cardOrders.reduce((s, o) => s + o.total, 0) },
    }

    // ── Daily revenue chart ────────────────────────────────────────────────────
    const days = []
    for (let i = parseInt(range) - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      days.push({
        label:   d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        dateStr: d.toISOString().split('T')[0],
        revenue: 0,
        orders:  0,
      })
    }
    orders.forEach(order => {
      const dateStr = new Date(order.createdAt).toISOString().split('T')[0]
      const day = days.find(d => d.dateStr === dateStr)
      if (day) { day.revenue += order.total; day.orders += 1 }
    })

    // ── Top selling products ───────────────────────────────────────────────────
    const productMap = {}
    orders.forEach(order => {
      order.items.forEach(item => {
        const key = item.name
        if (!productMap[key]) productMap[key] = { name: key, qty: 0, revenue: 0 }
        productMap[key].qty     += item.quantity
        productMap[key].revenue += item.subtotal
      })
    })
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // ── Recent 10 orders ───────────────────────────────────────────────────────
    const recentOrders = orders.slice(0, 10).map(o => ({
      _id:           o._id,
      orderNumber:   o.orderNumber,
      total:         o.total,
      discount:      o.discount || 0,
      tax:           o.tax,
      paymentMethod: o.paymentMethod,
      itemCount:     o.items.length,
      createdAt:     o.createdAt,
    }))

    return NextResponse.json({
      success: true,
      range: parseInt(range),
      stats: {
        totalRevenue,
        totalOrders,
        totalTax,
        totalDiscount,
        avgOrderValue,
        paymentBreakdown,
        dailyChart:    days,
        topProducts,
        recentOrders,
      },
    })
  } catch (error) {
    console.error('Reports error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}