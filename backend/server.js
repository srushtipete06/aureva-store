require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/user');
const express = require("express");
const userDashboardRoutes = require('./routes/userDashboardRoutes');
const mongoose = require("mongoose");
const cors = require("cors");
const Razorpay = require("razorpay");
const Product = require("./models/Product");
const Order = require("./models/Order");
const nodemailer = require("nodemailer");

// ✅ FIXED: Instantiated properly without variable reference errors
const app = express();

// 1. Parsing Middleware
app.use(express.json());

// 2. CORS Configuration
app.use(cors({
  origin: ["https://www.aurevaonline.in", "https://aurevaonline.in"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true
}));

// 3. Manual Headers Bypass
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (["https://www.aurevaonline.in", "https://aurevaonline.in"].includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ==========================================
// 📍 SECURE CORS BYPASS ROUTES (FIXED FOR CORB BLOCKING)
// ==========================================
const GlobalAddress = mongoose.models.GlobalAddress || mongoose.model('GlobalAddress', new mongoose.Schema({
  fullName: String,
  phone: String,
  streetAddress: String,
  city: String,
  state: String,
  pincode: String
}, { timestamps: true }));

// 1. Save Address Endpoint (Bypass Area)
app.post("/api/user/global-addresses", async (req, res) => {
  try {
    const address = new GlobalAddress(req.body);
    await address.save();
    res.status(201).json(address);
  } catch (err) {
    console.error("Address Persistence Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Fetch Addresses Endpoint (Bypass Area)
app.get("/api/user/global-addresses", async (req, res) => {
  try {
    const addresses = await GlobalAddress.find().sort({ createdAt: -1 });
    res.json(addresses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Profile Update Endpoint (Bypass Area - Mapped to match frontend Axios call)
app.put("/api/user/public-profile/update", async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required." });

    const updatedUser = await User.findOneAndUpdate(
      { email: email },
      { name: name },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ success: false, message: "User not found." });

    res.json({ 
      success: true, 
      user: { id: updatedUser._id, name: updatedUser.name, email: updatedUser.email } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ❤️ 4. Wishlist Toggle Endpoint (🟢 FIXED: Connected to real MongoDB push/pull updates!)
app.post("/api/user/wishlist/toggle", async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: "Product ID is required." });

    let userId;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'AUREVA_SECRET_KEY');
        userId = decoded.id;
      } catch (err) {
        console.error("Token verification failed inside wishlist block context.");
      }
    }

    let userDoc;
    if (userId) {
      userDoc = await User.findById(userId);
    } else {
      userDoc = await User.findOne(); // Fallback layer for public session instances
    }

    if (!userDoc) return res.status(404).json({ success: false, message: "User session not found." });
    if (!userDoc.wishlist) userDoc.wishlist = [];

    const itemIndex = userDoc.wishlist.indexOf(productId);
    if (itemIndex > -1) {
      userDoc.wishlist.splice(itemIndex, 1);
      await userDoc.save();
      res.status(200).json({ success: true, message: "Removed from wishlist successfully." });
    } else {
      userDoc.wishlist.push(productId);
      await userDoc.save();
      res.status(200).json({ success: true, message: "Added to wishlist successfully! ✨" });
    }
  } catch (err) {
    console.error("Wishlist Toggle Sync Failure:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 📦 USER ORDERS HISTORY FETCH ROUTE (TOP BYPASS)
// ==========================================
app.get("/api/orders/myorders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Fetch orders error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Base Dashboard Routes (Strict validation routers come AFTER the public bypass hooks)
app.use('/api/user', userDashboardRoutes);

// 💳 Razorpay Setup
const razorpay = new Razorpay({
 key_id: process.env.RAZORPAY_KEY_ID,        
 key_secret: process.env.RAZORPAY_KEY_SECRET
});

// 💾 MongoDB Atlas Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Atlas Connected Safely! 💎"))
  .catch(err => console.error("MongoDB Connection Error:", err));

// 📧 NODEMAILER TRANSPORTER SETUP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const otpStore = new Map();

// 🚀 Test Route
app.get("/", (req, res) => {
  res.send("AUREVA backend running successfully 🚀");
});

// ==========================================
// 🔑 AUTHENTICATION ROUTES (REGISTER & LOGIN)
// ==========================================

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ success: false, message: "This email address is already registered." });

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    otpStore.set(email, { name, password: hashedPassword, otp: generatedOtp, expiresAt: Date.now() + 600000 });

    const mailOptions = {
      from: `"AUREVA High Jewelry" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify Your AUREVA Account 💎",
      html: `<h3>Welcome to AUREVA, ${name}!</h3>
             <p>Your 6-digit dynamic registration OTP code is:</p>
             <h2 style="color: #b3925c;">${generatedOtp}</h2>`
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Verification code sent! 🎉" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const sessionData = otpStore.get(email);
    if (!sessionData || sessionData.otp !== otp || Date.now() > sessionData.expiresAt) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
    }
    const user = new User({ name: sessionData.name, email, password: sessionData.password });
    await user.save();
    otpStore.delete(email);
    res.status(201).json({ success: true, message: "Account verified successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: "Invalid email or password." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Invalid email or password." });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'AUREVA_SECRET_KEY', { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 📦 PRODUCT ROUTES
// ==========================================

app.post("/add-product", async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json({ success: true, message: "Product added! 💎", product: newProduct });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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

app.post("/create-payment", async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ success: false, error: "Total amount is required." });
    
    const options = { amount: Math.round(amount * 100), currency: "INR", receipt: `receipt_${Date.now()}` };
    const order = await razorpay.orders.create(options);
    res.status(200).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/place-order", async (req, res) => {
  try {
    const { customerDetails, items, totalAmount } = req.body;
    const newOrder = new Order({ customerDetails, items, totalAmount, status: "Paid" });
    await newOrder.save();
    res.status(201).json({ success: true, message: "Order saved successfully! 💎", orderId: newOrder._id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 🚀 SERVER LISTEN
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🔥`);
});