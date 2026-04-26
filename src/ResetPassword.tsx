import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Lock, ArrowLeft } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await axios.post(`${API_BASE_URL}/auth/reset-password/${token}`, { password });
      setSuccess(true);
      setTimeout(() => navigate('/auth'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-[#121926] p-8 rounded-3xl border border-slate-800 shadow-2xl">
        <div className="text-center">
          <button onClick={() => navigate('/auth')} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-8">
            <ArrowLeft size={20} /> Back to Login
          </button>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
            Reset Password
          </h2>
          <p className="text-slate-500 mt-2 text-sm font-bold uppercase tracking-widest">
            Enter your new password below
          </p>
        </div>

        {success ? (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-sm font-bold text-center">
            Password reset successful! Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-bold text-center">
                {error}
              </div>
            )}
            
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
              <input 
                type="password" 
                placeholder="New Password" 
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-white text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
              <input 
                type="password" 
                placeholder="Confirm New Password" 
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-white text-sm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
