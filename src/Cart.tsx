import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFullImageUrl } from './utils/imageUtils';
import { 
  ShoppingCart, 
  Trash2, 
  ArrowLeft, 
  ShoppingBag,
  Package
} from 'lucide-react';

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<any[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) setCartItems(JSON.parse(savedCart));
  }, []);

  const removeFromCart = (index: number) => {
    const newCart = [...cartItems];
    newCart.splice(index, 1);
    setCartItems(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cart');
  };

  return (
    <div className="min-h-screen bg-[#0a0f18] text-slate-300 font-sans pb-20">
      <nav className="bg-[#121926]/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 text-slate-400 hover:text-white transition-colors flex items-center gap-2">
            <ArrowLeft size={20} />
            <span className="font-bold uppercase tracking-widest text-xs hidden sm:inline">Back</span>
          </button>
          <h1 className="text-lg md:text-xl font-black text-white uppercase tracking-tighter italic">Your Cart</h1>
          <div className="w-10"></div> {/* Spacer */}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        {cartItems.length > 0 ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">{cartItems.length} Items</span>
              <button onClick={clearCart} className="text-red-500 hover:text-red-400 font-bold uppercase tracking-widest text-[10px] transition-colors">Clear All</button>
            </div>
            
            <div className="space-y-3">
              {cartItems.map((item, index) => (
                <div key={index} className="bg-[#121926] rounded-2xl p-4 border border-slate-800 flex items-center gap-4 group">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex-shrink-0">
                    {item.icon ? (
                      <img 
                        src={getFullImageUrl(item.icon)} 
                        className="w-full h-full object-cover" 
                        alt={item.name} 
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center');
                          (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-slate-500"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></div>';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <Package size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold truncate uppercase tracking-tight text-sm md:text-base">{item.name}</h3>
                    <p className="text-blue-400 font-black text-xs md:text-sm mt-1">{item.price} MMK</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => navigate(`/product/${item._id}`)}
                      className="p-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all"
                    >
                      <ShoppingBag size={18} />
                    </button>
                    <button 
                      onClick={() => removeFromCart(index)}
                      className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 p-6 bg-blue-600/10 rounded-3xl border border-blue-500/20 text-center">
              <p className="text-slate-400 font-medium mb-4 italic text-sm">Each item requires specific details (like Player ID) for processing.</p>
              <button 
                onClick={() => navigate('/')}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-slate-700 mx-auto mb-6 border border-slate-800 border-dashed">
              <ShoppingCart size={40} />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Your cart is empty</h2>
            <p className="text-slate-500 mb-8 font-medium">Looks like you haven't added anything yet.</p>
            <button 
              onClick={() => navigate('/')}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
            >
              Start Shopping
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Cart;