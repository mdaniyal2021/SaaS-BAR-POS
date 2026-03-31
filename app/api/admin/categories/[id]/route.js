import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import Category from '@/models/Category'
import Product from '@/models/Product'

async function getCategory(id, barId) {
  const category = await Category.findOne({ _id: id, bar: barId })
  if (!category) return null
  return category
}

export async function PATCH(request, { params }) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const { id } = await params
  const category = await getCategory(id, user.barId)
  if (!category) {
    return NextResponse.json({ success: false, message: 'Category not found' }, { status: 404 })
  }

  const { name } = await request.json()

  if (!name || !name.trim()) {
    return NextResponse.json({ success: false, message: 'Category name is required' }, { status: 400 })
  }

  const duplicate = await Category.findOne({ bar: user.barId, name: name.trim(), _id: { $ne: id } })
  if (duplicate) {
    return NextResponse.json({ success: false, message: 'Another category with this name already exists' }, { status: 400 })
  }

  category.name = name.trim()
  await category.save()
  return NextResponse.json({ success: true, message: 'Category updated', category })
}

export async function DELETE(request, { params }) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const { id } = await params
  const category = await getCategory(id, user.barId)
  if (!category) {
    return NextResponse.json({ success: false, message: 'Category not found' }, { status: 404 })
  }

  const productCount = await Product.countDocuments({ category: id, bar: user.barId })
  if (productCount > 0) {
    return NextResponse.json(
      { success: false, message: `Cannot delete — ${productCount} product(s) are using this category` },
      { status: 400 }
    )
  }

  await category.deleteOne()
  return NextResponse.json({ success: true, message: 'Category deleted' })
}
