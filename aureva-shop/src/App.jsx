import Dashboard from './Dashboard';
import React, { useEffect, useState, useMemo } from 'react';
import { useCart } from './CartContext';
import Auth from './Auth';
import axios from 'axios';
import { 
  ShoppingBag, 
  Heart, 
  User, 
  X, 
  Plus, 
  Minus, 
  Star, 
  Check, 
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Truck
} from 'lucide-react';

function App() {
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All'); 
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [view, setView] = useState('shop'); 
  const [user, setUser] = useState(null); 
  const { cartItems, addToCart, removeFromCart, clearCart, totalPrice } = useCart();

  // Modal, Wishlist & Review States
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

  // 🟢 PERSISTENT WISHLIST LOADER
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

  useEffect(() => {
    if (selectedProduct) {
      fetchProductReviews(selectedProduct._id);
    }
  }, [selectedProduct]);

  // Normalize products data
  const filteredProducts = useMemo(() => {
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

  const toggleWishlist = async (product) => {
    const currentToken = localStorage.getItem('token') || token;
    if (!currentToken) {
      alert("Please login to curate your wishlist! 💎");
      setView('auth');
      return;
    }

    const productIdStr = product._id.toString();
    const isAlreadyPresent = localWishlist.includes(productIdStr);

    try {
      // Optimistic update
      if (isAlreadyPresent) {
        setLocalWishlist(prev => prev.filter(id => id !== productIdStr));
      } else {
        setLocalWishlist(prev => [...prev, productIdStr]);
      }

      const { data } = await axios.post(
        `${backendUrl}/user/wishlist/toggle`, 
        { productId: productIdStr }, 
        { headers: { Authorization: `Bearer ${currentToken}` } }
      );
      
      if (data && Array.isArray(data.products)) {
        setLocalWishlist(data.products.map(p => (typeof p === 'object' ? p._id.toString() : p.toString())));
      }
    } catch (err) { 
      console.error("Wishlist toggle error, rolling back:", err);
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
      alert("Please sign in to write an authentic review.");
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
        alert("Luxury Product successfully added to catalog! 💎");
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
        name: "AUREVA Jewelry",
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
                productId: item._id, name: item.name, price: item.price, quantity: item.quantity
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
            alert("Payment caught but order save failed. Please contact care.");
          }
        },
        prefill: { name: shippingData.name, email: shippingData.email, contact: shippingData.phone },
        theme: { color: "#C5A880" }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) { console.error(err); }
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#FCFAF7] text-[#121212] font-sans antialiased selection:bg-[#c5a880]/20 selection:text-[#121212]">
      
      {/* ✦ TOP TICKER BANNER */}
      <div className="bg-[#121212] text-[#F8F4EE] text-[10px] tracking-[0.25em] font-medium uppercase py-2 text-center overflow-hidden">
        ✦ Free Insured Shipping Across India ✦ Handcrafted Artistry & Heirlooms ✦ Easy 7-Day Support ✦
      </div>

      {/* 👑 LUXURY STICKY NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-[#ECE5D8]/70 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex justify-between items-center">
          
          {/* Brand Monogram */}
          <div 
            onClick={() => { setView('shop'); setSelectedCategory('All'); }}
            onDoubleClick={() => setView('admin')} 
            className="cursor-pointer select-none group flex flex-col"
            title="Double click for Admin Panel"
          >
            <span className="font-serif text-2xl lg:text-3xl font-light tracking-[0.28em] text-[#121212] transition-colors group-hover:text-[#9A7B4F]">
              AUR<span className="font-semibold text-[#C5A880]">E</span>VA
            </span>
            <span className="text-[9px] uppercase tracking-[0.3em] text-stone-400 font-sans -mt-0.5">High Jewelry</span>
          </div>

          {/* Action Hub */}
          <div className="flex items-center gap-5 sm:gap-7">
            {user ? (
              <div className="flex items-center gap-4 text-xs font-semibold tracking-wider uppercase">
                <button 
                  onClick={() => setView('dashboard')} 
                  className="flex items-center gap-2 text-stone-700 hover:text-[#9A7B4F] transition-colors"
                >
                  <User className="h-4 w-4 text-[#C5A880]" />
                  <span className="hidden sm:inline">{user.name.split(' ')[0]}</span>
                </button>
                <button 
                  onClick={handleLogout} 
                  className="text-stone-400 hover:text-red-600 transition-colors text-[11px]"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setView('auth')} 
                className="flex items-center gap-2 text-xs uppercase font-semibold tracking-widest text-stone-700 hover:text-[#9A7B4F] transition-colors"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

            {/* Wishlist Link Indicator */}
            {user && (
              <button 
                onClick={() => setView('dashboard')}
                className="relative p-1 text-stone-700 hover:text-[#9A7B4F] transition-colors"
                title="View Curated Wishlist"
              >
                <Heart className="h-5 w-5" />
                {localWishlist.length > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#121212] text-[9px] font-bold text-white ring-2 ring-white">
                    {localWishlist.length}
                  </span>
                )}
              </button>
            )}

            {/* Cart Button */}
            <button 
              onClick={() => setIsCartOpen(true)} 
              className="relative flex items-center gap-2.5 rounded-full bg-[#121212] text-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider shadow-lg shadow-black/10 hover:bg-[#9A7B4F] transition-all duration-300 active:scale-95"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Bag</span>
              {totalCartCount > 0 && (
                <span className="ml-1 rounded-full bg-[#C5A880] px-1.5 py-0.2 text-[10px] font-bold text-[#121212]">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 🔐 VIEW: LOGIN / SIGNUP */}
      {view === 'auth' && (
        <Auth 
          setView={setView} 
          onLoginSuccess={(userData, userToken) => {
            if (userToken) localStorage.setItem('token', userToken);
            localStorage.setItem('user', JSON.stringify(userData));
            
            setUser(userData);
            setShippingData(prev => ({ ...prev, name: userData.name, email: userData.email }));
            setView('shop');
            
            const currentToken = userToken || localStorage.getItem('token');
            if (currentToken) {
              fetchWishlist(currentToken);
            }
          }} 
        />
      )}

      {/* 👤 VIEW: USER DASHBOARD */}
      {view === 'dashboard' && user && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <button 
            onClick={() => setView('shop')} 
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-stone-400 hover:text-[#9A7B4F] mb-6 font-semibold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Store
          </button>
          <Dashboard />
        </div>
      )}

      {/* 🛒 VIEW 1: SHOP (MAIN STOREFRONT) */}
      {view === 'shop' && (
        <>
          {/* Hero Banner */}
          <section className="relative overflow-hidden py-24 sm:py-32 bg-[#F8F4EE] border-b border-[#ECE5D8] px-6 text-center">
            <div className="relative z-10 max-w-3xl mx-auto">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#ECE5D8] bg-white/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9A7B4F] mb-6 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" /> The High Artisan Collection
              </span>
              <h2 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-light text-[#121212] tracking-tight leading-tight">
                Adorn Yourself in <br />
                <span className="italic font-normal text-[#C5A880]">Pure Radiance</span>
              </h2>
              <p className="mt-6 text-stone-600 text-sm sm:text-base font-light max-w-xl mx-auto leading-relaxed">
                Sculpted miniature forms, iridescent gemstones, and timeless handmade pieces designed to elevate everyday luxury.
              </p>
            </div>
          </section>

          {/* Sticky Category Pills */}
          <div className="sticky top-20 z-30 bg-white/90 backdrop-blur-md border-b border-[#ECE5D8] py-4 px-6 overflow-x-auto">
            <div className="flex justify-center items-center gap-2 min-w-max mx-auto max-w-7xl">
              {['All', 'Rings', 'Necklaces', 'Bracelets', 'Earrings'].map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button 
                    key={cat} 
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                      isActive 
                        ? 'bg-[#121212] text-white shadow-md' 
                        : 'bg-transparent text-stone-500 hover:bg-[#F8F4EE] hover:text-[#121212]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Products Grid */}
          <main className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20">
                <p className="font-serif text-2xl text-stone-400 italic">No luxury pieces in this curation yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
                {filteredProducts.map((product) => {
                  const firstImg = product.images?.[0] || product.image;
                  const secondImg = product.images?.[1] || firstImg;
                  const isWishlisted = localWishlist.includes(product._id);

                  return (
                    <div 
                      key={product._id} 
                      className="group relative flex flex-col overflow-hidden rounded-3xl bg-white border border-[#ECE5D8]/80 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-stone-900/10 cursor-pointer"
                      onClick={() => { setSelectedProduct(product); setModalQuantity(1); setActiveImageIndex(0); }}
                    >
                      {/* Visual Canvas with Hover Image Swap */}
                      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#F8F4EE]">
                        <img 
                          src={firstImg} 
                          alt={product.name} 
                          className="h-full w-full object-cover transition-opacity duration-700 group-hover:opacity-0" 
                          onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500"; }}
                        />
                        <img 
                          src={secondImg} 
                          alt={`${product.name} angle preview`} 
                          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-700 group-hover:opacity-100 group-hover:scale-105" 
                          onError={(e) => { e.target.src = firstImg; }}
                        />

                        {/* Floating Wishlist Heart */}
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}
                          className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-md shadow transition-transform duration-300 hover:scale-110 active:scale-90"
                          title={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
                        >
                          <Heart 
                            className={`h-4 w-4 transition-colors ${
                              isWishlisted ? 'fill-red-500 text-red-500' : 'text-stone-700 hover:text-red-500'
                            }`} 
                          />
                        </button>

                        {/* Category Tag */}
                        <span className="absolute top-4 left-4 z-10 rounded-full bg-white/70 backdrop-blur-md px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-stone-700">
                          {product.category || 'Jewelry'}
                        </span>

                        {/* Slide-Up Quick Add */}
                        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#121212]/95 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-xl backdrop-blur transition hover:bg-[#9A7B4F]"
                          >
                            <ShoppingBag className="h-4 w-4" /> Add to Bag
                          </button>
                        </div>
                      </div>

                      {/* Content Card Body */}
                      <div className="p-6 flex flex-1 flex-col justify-between">
                        <div>
                          <h3 className="font-serif text-lg font-medium text-[#121212] transition-colors group-hover:text-[#9A7B4F]">
                            {product.name}
                          </h3>
                          <p className="mt-1 line-clamp-1 text-xs text-stone-500">
                            {product.description || 'Exclusive handcrafted luxury piece'}
                          </p>
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t border-[#ECE5D8]/70 pt-3">
                          <span className="text-base font-semibold text-[#121212]">
                            ₹{product.price?.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 group-hover:text-[#9A7B4F] transition-colors">
                            Explore &rarr;
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </>
      )}

      {/* 🔍 PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-[#ECE5D8] grid grid-cols-1 md:grid-cols-2">
            
            {/* Close Cross */}
            <button 
              type="button" 
              onClick={() => { setSelectedProduct(null); setActiveImageIndex(0); }} 
              className="absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-stone-700 shadow-md backdrop-blur hover:bg-stone-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            {/* Left: Gallery View */}
            <div className="flex flex-col justify-between bg-[#F8F4EE] border-b md:border-b-0 md:border-r border-[#ECE5D8] p-6">
              <div className="flex-1 flex items-center justify-center overflow-hidden rounded-2xl bg-white p-4 shadow-sm">
                <img 
                  src={selectedProduct.images?.[activeImageIndex] || selectedProduct.image} 
                  alt={selectedProduct.name} 
                  className="max-h-[380px] w-full object-contain" 
                  onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500"; }}
                />
              </div>

              {/* Angle Selector */}
              {selectedProduct.images && selectedProduct.images.length > 1 && (
                <div className="mt-4 flex gap-3 overflow-x-auto justify-center">
                  {selectedProduct.images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`h-14 w-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                        activeImageIndex === idx ? 'border-[#C5A880] ring-2 ring-[#C5A880]/30' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} alt="Thumbnail angle" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Spec & Actions */}
            <div className="p-8 flex flex-col justify-between overflow-y-auto max-h-[80vh]">
              <div>
                <span className="text-[11px] uppercase tracking-widest font-semibold text-[#9A7B4F]">
                  {selectedProduct.category}
                </span>
                <h2 className="font-serif text-3xl font-light text-[#121212] mt-1 mb-2">
                  {selectedProduct.name}
                </h2>
                <p className="text-2xl font-semibold text-[#121212] mb-4">
                  ₹{selectedProduct.price?.toLocaleString('en-IN')}
                </p>
                
                <p className="text-stone-600 text-sm leading-relaxed mb-6">
                  {selectedProduct.description}
                </p>
                
                {/* Quantity Chooser */}
                <div className="mb-6">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-2">
                    Quantity
                  </label>
                  <div className="inline-flex items-center rounded-xl border border-[#ECE5D8] bg-[#FCFAF7] p-1">
                    <button 
                      type="button" 
                      onClick={() => setModalQuantity(q => Math.max(1, q - 1))} 
                      className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white text-stone-700 transition"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-10 text-center font-semibold text-sm">{modalQuantity}</span>
                    <button 
                      type="button" 
                      onClick={() => setModalQuantity(q => q + 1)} 
                      className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white text-stone-700 transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Primary Purchase Buttons */}
                <div className="flex gap-3 mb-8">
                  <button 
                    type="button"
                    onClick={() => {
                      for(let i=0; i<modalQuantity; i++) { addToCart(selectedProduct); }
                      setSelectedProduct(null);
                      setActiveImageIndex(0);
                      setIsCartOpen(true);
                    }}
                    className="flex-1 rounded-2xl bg-[#121212] py-4 text-xs font-semibold uppercase tracking-widest text-white shadow-lg transition hover:bg-[#9A7B4F]"
                  >
                    Add {modalQuantity} To Bag
                  </button>

                  <button 
                    type="button"
                    onClick={() => toggleWishlist(selectedProduct)}
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all ${
                      localWishlist.includes(selectedProduct._id) 
                        ? 'border-red-200 bg-red-50 text-red-500' 
                        : 'border-[#ECE5D8] text-stone-600 hover:bg-stone-50'
                    }`}
                    title={localWishlist.includes(selectedProduct._id) ? "Remove from wishlist" : "Add to wishlist"}
                  >
                    <Heart className={`h-5 w-5 ${localWishlist.includes(selectedProduct._id) ? 'fill-red-500' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Reviews Drawer */}
              <div className="border-t border-[#ECE5D8] pt-6">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-stone-700 mb-3">
                  Customer Reflections ({reviews.length})
                </h4>
                
                <div className="space-y-3 max-h-36 overflow-y-auto pr-1 mb-4">
                  {reviews.length === 0 ? (
                    <p className="text-xs text-stone-400 italic">No reviews yet. Be the first to share your thoughts.</p>
                  ) : (
                    reviews.map((rev, index) => (
                      <div key={index} className="rounded-xl border border-[#ECE5D8] bg-[#FCFAF7] p-3 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-stone-800">{rev.userName || 'Verified Buyer'}</span>
                          <span className="text-[#C5A880]">{'★'.repeat(rev.rating)}</span>
                        </div>
                        <p className="text-stone-600">{rev.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                {user ? (
                  <form onSubmit={handleReviewSubmit} className="space-y-2">
                    <div className="flex gap-2">
                      <select 
                        value={newReview.rating} 
                        onChange={e => setNewReview({...newReview, rating: Number(e.target.value)})}
                        className="rounded-xl border border-[#ECE5D8] bg-white px-2 py-2 text-xs font-medium text-stone-700 outline-none"
                      >
                        <option value="5">5 ★ Luxury</option>
                        <option value="4">4 ★ Great</option>
                        <option value="3">3 ★ Average</option>
                        <option value="2">2 ★ Fair</option>
                        <option value="1">1 ★ Poor</option>
                      </select>
                      <input 
                        type="text" 
                        required
                        placeholder="Share your feedback..." 
                        value={newReview.comment}
                        onChange={e => setNewReview({...newReview, comment: e.target.value})}
                        className="flex-1 rounded-xl border border-[#ECE5D8] bg-[#FCFAF7] px-3 py-2 text-xs outline-none focus:border-[#C5A880] focus:bg-white"
                      />
                      <button 
                        type="submit" 
                        className="rounded-xl bg-[#121212] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#9A7B4F]"
                      >
                        Post
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="text-[11px] text-stone-400 italic text-center">Sign in to leave a verified review.</p>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ⚙️ VIEW 2: ADMIN PANEL */}
      {view === 'admin' && (
        <main className="max-w-xl mx-auto px-6 py-16">
          <button 
            onClick={() => setView('shop')} 
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-stone-400 hover:text-[#9A7B4F] mb-6 font-semibold"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Store
          </button>
          
          <div className="rounded-3xl border border-[#ECE5D8] bg-white p-8 shadow-xl">
            <h3 className="font-serif text-2xl font-light text-[#121212] border-b border-[#ECE5D8] pb-4 mb-6">
              Add Catalog Piece 💎
            </h3>
            
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">Item Title</label>
                <input required type="text" name="name" placeholder="e.g. Baroque Pearl Drops" value={newProduct.name} onChange={handleAdminInputChange} className="w-full rounded-xl border border-[#ECE5D8] bg-[#FCFAF7] px-4 py-3 text-xs outline-none focus:border-[#C5A880]" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">Price (₹)</label>
                  <input required type="number" name="price" placeholder="1499" value={newProduct.price} onChange={handleAdminInputChange} className="w-full rounded-xl border border-[#ECE5D8] bg-[#FCFAF7] px-4 py-3 text-xs outline-none focus:border-[#C5A880]" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">Category</label>
                  <select name="category" value={newProduct.category} onChange={handleAdminInputChange} className="w-full rounded-xl border border-[#ECE5D8] bg-[#FCFAF7] px-3 py-3 text-xs outline-none focus:border-[#C5A880]">
                    <option value="Rings">Rings</option>
                    <option value="Necklaces">Necklaces</option>
                    <option value="Bracelets">Bracelets</option>
                    <option value="Earrings">Earrings</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">Description</label>
                <textarea required name="description" placeholder="Product backstory and materials..." value={newProduct.description} onChange={handleAdminInputChange} className="w-full rounded-xl border border-[#ECE5D8] bg-[#FCFAF7] p-3 text-xs outline-none focus:border-[#C5A880] h-24" />
              </div>
              
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">Image URLs (comma separated)</label>
                <textarea required name="images" placeholder="https://..., https://..." value={newProduct.images || ''} onChange={handleAdminInputChange} className="w-full rounded-xl border border-[#ECE5D8] bg-[#FCFAF7] p-3 text-xs outline-none focus:border-[#C5A880] h-24 font-mono text-[11px]" />
              </div>

              <button type="submit" className="w-full rounded-xl bg-[#121212] py-4 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#9A7B4F]">
                Publish to Aureva Catalog
              </button>
            </form>
          </div>
        </main>
      )}

      {/* 💳 VIEW 3: CHECKOUT PAGE */}
      {view === 'checkout' && (
        <main className="max-w-5xl mx-auto px-6 py-12">
          <button 
            onClick={() => setView('shop')} 
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-stone-400 hover:text-[#9A7B4F] mb-8 font-semibold"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Store
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 rounded-3xl border border-[#ECE5D8] bg-white p-6 sm:p-8 shadow-sm">
              <h3 className="font-serif text-2xl font-light text-[#121212] border-b border-[#ECE5D8] pb-4 mb-6">
                Shipping Destination
              </h3>

              <form onSubmit={handlePlaceOrder} className="space-y-4">
                <input required type="text" name="name" placeholder="Full Recipient Name" value={shippingData.name} onChange={handleInputChange} className="w-full rounded-xl border border-[#ECE5D8] bg-[#FCFAF7] px-4 py-3 text-xs outline-none focus:border-[#C5A880]" />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input required type="email" name="email" placeholder="Email Address" value={shippingData.email} onChange={handleInputChange} className="w-full rounded-xl border border-[#ECE5D8] bg-[#FCFAF7] px-4 py-3 text-xs outline-none focus:border-[#C5A880]" />
                  <input required type="tel" name="phone" placeholder="Phone Number" value={shippingData.phone} onChange={handleInputChange} className="w-full rounded-xl border border-[#ECE5D8] bg-[#FCFAF7] px-4 py-3 text-xs outline-none focus:border-[#C5A880]" />
                </div>

                <input required type="text" name="address" placeholder="Flat, Building, Street Address" value={shippingData.address} onChange={handleInputChange} className="w-full rounded-xl border border-[#ECE5D8] bg-[#FCFAF7] px-4 py-3 text-xs outline-none focus:border-[#C5A880]" />
                
                <div className="grid grid-cols-2 gap-4">
                  <input required type="text" name="city" placeholder="City" value={shippingData.city} onChange={handleInputChange} className="w-full rounded-xl border border-[#ECE5D8] bg-[#FCFAF7] px-4 py-3 text-xs outline-none focus:border-[#C5A880]" />
                  <input required type="text" name="pinCode" placeholder="Postal PIN Code" value={shippingData.pinCode} onChange={handleInputChange} className="w-full rounded-xl border border-[#ECE5D8] bg-[#FCFAF7] px-4 py-3 text-xs outline-none focus:border-[#C5A880]" />
                </div>

                <button 
                  type="submit" 
                  className="w-full mt-6 rounded-xl bg-[#121212] py-4 text-xs font-semibold uppercase tracking-widest text-white shadow-xl transition hover:bg-[#9A7B4F]"
                >
                  Confirm & Pay with Razorpay
                </button>
              </form>
            </div>

            <div className="lg:col-span-5 rounded-3xl border border-[#ECE5D8] bg-[#F8F4EE] p-6 sm:p-8 h-fit">
              <h3 className="font-serif text-xl font-light text-[#121212] border-b border-[#ECE5D8] pb-3 mb-6">
                Curated Bag Summary
              </h3>

              <div className="space-y-4 max-h-64 overflow-y-auto pr-1 mb-6">
                {cartItems.map((item) => (
                  <div key={item._id} className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-stone-800">{item.name}</span>
                      <span className="text-stone-400 block mt-0.5">Qty: {item.quantity}</span>
                    </div>
                    <span className="font-semibold text-[#121212]">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#ECE5D8] pt-4 space-y-2">
                <div className="flex justify-between text-xs text-stone-500">
                  <span>Shipping & Handling</span>
                  <span className="text-emerald-700 font-semibold uppercase tracking-wider">Complimentary</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-stone-600">Total Bill</span>
                  <span className="font-serif text-2xl font-semibold text-[#121212]">
                    ₹{totalPrice.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* 🎉 VIEW 4: ORDER SUCCESS */}
      {view === 'success' && (
        <main className="max-w-lg mx-auto text-center py-24 px-6">
          <div className="w-16 h-16 bg-[#C5A880]/20 text-[#9A7B4F] rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-8 w-8 stroke-[2.5]" />
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-light text-[#121212] mb-3">Order Confirmed</h2>
          <p className="text-stone-600 text-sm max-w-sm mx-auto leading-relaxed mb-8">
            Thank you for celebrating fine craftsmanship with AUREVA. We are carefully packaging your heirloom.
          </p>
          <button 
            onClick={() => setView('shop')} 
            className="rounded-full bg-[#121212] px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#9A7B4F]"
          >
            Continue Browsing
          </button>
        </main>
      )}

      {/* 🛒 FLOATING BAG SLIDE-OVER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            onClick={() => setIsCartOpen(false)} 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" 
          />

          {/* Drawer Tray */}
          <div className="relative z-10 w-full max-w-md bg-white h-full shadow-2xl p-6 sm:p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
            <div>
              <div className="flex justify-between items-center border-b border-[#ECE5D8] pb-4 mb-6">
                <div>
                  <h3 className="font-serif text-2xl font-light text-[#121212]">Your Bag</h3>
                  <p className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold mt-0.5">
                    {totalCartCount} {totalCartCount === 1 ? 'Piece' : 'Pieces'}
                  </p>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)} 
                  className="rounded-full p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {cartItems.length === 0 ? (
                <div className="text-center py-20">
                  <ShoppingBag className="h-12 w-12 text-stone-300 mx-auto mb-3 stroke-[1.2]" />
                  <p className="font-serif text-lg text-stone-500">Your bag is empty</p>
                  <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">Explore our earrings, necklaces, and rings to begin your collection.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item) => {
                    const itemImg = item.images?.[0] || item.image || item.images;
                    return (
                      <div key={item._id} className="flex gap-4 rounded-2xl border border-[#ECE5D8] bg-[#FCFAF7] p-3">
                        <img 
                          src={itemImg} 
                          alt={item.name} 
                          className="h-20 w-20 rounded-xl object-cover bg-white" 
                          onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500"; }}
                        />
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="font-serif text-sm font-medium text-[#121212] line-clamp-1">{item.name}</h4>
                            <p className="text-xs font-semibold text-[#9A7B4F] mt-0.5">₹{item.price?.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <button 
                              onClick={() => removeFromCart(item._id)} 
                              className="h-6 w-6 flex items-center justify-center rounded-lg border border-[#ECE5D8] bg-white hover:bg-stone-50 text-xs"
                            >
                              -
                            </button>
                            <span className="text-xs font-semibold w-6 text-center">{item.quantity}</span>
                            <button 
                              onClick={() => addToCart(item)} 
                              className="h-6 w-6 flex items-center justify-center rounded-lg border border-[#ECE5D8] bg-white hover:bg-stone-50 text-xs"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="border-t border-[#ECE5D8] pt-6 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Subtotal</span>
                  <span className="font-serif text-2xl font-semibold text-[#121212]">
                    ₹{totalPrice.toLocaleString('en-IN')}
                  </span>
                </div>
                <button 
                  onClick={() => { setIsCartOpen(false); setView('checkout'); }} 
                  className="w-full rounded-2xl bg-[#121212] py-4 text-xs font-semibold uppercase tracking-widest text-white shadow-xl transition hover:bg-[#9A7B4F]"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div> 
        </div>
      )}

    </div>
  );
}

export default App;