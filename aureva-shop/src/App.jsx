import Dashboard from './Dashboard';
import React, { useEffect, useState } from 'react';
import { useCart } from './CartContext';
import Auth from './Auth';
import axios from 'axios';

function App() {
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All'); 
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [view, setView] = useState('shop'); 
  const [user, setUser] = useState(null); 
  const { cartItems, addToCart, removeFromCart, clearCart, totalPrice } = useCart();

  // Modal, Wishlist & Real Review States
  const [selectedProduct, setSelectedProduct] = useState(null); 
  const [modalQuantity, setModalQuantity] = useState(1);
  const [localWishlist, setLocalWishlist] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [shippingData, setShippingData] = useState({
    name: '', email: '', address: '', city: '', pinCode: '', phone: ''
  });

  const [newProduct, setNewProduct] = useState({
    name: '', price: '', description: '', images: '', category: 'Rings' 
  });

  const backendUrl = "https://aureva-store.onrender.com/api";
  const token = localStorage.getItem('token');
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

  // 🟢 PERSISTENT WISHLIST LOADER (RELOAD SYNCHRONIZATION)
  const fetchWishlist = async (passedToken) => {
    const activeToken = passedToken || localStorage.getItem('token') || token;
    if (!activeToken) return;
    
    try {
      const { data } = await axios.get(`${backendUrl}/user/wishlist`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      
      if (Array.isArray(data)) {
        const parsedIds = data.map(item => {
          if (item && typeof item === 'object' && item._id) return item._id.toString();
          return item ? item.toString() : '';
        });
        setLocalWishlist(parsedIds);
      }
    } catch (err) { 
      console.error("Wishlist state sync refresh failure:", err); 
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setShippingData(prev => {
        const parsed = JSON.parse(savedUser);
        return {
          ...prev,
          name: parsed.name || '',
          email: parsed.email || ''
        };
      });
      fetchWishlist(savedToken);
    }
    fetchProducts();
  }, []);

  // Fetch reviews dynamically whenever a product is selected
  useEffect(() => {
    if (selectedProduct) {
      fetchProductReviews(selectedProduct._id);
    }
  }, [selectedProduct]);

  // 🟢 HIGH-PERFORMANCE DATA NORMALIZATION & CATEGORY FILTERING
  const filteredProducts = React.useMemo(() => {
    const safeProducts = (products || []).map(p => {
      if (!p.images || (Array.isArray(p.images) && p.images.length === 0)) {
        return {
          ...p,
          images: p.image ? [p.image] : ["https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500"]
        };
      }
      if (typeof p.images === 'string') {
        return { ...p, images: [p.images] };
      }
      return p;
    });

    if (selectedCategory === 'All') {
      return safeProducts;
    }
    return safeProducts.filter(p => p.category === selectedCategory);
  }, [selectedCategory, products]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setLocalWishlist([]);
    setView('shop');
  };

  const fetchProducts = () => {
    fetch('https://aureva-store.onrender.com/api/products')
      .then((res) => {
        if (!res.ok) {
          return fetch('https://aureva-store.onrender.com/products').then(r => r.json());
        }
        return res.json();
      })
      .then((data) => {
        setProducts(data || []);
      })
      .catch((err) => {
        console.error("Primary endpoint failed, calling global endpoint root:", err);
        fetch('https://aureva-store.onrender.com/products')
          .then(res => res.json())
          .then(data => setProducts(data || []))
          .catch(e => console.error("All production paths blocked:", e));
      });
  };

  

    // 🟢 FIXED: Safe, Persistent and Syntactically Closed Toggle Engine
  const toggleWishlist = async (product) => {
    const currentToken = localStorage.getItem('token') || token;
    if (!currentToken) {
      alert("Please login to manage your wishlist! ❤️");
      setView('auth');
      return;
    }

    const productIdStr = product._id.toString();
    const isAlreadyPresent = localWishlist.includes(productIdStr);

    try {
      // Optimistic Update: Frontend UI changes color immediately
      if (isAlreadyPresent) {
        setLocalWishlist(prev => prev.filter(id => id !== productIdStr));
      } else {
        setLocalWishlist(prev => [...prev, productIdStr]);
      }

      // Sync data changes directly to server
      const { data } = await axios.post(
        `${backendUrl}/user/wishlist/toggle`, 
        { productId: productIdStr }, 
        { headers: { Authorization: `Bearer ${currentToken}` } }
      );
      
      console.log("👉 SERVER TOGGLE RESPONSE DATA:", data);
      
      if (data && Array.isArray(data.products)) {
        setLocalWishlist(data.products.map(id => id.toString()));
      }
    } catch (err) { 
      console.error("Wishlist database toggle error, rolling back:", err);
      fetchWishlist(currentToken);
    }
  };

  const fetchProductReviews = async (productId) => {
    try {
      const { data } = await axios.get(`https://aureva-store.onrender.com/api/products/${productId}/reviews`);
      setReviews(data);
    } catch (err) {
      console.error("Error fetching reviews:", err);
      setReviews([]); 
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Please login to leave a review.");
      return;
    }
    try {
      const { data } = await axios.post(
        `https://aureva-store.onrender.com/api/products/${selectedProduct._id}/reviews`,
        { rating: Number(newReview.rating), comment: newReview.comment },
        config
      );
      setReviews([data.review, ...reviews]);
      setNewReview({ rating: 5, comment: '' });
      alert("Thank you for your authentic review! ✨");
    } catch (err) {
      console.error(err);
      alert("Could not submit review at this moment.");
    }
  };

  const handleInputChange = (e) => {
    setShippingData({ ...shippingData, [e.target.name]: e.target.value });
  };

  const handleAdminInputChange = (e) => {
    setNewProduct({ ...newProduct, [e.target.name]: e.target.value });
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const imageArray = newProduct.images.split(',').map(url => url.trim());

      const res = await fetch("https://aureva-store.onrender.com/add-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...newProduct, 
          price: Number(newProduct.price),
          images: imageArray 
        })
      });
      if (res.ok) {
        alert("Luxury Product successfully added! 💎");
        setNewProduct({ name: '', price: '', description: '', images: '', category: 'Rings' });
        fetchProducts(); 
        setView('shop');
      }
    } catch (err) { console.error(err); }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("https://aureva-store.onrender.com/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: totalPrice })
      });
      
      const paymentData = await res.json();
      if (!paymentData.success) return;

      const options = {
        key: "rzp_live_T30T7ccffoXhy5", 
        amount: paymentData.order.amount,
        currency: "INR",
        name: "AUREVA ",
        order_id: paymentData.order.id,
        handler: async function (response) {
          const currentToken = localStorage.getItem('token') || token;

          const orderRes = await fetch("https://aureva-store.onrender.com/place-order", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${currentToken}` 
            },
            body: JSON.stringify({
              customerDetails: shippingData,
              items: cartItems.map(item => ({
                productId: item._id, name: item.price, price: item.price, quantity: item.quantity
              })),
              totalAmount: totalPrice,
              razorpayPaymentId: response.razorpay_payment_id 
            })
          });
          
          const orderData = await orderRes.json();
          if (orderData.success || orderRes.status === 201) {
            localStorage.removeItem('cart'); 
            clearCart(); 
            setView('success'); 
          } else {
            alert("Payment caught but order execution dropped. Kindly message care.");
          }
        },
        prefill: { name: shippingData.name, email: shippingData.email, contact: shippingData.phone },
        theme: { color: "#b3925c" }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#2c2a29] font-serif relative">
      
      {/* 👑 NAVBAR */}
      <nav className="bg-white border-b border-[#e5e1da] px-8 py-5 flex justify-between items-center sticky top-0 z-40 shadow-sm">
        <h1 
          onClick={() => { setView('shop'); setSelectedCategory('All'); }}
          onDoubleClick={() => setView('admin')} 
          className="text-3xl font-bold tracking-[0.2em] text-[#b3925c] cursor-pointer selection:bg-transparent"
          title="Double click for Admin Panel"
        >
          AUREVA
        </h1>
        <div className="flex items-center gap-6">
          {user ? (
            <div className="flex items-center gap-4 text-xs tracking-widest uppercase">
              <button onClick={() => setView('dashboard')} className="text-[#b3925c] font-semibold hover:underline">
                👤 My Account ({user.name})
              </button>
              <button onClick={handleLogout} className="text-red-500 hover:underline">Logout</button>
            </div>
          ) : (
            <button onClick={() => setView('auth')} className="text-xs uppercase tracking-widest font-semibold hover:text-[#b3925c] transition-all duration-300">
              Login
            </button>
          )}

          {view === 'shop' && (
            <button onClick={() => setIsCartOpen(true)} className="relative bg-[#2c2a29] text-white px-5 py-2.5 text-sm tracking-widest uppercase hover:bg-[#b3925c] transition-all duration-300">
              Cart ({cartItems.reduce((acc, item) => acc + item.quantity, 0)})
            </button>
          )}
        </div>
      </nav>

      {/* 🔐 VIEW: LOGIN / SIGNUP */}
      {view === 'auth' && (
        <Auth setView={setView} onLoginSuccess={(userData, userToken) => {
          // 🟢 FIXED: Agar login success par token handle parameters se mil raha ho toh use save karein
          if (userToken) localStorage.setItem('token', userToken);
          localStorage.setItem('user', JSON.stringify(userData));
          
          setUser(userData);
          setShippingData(prev => ({ ...prev, name: userData.name, email: userData.email }));
          setView('shop');
          
          // Instant active call ensuring local storage sync is complete
          const currentToken = userToken || localStorage.getItem('token');
          if (currentToken) {
            fetchWishlist(currentToken);
          }
        }} />
      )}

      {/* 👤 VIEW: USER DASHBOARD */}
      {view === 'dashboard' && user && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <button onClick={() => setView('shop')} className="text-xs uppercase tracking-widest text-gray-400 hover:text-[#b3925c] mb-6 block">← Back to Shop</button>
          <Dashboard />
        </div>
      )}

      {/* 🛒 VIEW 1: SHOP (MAIN STOREFRONT) */}
      {view === 'shop' && (
        <>
          <header className="text-center py-24 bg-white border-b border-[#e5e1da] px-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[#b3925c] mb-3">The Ultimate Luxury Experience</p>
            <h2 className="text-4xl font-light tracking-wide md:text-6xl mb-6">Fine High Jewelry</h2>
            <p className="max-w-md mx-auto text-gray-500 text-sm italic font-sans leading-relaxed">
              Discover beautifully crafted timeless pieces designed to elevate your royal presence.
            </p>
          </header>

          <section className="flex justify-center items-center gap-8 md:gap-12 py-8 bg-white border-b border-[#e5e1da] text-xs uppercase tracking-widest font-semibold">
            {['All', 'Rings', 'Necklaces', 'Bracelets', 'Earrings'].map((cat) => (
              <button 
                key={cat} onClick={() => setSelectedCategory(cat)}
                className={`pb-2 border-b-2 transition-all duration-300 ${selectedCategory === cat ? 'border-[#b3925c] text-[#b3925c]' : 'border-transparent text-gray-400 hover:text-[#2c2a29]'}`}
              >
                {cat}
              </button>
            ))}
          </section>

          <main className="max-w-7xl mx-auto px-8 py-16">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12"><p className="text-xl italic text-gray-500">No luxury items found.</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                {filteredProducts.map((product) => (
                  <div key={product._id} className="bg-white group border border-[#e5e1da] overflow-hidden transition-all duration-300 hover:shadow-xl relative">
                    
                    {/* ❤️ Wishlist Button */}
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}
                      className="absolute top-4 right-4 z-10 bg-white/80 p-2 rounded-full shadow-md hover:bg-white transition-all duration-200 text-base"
                    >
                      {localWishlist.includes(product._id) ? '❤️' : '🤍'}
                    </button>

                    {/* Open Modal on click */}
                    <div onClick={() => { setSelectedProduct(product); setModalQuantity(1); setActiveImageIndex(0); }} className="cursor-pointer">
                      <div className="overflow-hidden bg-[#f4f4f4] aspect-square relative">
                        <img 
                          src={product.images && product.images[0] ? product.images[0] : (product.image || product.images)} 
                          alt={product.name} 
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" 
                          onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500"; }}
                        />
                      </div>
                      <div className="p-6 text-center">
                        <span className="text-[10px] uppercase tracking-widest text-gray-400 block mb-1">{product.category || 'Jewelry'}</span>
                        <h3 className="text-xl font-medium tracking-wide mb-2 hover:text-[#b3925c]">{product.name}</h3>
                        <p className="text-gray-500 text-sm italic mb-4 line-clamp-2">{product.description}</p>
                        <p className="text-[#b3925c] text-lg font-semibold tracking-wider mb-6">₹{product.price.toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    <div className="px-6 pb-6">
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

      {/* 🔍 PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-none grid grid-cols-1 md:grid-cols-2 relative shadow-2xl font-sans text-black">
            <button 
              type="button" 
              onClick={() => { setSelectedProduct(null); setActiveImageIndex(0); }} 
              className="absolute top-4 right-4 text-2xl font-light hover:text-[#b3925c] z-10"
            >
              ✕
            </button>
            
            {/* Left Column: Dynamic Multi-Image Gallery */}
            <div className="bg-[#faf9f6] flex flex-col justify-between p-0 border-r w-full md:h-full">
              <div className="flex-1 w-full flex items-center justify-center p-6 bg-white overflow-hidden self-center">
                <img 
                  src={selectedProduct.images && selectedProduct.images[activeImageIndex] ? selectedProduct.images[activeImageIndex] : (selectedProduct.image || selectedProduct.images)} 
                  alt={selectedProduct.name} 
                  className="w-full h-auto max-h-[480px] object-contain block transition-all duration-300 mx-auto" 
                  onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500"; }}
                />
              </div>

              {/* Thumbnails Row */}
              {selectedProduct.images && selectedProduct.images.length > 1 && (
                <div className="flex justify-center gap-3 p-4 border-t overflow-x-auto bg-[#faf9f6] shrink-0">
                  {selectedProduct.images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-14 h-14 bg-white border p-0.5 transition-all duration-200 aspect-square shrink-0 ${
                        activeImageIndex === idx ? 'border-[#b3925c] ring-1 ring-[#b3925c]' : 'border-gray-200 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} alt="angle preview" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Content Details */}
            <div className="p-8 flex flex-col justify-between bg-white overflow-y-auto border-t md:border-t-0">
              <div>
                <span className="text-xs uppercase tracking-widest text-[#b3925c] font-semibold">{selectedProduct.category}</span>
                <h2 className="text-3xl font-serif text-[#2c2a29] tracking-wide mt-1 mb-3">{selectedProduct.name}</h2>
                <p className="text-2xl font-semibold text-gray-800 mb-4">₹{selectedProduct.price.toLocaleString('en-IN')}</p>
                <p className="text-gray-600 text-sm leading-relaxed mb-6 italic">{selectedProduct.description}</p>
                
                {/* Quantity Selector */}
                <div className="mb-6">
                  <label className="block text-xs uppercase tracking-widest font-bold text-gray-500 mb-2">Select Quantity</label>
                  <div className="flex items-center gap-3 w-fit border border-gray-300 p-1">
                    <button type="button" onClick={() => setModalQuantity(q => Math.max(1, q - 1))} className="px-3 py-1 hover:bg-gray-100 text-lg font-bold">-</button>
                    <span className="w-8 text-center font-semibold text-sm">{modalQuantity}</span>
                    <button type="button" onClick={() => setModalQuantity(q => q + 1)} className="px-3 py-1 hover:bg-gray-100 text-lg font-bold">+</button>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex gap-3 mb-8">
                  <button 
                    type="button"
                    onClick={() => {
                      for(let i=0; i<modalQuantity; i++) { addToCart(selectedProduct); }
                      setSelectedProduct(null);
                      setActiveImageIndex(0);
                      setIsCartOpen(true);
                    }}
                    className="flex-1 bg-[#2c2a29] text-white py-4 text-xs uppercase tracking-widest font-semibold hover:bg-[#b3925c] transition-all duration-300"
                  >
                    Add {modalQuantity} Item(s) To Cart
                  </button>

                  <button 
                    type="button"
                    onClick={() => toggleWishlist(selectedProduct)}
                    className={`px-4 border transition-all duration-200 text-lg flex items-center justify-center ${
                      localWishlist.includes(selectedProduct._id) 
                        ? 'border-red-200 bg-red-50 text-red-500 hover:bg-red-100' 
                        : 'border-[#2c2a29] text-[#2c2a29] hover:bg-gray-50'
                    }`}
                    title={localWishlist.includes(selectedProduct._id) ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    {localWishlist.includes(selectedProduct._id) ? '❤️' : '🤍'}
                  </button>
                </div>
              </div>

              {/* REVIEWS SECTION */}
              <div className="border-t pt-4">
                <h4 className="text-xs uppercase tracking-widest font-bold text-gray-700 mb-3">Customer Reviews</h4>
                <div className="space-y-3 max-h-40 overflow-y-auto pr-2 mb-4">
                  {reviews.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No reviews yet. Be the first to share your genuine experience!</p>
                  ) : (
                    reviews.map((rev, index) => (
                      <div key={index} className="text-xs border-b pb-2">
                        <p className="text-[#b3925c] font-bold">
                          {"⭐".repeat(rev.rating)} 
                          <span className="text-gray-500 font-normal ml-2">by {rev.userName || 'Verified Buyer'}</span>
                        </p>
                        <p className="text-gray-600 mt-1">{rev.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                {user ? (
                  <form onSubmit={handleReviewSubmit} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase font-bold text-gray-500">Write a Review:</label>
                      <select 
                        value={newReview.rating} 
                        onChange={e => setNewReview({...newReview, rating: Number(e.target.value)})}
                        className="text-xs border p-1 bg-white"
                      >
                        <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                        <option value="4">⭐⭐⭐⭐ (4)</option>
                        <option value="3">⭐⭐⭐ (3)</option>
                        <option value="2">⭐⭐ (2)</option>
                        <option value="1">⭐ (1)</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        required
                        placeholder="Share your honest feedback..." 
                        value={newReview.comment}
                        onChange={e => setNewReview({...newReview, comment: e.target.value})}
                        className="w-full p-2 border text-xs outline-none focus:border-[#b3925c]"
                      />
                      <button type="submit" className="bg-[#2c2a29] text-white px-3 text-xs uppercase font-semibold hover:bg-[#b3925c]">Submit</button>
                    </div>
                  </form>
                ) : (
                  <p className="text-[10px] text-gray-400 italic text-center">Log in to leave a verified review.</p>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ⚙️ VIEW 2: SECRET ADMIN PANEL */}
      {view === 'admin' && (
        <main className="max-w-md mx-auto px-8 py-16 bg-white border border-[#e5e1da] mt-12 shadow-md">
          <button onClick={() => setView('shop')} className="text-xs uppercase tracking-widest text-gray-400 hover:text-[#b3925c] mb-6 block">← Back to Shop</button>
          <h3 className="text-2xl font-light tracking-widest uppercase mb-6 border-b pb-3 text-[#b3925c]">Add New Luxury Item</h3>
          <form onSubmit={handleAddProduct} className="space-y-4">
            <input required type="text" name="name" placeholder="Jewelry Name" value={newProduct.name} onChange={handleAdminInputChange} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c]" />
            <input required type="number" name="price" placeholder="Price in ₹" value={newProduct.price} onChange={handleAdminInputChange} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c]" />
            <select name="category" value={newProduct.category} onChange={handleAdminInputChange} className="w-full border p-3 rounded-none text-sm outline-none bg-white text-gray-600 focus:border-[#b3925c]">
              <option value="Rings">Rings</option>
              <option value="Necklaces">Necklaces</option>
              <option value="Bracelets">Bracelets</option>
              <option value="Earrings">Earrings</option>
            </select>
            <textarea required name="description" placeholder="Product Description" value={newProduct.description} onChange={handleAdminInputChange} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c] h-24" />
            
            <textarea 
              required 
              name="images" 
              placeholder="Paste multiple links here separated by commas (e.g. url1.jpg, url2.jpg, url3.jpg)" 
              value={newProduct.images || ''} 
              onChange={handleAdminInputChange} 
              className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c] h-24" 
            />
            
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
          <div className="text-3xl font-light tracking-widest uppercase mb-4">Order Placed!</div>
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
                      <img 
                        src={item.images && item.images[0] ? item.images[0] : (item.image || item.images)} 
                        alt={item.name} 
                        className="w-20 h-20 object-cover border border-[#e5e1da]" 
                        onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500"; }}
                      />
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
                <button onClick={() => { setIsCartOpen(false); setView('checkout'); }} className="w-full bg-[#2c2a29] text-white py-4 text-xs uppercase tracking-widest font-semibold hover:bg-[#b3925c] transition-all duration-300">Proceed to Checkout</button>
              </div>
            )}
          </div> 
        </div>
      )}

    </div>
  );
}

export default App;