// ==========================================
// 🔒 SECURED GLOBAL ADDRESS ENDPOINTS
// ==========================================

// 1. SAVE ADDRESS: Naya address save karte waqt logged-in user ki ID attach karo
app.post("/api/user/global-addresses", authenticateToken, async (req, res) => {
  try {
    // 🔒 req.user.id humein authenticateToken middleware se mil raha hai
    const addressData = {
      ...req.body,
      user: req.user.id 
    };

    const address = new Address(addressData); // Tumhara naya Schema 'Address'
    await address.save();
    res.status(201).json({ success: true, message: "Address saved securely! ✨", address });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. FETCH ADDRESSES: Sirf logged-in user ke addresses query karo
app.get("/api/user/global-addresses", authenticateToken, async (req, res) => {
  try {
    // 🔒 STRICT PRIVACY LOCK: {} filter ke andar 'user: req.user.id' lagana compulsory hai
    const addresses = await Address.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(addresses);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});