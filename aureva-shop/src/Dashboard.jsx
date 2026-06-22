import React, { useEffect, useState } from 'react';
import axios from 'axios'; 

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '' });
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [newAddress, setNewAddress] = useState({ fullName: '', phone: '', streetAddress: '', city: '', state: '', pincode: '' });
  const [wishlist, setWishlist] = useState([]);
  const [message, setMessage] = useState('');

  const backendUrl = "https://aureva-store.onrender.com/api";

  // 🟢 FIXED: Dynamic token generator helper to prevent 401 cache latches on active updates
  const getAuthConfig = () => {
    const freshToken = localStorage.getItem('token');
    return freshToken ? { headers: { Authorization: `Bearer ${freshToken}` } } : {};
  };

  // 1. Initial load par localStorage se details load karo
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
      } catch (e) { console.error("Error reading storage user:", e); }
    }
  }, []);

  // 2. Fetch targets on active dashboard tabs shift matrix
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
    } catch (err) { console.error("Profile fetch mismatch context:", err); }
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
      setMessage('Profile update failed.'); 
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.put(`${backendUrl}/user/profile/changepassword`, passwordData, getAuthConfig());
      setMessage(data.message);
      setPasswordData({ currentPassword: '', newPassword: '' });
    } catch (err) { setMessage(err.response?.data?.message || 'Password update failed.'); }
  };

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/orders/myorders`, getAuthConfig());
      setOrders(data);
    } catch (err) { console.error(err); }
  };

  const fetchAddresses = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/user/global-addresses`, getAuthConfig());
      setAddresses(data);
    } catch (err) { console.error(err); }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${backendUrl}/user/global-addresses`, newAddress, getAuthConfig());
      setAddresses([...addresses, data]);
      setNewAddress({ fullName: '', phone: '', streetAddress: '', city: '', state: '', pincode: '' });
      setMessage('Address added successfully!');
    } catch (err) { console.error(err); }
  };

  const fetchWishlist = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/user/wishlist`, getAuthConfig());
      setWishlist(data);
    } catch (err) { console.error("Wishlist array download pipeline block:", err); }
  };

  return (
    <div className="max-w-6xl mx-auto my-10 p-4 min-h-[70vh] flex flex-col md:flex-row gap-6 font-sans text-black">
      <div className="w-full md:w-1/4 bg-gray-50 p-4 rounded-lg shadow-sm h-fit space-y-2">
        <h2 className="text-xl font-bold text-gray-800 mb-4 px-2">My Account</h2>
        {[
          { id: 'profile', label: '👤 Profile Settings' },
          { id: 'orders', label: '📦 Order History' },
          { id: 'addresses', label: '📍 Saved Addresses' },
          { id: 'wishlist', label: '❤️ My Wishlist' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full text-left px-4 py-3 rounded-md font-medium transition-all ${activeTab === tab.id ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="w-full md:w-3/4 bg-white p-6 border rounded-lg shadow-sm">
        {message && <div className="mb-4 p-3 bg-gray-100 border text-sm rounded text-gray-700 font-medium">{message}</div>}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <h3 className="text-lg font-bold border-b pb-2">Update Account Details</h3>
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input type="text" value={profile.name || ''} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full p-2 border rounded" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email (Cannot change)</label>
                <input type="email" value={profile.email || ''} disabled className="w-full p-2 border rounded bg-gray-100 text-gray-500 cursor-not-allowed" />
              </div>
              <button type="submit" className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800">Save Changes</button>
            </form>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <h3 className="text-lg font-bold border-b pb-2 mb-4">Your Orders</h3>
            {orders.length === 0 ? <p className="text-gray-500 italic">You have not placed any orders yet. 🛒</p> : (
              <div className="space-y-3">
                {orders.map(order => (
                  <div key={order._id} className="border p-4 rounded-md flex justify-between items-center bg-gray-50">
                    <div>
                      <p className="text-sm font-bold text-gray-700">ID: #{order._id}</p>
                      <p className="text-xs text-gray-500">Date: {new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-black">₹{(order.totalAmount || order.totalPrice || 0).toLocaleString('en-IN')}</p>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${order.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {order.status || 'Paid'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'addresses' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold border-b pb-2 mb-3">Saved Addresses</h3>
              {addresses.length === 0 ? <p className="text-gray-500 text-sm italic">No saved addresses found.</p> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map(addr => (
                    <div key={addr._id} className="border p-3 rounded bg-gray-50 text-sm">
                      <p className="font-bold">{addr.fullName}</p>
                      <p className="text-gray-600">{addr.streetAddress}, {addr.city}, {addr.state} - {addr.pincode}</p>
                      <p className="text-gray-500 mt-1">📞 {addr.phone}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <form onSubmit={handleAddAddress} className="border-t pt-4 space-y-3">
              <h3 className="text-md font-bold">Add New Address</h3>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Full Name" value={newAddress.fullName} onChange={e => setNewAddress({...newAddress, fullName: e.target.value})} className="p-2 border rounded text-sm" required />
                <input type="text" placeholder="Phone" value={newAddress.phone} onChange={e => setNewAddress({...newAddress, phone: e.target.value})} className="p-2 border rounded text-sm" required />
              </div>
              <input type="text" placeholder="Street Address" value={newAddress.streetAddress} onChange={e => setNewAddress({...newAddress, streetAddress: e.target.value})} className="w-full p-2 border rounded text-sm" required />
              <div className="grid grid-cols-3 gap-2">
                <input type="text" placeholder="City" value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} className="p-2 border rounded text-sm" required />
                <input type="text" placeholder="State" value={newAddress.state} onChange={e => setNewAddress({...newAddress, state: e.target.value})} className="p-2 border rounded text-sm" required />
                <input type="text" placeholder="Pincode" value={newAddress.pincode} onChange={e => setNewAddress({...newAddress, pincode: e.target.value})} className="p-2 border rounded text-sm" required />
              </div>
              <button type="submit" className="bg-black text-white text-sm px-4 py-2 rounded hover:bg-gray-800">Add Address</button>
            </form>
          </div>
        )}

        {activeTab === 'wishlist' && (
          <div>
            <h3 className="text-lg font-bold border-b pb-2 mb-4">Your Wishlist</h3>
            {wishlist.length === 0 ? <p className="text-gray-500 italic">Your wishlist is currently empty. ❤️</p> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {wishlist.map(product => product && (
                  <div key={product._id} className="border p-3 rounded-md text-center bg-gray-50">
                    <img src={product.image} alt={product.name} className="h-32 mx-auto object-contain mb-2" />
                    <h4 className="text-sm font-medium truncate">{product.name}</h4>
                    <p className="text-sm font-bold mt-1">₹{(product.price || 0).toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;