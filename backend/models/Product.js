const mongoose = require("mongoose");

// Jewelry products ka structure (Schema)
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    description: { type: String }
});

// Is model ko export kar rahe hain taaki server.js isko use kar sake
module.exports = mongoose.model("Product", productSchema);