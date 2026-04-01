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
    default: 5,
  },
  unit: {
    type: String,
    default: 'pcs',
    trim: true,
  },
  barcode: {
    type: String,
    default: '',
    trim: true,
    // Unique per bar — enforced via compound index below
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
    default: true,
  },
}, {
  timestamps: true,
})

// Compound indexes for fast bar-scoped queries
ProductSchema.index({ bar: 1, category: 1 })
ProductSchema.index({ bar: 1, isAvailable: 1 })
// Barcode lookup — sparse so empty strings don't conflict
ProductSchema.index({ bar: 1, barcode: 1 }, { sparse: true })

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema)
export default Product