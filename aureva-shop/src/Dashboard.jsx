import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  User, 
  Package, 
  MapPin, 
  Heart, 
  Trash2, 
  Lock, 
  Plus, 
  ShieldCheck, 
  ShoppingBag,
  ExternalLink 
} from 'lucide-react';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '' });
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [newAddress, setNewAddress] = useState({ 
    fullName: '', 
    phone: '', 
    streetAddress: '', 
    city: '', 
    state: '', 
    pincode: '' 
  });
  const [wishlist, setWishlist] = useState([]);
  const [message, setMessage] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  const backendUrl = "https://aureva-store.onrender.com/api";

  const getAuthConfig = () => {
    const freshToken = localStorage.getItem('token');
    return freshToken ? { headers: { Authorization: `Bearer ${freshToken}` } } : {};
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setProfile(prev => ({
          ...prev,
          email: parsedUser.email || prev.email,
          name: parsedUser.name || prev.name
        }));
      } catch (e) { 
        console.error("Error reading storage user:", e); 
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'profile') fetchProfile();
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'addresses') fetchAddresses();
    if (activeTab === 'wishlist') fetchWishlist();
    setMessage('');
  }, [activeTab]);

  const fetchProfile = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/user/profile`, getAuthConfig());
      setProfile(data);
    } catch (err) { 
      console.error("Profile fetch error:", err); 
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    let userEmail = profile.email;
    if (!userEmail) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        userEmail = JSON.parse(storedUser).email;
      }
    }

    if (!userEmail) {
      setMessage('Session identity missing. Please log out and sign in again.');
      return;
    }

    setLoadingAction(true);
    try {
      const { data } = await axios.put(
        `${backendUrl}/user/public-profile/update`, 
        { email: userEmail, name: profile.name },
        getAuthConfig()
      );
      if (data.success) {
        setMessage('Profile updated successfully! 🎉');
        localStorage.setItem('user', JSON.stringify(data.user));
        setProfile(data.user);
      }
    } catch (err) { 
      console.error(err);
      setMessage('Profile update failed. Please try again.'); 
    } finally {
      setLoadingAction(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoadingAction(true);
    try {
      const { data } = await axios.put(`${backendUrl}/user/profile/changepassword`, passwordData, getAuthConfig());
      setMessage(data.message || 'Password successfully changed! 🔒');
      setPasswordData({ currentPassword: '', newPassword: '' });
    } catch (err) { 
      setMessage(err.response?.data?.message || 'Password update failed.'); 
    } finally {
      setLoadingAction(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/orders/myorders`, getAuthConfig());
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) { 
      console.error(err); 
    }
  };

  const fetchAddresses = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/user/global-addresses`, getAuthConfig());
      setAddresses(Array.isArray(data) ? data : []);
    } catch (err) { 
      console.error(err); 
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    setLoadingAction(true);
    try {
      const { data } = await axios.post(`${backendUrl}/user/global-addresses`, newAddress, getAuthConfig());
      setAddresses([data, ...addresses]);
      setNewAddress({ fullName: '', phone: '', streetAddress: '', city: '', state: '', pincode: '' });
      setMessage('Address added successfully! 📍');
    } catch (err) { 
      console.error(err); 
      setMessage('Failed to save address.');
    } finally {
      setLoadingAction(false);
    }
  };

  const fetchWishlist = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/user/wishlist`, getAuthConfig());
      setWishlist(Array.isArray(data) ? data : []);
    } catch (err) { 
      console.error("Wishlist array download error:", err); 
    }
  };

  const handleRemoveFromWishlist = async (productId) => {
    try {
      // Optimistic instant state removal
      setWishlist(prev => prev.filter(item => item._id !== productId));
      await axios.post(`${backendUrl}/user/wishlist/toggle`, { productId }, getAuthConfig());
    } catch (err) {
      console.error("Could not remove from wishlist:", err);
      fetchWishlist(); // Rollback on error
    }
  };

  const navItems = [
    { id: 'profile', label: 'Profile Details', icon: User },
    { id: 'orders', label: 'Order History', icon: Package, count: orders.length },
    { id: 'addresses', label: 'Saved Addresses', icon: MapPin, count: addresses.length },
    { id: 'wishlist', label: 'My Wishlist', icon: Heart, count: wishlist.length },
  ];

  return (
    <div className="min-h-screen bg-[#FCFAF7] py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header Title */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#ece5d8] pb-6 gap-4">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-light text-[#121212] tracking-tight">
              Customer <span className="font-medium text-[#c5a880]">Portal</span>
            </h1>
            <p className="mt-1 text-xs uppercase tracking-widest text-stone-400">
              Manage your orders, profile, and curated jewelry wishlist
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ece5d8] bg-white px-4 py-1.5 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-stone-600">{profile.email || 'Authenticated User'}</span>
          </div>
        </div>

        {/* Global Notifications */}
        {message && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-[#ece5d8] bg-white px-5 py-3.5 shadow-sm animate-in fade-in">
            <p className="text-sm font-medium text-stone-700">{message}</p>
            <button onClick={() => setMessage('')} className="text-xs text-stone-400 hover:text-stone-700">✕</button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Menu */}
          <aside className="w-full lg:w-72 shrink-0">
            <div className="sticky top-24 rounded-3xl border border-[#ece5d8] bg-white p-3 shadow-xl shadow-stone-900/5">
              <nav className="space-y-1">
                {navItems.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                        isActive 
                          ? 'bg-[#121212] text-white shadow-md' 
                          : 'text-stone-500 hover:bg-[#F8F4EE] hover:text-[#121212]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 ${isActive ? 'text-[#c5a880]' : 'text-stone-400'}`} />
                        <span>{tab.label}</span>
                      </div>
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isActive ? 'bg-white/20 text-white' : 'bg-[#ECE5D8] text-stone-700'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Tab Content Display Area */}
          <main className="flex-1">
            <div className="rounded-3xl border border-[#ece5d8] bg-white p-6 sm:p-8 shadow-xl shadow-stone-900/5">
              
              {/* TAB 1: PROFILE */}
              {activeTab === 'profile' && (
                <div className="space-y-10">
                  {/* Account Details */}
                  <section>
                    <div className="border-b border-[#ece5d8] pb-4 mb-6">
                      <h2 className="font-serif text-2xl font-light text-[#121212]">Account Details</h2>
                      <p className="text-xs text-stone-400 mt-0.5">Keep your personal contact credentials up to date</p>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="space-y-5 max-w-lg">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                          Full Name
                        </label>
                        <input 
                          type="text" 
                          value={profile.name || ''} 
                          onChange={e => setProfile({...profile, name: e.target.value})} 
                          className="w-full rounded-xl border border-[#ece5d8] bg-[#FCFAF7] px-4 py-3 text-sm text-[#121212] outline-none transition focus:border-[#c5a880] focus:bg-white focus:ring-2 focus:ring-[#c5a880]/20" 
                          required 
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                          Email Address (Fixed Account Identity)
                        </label>
                        <input 
                          type="email" 
                          value={profile.email || ''} 
                          disabled 
                          className="w-full rounded-xl border border-[#ece5d8] bg-[#F8F4EE] px-4 py-3 text-sm text-stone-400 cursor-not-allowed select-none" 
                        />
                      </div>

                      <button 
                        type="submit" 
                        disabled={loadingAction}
                        className="rounded-xl bg-[#121212] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#9A7B4F] disabled:opacity-50"
                      >
                        {loadingAction ? 'Updating...' : 'Save Profile Changes'}
                      </button>
                    </form>
                  </section>

                  {/* Password Change Sub-section */}
                  <section className="pt-8 border-t border-[#ece5d8]">
                    <div className="mb-6">
                      <h3 className="font-serif text-xl font-light text-[#121212] flex items-center gap-2">
                        <Lock className="h-4 w-4 text-[#c5a880]" /> Change Password
                      </h3>
                      <p className="text-xs text-stone-400 mt-0.5">Ensure your account is protected with a secure password</p>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">Current Password</label>
                        <input 
                          type="password" 
                          placeholder="••••••••" 
                          value={passwordData.currentPassword} 
                          onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})} 
                          className="w-full rounded-xl border border-[#ece5d8] bg-[#FCFAF7] px-4 py-3 text-sm outline-none transition focus:border-[#c5a880] focus:bg-white" 
                          required 
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">New Password</label>
                        <input 
                          type="password" 
                          placeholder="••••••••" 
                          value={passwordData.newPassword} 
                          onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} 
                          className="w-full rounded-xl border border-[#ece5d8] bg-[#FCFAF7] px-4 py-3 text-sm outline-none transition focus:border-[#c5a880] focus:bg-white" 
                          required 
                        />
                      </div>

                      <button 
                        type="submit" 
                        disabled={loadingAction}
                        className="rounded-xl border border-[#121212] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#121212] transition hover:bg-[#121212] hover:text-white disabled:opacity-50"
                      >
                        Update Security Password
                      </button>
                    </form>
                  </section>
                </div>
              )}

              {/* TAB 2: ORDERS */}
              {activeTab === 'orders' && (
                <div>
                  <div className="border-b border-[#ece5d8] pb-4 mb-6">
                    <h2 className="font-serif text-2xl font-light text-[#121212]">Order History</h2>
                    <p className="text-xs text-stone-400 mt-0.5">Track your orders and check status history</p>
                  </div>

                  {orders.length === 0 ? (
                    <div className="text-center py-16">
                      <Package className="h-12 w-12 text-stone-300 mx-auto mb-3 stroke-[1.2]" />
                      <p className="font-serif text-lg text-stone-600">No orders placed yet</p>
                      <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">Explore our handmade collections and complete your first checkout.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map(order => (
                        <div 
                          key={order._id} 
                          className="rounded-2xl border border-[#ece5d8] bg-[#FCFAF7] p-5 transition hover:shadow-md flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs font-bold text-stone-800">#{order._id.slice(-8).toUpperCase()}</span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                order.status === 'Paid' 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}>
                                {order.status || 'Paid'}
                              </span>
                            </div>
                            <p className="text-xs text-stone-400">
                              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            {order.items && (
                              <p className="text-xs text-stone-600 mt-2 font-medium">
                                {order.items.length} {order.items.length === 1 ? 'item' : 'items'} in this order
                              </p>
                            )}
                          </div>

                          <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-[#ece5d8]">
                            <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold">Total Amount</p>
                            <p className="font-serif text-xl font-medium text-[#121212] mt-0.5">
                              ₹{(order.totalAmount || order.totalPrice || 0).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ADDRESSES */}
              {activeTab === 'addresses' && (
                <div className="space-y-8">
                  <div>
                    <div className="border-b border-[#ece5d8] pb-4 mb-6">
                      <h2 className="font-serif text-2xl font-light text-[#121212]">Shipping Addresses</h2>
                      <p className="text-xs text-stone-400 mt-0.5">Manage your delivery locations for swift checkout</p>
                    </div>

                    {addresses.length === 0 ? (
                      <p className="text-sm italic text-stone-400 py-4">No shipping addresses saved yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {addresses.map(addr => (
                          <div key={addr._id} className="relative rounded-2xl border border-[#ece5d8] bg-[#FCFAF7] p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="h-4 w-4 text-[#c5a880]" />
                              <h4 className="font-semibold text-sm text-[#121212]">{addr.fullName}</h4>
                            </div>
                            <p className="text-xs text-stone-600 leading-relaxed">
                              {addr.streetAddress}<br />
                              {addr.city}, {addr.state} - <span className="font-mono font-medium">{addr.pincode}</span>
                            </p>
                            <p className="mt-3 text-xs text-stone-500 font-medium">
                              Phone: <span className="text-stone-800">{addr.phone}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add New Address Form */}
                  <form onSubmit={handleAddAddress} className="rounded-2xl border border-[#ece5d8] bg-white p-6 shadow-sm space-y-4">
                    <h3 className="font-serif text-lg font-light text-[#121212] flex items-center gap-2">
                      <Plus className="h-4 w-4 text-[#c5a880]" /> Add New Address
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input 
                        type="text" 
                        placeholder="Full Recipient Name" 
                        value={newAddress.fullName} 
                        onChange={e => setNewAddress({...newAddress, fullName: e.target.value})} 
                        className="rounded-xl border border-[#ece5d8] bg-[#FCFAF7] px-4 py-2.5 text-xs outline-none focus:border-[#c5a880] focus:bg-white" 
                        required 
                      />
                      <input 
                        type="tel" 
                        placeholder="10-digit Phone Number" 
                        value={newAddress.phone} 
                        onChange={e => setNewAddress({...newAddress, phone: e.target.value})} 
                        className="rounded-xl border border-[#ece5d8] bg-[#FCFAF7] px-4 py-2.5 text-xs outline-none focus:border-[#c5a880] focus:bg-white" 
                        required 
                      />
                    </div>

                    <input 
                      type="text" 
                      placeholder="Street Address, Flat / House No, Landmark" 
                      value={newAddress.streetAddress} 
                      onChange={e => setNewAddress({...newAddress, streetAddress: e.target.value})} 
                      className="w-full rounded-xl border border-[#ece5d8] bg-[#FCFAF7] px-4 py-2.5 text-xs outline-none focus:border-[#c5a880] focus:bg-white" 
                      required 
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input 
                        type="text" 
                        placeholder="City" 
                        value={newAddress.city} 
                        onChange={e => setNewAddress({...newAddress, city: e.target.value})} 
                        className="rounded-xl border border-[#ece5d8] bg-[#FCFAF7] px-4 py-2.5 text-xs outline-none focus:border-[#c5a880] focus:bg-white" 
                        required 
                      />
                      <input 
                        type="text" 
                        placeholder="State" 
                        value={newAddress.state} 
                        onChange={e => setNewAddress({...newAddress, state: e.target.value})} 
                        className="rounded-xl border border-[#ece5d8] bg-[#FCFAF7] px-4 py-2.5 text-xs outline-none focus:border-[#c5a880] focus:bg-white" 
                        required 
                      />
                      <input 
                        type="text" 
                        placeholder="Pincode" 
                        value={newAddress.pincode} 
                        onChange={e => setNewAddress({...newAddress, pincode: e.target.value})} 
                        className="rounded-xl border border-[#ece5d8] bg-[#FCFAF7] px-4 py-2.5 text-xs outline-none focus:border-[#c5a880] focus:bg-white" 
                        required 
                      />
                    </div>

                    <button 
                      type="submit" 
                      disabled={loadingAction}
                      className="rounded-xl bg-[#121212] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#9A7B4F] disabled:opacity-50"
                    >
                      {loadingAction ? 'Saving Address...' : 'Save Shipping Address'}
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 4: WISHLIST */}
              {activeTab === 'wishlist' && (
                <div>
                  <div className="border-b border-[#ece5d8] pb-4 mb-6 flex items-center justify-between">
                    <div>
                      <h2 className="font-serif text-2xl font-light text-[#121212]">My Curated Wishlist</h2>
                      <p className="text-xs text-stone-400 mt-0.5">Your saved pieces and favorite handcrafted designs</p>
                    </div>
                    {wishlist.length > 0 && (
                      <span className="text-xs uppercase tracking-widest font-semibold text-stone-500">
                        {wishlist.length} Items
                      </span>
                    )}
                  </div>

                  {wishlist.length === 0 ? (
                    <div className="text-center py-16">
                      <Heart className="h-12 w-12 text-stone-300 mx-auto mb-3 stroke-[1.2]" />
                      <p className="font-serif text-lg text-stone-600">Your wishlist is empty</p>
                      <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
                        Tap the heart icon on any jewelry piece while browsing the store to save it here.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                      {wishlist.map(product => {
                        if (!product) return null;
                        const displayImage = product.images?.[0] || product.image || '';

                        return (
                          <div 
                            key={product._id} 
                            className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#ece5d8] bg-[#FCFAF7] p-3 transition duration-300 hover:shadow-lg hover:-translate-y-1"
                          >
                            {/* Card Canvas */}
                            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#F8F4EE]">
                              {displayImage ? (
                                <img 
                                  src={displayImage} 
                                  alt={product.name} 
                                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105" 
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-xs text-stone-400">
                                  No Image
                                </div>
                              )}

                              {/* Remove Quick Action */}
                              <button
                                onClick={() => handleRemoveFromWishlist(product._id)}
                                title="Remove from wishlist"
                                className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-stone-600 shadow backdrop-blur transition hover:bg-red-50 hover:text-red-500 hover:scale-110 active:scale-95"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Content */}
                            <div className="mt-3 flex-1 flex flex-col justify-between">
                              <div>
                                <h4 className="font-serif text-sm font-medium text-[#121212] truncate">
                                  {product.name}
                                </h4>
                                <p className="font-sans text-sm font-semibold text-[#121212] mt-1">
                                  ₹{(product.price || 0).toLocaleString('en-IN')}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;