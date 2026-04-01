import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import Order from '@/models/Order'
import Product from '@/models/Product'
import Bar from '@/models/Bar'

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

    const { items, paymentMethod, notes, discount = 0 } = await request.json()

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

    const productIds = items.map(i => i.productId)
    const products   = await Product.find({ _id: { $in: productIds }, bar: user.barId })
    const productMap = {}
    products.forEach(p => { productMap[p._id.toString()] = p })

    for (const item of items) {
      const product = productMap[item.productId]
      if (!product) return NextResponse.json({ success: false, message: `Product not found: ${item.productId}` }, { status: 400 })
      if (!product.isAvailable) return NextResponse.json({ success: false, message: `"${product.name}" is currently unavailable` }, { status: 400 })
      if (product.stock < item.quantity) return NextResponse.json({ success: false, message: `Not enough stock for "${product.name}". Available: ${product.stock}` }, { status: 400 })
      if (!item.quantity || item.quantity < 1) return NextResponse.json({ success: false, message: 'Item quantity must be at least 1' }, { status: 400 })
    }

    let subtotal = 0
    const orderItems = items.map(item => {
      const product      = productMap[item.productId]
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

    // Discount applied before tax
    const discountAmt   = Math.min(parseFloat(discount) || 0, subtotal)
    const afterDiscount = subtotal - discountAmt
    const taxAmount     = parseFloat(((afterDiscount * bar.taxRate) / 100).toFixed(2))
    const total         = parseFloat((afterDiscount + taxAmount).toFixed(2))

    const order = await Order.create({
      items:         orderItems,
      subtotal:      parseFloat(subtotal.toFixed(2)),
      tax:           taxAmount,
      discount:      discountAmt,
      total,
      paymentMethod,
      paymentStatus: 'paid',
      notes:         notes || '',
      cashier:       user.id,
      bar:           user.barId,
    })

    // Deduct stock
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
        orderNumber:   order.orderNumber,
        barName:       bar.name,
        barAddress:    bar.address || '',
        items:         orderItems,
        subtotal:      order.subtotal,
        discount:      discountAmt,
        tax:           order.tax,
        taxRate:       bar.taxRate,
        taxType:       bar.taxType || 'VAT',
        total:         order.total,
        paymentMethod: order.paymentMethod,
        cashier:       order.cashier?.name,
        createdAt:     order.createdAt,
      },
    }, { status: 201 })

  } catch (error) {
    console.error('Create order error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}