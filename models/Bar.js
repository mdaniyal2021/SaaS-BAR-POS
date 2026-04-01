import mongoose from 'mongoose'

const BarSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Bar name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    default: '',
  },
  logo: {
    type: String,
    default: '',
  },
  address: {
    type: String,
    default: '',
  },
  subscription: {
    status: {
      type: String,
      enum: ['active', 'inactive', 'expired', 'trial'],
      default: 'trial',
    },
    plan: {
      type: String,
      enum: ['monthly', 'yearly', 'trial'],
      default: 'trial',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  },
  taxRate: {
    type: Number,
    default: 10,
  },
  // UK/EU → 'VAT' | USA → 'Sales Tax' | Canada → 'GST/HST' | Australia → 'GST'
  taxType: {
    type: String,
    enum: ['VAT', 'Sales Tax', 'GST', 'HST', 'PST', 'None'],
    default: 'VAT',
  },
  currency: {
    type: String,
    default: 'USD',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
})

const Bar = mongoose.models.Bar || mongoose.model('Bar', BarSchema)
export default Bar