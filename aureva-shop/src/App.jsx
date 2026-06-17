import React, { useEffect, useState } from 'react';
import { useCart } from './CartContext';

function App() {
  const [products, setProducts] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [view, setView] = useState('shop'); // 'shop', 'checkout', 'success', 'admin'
  const { cartItems, addToCart, removeFromCart, clearCart, totalPrice } = useCart();

  // Checkout Form State
  const [shippingData, setShippingData] = useState({
    name: '', email: '', address: '', city: '', pinCode: '', phone: ''
  });

  // Admin New Product State
  const [newProduct, setNewProduct] = useState({
    name: '', price: '', description: '', image: ''
  });

  // 🌐 Live Backend se products fetch karna
  const fetchProducts = () => {
    fetch('https://aureva-store.onrender.com/products')
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error("Error fetching products:", err));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleInputChange = (e) => {
    setShippingData({ ...shippingData, [e.target.name]: e.target.value });
  };

  const handleAdminInputChange = (e) => {
    setNewProduct({ ...newProduct, [e.target.name]: e.target.value });
  };

  // 📝 ADMIN: Naya Product Add Karna (Live Server)
  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("https://aureva-store.onrender.com/add-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newProduct,
          price: Number(newProduct.price)
        })
      });
      if (res.ok) {
        alert("Product Successfully Added! 💎");
        setNewProduct({ name: '', price: '', description: '', image: '' });
        fetchProducts(); // Refresh Storefront
        setView('shop');
      }
    } catch (err) {
      console.error(err);
      alert("Product add karne mein dikkat aayi.");
    }
  };

  // 💳 PAYMENT AND ORDER PLACING LOGIC (Live Server + Razorpay)
  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("https://aureva-store.onrender.com/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: totalPrice })
      });
      const paymentData = await res.json();

      if (!paymentData.success) {
        alert("Payment initiate nahi ho paya bhai! Check backend.");
        return;
      }

      const options = {
        key: "rzp_test_T2iL4JJgye7uDR", // 👈 Aapke backend ki test key se sync kar diya hai
        amount: paymentData.order.amount,
        currency: "INR",
        name: "AUREVA Luxury",
        description: "Fine High Jewelry Purchase",
        order_id: paymentData.order.id,
        handler: async function (response) {
          const orderRes = await fetch("https://aureva-store.onrender.com/place-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerDetails: shippingData,
              items: cartItems.map(item => ({
                productId: item._id,
                name: item.name,
                price: item.price,
                quantity: item.quantity
              })),
              totalAmount: totalPrice
            })
          });
          const orderData = await orderRes.json();

          if (orderData.success) {
            setView('success');
            clearCart();
          }
        },
        prefill: {
          name: shippingData.name,
          email: shippingData.email,
          contact: shippingData.phone
        },
        theme: { color: "#b3925c" }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error(err);
      alert("Kuch gadbad ho gayi!");
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#2c2a29] font-serif relative">
      
      {/* 👑 NAVBAR */}
      <nav className="bg-white border-b border-[#e5e1da] px-8 py-5 flex justify-between items-center sticky top-0 z-40 shadow-sm">
        <h1 
          onDoubleClick={() => setView('admin')} // 👈 Secret entry point for admin panel!
          className="text-3xl font-bold tracking-[0.2em] text-[#b3925c] cursor-pointer selection:bg-transparent"
          title="Double click for Admin Panel"
        >
          AUREVA
        </h1>
        {view === 'shop' && (
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative bg-[#2c2a29] text-white px-5 py-2.5 rounded-none text-sm tracking-widest uppercase hover:bg-[#b3925c] transition-all duration-300"
          >
            Cart ({cartItems.reduce((acc, item) => acc + item.quantity, 0)})
          </button>
        )}
      </nav>

      {/* 🛒 VIEW 1: SHOP (MAIN STOREFRONT) */}
      {view === 'shop' && (
        <>
          <header className="text-center py-16 bg-white border-b border-[#e5e1da]">
            <p className="text-xs uppercase tracking-[0.3em] text-[#b3925c] mb-2">The Ultimate Luxury Experience</p>
            <h2 className="text-4xl font-light tracking-wide md:text-5xl">Fine High Jewelry</h2>
          </header>

          <main className="max-w-7xl mx-auto px-8 py-16">
            {products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xl italic text-gray-500">Database empty hai bhai! Logo par double click karke naya product daalo.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                {products.map((product) => (
                  <div key={product._id} className="bg-white group border border-[#e5e1da] overflow-hidden transition-all duration-300 hover:shadow-xl">
                    <div className="overflow-hidden bg-[#f4f4f4] aspect-square relative">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                    </div>
                    <div className="p-6 text-center">
                      <h3 className="text-xl font-medium tracking-wide mb-2">{product.name}</h3>
                      <p className="text-gray-500 text-sm italic mb-4 line-clamp-2">{product.description}</p>
                      <p className="text-[#b3925c] text-lg font-semibold tracking-wider mb-6">₹{product.price.toLocaleString('en-IN')}</p>
                      <button onClick={() => addToCart(product)} className="w-full border border-[#2c2a29] text-[#2c2a29] py-3 text-xs uppercase tracking-widest font-semibold bg-transparent transition-all duration-300 hover:bg-[#2c2a29] hover:text-white">
                        Add To Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </>
      )}

      {/* ⚙️ VIEW 2: SECRET ADMIN PANEL */}
      {view === 'admin' && (
        <main className="max-w-md mx-auto px-8 py-16 bg-white border border-[#e5e1da] mt-12 shadow-md">
          <button onClick={() => setView('shop')} className="text-xs uppercase tracking-widest text-gray-400 hover:text-[#b3925c] mb-6 block">← Back to Shop</button>
          <h3 className="text-2xl font-light tracking-widest uppercase mb-6 border-b pb-3 text-[#b3925c]">Add New Luxury Item</h3>
          <form onSubmit={handleAddProduct} className="space-y-4">
            <input required type="text" name="name" placeholder="Jewelry Name" value={newProduct.name} onChange={handleAdminInputChange} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c]" />
            <input required type="number" name="price" placeholder="Price in ₹" value={newProduct.price} onChange={handleAdminInputChange} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c]" />
            <textarea required name="description" placeholder="Product Description" value={newProduct.description} onChange={handleAdminInputChange} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c] h-24" />
            <input required type="text" name="image" placeholder="Image Link (URL)" value={newProduct.image} onChange={handleAdminInputChange} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c]" />
            <button type="submit" className="w-full bg-[#b3925c] text-white py-4 text-xs uppercase tracking-widest font-semibold hover:bg-[#2c2a29] transition-all duration-300">Save Product to Cloud</button>
          </form>
        </main>
      )}

      {/* 💳 VIEW 3: CHECKOUT PAGE */}
      {view === 'checkout' && (
        <main className="max-w-4xl mx-auto px-8 py-16">
          <button onClick={() => setView('shop')} className="text-sm uppercase tracking-widest text-gray-400 hover:text-[#b3925c] mb-8 block">← Back to Gallery</button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-white border border-[#e5e1da] p-8">
              <h3 className="text-xl font-light tracking-widest uppercase mb-6 border-b pb-3">Shipping Details</h3>
              <form onSubmit={handlePlaceOrder} className="space-y-4">
                <input required type="text" name="name" placeholder="Full Name" value={shippingData.name} onChange={handleInputChange} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c]" />
                <input required type="email" name="email" placeholder="Email Address" value={shippingData.email} onChange={handleInputChange} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c]" />
                <input required type="text" name="phone" placeholder="Phone Number" value={shippingData.phone} onChange={handleInputChange} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c]" />
                <input required type="text" name="address" placeholder="Street Address" value={shippingData.address} onChange={handleInputChange} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c]" />
                <div className="grid grid-cols-2 gap-4">
                  <input required type="text" name="city" placeholder="City" value={shippingData.city} onChange={handleInputChange} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c]" />
                  <input required type="text" name="pinCode" placeholder="Pin Code" value={shippingData.pinCode} onChange={handleInputChange} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c]" />
                </div>
                <button type="submit" className="w-full bg-[#2c2a29] text-white py-4 text-xs uppercase tracking-widest font-semibold hover:bg-[#b3925c] transition-all duration-300 mt-6">Place Order (Pay Now)</button>
              </form>
            </div>
            <div className="bg-[#fcfbf9] border border-[#e5e1da] p-8 h-fit">
              <h3 className="text-xl font-light tracking-widest uppercase mb-6 border-b pb-3">Order Summary</h3>
              <div className="space-y-4 max-h-60 overflow-y-auto mb-6">
                {cartItems.map((item) => (
                  <div key={item._id} className="flex justify-between items-center text-sm">
                    <span>{item.name} <span className="text-gray-400">x{item.quantity}</span></span>
                    <span className="font-semibold">₹{((item.price) * item.quantity).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#e5e1da] pt-4 flex justify-between items-center">
                <span className="uppercase tracking-widest text-sm text-gray-500">Total Bill:</span>
                <span className="text-2xl font-semibold text-[#b3925c]">₹{totalPrice.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* 🎉 VIEW 4: ORDER SUCCESS PAGE */}
      {view === 'success' && (
        <main className="max-w-md mx-auto text-center py-28 px-8">
          <div className="w-20 h-20 bg-[#b3925c]/10 text-[#b3925c] rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✓</div>
          <h2 className="text-3xl font-light tracking-widest uppercase mb-4">Order Placed!</h2>
          <p className="text-gray-500 text-sm italic mb-8">Thank you for shopping with AUREVA. Your royal high jewelry order has been recorded successfully.</p>
          <button onClick={() => setView('shop')} className="bg-[#2c2a29] text-white px-8 py-3 text-xs uppercase tracking-widest font-semibold hover:bg-[#b3925c] transition-all duration-300">Continue Shopping</button>
        </main>
      )}

      {/* 🛒 FLOATING SIDEBAR (CART) */}
      {isCartOpen && view === 'shop' && (
        <div className="fixed inset-0 bg-black/40 z-50 transition-opacity backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-8 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex justify-between items-center border-b border-[#e5e1da] pb-4 mb-6">
                <h3 className="text-2xl font-light tracking-widest uppercase">Your Cart</h3>
                <button onClick={() => setIsCartOpen(false)} className="text-2xl hover:text-[#b3925c]">✕</button>
              </div>
              {cartItems.length === 0 ? (
                <p className="text-center italic text-gray-400 mt-20">Your cart is as light as air. Add some luxury.</p>
              ) : (
                <div className="space-y-6">
                  {cartItems.map((item) => (
                    <div key={item._id} className="flex gap-4 border-b border-[#faf9f6] pb-4">
                      <img src={item.image} alt={item.name} className="w-20 h-20 object-cover border border-[#e5e1da]" />
                      <div className="flex-1">
                        <h4 className="font-medium text-base tracking-wide">{item.name}</h4>
                        <p className="text-[#b3925c] text-sm mt-1">₹{item.price.toLocaleString('en-IN')}</p>
                        <div className="flex items-center gap-3 mt-3">
                          <button onClick={() => removeFromCart(item._id)} className="border px-2 py-0.5 text-sm hover:bg-gray-100">-</button>
                          <span className="text-sm font-sans font-semibold">{item.quantity}</span>
                          <button onClick={() => addToCart(item)} className="border px-2 py-0.5 text-sm hover:bg-gray-100">+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {cartItems.length > 0 && (
              <div className="border-t border-[#e5e1da] pt-6 mt-6">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-sm uppercase tracking-widest text-gray-500">Subtotal:</span>
                  <span className="text-2xl font-semibold text-[#b3925c]">₹{totalPrice.toLocaleString('en-IN')}</span>
                </div>
                <button  onClick={() => { setIsCartOpen(false); setView('checkout'); }} className="w-full bg-[#2c2a29] text-white py-4 text-xs uppercase tracking-widest font-semibold hover:bg-[#b3925c] transition-all duration-300">Proceed to Checkout</button>
              </div>
            )}
          </div> 
        </div>
      )}

    </div>
  );
}

export default App;