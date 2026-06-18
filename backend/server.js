require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/user');
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Razorpay = require("razorpay");
const Product = require("./models/Product");
const Order = require("./models/Order");

const app = express();

app.use(cors({
    origin: ["https://aurevaonline.in", "https://www.aurevaonline.in"],
    credentials: true
}));
app.use(express.json());

// 💳 Razorpay Setup
const razorpay = new Razorpay({
 key_id: process.env.RAZORPAY_KEY_ID,        
 key_secret: process.env.RAZORPAY_KEY_SECRET
});

// 💾 MongoDB Atlas Connection
mongoose.connect("mongodb+srv://srushtipete06_db_user:kcKk7YBPI0HGqurK@cluster0.xod8amk.mongodb.net/aureva?retryWrites=true&w=majority")
  .then(() => console.log("MongoDB Atlas Connected 💎"))
  .catch(err => console.error("MongoDB Connection Error:", err));

// 🚀 Test Route
app.get("/", (req, res) => {
  res.send("AUREVA backend running successfully 🚀");
});

// ==========================================
// 🔑 AUTHENTICATION ROUTES (REGISTER & LOGIN)
// ==========================================

// 📝 1. USER REGISTER (SIGN UP)
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ success: false, message: "This email address is already registered." });

    // Secure and Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();
    res.status(201).json({ success: true, message: "User account successfully registered! 🎉" });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🔑 2. USER LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: "Invalid email or password." });

    // Match password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Invalid email or password." });

    // Generate JWT Token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'AUREVA_SECRET_KEY', {
      expiresIn: '7d'
    });

    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 📦 PRODUCT ROUTES
// ==========================================

// ADD PRODUCT (Admin side)
app.post("/add-product", async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json({ success: true, message: "Product added successfully! 💎", product: newProduct });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET ALL PRODUCTS
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 💳 PAYMENT & ORDER ROUTES
// ==========================================

// PAYMENT INITIATE ROUTE
app.post("/create-payment", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) {
      return res.status(400).json({ success: false, error: "Total amount is required." });
    }
    
    const options = {
      amount: Math.round(amount * 100), 
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    };
    
    const order = await razorpay.orders.create(options);
    res.status(200).json({ success: true, order });
  } catch (err) {
    console.error("Razorpay Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// SAVE ORDER ROUTE
app.post("/place-order", async (req, res) => {
  try {
    const { customerDetails, items, totalAmount } = req.body;
    const newOrder = new Order({ customerDetails, items, totalAmount, status: "Paid" });
    await newOrder.save();
    res.status(201).json({ success: true, message: "Order successfully saved to the database! 💎", orderId: newOrder._id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🔥`);
});