import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getFullImageUrl } from './utils/imageUtils';
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, RefreshCcw, Gamepad2, CreditCard, ShoppingCart } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

interface Order {
  _id: string;
  gameType: string;
  gameId: string;
  zoneId?: string;
  amount: string;
  paymentMethod: string;
  orderStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected';
  createdAt: string;
}

const History = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }
      try {
        const api = axios.create({
          baseURL: API_BASE_URL,
          timeout: 15000
        });

        const [orderRes, gameRes] = await Promise.all([
          api.get('/orders/user', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          api.get('/games')
        ]);
        setOrders(orderRes.data);
        setGames(gameRes.data || []);
      } catch (err: any) {
        setError('Failed to fetch order history');
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/auth');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [navigate]);

  const reorder = (order: Order) => {
    // Navigate to the product page for this game
    const game = games.find(g => g._id === order.gameId || g.name === order.gameType);
    if (game) {
      navigate(`/product/${game._id}`);
    } else {
      // Fallback if game not found by ID or name
      navigate('/');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center">
      <RefreshCcw className="text-blue-500 animate-spin" size={48} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0f18] text-slate-300 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors">
            <ArrowLeft size={20} /> Back to Catalog
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-black p-1 rounded-xl text-white shadow-lg shadow-black/20">
              <img 
                src={getFullImageUrl('/logo.png')} 
                alt="Blasky Logo" 
                className="w-8 h-8 md:w-10 md:h-10 object-contain" 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-blue-500"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-gamepad-2"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="13" r="1"/><circle cx="18" cy="11" r="1"/><path d="M18 20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/></svg></div>';
                }}
              />
            </div>
            <span className="text-xl font-black text-white uppercase tracking-tighter italic">Blasky History</span>
          </div>
        </div>

        <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-4">
          <Package className="text-blue-500" /> My Order History
        </h2>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-bold text-center mb-8">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="bg-[#121926] p-6 rounded-3xl border border-slate-800 shadow-xl hover:border-slate-700 transition-all group">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-500/10 p-4 rounded-2xl text-blue-400">
                    <Gamepad2 size={24} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors">
                      {order.gameType.replace('-', ' ')}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Clock size={12}/> {new Date(order.createdAt).toLocaleDateString()}</span>
                      <span className="bg-slate-900 px-2 py-0.5 rounded text-[10px] border border-slate-800">ID: {order.gameId}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 md:text-right">
                  <div className="space-y-1">
                    <p className="text-blue-400 font-black text-lg">{order.amount}</p>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-1 justify-end">
                      <CreditCard size={10} /> {order.paymentMethod}
                    </p>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${
                    order.orderStatus === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                    order.orderStatus === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                    order.orderStatus === 'processing' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                    'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}>
                    {order.orderStatus === 'completed' && <CheckCircle size={14} />}
                    {order.orderStatus === 'pending' && <Clock size={14} />}
                    {order.orderStatus === 'processing' && <RefreshCcw size={14} className="animate-spin" />}
                    {order.orderStatus === 'failed' && <XCircle size={14} />}
                    {order.orderStatus === 'rejected' && <XCircle size={14} />}
                    {order.orderStatus}
                  </div>
                  <button 
                    onClick={() => reorder(order)}
                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                    title="Buy Again"
                  >
                    <ShoppingCart size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {orders.length === 0 && !loading && (
            <div className="text-center py-32 bg-[#121926]/50 rounded-[40px] border border-slate-800 border-dashed">
              <Package size={48} className="mx-auto text-slate-700 mb-6" />
              <h3 className="text-2xl font-black text-white mb-2">No orders yet</h3>
              <p className="text-slate-500">Your purchase history will appear here once you make an order.</p>
              <button 
                onClick={() => navigate('/')}
                className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
              >
                Start Shopping
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
