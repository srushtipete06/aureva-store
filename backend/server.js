const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Razorpay = require("razorpay");
const Product = require("./models/Product");
const Order = require("./models/Order"); // 👈 Order Model import kiya

const app = express();

// Middleware settings
app.use(cors());
app.use(express.json());

// Razorpay Setup (Official Test Keys for testing)
// Isko replace karo puraane wale Razorpay setup se
const razorpay = new Razorpay({
  key_id: "rzp_test_T2iL4JJgye7uDR",
  key_secret: "rAWYwLseYy5Sl1QIHPrB5ptA"
});

// MongoDB connect
mongoose.connect("mongodb+srv://srushtipete06_db_user:kcKk7YBPI0HGqurK@cluster0.xod8amk.mongodb.net/aureva?retryWrites=true&w=majority")
  .then(() => console.log("MongoDB Atlas Connected 💎"))
  .catch(err => console.log(err));

// Test route
app.get("/", (req, res) => {
  res.send("AUREVA backend running 🚀");
});

// ADD PRODUCT (Admin side)
app.post("/add-product", async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.send("Product Added 💎");
  } catch (err) {
    res.status(500).send(err);
  }
});

// GET ALL PRODUCTS
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).send(err);
  }
});

// 💳 ASLI PAYMENT INITIATE ROUTE (Razorpay Order ID Banayega)
app.post("/create-payment", async (req, res) => {
  try {
    const { amount } = req.body;
    const options = {
      amount: amount * 100, // Razorpay paise mein amount leta hai
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

// 📝 2. SAVE ORDER ROUTE (Payment hit hone ke baad MongoDB mein save karega)
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

// Start server
app.listen(5000, () => {
  console.log("Server running on port 5000 🔥");
});