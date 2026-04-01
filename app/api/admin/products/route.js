import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import Product from '@/models/Product'
import Category from '@/models/Category'

// GET — fetch all products OR lookup by barcode (?barcode=xxx)
export async function GET(request) {
  const user = getUserFromRequest(request)
  if (!user || !['admin', 'cashier'].includes(user.role)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  // Barcode lookup — used by POS scanner
  const { searchParams } = new URL(request.url)
  const barcode = searchParams.get('barcode')

  if (barcode) {
    const product = await Product.findOne({
      bar:     user.barId,
      barcode: barcode.trim(),
    }).populate('category', 'name')

    if (!product) {
      return NextResponse.json({ success: false, message: 'Product not found for this barcode' }, { status: 404 })
    }
    return NextResponse.json({ success: true, product })
  }

  // Normal — return all products
  const products = await Product.find({ bar: user.barId })
    .populate('category', 'name')
    .sort({ name: 1 })
  return NextResponse.json({ success: true, products })
}

// POST — create product (with optional barcode)
export async function POST(request) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const { name, price, stock, unit, lowStockAlert, categoryId, barcode } = await request.json()

  if (!name || !name.trim()) {
    return NextResponse.json({ success: false, message: 'Product name is required' }, { status: 400 })
  }
  if (price === undefined || price === null || isNaN(price) || Number(price) < 0) {
    return NextResponse.json({ success: false, message: 'Valid price is required' }, { status: 400 })
  }
  if (!categoryId) {
    return NextResponse.json({ success: false, message: 'Category is required' }, { status: 400 })
  }

  const category = await Category.findOne({ _id: categoryId, bar: user.barId })
  if (!category) {
    return NextResponse.json({ success: false, message: 'Invalid category' }, { status: 400 })
  }

  // Barcode uniqueness check within this bar
  if (barcode && barcode.trim()) {
    const existing = await Product.findOne({ bar: user.barId, barcode: barcode.trim() })
    if (existing) {
      return NextResponse.json({ success: false, message: 'This barcode is already assigned to another product' }, { status: 400 })
    }
  }

  const product = await Product.create({
    name:          name.trim(),
    price:         Number(price),
    stock:         Number(stock) || 0,
    unit:          unit?.trim() || 'pcs',
    lowStockAlert: Number(lowStockAlert) || 5,
    barcode:       barcode?.trim() || '',
    category:      categoryId,
    bar:           user.barId,
  })

  await product.populate('category', 'name')
  return NextResponse.json({ success: true, message: 'Product created successfully', product }, { status: 201 })
}