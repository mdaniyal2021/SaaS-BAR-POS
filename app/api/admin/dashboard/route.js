import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import Order from '@/models/Order'
import Product from '@/models/Product'
import Category from '@/models/Category'
import User from '@/models/User'

export async function GET(request) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const barId = user.barId

    // ── Date ranges ────────────────────────────────────────────────────────────
    const now        = new Date()

    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const todayEnd   = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    const weekStart  = new Date(now)
    weekStart.setDate(now.getDate() - 6)
    weekStart.setHours(0, 0, 0, 0)

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // ── Run all queries in parallel ────────────────────────────────────────────
    const [
      todayOrders,
      weekOrders,
      monthOrders,
      totalProducts,
      totalCategories,
      totalStaff,
      lowStockProducts,
      recentOrders,
    ] = await Promise.all([

      // Today's paid orders
      Order.find({
        bar: barId,
        paymentStatus: 'paid',
        createdAt: { $gte: todayStart, $lte: todayEnd },
      }).select('total paymentMethod'),

      // This week's paid orders (for daily chart)
      Order.find({
        bar: barId,
        paymentStatus: 'paid',
        createdAt: { $gte: weekStart },
      }).select('total createdAt'),

      // This month's paid orders
      Order.find({
        bar: barId,
        paymentStatus: 'paid',
        createdAt: { $gte: monthStart },
      }).select('total'),

      // Product count
      Product.countDocuments({ bar: barId }),

      // Category count
      Category.countDocuments({ bar: barId }),

      // Cashier count (active only)
      User.countDocuments({ bar: barId, role: 'cashier', isActive: true }),

      // Low stock products
      Product.find({
        bar: barId,
        $expr: { $lte: ['$stock', '$lowStockAlert'] },
      })
        .select('name stock lowStockAlert unit')
        .sort({ stock: 1 })
        .limit(5),

      // Recent 5 orders
      Order.find({ bar: barId, paymentStatus: 'paid' })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('orderNumber total paymentMethod createdAt items')
        .populate('cashier', 'name'),
    ])

    // ── Today stats ────────────────────────────────────────────────────────────
    const todayRevenue    = todayOrders.reduce((sum, o) => sum + o.total, 0)
    const todayOrderCount = todayOrders.length
    const cashOrders      = todayOrders.filter(o => o.paymentMethod === 'cash').length
    const cardOrders      = todayOrders.filter(o => o.paymentMethod === 'card').length

    // ── Month stats ────────────────────────────────────────────────────────────
    const monthRevenue    = monthOrders.reduce((sum, o) => sum + o.total, 0)

    // ── Weekly chart — last 7 days ─────────────────────────────────────────────
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      days.push({
        label:   d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
        dateStr: d.toISOString().split('T')[0],
        revenue: 0,
        orders:  0,
      })
    }

    weekOrders.forEach(order => {
      const orderDate = new Date(order.createdAt).toISOString().split('T')[0]
      const day = days.find(d => d.dateStr === orderDate)
      if (day) {
        day.revenue += order.total
        day.orders  += 1
      }
    })

    return NextResponse.json({
      success: true,
      stats: {
        today: {
          revenue:    todayRevenue,
          orders:     todayOrderCount,
          cashOrders,
          cardOrders,
        },
        month: {
          revenue:    monthRevenue,
          orders:     monthOrders.length,
        },
        counts: {
          products:   totalProducts,
          categories: totalCategories,
          staff:      totalStaff,
        },
        weeklyChart:   days,
        lowStock:      lowStockProducts,
        recentOrders,
      },
    })

    

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}