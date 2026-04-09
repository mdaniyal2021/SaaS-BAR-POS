import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import Order from '@/models/Order'
import Product from '@/models/Product'
import Bar from '@/models/Bar'
import Counter from '@/models/Counter'
import User from '@/models/User' // required so populate('cashier') can resolve the User model

export async function GET(request) {
  try {
    const user = getUserFromRequest(request)
    if (!user || !['admin', 'cashier'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    await connectDB()
    const orders = await Order.find({ bar: user.barId, paymentStatus: 'paid' })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('cashier', 'name')
    return NextResponse.json({ success: true, orders })
  } catch (error) {
    console.error('Get orders error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const user = getUserFromRequest(request)
    if (!user || !['admin', 'cashier'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const body = await request.json()
    const {
      items,
      paymentMethod,
      notes        = '',
      discountType  = 'percent',
      discountRawVal = 0,
    } = body

    const discountAmt = parseFloat(body.discountValue ?? body.discount ?? 0) || 0

    // ── Validation ─────────────────────────────────────────────────────────────
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: 'Order must have at least one item' }, { status: 400 })
    }
    if (!['cash', 'card'].includes(paymentMethod)) {
      return NextResponse.json({ success: false, message: 'Payment method must be cash or card' }, { status: 400 })
    }

    const bar = await Bar.findById(user.barId)
    if (!bar) {
      return NextResponse.json({ success: false, message: 'Bar not found' }, { status: 404 })
    }

    const cashierId = user.id || user._id
    if (!cashierId) {
      return NextResponse.json({ success: false, message: 'Session expired. Please log in again.' }, { status: 401 })
    }

    // ── Fetch & validate products ──────────────────────────────────────────────
    const productIds = items.map(i => i.productId)
    const products   = await Product.find({ _id: { $in: productIds }, bar: user.barId })
    const productMap = {}
    products.forEach(p => { productMap[p._id.toString()] = p })

    for (const item of items) {
      const product = productMap[item.productId]
      if (!product)              return NextResponse.json({ success: false, message: `Product not found` }, { status: 400 })
      if (!product.isAvailable)  return NextResponse.json({ success: false, message: `"${product.name}" is currently unavailable` }, { status: 400 })
      if (product.stock < item.quantity) return NextResponse.json({ success: false, message: `Not enough stock for "${product.name}". Available: ${product.stock}` }, { status: 400 })
      if (!item.quantity || item.quantity < 1) return NextResponse.json({ success: false, message: 'Quantity must be at least 1' }, { status: 400 })
    }

    // ── Build items & calculate totals ─────────────────────────────────────────
    let subtotal = 0
    const orderItems = items.map(item => {
      const product = productMap[item.productId]
      const itemSubtotal = product.price * item.quantity
      subtotal += itemSubtotal
      return {
        product:  product._id,
        name:     product.name,
        price:    product.price,
        quantity: item.quantity,
        subtotal: itemSubtotal,
      }
    })

    const safeDiscount  = Math.min(discountAmt, subtotal)
    const afterDiscount = subtotal - safeDiscount
    const taxAmount     = parseFloat(((afterDiscount * bar.taxRate) / 100).toFixed(2))
    const total         = parseFloat((afterDiscount + taxAmount).toFixed(2))

    // ── Generate orderNumber atomically (prevents race condition) ─────────────
    // $inc on a Counter document is a single atomic MongoDB operation —
    // two cashiers hitting this at the same time will always get different numbers
    const counter = await Counter.findOneAndUpdate(
      { _id: `order_${user.barId}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    )
    const orderNumber = `ORD-${String(counter.seq).padStart(6, '0')}`

    // ── Create order ───────────────────────────────────────────────────────────
    const order = await Order.create({
      orderNumber,
      items:         orderItems,
      subtotal:      parseFloat(subtotal.toFixed(2)),
      tax:           taxAmount,
      discount:      safeDiscount,
      total,
      paymentMethod,
      paymentStatus: 'paid',
      notes:         notes || '',
      cashier:       cashierId,
      bar:           user.barId,
    })

    // ── Deduct stock ───────────────────────────────────────────────────────────
    await Promise.all(
      items.map(item =>
        Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } })
      )
    )

    await order.populate('cashier', 'name')

    return NextResponse.json({
      success: true,
      message: 'Order placed successfully',
      order,
      receipt: {
        orderNumber:    order.orderNumber,
        barName:        bar.name,
        barAddress:     bar.address || '',
        barPhone:       bar.phone || '',
        items:          orderItems,
        subtotal:       order.subtotal,
        discountAmount: safeDiscount,
        discountType,
        discountValue:  discountRawVal,
        afterDiscount,
        tax:            order.tax,
        taxRate:        bar.taxRate,
        taxType:        bar.taxType || 'VAT',
        total:          order.total,
        paymentMethod:  order.paymentMethod,
        cashier:        order.cashier?.name,
        notes:          notes || '',
        createdAt:      order.createdAt,
      },
    }, { status: 201 })

  } catch (error) {
    console.error('Create order error:', error)
    return NextResponse.json({
      success: false,
      message: process.env.NODE_ENV === 'development'
        ? `Server error: ${error.message}`
        : 'Server error. Please try again.',
    }, { status: 500 })
  }
}