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
const nodemailer = require("nodemailer"); // 📧 NodeMailer Added

const app = express();

app.use(cors({
    origin: ["https://aurevaonline.in", "https://www.aurevaonline.in"],
    credentials: true
}));
app.use(express.json());
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
    pass: process.env.EMAIL_PASS // Tumhara 16-digit App Password bina spaces ke render par save hona chahiye
  }
});

// Temporary memory block codes storage (In-memory storage for OTPs)
const otpStore = new Map();

// 🚀 Test Route
app.get("/", (req, res) => {
  res.send("AUREVA backend running successfully with Live OTP Systems 🚀");
});

// ==========================================
// 🔑 AUTHENTICATION ROUTES (REGISTER & LOGIN)
// ==========================================

// 📝 1. USER REGISTER (WITH REAL EMAIL OTP SENDING)
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ success: false, message: "This email address is already registered." });

    // Generate 6 Digit Secure Code
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Secure and Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save temporary state details in Memory
    otpStore.set(email, { name, password: hashedPassword, otp: generatedOtp, expiresAt: Date.now() + 600000 }); // 10 Min Valid

    // Nodemailer Mail Trigger Layout
    const mailOptions = {
      from: `"AUREVA High Jewelry" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify Your AUREVA Account 💎",
      html: `<h3>Welcome to AUREVA, ${name}!</h3>
             <p>Thank you for creating an account with us. Your 6-digit dynamic registration OTP code is:</p>
             <h2 style="color: #b3925c; tracking-char: 2px;">${generatedOtp}</h2>
             <p>This code is valid for the next 10 minutes only.</p>`
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: "Verification registration code has been dispatched to your email address! 🎉" });

  } catch (err) {
    console.error("Registration Mail Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 📝 1B. VERIFY REGISTER OTP (CRITICAL BACKEND HOOK)
app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const sessionData = otpStore.get(email);

    if (!sessionData || sessionData.otp !== otp || Date.now() > sessionData.expiresAt) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP code verification failed." });
    }

    // Creating profile inside DB permanently now
    const user = new User({
      name: sessionData.name,
      email: email,
      password: sessionData.password
    });

    await user.save();
    otpStore.delete(email); // Clean Memory

    res.status(201).json({ success: true, message: "Account verified successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🔑 2. USER LOGIN (MODIFIED TO ENFORCE OTP SECURITY AT SIGN IN)
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: "Invalid email or password." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Invalid email or password." });

    // Generate 6 Digit Code for Login Validation
    const loginOtp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(`login_${email}`, { otp: loginOtp, userId: user._id, expiresAt: Date.now() + 600000 });

    // Send Mail via NodeMailer Setup
    const mailOptions = {
      from: `"AUREVA High Jewelry" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "AUREVA Account Secure Login OTP 🔐",
      html: `<h3>Hello ${user.name},</h3>
             <p>We received a sign-in request for your account. Please use the following OTP to log in securely:</p>
             <h2 style="color: #2c2a29; letter-spacing: 2px;">${loginOtp}</h2>
             <p>If you did not initiate this request, please change your security configurations immediately.</p>`
    };

    await transporter.sendMail(mailOptions);

    // 🌟 Signal frontend that OTP screen needs to open!
    res.status(200).json({ success: true, requiresOtp: true, message: "Security login authentication OTP has been triggered!" });

  } catch (err) {
    console.error("Login OTP Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🔑 2B. VERIFY LOGIN OTP ROUTE (FINALIZE SECURE SIGN IN)
app.post("/api/auth/verify-login-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const sessionData = otpStore.get(`login_${email}`);

    if (!sessionData || sessionData.otp !== otp || Date.now() > sessionData.expiresAt) {
      return res.status(400).json({ success: false, message: "Invalid or expired login OTP validation code." });
    }

    const user = await User.findById(sessionData.userId);
    if (!user) return res.status(404).json({ success: false, message: "User reference profile missing." });

    // Create Authorized Token Session
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'AUREVA_SECRET_KEY', {
      expiresIn: '7d'
    });

    otpStore.delete(`login_${email}`); // Wipe session logs

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

app.post("/add-product", async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json({ success: true, message: "Product added successfully! 💎", product: newProduct });
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🔥`);
});