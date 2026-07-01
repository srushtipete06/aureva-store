const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  // 🟢 CHANGED: Ab yeh ek single photo nahi, balki multiple images ka array hai
  images: [{ type: String, required: true }] 
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);