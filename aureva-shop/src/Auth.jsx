import React, { useState } from 'react';

const BACKEND_BASE_URL = "https://aureva-store.onrender.com";

function Auth({ setView, onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setMessage('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(BACKEND_BASE_URL + endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        setError(data.message || 'An error occurred. Please try again.');
        setLoading(false);
        return;
      }

      if (isLogin) {
        if (data.token) localStorage.setItem('token', data.token);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
        
        if (onLoginSuccess && data.user) {
          onLoginSuccess(data.user);
        }
        if (setView) {
          setView('shop');
        }
      } else {
        setMessage('Account created successfully! Please sign in now.');
        setIsLogin(true);
        setFormData({ name: '', email: formData.email, password: '' });
      }
    } catch (err) {
      console.error("Auth submit error details:", err);
      setError('Unable to connect to the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-md mx-auto px-8 py-16 bg-white border border-[#e5e1da] mt-12 shadow-md font-serif text-black">
      <button 
        type="button"
        onClick={() => setView && setView('shop')} 
        className="text-xs uppercase tracking-widest text-gray-400 hover:text-[#b3925c] mb-6 block"
      >
        ← Back to Shop
      </button>

      <h3 className="text-2xl font-light tracking-widest uppercase mb-6 border-b pb-3 text-[#b3925c]">
        {isLogin ? 'AUREVA LOGIN' : 'CREATE ACCOUNT'}
      </h3>

      {error && <p className="text-red-500 text-sm italic mb-4">{error}</p>}
      {message && <p className="text-green-600 text-sm italic mb-4">{message}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <input required type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c]" />
        )}
        <input required type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c]" />
        <input required type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c]" />
        
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-[#2c2a29] text-white py-4 text-xs uppercase tracking-widest font-semibold hover:bg-[#b3925c] transition-all duration-300 disabled:opacity-50"
        >
          {loading ? 'Connecting to Server...' : (isLogin ? 'Sign In' : 'Register Account')}
        </button>
      </form>

      <p className="mt-6 text-sm text-center text-gray-500 italic">
        {isLogin ? "New to AUREVA? " : "Already have an account? "}
        <span onClick={() => setIsLogin(!isLogin)} className="text-[#b3925c] underline cursor-pointer font-sans font-semibold not-italic ml-1">
          {isLogin ? 'Create an Account' : 'Sign In'}
        </span>
      </p>
    </main>
  );
}

export default Auth;