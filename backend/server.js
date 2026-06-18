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

//  Razorpay Setup (Official Test Keys)
const razorpay = new Razorpay({
  key_id: "rzp_live_T30T7ccffoXhy5",        
  key_secret: "SNsK97sSLB4RPRmSAlDOovpx"
});

//  MongoDB Atlas Connection
mongoose.connect("mongodb+srv://srushtipete06_db_user:kcKk7YBPI0HGqurK@cluster0.xod8amk.mongodb.net/aureva?retryWrites=true&w=majority")
  .then(() => console.log("MongoDB Atlas Connected 💎"))
  .catch(err => console.error("MongoDB Connection Error:", err));

//  Test Route
app.get("/", (req, res) => {
  res.send("AUREVA backend running 🚀");
});

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

//  Start Server (Port dynamically environments se uthaega ya default 5000)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🔥`);
});