import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import Bar from '@/models/Bar'
import User from '@/models/User'

export async function GET(request) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const now = new Date()
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const [
      totalBars,
      activeBars,
      expiredBars,
      inactiveBars,
      totalUsers,
      expiringBars,
      recentBars,
    ] = await Promise.all([
      Bar.countDocuments(),
      Bar.countDocuments({ 'subscription.status': 'active', isActive: true }),
      Bar.countDocuments({ 'subscription.status': 'expired' }),
      Bar.countDocuments({ isActive: false }),
      User.countDocuments({ role: { $ne: 'superadmin' } }),
      Bar.find({
        isActive: true,
        'subscription.status': { $in: ['active', 'trial'] },
        'subscription.expiryDate': { $gte: now, $lte: sevenDaysLater },
      }).select('name subscription.expiryDate').limit(10),
      Bar.find().sort({ createdAt: -1 }).limit(5).select('name email subscription isActive createdAt'),
    ])

    return NextResponse.json({
      success: true,
      stats: {
        totalBars,
        activeBars,
        expiredBars,
        inactiveBars,
        totalUsers,
        expiringBars,
        recentBars,
      },
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}
