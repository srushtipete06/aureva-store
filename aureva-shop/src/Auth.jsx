import React, { useState } from 'react';

const BACKEND_BASE_URL = "https://aureva-store.onrender.com";

function Auth({ setView, onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // DYNAMIC UI AUTH MODES: 'auth', 'register_otp', 'forgot_email', 'forgot_otp'
  const [authMode, setAuthMode] = useState('auth'); 
  
  // Storage hooks for input parameters
  const [registerOtp, setRegisterOtp] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 🔑 1. INITIAL LOGIN OR SIGNUP SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setMessage('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin 
      ? { email: formData.email.trim().toLowerCase(), password: formData.password }
      : { name: formData.name, email: formData.email.trim().toLowerCase(), password: formData.password };

    try {
      const res = await fetch(BACKEND_BASE_URL + endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        setError(data.message || 'An error occurred. Please try again.');
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
        setMessage('Verification code sent to your email! Please check your inbox. 🎉');
        setAuthMode('register_otp');
      }
    } catch (err) {
      console.error("Auth submit error details:", err);
      setError('Unable to connect to the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // 🟢 2. SIGNUP EMAIL OTP VERIFICATION DISPATCHER
  const handleRegisterOtpVerify = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email.trim().toLowerCase(), 
          otp: registerOtp.trim() 
        })
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        setError(data.message || 'Invalid or expired registration OTP.');
        return;
      }

      alert('Account verified successfully! Welcome to AUREVA. 💎');
      setIsLogin(true);
      setAuthMode('auth');
      setFormData({ name: '', email: formData.email, password: '' });
      setRegisterOtp('');
    } catch (err) {
      setError('Could not verify registration code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 🟢 3. FORGOT PASSWORD REQUEST DISPATCHER
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setMessage('');
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email: resetEmail.trim().toLowerCase() }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); 
      const data = await res.json();

      if (!res.ok || data.success === false) {
        setError(data.message || 'Verification initialization failed.');
        setLoading(false);
        return;
      }

      setMessage(data.message || 'OTP code generated!');
      setAuthMode('forgot_otp');
    } catch (err) {
      console.error("Forgot request client sync error:", err);
      if (err.name === 'AbortError') {
        setError('Mail delivery is taking longer than usual. Please check your inbox anyway or try again in a few moments.');
      } else {
        setError('Unable to reach authentication server. Please check your internet connection.');
      }
    } finally {
      setLoading(false); 
    }
  };

  // 🟢 4. PASSWORD RESET CONFIRMATION DISPATCHER
  const handleResetConfirm = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: resetEmail.trim().toLowerCase(), 
          otp: resetOtp.trim(), 
          newPassword 
        })
      });
      const data = await res.json();

      if (!res.ok || data.success === false) {
        setError(data.message || 'Invalid verification inputs.');
        return;
      }

      alert('Password updated successfully! 🎉');
      setAuthMode('auth');
      setIsLogin(true);
      setFormData({ name: '', email: resetEmail, password: '' });
      setResetEmail('');
      setResetOtp('');
      setNewPassword('');
    } catch (err) {
      setError('Password transition failed. Retry again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center px-4 py-12 sm:px-6">
      {/* Decorative Glow Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#c5a880]/15 rounded-full blur-3xl pointer-events-none" />

      <main className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#ece5d8] bg-white/95 p-8 sm:p-10 shadow-2xl shadow-stone-900/5 backdrop-blur-xl transition-all">
        {/* Navigation Breadcrumb */}
        <button 
          type="button"
          onClick={() => {
            if (authMode !== 'auth') {
              setAuthMode('auth');
              setError('');
              setMessage('');
            } else {
              setView && setView('shop');
            }
          }} 
          className="group inline-flex items-center gap-1.5 text-[11px] font-sans font-semibold uppercase tracking-widest text-stone-400 hover:text-[#9A7B4F] transition-colors mb-6"
        >
          <span className="transition-transform group-hover:-translate-x-1">←</span>
          {authMode !== 'auth' ? 'Back to Sign In' : 'Back to Store'}
        </button>

        {/* Brand Monogram */}
        <div className="text-center mb-6">
          <span className="font-serif text-2xl tracking-[0.25em] text-[#121212] font-light">
            AUR<span className="font-semibold text-[#c5a880]">E</span>VA
          </span>
          <p className="font-sans text-[11px] uppercase tracking-widest text-stone-400 mt-1">Artisan Fine Jewelry</p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50/70 p-3 text-center text-xs font-sans text-red-600 animate-in fade-in duration-200">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-center text-xs font-sans text-emerald-700 animate-in fade-in duration-200">
            {message}
          </div>
        )}

        {/* VIEW: LOGIN / REGISTER */}
        {authMode === 'auth' && (
          <>
            {/* Elegant Mode Toggle */}
            <div className="relative mb-8 flex rounded-2xl bg-[#F8F4EE] p-1 border border-[#ece5d8]/70">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(''); setMessage(''); }}
                className={`flex-1 rounded-xl py-2.5 text-xs font-sans font-semibold tracking-wider uppercase transition-all duration-300 ${
                  isLogin ? 'bg-white text-[#121212] shadow-sm' : 'text-stone-400 hover:text-[#121212]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(''); setMessage(''); }}
                className={`flex-1 rounded-xl py-2.5 text-xs font-sans font-semibold tracking-wider uppercase transition-all duration-300 ${
                  !isLogin ? 'bg-white text-[#121212] shadow-sm' : 'text-stone-400 hover:text-[#121212]'
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 font-sans">
              {!isLogin && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                    Full Name
                  </label>
                  <input 
                    required 
                    type="text" 
                    name="name" 
                    placeholder="e.g. Srushti Pete" 
                    value={formData.name} 
                    onChange={handleChange} 
                    className="w-full rounded-xl border border-[#ece5d8] bg-[#FCFAF7] px-4 py-3 text-sm text-[#121212] placeholder-stone-300 outline-none transition focus:border-[#c5a880] focus:bg-white focus:ring-2 focus:ring-[#c5a880]/20" 
                  />
                </div>
              )}
              
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                  Email Address
                </label>
                <input 
                  required 
                  type="email" 
                  name="email" 
                  placeholder="name@example.com" 
                  value={formData.email} 
                  onChange={handleChange} 
                  className="w-full rounded-xl border border-[#ece5d8] bg-[#FCFAF7] px-4 py-3 text-sm text-[#121212] placeholder-stone-300 outline-none transition focus:border-[#c5a880] focus:bg-white focus:ring-2 focus:ring-[#c5a880]/20" 
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                    Password
                  </label>
                  {isLogin && (
                    <button 
                      type="button"
                      onClick={() => { setAuthMode('forgot_email'); setError(''); setMessage(''); }} 
                      className="text-[11px] font-medium text-stone-400 hover:text-[#9A7B4F] transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <input 
                  required 
                  type="password" 
                  name="password" 
                  placeholder="••••••••" 
                  value={formData.password} 
                  onChange={handleChange} 
                  className="w-full rounded-xl border border-[#ece5d8] bg-[#FCFAF7] px-4 py-3 text-sm text-[#121212] placeholder-stone-300 outline-none transition focus:border-[#c5a880] focus:bg-white focus:ring-2 focus:ring-[#c5a880]/20" 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#121212] py-3.5 text-xs font-semibold uppercase tracking-widest text-white shadow-lg shadow-black/10 transition-all duration-300 hover:bg-[#9A7B4F] hover:shadow-stone-900/20 active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Processing...
                  </span>
                ) : (isLogin ? 'Sign In to Aureva' : 'Create Aureva Account')}
              </button>
            </form>
          </>
        )}

        {/* VIEW: SIGNUP EMAIL OTP VERIFICATION SCREEN */}
        {authMode === 'register_otp' && (
          <div className="font-sans">
            <div className="text-center mb-6">
              <h3 className="font-serif text-2xl font-light text-[#121212]">Verify Your Email</h3>
              <p className="mt-2 text-xs text-stone-500 leading-relaxed">
                We sent a 6-digit code to <strong className="text-stone-800">{formData.email}</strong>. Enter it below to activate your account.
              </p>
            </div>

            <form onSubmit={handleRegisterOtpVerify} className="space-y-4">
              <input 
                required 
                type="text" 
                placeholder="• • • • • •" 
                value={registerOtp} 
                onChange={e => setRegisterOtp(e.target.value)} 
                className="w-full text-center tracking-[0.5em] text-lg font-bold rounded-xl border border-[#ece5d8] bg-[#FCFAF7] py-3 text-[#121212] outline-none focus:border-[#c5a880] focus:bg-white focus:ring-2 focus:ring-[#c5a880]/20" 
                maxLength={6} 
              />
              <button 
                type="submit" 
                disabled={loading}
                className="w-full rounded-xl bg-[#121212] py-3.5 text-xs font-semibold uppercase tracking-widest text-white shadow-lg transition duration-300 hover:bg-[#9A7B4F] disabled:opacity-50"
              >
                {loading ? 'Validating Token...' : 'Verify & Complete Registration'}
              </button>
            </form>
          </div>
        )}

        {/* VIEW: FORGOT PASSWORD REQUEST OVERLAY */}
        {authMode === 'forgot_email' && (
          <div className="font-sans">
            <div className="text-center mb-6">
              <h3 className="font-serif text-2xl font-light text-[#121212]">Password Recovery</h3>
              <p className="mt-2 text-xs text-stone-500 leading-relaxed">
                Enter your account email. We'll send you a 6-digit code to securely reset your credentials.
              </p>
            </div>

            <form onSubmit={handleForgotRequest} className="space-y-4">
              <input 
                required 
                type="email" 
                placeholder="name@example.com" 
                value={resetEmail} 
                onChange={e => setResetEmail(e.target.value)} 
                className="w-full rounded-xl border border-[#ece5d8] bg-[#FCFAF7] px-4 py-3 text-sm text-[#121212] outline-none focus:border-[#c5a880] focus:bg-white focus:ring-2 focus:ring-[#c5a880]/20" 
              />
              <button 
                type="submit" 
                disabled={loading}
                className="w-full rounded-xl bg-[#121212] py-3.5 text-xs font-semibold uppercase tracking-widest text-white shadow-lg transition duration-300 hover:bg-[#9A7B4F] disabled:opacity-50"
              >
                {loading ? 'Sending Code...' : 'Send Recovery Code'}
              </button>
            </form>
          </div>
        )}

        {/* VIEW: FORGOT PASSWORD SET NEW CREDS OVERLAY */}
        {authMode === 'forgot_otp' && (
          <div className="font-sans">
            <div className="text-center mb-6">
              <h3 className="font-serif text-2xl font-light text-[#121212]">Set New Password</h3>
              <p className="mt-2 text-xs text-stone-500 leading-relaxed">
                Enter the code sent to your email and your new password.
              </p>
            </div>

            <form onSubmit={handleResetConfirm} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                  6-Digit OTP Code
                </label>
                <input 
                  required 
                  type="text" 
                  placeholder="• • • • • •" 
                  value={resetOtp} 
                  onChange={e => setResetOtp(e.target.value)} 
                  className="w-full text-center tracking-[0.4em] text-base font-bold rounded-xl border border-[#ece5d8] bg-[#FCFAF7] py-3 text-[#121212] outline-none focus:border-[#c5a880] focus:bg-white focus:ring-2 focus:ring-[#c5a880]/20" 
                  maxLength={6} 
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                  New Password
                </label>
                <input 
                  required 
                  type="password" 
                  placeholder="••••••••" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  className="w-full rounded-xl border border-[#ece5d8] bg-[#FCFAF7] px-4 py-3 text-sm text-[#121212] outline-none focus:border-[#c5a880] focus:bg-white focus:ring-2 focus:ring-[#c5a880]/20" 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="mt-4 w-full rounded-xl bg-[#121212] py-3.5 text-xs font-semibold uppercase tracking-widest text-white shadow-lg transition duration-300 hover:bg-[#9A7B4F] disabled:opacity-50"
              >
                {loading ? 'Updating Credentials...' : 'Save New Password'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default Auth;