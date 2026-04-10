import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'cashier'],
    default: 'cashier',
  },
  bar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bar',
    default: null, // null for superadmin
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
})

// Hash password before saving
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  if (this.password.length < 8) {
    throw new Error('Password must be at least 8 characters long')
  }
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Compare password method
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

const User = mongoose.models.User || mongoose.model('User', UserSchema)
export default User
