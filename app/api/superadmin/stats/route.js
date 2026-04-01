import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Bar from '@/models/Bar'
import User from '@/models/User'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const totalBars = await Bar.countDocuments()
    const activeBars = await Bar.countDocuments({ isActive: true, 'subscription.status': 'active' })
    const expiredBars = await Bar.countDocuments({ 'subscription.status': 'expired' })
    const totalUsers = await User.countDocuments({ role: { $ne: 'superadmin' } })

    // Bars expiring in next 7 days
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    const expiringBars = await Bar.find({
      'subscription.status': 'active',
      'subscription.expiryDate': { $lte: sevenDaysFromNow, $gte: new Date() },
    }).select('name subscription.expiryDate')

    // Recent bars (last 5)
    const recentBars = await Bar.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email subscription.status isActive createdAt')

    return NextResponse.json({
      success: true,
      stats: {
        totalBars,
        activeBars,
        expiredBars,
        inactiveBars: totalBars - activeBars - expiredBars,
        totalUsers,
        expiringBars,
        recentBars,
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}