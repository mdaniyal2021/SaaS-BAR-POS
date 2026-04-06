import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import Product from '@/models/Product'

// GET — all products with stock info
export async function GET(request) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    await connectDB()

    const products = await Product.find({ bar: user.barId })
      .populate('category', 'name')
      .sort({ name: 1 })

    return NextResponse.json({ success: true, products })
  } catch (error) {
    console.error('Inventory GET error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

// PATCH — manually adjust stock for a product
export async function PATCH(request) {
  try {
    const user = getUserFromRequest(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }
    await connectDB()

    const { productId, newStock, lowStockAlert } = await request.json()

    if (!productId) {
      return NextResponse.json({ success: false, message: 'Product ID is required' }, { status: 400 })
    }
    if (newStock === undefined || newStock === null || isNaN(newStock) || Number(newStock) < 0) {
      return NextResponse.json({ success: false, message: 'Valid stock value is required' }, { status: 400 })
    }

    const product = await Product.findOne({ _id: productId, bar: user.barId })
    if (!product) {
      return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 })
    }

    product.stock = Number(newStock)
    if (lowStockAlert !== undefined && !isNaN(lowStockAlert)) {
      product.lowStockAlert = Number(lowStockAlert)
    }
    await product.save()
    await product.populate('category', 'name')

    return NextResponse.json({ success: true, message: 'Stock updated successfully', product })
  } catch (error) {
    console.error('Inventory PATCH error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}