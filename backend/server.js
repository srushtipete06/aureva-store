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

//  MongoDB Atlas Connection
mongoose.connect("mongodb+srv://srushtipete06_db_user:kcKk7YBPI0HGqurK@cluster0.xod8amk.mongodb.net/aureva?retryWrites=true&w=majority")
  .then(() => console.log("MongoDB Atlas Connected 💎"))
  .catch(err => console.error("MongoDB Connection Error:", err));

//  Test Route
app.get("/", (req, res) => {
  res.send("AUREVA backend running 🚀");
});

// ==========================================
//  AUTHENTICATION ROUTES (REGISTER & LOGIN)
// ==========================================

//  1. USER REGISTER (SIGN UP)
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // check user
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ success: false, message: "Email pehle se registered hai bhai!" });

    // Password secure
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // New user 
    user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();
    res.status(201).json({ success: true, message: "User successfully register ho gaya! 🎉" });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//  2. USER LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check karo user exist karta hai ya nahi
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: "Galat Email ya Password bhai!" });

    // Password match karo
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Galat Email ya Password bhai!" });

    // JWT Token generate karo taaki user login rahe
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'AUREVA_SECRET_KEY', {
      expiresIn: '7d' // 7 din tak token valid rahega
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
//  PRODUCT ROUTES
// ==========================================

//  ADD PRODUCT (Admin side)
app.post("/add-product", async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json({ success: true, message: "Product Added 💎", product: newProduct });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//  GET ALL PRODUCTS
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
//  PAYMENT & ORDER ROUTES
// ==========================================

//  PAYMENT INITIATE ROUTE (Razorpay Order ID Creator)
app.post("/create-payment", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) {
      return res.status(400).json({ success: false, error: "Amount required hai bhai!" });
    }
    
    const options = {
      amount: Math.round(amount * 100), // Secure formatting for paise
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

//  SAVE ORDER ROUTE (Saves to MongoDB after successful payment)
app.post("/place-order", async (req, res) => {
  try {
    const { customerDetails, items, totalAmount } = req.body;
    const newOrder = new Order({ customerDetails, items, totalAmount, status: "Paid" });
    await newOrder.save();
    res.status(201).json({ success: true, message: "Order Saved to Database! 💎", orderId: newOrder._id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

//  Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🔥`);
});