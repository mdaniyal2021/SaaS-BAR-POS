import connectDB from '@/lib/db'
import Bar from '@/models/Bar'

/**
 * checkBarSubscription — call this on every protected API route for admin/cashier.
 *
 * Returns { ok: true } if the bar is active and subscription is valid.
 * Returns { ok: false, message } if the bar is deactivated or subscription expired.
 *
 * Usage in an API route:
 *   const sub = await checkBarSubscription(user.barId)
 *   if (!sub.ok) return NextResponse.json({ success: false, message: sub.message }, { status: 403 })
 */
export async function checkBarSubscription(barId) {
  await connectDB()

  const bar = await Bar.findById(barId).select('isActive subscription')

  if (!bar || !bar.isActive) {
    return { ok: false, message: 'Bar account has been deactivated. Please contact super admin.' }
  }

  const now = new Date()
  const expired =
    bar.subscription.status === 'expired' ||
    (bar.subscription.expiryDate && new Date(bar.subscription.expiryDate) < now)

  if (expired) {
    // Mark as expired in DB — fire and forget (don't block response)
    Bar.findByIdAndUpdate(barId, { 'subscription.status': 'expired' }).exec()
    return { ok: false, message: 'Bar subscription has expired. Please contact super admin to renew.' }
  }

  return { ok: true }
}
