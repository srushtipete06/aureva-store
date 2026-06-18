import React, { useState } from 'react';

function Auth({ setView, onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false); 
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Dono authentication states ke endpoints
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(`https://aureva-store.onrender.com${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        setError(data.message || 'An error occurred. Please try again.');
        return;
      }

      // Backend verification configuration handler
      if (data.requiresOtp || !isLogin) {
        // Agar backend login par bhi OTP maang raha hai ya registration successful hai
        setMessage(data.message || 'Verification code has been dispatched!');
        setIsVerifyingOtp(true);
      } else {
        // Direct Login flow (agar backend par direct email/password checks hain)
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
        setView('shop');
      }
    } catch (err) {
      setError('Unable to connect to the server. Please check your connection.');
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Dynamic endpoint check agar login verification alag bani ho backend par
    const verifyEndpoint = isLogin ? '/api/auth/verify-login-otp' : '/api/auth/verify-otp';

    try {
      const res = await fetch(`https://aureva-store.onrender.com${verifyEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp }),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        setError(data.message || 'Invalid or expired OTP code.');
        return;
      }

      if (isLogin) {
        // Login OTP successfully verified -> Direct Dashboard Access!
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
        setView('shop');
      } else {
        // Registration OTP verified successfully -> Send to login window
        setMessage('Your account has been verified successfully! Please sign in.');
        setIsVerifyingOtp(false);
        setIsLogin(true);
        setFormData({ name: '', email: formData.email, password: '' });
        setOtp('');
      }
    } catch (err) {
      setError('Connection to verification server failed.');
    }
  };

  return (
    <main className="max-w-md mx-auto px-8 py-16 bg-white border border-[#e5e1da] mt-12 shadow-md font-serif text-black">
      <button 
        onClick={() => {
          if (isVerifyingOtp) {
            setIsVerifyingOtp(false);
          } else {
            setView('shop');
          }
        }} 
        className="text-xs uppercase tracking-widest text-gray-400 hover:text-[#b3925c] mb-6 block"
      >
        {isVerifyingOtp ? '← Back' : '← Back to Shop'}
      </button>

      <h3 className="text-2xl font-light tracking-widest uppercase mb-6 border-b pb-3 text-[#b3925c]">
        {isVerifyingOtp ? 'VERIFY OTP' : isLogin ? 'AUREVA LOGIN' : 'CREATE ACCOUNT'}
      </h3>

      {error && <p className="text-red-500 text-sm italic mb-4">{error}</p>}
      {message && <p className="text-green-600 text-sm italic mb-4">{message}</p>}

      {isVerifyingOtp ? (
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <p className="text-xs text-gray-500 italic mb-2">
            Please enter the 6-digit verification code sent to <strong className="font-sans font-semibold not-italic text-gray-700">{formData.email}</strong>.
          </p>
          <input 
            required 
            type="text" 
            maxLength="6"
            placeholder="Enter 6-Digit OTP" 
            value={otp} 
            onChange={(e) => setOtp(e.target.value)} 
            className="w-full border p-3 rounded-none text-center text-lg tracking-[0.5em] font-sans font-bold outline-none focus:border-[#b3925c]" 
          />
          <button type="submit" className="w-full bg-[#b3925c] text-white py-4 text-xs uppercase tracking-widest font-semibold hover:bg-[#2c2a29] transition-all duration-300">
            Verify Code
          </button>
        </form>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <input required type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c]" />
            )}
            <input required type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c]" />
            <input required type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} className="w-full border p-3 rounded-none text-sm outline-none focus:border-[#b3925c]" />
            
            <button type="submit" className="w-full bg-[#2c2a29] text-white py-4 text-xs uppercase tracking-widest font-semibold hover:bg-[#b3925c] transition-all duration-300">
              {isLogin ? 'Sign In' : 'Register Account'}
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
    </main>
  );
}

export default Auth;