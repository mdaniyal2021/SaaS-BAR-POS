import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { checkBarSubscription } from '@/lib/subscription'
import Product from '@/models/Product'
import Category from '@/models/Category'
import Order from '@/models/Order'
import Counter from '@/models/Counter'

export async function POST(request) {
  const user = getUserFromRequest(request)
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const sub = await checkBarSubscription(user.barId)
  if (!sub.ok) return NextResponse.json({ success: false, message: sub.message }, { status: 403 })

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 })
  }

  const { data, duplicateMode } = body

  if (!data || data.version !== '1') {
    return NextResponse.json(
      { success: false, message: 'Invalid or incompatible backup file. Only version 1 backups are supported.' },
      { status: 400 }
    )
  }

  if (!['skip', 'overwrite'].includes(duplicateMode)) {
    return NextResponse.json(
      { success: false, message: 'duplicateMode must be "skip" or "overwrite"' },
      { status: 400 }
    )
  }

  await connectDB()

  const barId  = user.barId
  const adminId = user.id
  const results = {
    categories: { created: 0 },
    products:   { created: 0, overwritten: 0, skipped: 0 },
    orders:     { imported: 0, skipped: 0 },
    errors:     [],
  }

  // ── Step 1: Import Categories ──────────────────────────────────────────────
  // Map: original category name (lowercase) → new ObjectId in this bar
  const catNameToId = {}

  for (const cat of (data.categories || [])) {
    const name = cat.name?.trim()
    if (!name) continue

    // Find existing by name (case-insensitive)
    const existing = await Category.findOne({
      bar:  barId,
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    })

    if (existing) {
      catNameToId[name.toLowerCase()] = existing._id
    } else {
      const created = await Category.create({ name, bar: barId, isActive: cat.isActive ?? true })
      catNameToId[name.toLowerCase()] = created._id
      results.categories.created++
    }
  }

  // ── Step 2: Import Products ────────────────────────────────────────────────
  // Map: product name (lowercase) → new ObjectId in this bar (used to link order items)
  const productNameToId = {}

  for (const prod of (data.products || [])) {
    const name = prod.name?.trim()
    if (!name) continue

    const catId = catNameToId[prod.categoryName?.trim().toLowerCase()]
    if (!catId) {
      results.errors.push(`Product "${name}" skipped — category "${prod.categoryName}" not found`)
      results.products.skipped++
      continue
    }

    const existing = await Product.findOne({
      bar:  barId,
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    })

    if (existing) {
      productNameToId[name.toLowerCase()] = existing._id

      if (duplicateMode === 'overwrite') {
        await Product.collection.updateOne(
          { _id: existing._id },
          { $set: {
            price:         prod.price,
            stock:         prod.stock         ?? 0,
            unit:          prod.unit          || 'pcs',
            lowStockAlert: prod.lowStockAlert ?? 5,
            taxRate:       prod.taxRate       ?? 0,
            image:         prod.image         || '',
            category:      catId,
            isAvailable:   prod.isAvailable   ?? true,
          }}
        )
        results.products.overwritten++
      } else {
        results.products.skipped++
      }
    } else {
      const created = await Product.create({
        name,
        price:         prod.price,
        stock:         prod.stock         ?? 0,
        unit:          prod.unit          || 'pcs',
        lowStockAlert: prod.lowStockAlert ?? 5,
        barcode:       '',   // Intentionally blank — barcodes must be unique per bar
        taxRate:       prod.taxRate       ?? 0,
        category:      catId,
        bar:           barId,
        isAvailable:   prod.isAvailable   ?? true,
      })

      if (prod.image) {
        await Product.collection.updateOne({ _id: created._id }, { $set: { image: prod.image } })
      }

      productNameToId[name.toLowerCase()] = created._id
      results.products.created++
    }
  }

  // ── Step 3: Import Orders ──────────────────────────────────────────────────
  const ordersToImport = data.orders || []

  if (ordersToImport.length > 0) {
    // Reserve a block of sequential order numbers atomically
    const counter = await Counter.findOneAndUpdate(
      { _id: `order_${barId}` },
      { $inc: { seq: ordersToImport.length } },
      { upsert: true, new: false }
    )
    let nextSeq = (counter?.seq ?? 0) + 1

    for (const order of ordersToImport) {
      // Re-map each item's product reference to the new bar's product IDs
      const items = (order.items || []).map(item => {
        const productId = productNameToId[item.name?.trim().toLowerCase()]
        if (!productId) return null
        return {
          product:   productId,
          name:      item.name,
          price:     item.price,
          quantity:  item.quantity,
          subtotal:  item.subtotal,
          taxRate:   item.taxRate   ?? 0,
          taxAmount: item.taxAmount ?? 0,
        }
      }).filter(Boolean)

      if (items.length === 0) {
        results.orders.skipped++
        continue
      }

      const orderNumber = `ORD-${String(nextSeq).padStart(6, '0')}`
      nextSeq++

      try {
        await Order.create({
          orderNumber,
          items,
          subtotal:      order.subtotal,
          tax:           order.tax      ?? 0,
          total:         order.total,
          discount:      order.discount ?? 0,
          paymentMethod: order.paymentMethod || 'cash',
          paymentStatus: 'paid',
          notes:         order.notes   || '',
          cashier:       adminId,
          bar:           barId,
          // createdAt not set — uses import timestamp (Mongoose default)
        })
        results.orders.imported++
      } catch (err) {
        // Duplicate orderNumber edge case — skip silently
        if (err.code === 11000) {
          results.orders.skipped++
        } else {
          results.errors.push(`Order "${order.originalOrderNumber}": ${err.message}`)
          results.orders.skipped++
        }
      }
    }
  }

  const summary = [
    `${results.categories.created} categories created`,
    `${results.products.created} products created`,
    duplicateMode === 'overwrite' ? `${results.products.overwritten} products overwritten` : `${results.products.skipped} products skipped (duplicate)`,
    `${results.orders.imported} orders imported`,
    results.orders.skipped > 0 ? `${results.orders.skipped} orders skipped` : null,
  ].filter(Boolean).join(', ')

  return NextResponse.json({
    success: true,
    message: `Import complete — ${summary}`,
    results,
  })
}
