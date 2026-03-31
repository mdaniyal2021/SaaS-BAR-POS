import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import Product from '@/models/Product'
import Category from '@/models/Category'

async function getProduct(id, barId) {
  return await Product.findOne({ _id: id, bar: barId })
}

export async function PATCH(request, { params }) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const { id } = await params
  const product = await getProduct(id, user.barId)
  if (!product) {
    return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 })
  }

  const { name, price, stock, unit, lowStockAlert, categoryId, isAvailable } = await request.json()

  if (name !== undefined) {
    if (!name.trim()) return NextResponse.json({ success: false, message: 'Product name is required' }, { status: 400 })
    product.name = name.trim()
  }
  if (price !== undefined) {
    if (isNaN(price) || Number(price) < 0) return NextResponse.json({ success: false, message: 'Valid price is required' }, { status: 400 })
    product.price = Number(price)
  }
  if (stock !== undefined) product.stock = Number(stock)
  if (unit !== undefined) product.unit = unit.trim() || 'pcs'
  if (lowStockAlert !== undefined) product.lowStockAlert = Number(lowStockAlert)
  if (isAvailable !== undefined) product.isAvailable = Boolean(isAvailable)

  if (categoryId !== undefined) {
    const category = await Category.findOne({ _id: categoryId, bar: user.barId })
    if (!category) return NextResponse.json({ success: false, message: 'Invalid category' }, { status: 400 })
    product.category = categoryId
  }

  await product.save()
  await product.populate('category', 'name')
  return NextResponse.json({ success: true, message: 'Product updated', product })
}

export async function DELETE(request, { params }) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const { id } = await params
  const product = await getProduct(id, user.barId)
  if (!product) {
    return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 })
  }

  await product.deleteOne()
  return NextResponse.json({ success: true, message: 'Product deleted' })
}
