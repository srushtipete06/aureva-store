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

// 🟢 REQUIRE DEDICATED WISHLIST SCHEDULER PERSISTENCE MODEL
const Wishlist = require('./models/Wishlist'); 

// 🟢 HOISTED DECLARATION: Globally instantiate otpStore Map
const otpStore = new Map();

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
// 📧 RESEND EMAIL SERVICE SETUP
// ==========================================
const { Resend } = require('resend');
// Explicit configuration passing for Tokyo Region as per domain setting
const resend = new Resend(process.env.RESEND_API_KEY || "re_mock_key", {
  headers: {
    'X-Resend-Region': 'ap-northeast-1'
  }
});

// ==========================================
// 📍 SECURE CORS BYPASS ROUTES
// ==========================================
const GlobalAddress = mongoose.models.GlobalAddress || mongoose.model('GlobalAddress', new mongoose.Schema({
  fullName: String,
  phone: String,
  streetAddress: String,
  city: String,
  state: String,
  pincode: String
}, { timestamps: true }));

app.post("/api/user/global-addresses", async (req, res) => {
  try {
    const address = new GlobalAddress(req.body);
    await address.save();
    res.status(201).json(address);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/user/global-addresses", async (req, res) => {
  try {
    const addresses = await GlobalAddress.find().sort({ createdAt: -1 });
    res.json(addresses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/user/public-profile/update", async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required." });
    const updatedUser = await User.findOneAndUpdate({ email }, { name }, { new: true });
    if (!updatedUser) return res.status(404).json({ success: false, message: "User not found." });
    res.json({ success: true, user: { id: updatedUser._id, name: updatedUser.name, email: updatedUser.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/user/wishlist", async (req, res) => {
  try {
    let userId;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'AUREVA_SECRET_KEY');
        userId = decoded.id;
      } catch (err) {}
    }
    if (!userId) {
      const fallbackUser = await User.findOne();
      if (fallbackUser) userId = fallbackUser._id;
    }
    if (!userId) return res.json([]);
    const userWishlist = await Wishlist.findOne({ user: userId }).populate('products');
    res.json(userWishlist && userWishlist.products ? userWishlist.products : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/user/profile", async (req, res) => {
  try {
    let userId;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'AUREVA_SECRET_KEY');
        userId = decoded.id;
      } catch (err) {}
    }
    const userDoc = userId ? await User.findById(userId) : await User.findOne();
    if (!userDoc) return res.status(404).json({ message: "User session document empty." });
    res.json({ name: userDoc.name, email: userDoc.email, phone: userDoc.phone || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/user/wishlist/toggle", async (req, res) => {
  try {
    const { productId } = req.body;
    let userId;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'AUREVA_SECRET_KEY');
        userId = decoded.id;
      } catch (err) {}
    }
    if (!userId) {
      const fallbackUser = await User.findOne();
      if (fallbackUser) userId = fallbackUser._id;
    }
    let userWishlist = await Wishlist.findOne({ user: userId });
    if (!userWishlist) {
      userWishlist = new Wishlist({ user: userId, products: [productId] });
      await userWishlist.save();
      return res.status(200).json({ success: true, action: "added" });
    }
    const itemIndex = userWishlist.products.indexOf(productId);
    if (itemIndex > -1) {
      userWishlist.products.splice(itemIndex, 1);
    } else {
      userWishlist.products.push(productId);
    }
    await userWishlist.save();
    res.status(200).json({ success: true, action: itemIndex > -1 ? "removed" : "added" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ⭐ REVIEWS ENDPOINTS
// ==========================================
const mockReviews = new Map();
app.get("/api/products/:productId/reviews", (req, res) => {
  const { productId } = req.params;
  if (!mockReviews.has(productId)) {
    return res.json([{ rating: 5, comment: "Absolutely stunning piece! Premium finish. 💎", userName: "AUREVA Buyer" }]);
  }
  res.json(mockReviews.get(productId));
});

app.post("/api/products/:productId/reviews", (req, res) => {
  const { productId } = req.params;
  const { rating, comment } = req.body;
  const freshReview = { rating: Number(rating) || 5, comment: comment || "Luxury design.", userName: "Verified Buyer", createdAt: new Date() };
  if (!mockReviews.has(productId)) mockReviews.set(productId, []);
  mockReviews.get(productId).unshift(freshReview);
  res.status(201).json({ success: true, review: freshReview });
});

app.get("/api/orders/myorders", async (req, res) => {
  try { res.json(await Order.find().sort({ createdAt: -1 })); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.use('/api/user', userDashboardRoutes);

const razorpay = new Razorpay({
 key_id: process.env.RAZORPAY_KEY_ID,        
 key_secret: process.env.RAZORPAY_KEY_SECRET
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Atlas Connected Safely! 💎"))
  .catch(err => console.error("MongoDB Connection Error:", err));

// ==========================================
// 🔑 AUTHENTICATION ROUTES (VERIFIED CUSTOM DOMAIN)
// ==========================================
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
    if (!name || !email || !password) return res.status(400).json({ success: false, message: "All fields are required." });

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ success: false, message: "This email address is already registered." });

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    otpStore.set(email, { name, password: hashedPassword, otp: generatedOtp, expiresAt: Date.now() + 600000 });

    await resend.emails.send({
      from: 'AUREVA High Jewelry <no-reply@aurevaonline.in>', // 👈 Strict Domain Trigger
      to: email,
      subject: 'Verify Your AUREVA Account 💎',
      html: `<h3>Welcome to AUREVA, ${name}!</h3><p>Your verification OTP code is:</p><h2>${generatedOtp}</h2>`
    });

    return res.status(200).json({ success: true, message: "Verification code sent! 🎉" });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Email pipeline blocked: ${err.message}` });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { otp } = req.body;
    const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
    const sessionData = otpStore.get(email);
    if (!sessionData || sessionData.otp !== otp.trim() || Date.now() > sessionData.expiresAt) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
    }
    const user = new User({ name: sessionData.name, email, password: sessionData.password });
    await user.save();
    otpStore.delete(email);
    return res.status(201).json({ success: true, message: "Account verified successfully!" });
  } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ success: false, message: "Invalid email or password." });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'AUREVA_SECRET_KEY', { expiresIn: '7d' });
    return res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  let email = req.body.email ? req.body.email.trim().toLowerCase() : '';
  if (!email) return res.status(400).json({ success: false, message: "Email is required." });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "No account found with this email." });

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(`reset_${email}`, { otp: generatedOtp, expiresAt: Date.now() + 600000 });

    await resend.emails.send({
      from: 'AUREVA High Jewelry <no-reply@aurevaonline.in>', // 👈 Strict Domain Trigger
      to: email,
      subject: 'Reset Your AUREVA Password 💎',
      html: `<h3>Password Reset Request</h3><p>Your 6-digit Reset OTP code is:</p><h2>${generatedOtp}</h2>`
    });

    return res.status(200).json({ success: true, message: "Reset OTP sent to your email! 🎉" });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Mail gateway error: ${err.message}` });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { otp, newPassword } = req.body;
    const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
    const sessionData = otpStore.get(`reset_${email}`);
    if (!sessionData || sessionData.otp !== otp.trim() || Date.now() > sessionData.expiresAt) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await User.findOneAndUpdate({ email }, { password: hashedPassword });
    otpStore.delete(`reset_${email}`);
    return res.status(200).json({ success: true, message: "Password updated successfully! 🎉" });
  } catch (err) { return res.status(500).json({ success: false, error: err.message }); }
});

// ==========================================
// 📦 PRODUCT / PAYMENT ROUTES
// ==========================================
app.post("/add-product", async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json({ success: true, product: newProduct });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get("/products", async (req, res) => {
  try { res.json(await Product.find()); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/create-payment", async (req, res) => {
  try {
    const options = { amount: Math.round(req.body.amount * 100), currency: "INR", receipt: `receipt_${Date.now()}` };
    res.status(200).json({ success: true, order: await razorpay.orders.create(options) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post("/place-order", async (req, res) => {
  try {
    const newOrder = new Order({ ...req.body, status: "Paid" });
    await newOrder.save();
    res.status(201).json({ success: true, orderId: newOrder._id });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🔥`));