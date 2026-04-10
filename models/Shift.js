import mongoose from 'mongoose'

const ShiftSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active',
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
    default: null,
  },
  openingCash: {
    type: Number,
    required: true,
    min: [0, 'Opening cash cannot be negative'],
  },
  closingCash: {
    type: Number,
    default: null,
  },
  // Populated when shift closes
  totalCashSales:  { type: Number, default: 0 },
  totalCardSales:  { type: Number, default: 0 },
  cashOrderCount:  { type: Number, default: 0 },
  cardOrderCount:  { type: Number, default: 0 },
  totalOrders:     { type: Number, default: 0 },
  grossSales:      { type: Number, default: 0 }, // before discount, after per-item subtotal
  totalDiscount:   { type: Number, default: 0 }, // total discount given across all orders
  expectedCash:    { type: Number, default: 0 }, // openingCash + totalCashSales
  cashDifference:  { type: Number, default: 0 }, // closingCash - expectedCash
  notes:           { type: String,  default: '' },
}, { timestamps: true })

ShiftSchema.index({ bar: 1, cashier: 1, status: 1 })
ShiftSchema.index({ bar: 1, startTime: -1 })

const Shift = mongoose.models.Shift || mongoose.model('Shift', ShiftSchema)
export default Shift
