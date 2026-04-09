import mongoose from 'mongoose'

const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "order_<barId>"
  seq: { type: Number, default: 0 },
})

const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema)
export default Counter
