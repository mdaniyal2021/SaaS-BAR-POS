import mongoose from 'mongoose'

const OrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true, // Snapshot at time of sale (product name may change later)
  },
  price: {
    type: Number,
    required: true, // Snapshot at time of sale (price may change later)
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  subtotal: {
    type: Number,
    required: true, // price * quantity
  },
}, { _id: false })

const OrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
  },
  items: {
    type: [OrderItemSchema],
    validate: {
      validator: (arr) => arr.length > 0,
      message: 'Order must have at least one item',
    },
  },
  subtotal: {
    type: Number,
    required: true, // Sum of all item subtotals (before tax)
  },
  tax: {
    type: Number,
    default: 0, // Tax amount captured at time of sale from bar.taxRate
  },
  total: {
    type: Number,
    required: true, // subtotal + tax
  },
  discount: {
    type: Number,
    default: 0,
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card'],
    required: [true, 'Payment method is required'],
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'paid',
  },
  notes: {
    type: String,
    default: '',
    trim: true,
  },
  cashier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  bar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bar',
    required: true,
  },
}, {
  timestamps: true,
})

// Fast queries for bar-scoped order history and reports
OrderSchema.index({ bar: 1, createdAt: -1 })
OrderSchema.index({ bar: 1, paymentStatus: 1 })
// Prevent duplicate order numbers per bar (safety net for race conditions)
OrderSchema.index({ bar: 1, orderNumber: 1 }, { unique: true })

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema)
export default Order
