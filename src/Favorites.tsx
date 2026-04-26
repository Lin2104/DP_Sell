import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getFullImageUrl } from './utils/imageUtils';
import { 
  Heart, 
  ArrowLeft, 
  Gamepad2
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const Favorites: React.FC = () => {
  const navigate = useNavigate();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoriteGames, setFavoriteGames] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedFavs = localStorage.getItem('favorites');
    if (savedFavs) {
      const ids = JSON.parse(savedFavs);
      setFavoriteIds(ids);
      fetchFavoriteGames(ids);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchFavoriteGames = async (ids: string[]) => {
    try {
      const api = axios.create({
        baseURL: API_BASE_URL,
        timeout: 15000
      });

      const [gamRes, catRes] = await Promise.all([
        api.get('/games'),
        api.get('/categories')
      ]);
      const allGames = gamRes.data || [];
      
      const filtered = allGames.filter((g: any) => ids.includes(g._id));

      setFavoriteGames(filtered);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Error fetching favorites:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = (id: string) => {
    const newIds = favoriteIds.filter(fid => fid !== id);
    setFavoriteIds(newIds);
    setFavoriteGames(prev => prev.filter(g => g._id !== id));
    localStorage.setItem('favorites', JSON.stringify(newIds));
  };

  const addToCart = (e: React.MouseEvent, game: any) => {
    e.stopPropagation();
    const savedCart = localStorage.getItem('cart');
    const cart = savedCart ? JSON.parse(savedCart) : [];
    cart.push({ 
      _id: game._id, 
      name: game.name, 
      price: game.minPrice, 
      icon: game.icon,
      addedAt: new Date() 
    });
    localStorage.setItem('cart', JSON.stringify(cart));
    setCartCount(cart.length);
  };

  return (
    <div className="min-h-screen bg-[#0a0f18] text-slate-300 font-sans pb-20">
      <nav className="bg-[#121926]/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 text-slate-400 hover:text-white transition-colors flex items-center gap-2">
            <ArrowLeft size={20} />
            <span className="font-bold uppercase tracking-widest text-xs hidden sm:inline">Back</span>
          </button>
          <h1 className="text-lg md:text-xl font-black text-white uppercase tracking-tighter italic">Favorites</h1>
          <div className="w-10"></div> {/* Spacer */}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : favoriteGames.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
            {favoriteGames.map((game) => (
              <div 
                key={game._id}
                onClick={() => navigate(`/product/${game._id}`)}
                className="group bg-[#121926] rounded-2xl md:rounded-3xl p-3 md:p-5 border border-slate-800 transition-all duration-500 cursor-pointer hover:shadow-2xl hover:shadow-blue-900/10 hover:-translate-y-2"
              >
                <div className="aspect-square mb-3 md:mb-6 overflow-hidden rounded-xl md:rounded-2xl bg-slate-800 border border-slate-700 relative">
                  {game.icon ? (
                    <img 
                      src={getFullImageUrl(game.icon)} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      alt={game.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center');
                        (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-slate-500"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-gamepad-2"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="13" r="1"/><circle cx="18" cy="11" r="1"/><path d="M18 20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/></svg></div>';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                      <Gamepad2 size={24} />
                    </div>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFavorite(game._id);
                    }}
                    className="absolute top-2 right-2 md:top-3 md:right-3 p-1.5 md:p-2 rounded-full bg-red-500/20 border border-red-500/50 text-red-500 backdrop-blur-md transition-all"
                  >
                    <Heart size={14} fill="currentColor" />
                  </button>
                </div>

                <div className="flex flex-col flex-1">
                  {/* Price - Hidden for Top-Up category */}
                  {(() => {
                    const categoryName = typeof game.categoryId === 'string' 
                      ? categories.find(c => c._id === game.categoryId)?.name 
                      : game.categoryId?.name;
                    const isTopUp = categoryName?.toLowerCase().includes('top-up') || categoryName?.toLowerCase().includes('topup');
                    
                    if (isTopUp) return null;
                    
                    return (
                      <div className="text-white font-black text-sm md:text-base mb-1">
                        {game.minPrice ? `${game.minPrice} MMK` : '---'}
                      </div>
                    );
                  })()}

                  {/* Name */}
                  <h3 className={`font-medium text-[11px] md:text-sm leading-tight transition-colors uppercase tracking-tight line-clamp-2 mb-1 ${game.isActive !== false ? 'text-slate-300 group-hover:text-blue-400' : 'text-slate-500'}`}>
                    {game.name}
                  </h3>

                  {/* Sold Count */}
                  <div className="text-slate-500 text-[10px] md:text-xs font-medium mb-3">
                    Sold {game.soldCount || 0}+
                  </div>

                  {/* Buy Button - Hidden for Top-Up category */}
                  {(() => {
                    const categoryName = typeof game.categoryId === 'string' 
                      ? categories.find(c => c._id === game.categoryId)?.name 
                      : game.categoryId?.name;
                    const isTopUp = categoryName?.toLowerCase().includes('top-up') || categoryName?.toLowerCase().includes('topup');
                    
                    if (isTopUp) return null;

                    return (
                      <button
                        onClick={(e) => game.isActive !== false && addToCart(e, game)}
                        disabled={game.isActive === false}
                        className={`w-full py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all mt-auto flex items-center justify-center gap-2 ${
                          game.isActive !== false 
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20' 
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        Buy
                      </button>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-slate-700 mx-auto mb-6 border border-slate-800 border-dashed">
              <Heart size={40} />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">No favorites yet</h2>
            <p className="text-slate-500 mb-8 font-medium">Items you mark as favorite will appear here.</p>
            <button 
              onClick={() => navigate('/')}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
            >
              Explore Catalog
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Favorites;