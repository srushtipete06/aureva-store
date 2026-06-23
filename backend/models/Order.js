const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  customerDetails: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String },
    city: { type: String },
    pinCode: { type: String }
  },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true }
    }
  ],
  totalAmount: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    default: 'Paid' 
  },
  razorpayPaymentId: { 
    type: String 
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);