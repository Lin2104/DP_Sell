import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useGoogleLogin } from '@react-oauth/google';
import { getFullImageUrl } from './utils/imageUtils';
import { Mail, Lock, User, ArrowLeft } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (isForgotPassword) {
        await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email: formData.email });
        setSuccess('Password reset link sent to your email');
      } else {
        const endpoint = isLogin ? '/auth/login' : '/auth/signup';
        const res = await axios.post(`${API_BASE_URL}${endpoint}`, formData);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError(null);
      try {
        // Fetch user info from Google using the access token
        const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });

        // Send user info to backend
        const res = await axios.post(`${API_BASE_URL}/auth/google`, {
          email: userInfo.data.email,
          name: userInfo.data.name,
          googleId: userInfo.data.sub,
          avatar: userInfo.data.picture,
          token: tokenResponse.access_token
        });

        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        navigate('/');
      } catch (err: any) {
        setError(err.response?.data?.error || 'Google Login failed');
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Google Login Failed')
  });

  return (
    <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-[#121926] p-8 rounded-3xl border border-slate-800 shadow-2xl">
        <div className="text-center">
          <button onClick={() => isForgotPassword ? setIsForgotPassword(false) : navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-8">
            <ArrowLeft size={20} /> {isForgotPassword ? 'Back to Login' : 'Back to Shop'}
          </button>
          <div className="flex justify-center mb-6">
            <div className="bg-black p-1 rounded-2xl text-white shadow-2xl shadow-black/40">
              <img 
                src={getFullImageUrl('/logo.png')} 
                alt="Blasky Logo" 
                className="w-12 h-12 md:w-16 md:h-16 object-contain" 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-blue-500"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-gamepad-2"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="13" r="1"/><circle cx="18" cy="11" r="1"/><path d="M18 20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/></svg></div>';
                }}
              />
            </div>
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
            {isForgotPassword ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Join Blasky')}
          </h2>
          <p className="text-slate-500 mt-2 text-sm font-bold uppercase tracking-widest">
            {isForgotPassword ? 'Enter email to receive reset link' : (isLogin ? 'Login to your account' : 'Create your gaming account')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-bold text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-sm font-bold text-center">
              {success}
            </div>
          )}
          
          {!isLogin && !isForgotPassword && (
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Full Name" 
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-white text-sm"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          )}

          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
            <input 
              type="email" 
              placeholder="Email Address" 
              required
              className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-white text-sm"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          {!isForgotPassword && (
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
              <input 
                type="password" 
                placeholder="Password" 
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-white text-sm"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          )}

          {isLogin && !isForgotPassword && (
            <div className="text-right">
              <button 
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isForgotPassword ? 'Send Reset Link' : (isLogin ? 'Login Now' : 'Create Account'))}
          </button>

          {!isForgotPassword && (
            <>
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-4 text-slate-500 text-xs font-bold uppercase tracking-widest">OR</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <button 
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-100 transition-all flex items-center justify-center gap-3"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                Sign in with Google
              </button>
            </>
          )}
        </form>

        {!isForgotPassword && (
          <div className="text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-slate-400 hover:text-white text-sm font-bold transition-colors"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
