import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { checkBarSubscription } from '@/lib/subscription'
import Product from '@/models/Product'
import Category from '@/models/Category'
import Order from '@/models/Order'
import Bar from '@/models/Bar'

export async function GET(request) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const sub = await checkBarSubscription(user.barId)
  if (!sub.ok) return NextResponse.json({ success: false, message: sub.message }, { status: 403 })

  await connectDB()

  const [bar, categories, products, orders] = await Promise.all([
    Bar.findById(user.barId).lean(),
    Category.find({ bar: user.barId }).sort({ name: 1 }).lean(),
    Product.find({ bar: user.barId }).populate('category', 'name').sort({ name: 1 }).lean(),
    Order.find({ bar: user.barId, paymentStatus: 'paid' }).sort({ createdAt: -1 }).lean(),
  ])

  const exportData = {
    version:    '1',
    exportedAt: new Date().toISOString(),
    barName:    bar?.name || 'Unknown Bar',

    categories: categories.map(c => ({
      name:     c.name,
      isActive: c.isActive ?? true,
    })),

    products: products.map(p => ({
      name:          p.name,
      price:         p.price,
      stock:         p.stock ?? 0,
      unit:          p.unit || 'pcs',
      lowStockAlert: p.lowStockAlert ?? 5,
      taxRate:       p.taxRate ?? 0,
      image:         p.image || '',
      categoryName:  p.category?.name || '',
      isAvailable:   p.isAvailable ?? true,
    })),

    orders: orders.map(o => ({
      originalOrderNumber: o.orderNumber,
      items: o.items.map(item => ({
        name:      item.name,
        price:     item.price,
        quantity:  item.quantity,
        subtotal:  item.subtotal,
        taxRate:   item.taxRate   ?? 0,
        taxAmount: item.taxAmount ?? 0,
      })),
      subtotal:      o.subtotal,
      tax:           o.tax      ?? 0,
      total:         o.total,
      discount:      o.discount ?? 0,
      paymentMethod: o.paymentMethod,
      notes:         o.notes || '',
    })),
  }

  const safeName = (bar?.name || 'data').replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const dateStr  = new Date().toISOString().split('T')[0]
  const filename = `barpos-backup-${safeName}-${dateStr}.json`

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type':        'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
