const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Order = require('../models/Order'); // Check exact path matching
const User = require('../models/user');   // Check exact path matching

// ==========================================
// 🔒 TOKEN VERIFICATION LAYER DIRECT BLOCK
// ==========================================
const checkSessionToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: "Authentication required. Please login." });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'AUREVA_SECRET_KEY');
    req.user = decoded; // Attaches user identity token payload context { id: '...' }
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: "Session expired or invalid token validation." });
  }
};

// ==========================================
// 📦 USER SPECIFIC ORDER HISTORY DISPATCHER
// ==========================================
router.get('/myorders', checkSessionToken, async (req, res) => {
  try {
    // 1. Logged-in user ka authentic contextual document database se fetch karo
    const userDoc = await User.findById(req.user.id);
    if (!userDoc) {
      return res.status(404).json({ success: false, message: "User account schema data mapping empty." });
    }

    // 2. 🔒 STRICT DATA PURGE AND ISOLATION: 
    // Filter orders collection STRICTLY by matching the session holder's exact email address
    const personalizedOrders = await Order.find({ "customerDetails.email": userDoc.email }).sort({ createdAt: -1 });
    
    // Response matrix return karo safely
    return res.json(personalizedOrders);

  } catch (err) {
    console.error("Order Privacy Verification Layer Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;