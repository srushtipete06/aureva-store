const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/user');
const Address = require('../models/Address');
const Wishlist = require('../models/Wishlist');

// 👤 Profile Settings & Password Change Routes
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) { res.status(500).json({ message: "Profile load nahi ho payi" }); }
});

router.put('/profile/update', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.name = req.body.name || user.name;
      user.phone = req.body.phone || user.phone;
      const updatedUser = await user.save();
      res.json({ _id: updatedUser._id, name: updatedUser.name, email: updatedUser.email, phone: updatedUser.phone });
    } else { res.status(404).json({ message: "User nahi mila" }); }
  } catch (error) { res.status(500).json({ message: "Profile update error" }); }
});

router.put('/profile/changepassword', protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User nahi mila" });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Purana password galat hai!" });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ message: "Password successfully change ho gaya! 🔒" });
  } catch (error) { res.status(500).json({ message: "Password badalne mein dikkat aayi" }); }
});

// 📍 Address Routes
router.get('/addresses', protect, async (req, res) => {
  try { const addresses = await Address.find({ user: req.user.id }); res.json(addresses); } 
  catch (error) { res.status(500).json({ message: "Address fetch error" }); }
});

router.post('/addresses', protect, async (req, res) => {
  try { const newAddress = new Address({ ...req.body, user: req.user.id }); await newAddress.save(); res.status(201).json(newAddress); } 
  catch (error) { res.status(500).json({ message: "Address save error" }); }
});

// ❤️ Wishlist Routes
router.get('/wishlist', protect, async (req, res) => {
  try { const wishlist = await Wishlist.findOne({ user: req.user.id }).populate('products'); res.json(wishlist ? wishlist.products : []); } 
  catch (error) { res.status(500).json({ message: "Wishlist fetch error" }); }
});

router.post('/wishlist', protect, async (req, res) => {
  const { productId } = req.body;
  try {
    let wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) { wishlist = new Wishlist({ user: req.user.id, products: [] }); }
    if (wishlist.products.includes(productId)) {
      wishlist.products = wishlist.products.filter(id => id.toString() !== productId);
      await wishlist.save();
      return res.json({ message: "Removed from wishlist", wishlist: wishlist.products });
    } else {
      wishlist.products.push(productId);
      await wishlist.save();
      return res.json({ message: "Added to wishlist", wishlist: wishlist.products });
    }
  } catch (error) { res.status(500).json({ message: "Wishlist update error" }); }
});

module.exports = router;