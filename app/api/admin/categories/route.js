import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import Category from '@/models/Category'

export async function GET(request) {
  const user = getUserFromRequest(request)
  if (!user || !['admin', 'cashier'].includes(user.role)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const categories = await Category.find({ bar: user.barId }).sort({ name: 1 })
  return NextResponse.json({ success: true, categories })
}

export async function POST(request) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const { name } = await request.json()

  if (!name || !name.trim()) {
    return NextResponse.json({ success: false, message: 'Category name is required' }, { status: 400 })
  }

  const existing = await Category.findOne({ bar: user.barId, name: name.trim() })
  if (existing) {
    return NextResponse.json({ success: false, message: 'Category with this name already exists' }, { status: 400 })
  }

  const category = await Category.create({ name: name.trim(), bar: user.barId })
  return NextResponse.json({ success: true, message: 'Category created successfully', category }, { status: 201 })
}
