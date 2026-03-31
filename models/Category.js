import mongoose from 'mongoose'

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
  },
  bar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bar',
    required: [true, 'Bar reference is required'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
})

// One bar cannot have two categories with the same name
CategorySchema.index({ bar: 1, name: 1 }, { unique: true })

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema)
export default Category
