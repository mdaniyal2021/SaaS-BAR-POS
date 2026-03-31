import mongoose from 'mongoose'

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative'],
  },
  lowStockAlert: {
    type: Number,
    default: 5, // Alert when stock falls to or below this number
  },
  unit: {
    type: String,
    default: 'pcs', // e.g. bottle, glass, pint, pcs
    trim: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required'],
  },
  bar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bar',
    required: [true, 'Bar reference is required'],
  },
  isAvailable: {
    type: Boolean,
    default: true, // Quick toggle to hide from POS without deleting
  },
}, {
  timestamps: true,
})

// Compound index for fast bar-scoped product queries
ProductSchema.index({ bar: 1, category: 1 })
ProductSchema.index({ bar: 1, isAvailable: 1 })

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema)
export default Product
