import React, { useState } from 'react';

const BACKEND_BASE_URL = "https://aureva-store.onrender.com";

function Auth({ setView, onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // DYNAMIC UI AUTH MODES
  // Modes: 'auth' (Login/Signup), 'register_otp' (Signup Email Verify), 'forgot_email', 'forgot_otp'
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
        // SIGNUP SUCCESS: Redirect directly to Email OTP Verification stage
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

  // 🟢 3. FORGOT PASSWORD REQUEST DISPATCHER (WITH TIMEOUT HANG PROTECTION)
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
    <main className="max-w-md mx-auto px-8 py-16 bg-white border border-[#e5e1da] mt-12 shadow-md font-serif text-black">
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
        className="text-xs uppercase tracking-widest text-gray-400 hover:text-[#b3925c] mb-6 block"
      >
        ← {authMode !== 'auth' ? 'Back to Login' : 'Back to Shop'}
      </button>

      {/* VIEW: LOGIN / REGISTER */}
      {authMode === 'auth' && (
        <>
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
            <div>
              <input required type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c]" />
              {isLogin && (
                <div className="text-right mt-1.5">
                  <span 
                    onClick={() => { setAuthMode('forgot_email'); setError(''); setMessage(''); }} 
                    className="text-xs text-gray-400 font-sans hover:text-[#b3925c] cursor-pointer transition-all underline"
                  >
                    Forgot Password?
                  </span>
                </div>
              )}
            </div>
            
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
        </>
      )}

      {/* VIEW: SIGNUP EMAIL OTP VERIFICATION SCREEN */}
      {authMode === 'register_otp' && (
        <>
          <h3 className="text-2xl font-light tracking-widest uppercase mb-6 border-b pb-3 text-[#b3925c]">
            VERIFY EMAIL
          </h3>
          <p className="text-xs text-gray-400 font-sans mb-4 leading-relaxed italic">
            A registration verification code has been dispatched to <strong>{formData.email}</strong>. Enter the 6-digit code below to unlock your luxury access.
          </p>

          {error && <p className="text-red-500 text-sm italic mb-4">{error}</p>}
          {message && <p className="text-green-600 text-sm italic mb-4">{message}</p>}

          <form onSubmit={handleRegisterOtpVerify} className="space-y-4">
            <input required type="text" placeholder="6-Digit Verification Code" value={registerOtp} onChange={e => setRegisterOtp(e.target.value)} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c]" maxLength={6} />
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#2c2a29] text-white py-4 text-xs uppercase tracking-widest font-semibold hover:bg-[#b3925c] transition-all duration-300 disabled:opacity-50"
            >
              {loading ? 'Validating Token...' : 'Verify & Activate Account'}
            </button>
          </form>
        </>
      )}

      {/* VIEW: FORGOT PASSWORD REQUEST OVERLAY */}
      {authMode === 'forgot_email' && (
        <>
          <h3 className="text-2xl font-light tracking-widest uppercase mb-6 border-b pb-3 text-[#b3925c]">
            RESET PASSWORD
          </h3>
          <p className="text-xs text-gray-400 font-sans mb-4 leading-relaxed italic">
            Enter your account email below. We will send you a 6-digit verification code to initialize password reset.
          </p>

          {error && <p className="text-red-500 text-sm italic mb-4">{error}</p>}

          <form onSubmit={handleForgotRequest} className="space-y-4">
            <input required type="email" placeholder="Email Address" value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c]" />
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#2c2a29] text-white py-4 text-xs uppercase tracking-widest font-semibold hover:bg-[#b3925c] transition-all duration-300 disabled:opacity-50"
            >
              {loading ? 'Sending OTP Code...' : 'Send Verification OTP'}
            </button>
          </form>
        </>
      )}

      {/* VIEW: FORGOT PASSWORD SET NEW CREDS OVERLAY */}
      {authMode === 'forgot_otp' && (
        <>
          <h3 className="text-2xl font-light tracking-widest uppercase mb-6 border-b pb-3 text-[#b3925c]">
            VERIFY OTP
          </h3>

          {error && <p className="text-red-500 text-sm italic mb-4">{error}</p>}
          {message && <p className="text-green-600 text-sm italic mb-4">{message}</p>}

          <form onSubmit={handleResetConfirm} className="space-y-4">
            <input required type="text" placeholder="6-Digit OTP Code" value={resetOtp} onChange={e => setResetOtp(e.target.value)} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c]" maxLength={6} />
            <input required type="password" placeholder="Enter New Secure Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c]" />
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#2c2a29] text-white py-4 text-xs uppercase tracking-widest font-semibold hover:bg-[#b3925c] transition-all duration-300 disabled:opacity-50"
            >
              {loading ? 'Updating Credentials...' : 'Save New Password'}
            </button>
          </form>
        </>
      )}
    </main>
  );
}

export default Auth;