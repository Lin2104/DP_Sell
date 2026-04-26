import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getFullImageUrl } from './utils/imageUtils';
import { 
  Zap, 
  ShieldCheck, 
  MessageSquare,
  Globe,
  Share2,
  ExternalLink,
  ArrowRight, 
  Search, 
  Layers, 
  Clock, 
  Heart, 
  Megaphone, 
  ShoppingCart, 
  Gamepad2
} from 'lucide-react';

interface Promotion {
  _id: string;
  title: string;
  description: string;
  image: string;
  link?: string;
  isActive: boolean;
}

interface Category {
  _id: string;
  name: string;
}

interface Game {
  _id: string;
  name: string;
  categoryId: any;
  icon: string;
  description?: string;
  soldCount?: number;
  minPrice?: number;
  isActive?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));

    const savedFavs = localStorage.getItem('favorites');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    
    const savedCart = localStorage.getItem('cart');
    if (savedCart) setCartCount(JSON.parse(savedCart).length);

    // 1. Try to load from cache first for instant rendering
    const cachedCategories = localStorage.getItem('catalog_categories');
    const cachedGames = localStorage.getItem('catalog_games');
    const cachedPromotions = localStorage.getItem('catalog_promotions');
    
    if (cachedCategories && cachedGames) {
      setCategories(JSON.parse(cachedCategories));
      setGames(JSON.parse(cachedGames));
      if (cachedPromotions) setPromotions(JSON.parse(cachedPromotions));
      setLoading(false); // Skip initial spinner if we have cache!
    }

    const fetchData = async (retryCount = 0) => {
      try {
        const api = axios.create({
          baseURL: API_BASE_URL,
          timeout: 20000 // Increased to 20s
        });

        // Use light mode for home page to minimize data transfer
        const [catRes, gamRes, promoRes] = await Promise.all([
          api.get('/categories'),
          api.get('/games?light=true'), // Restored light=true (icons now included in light mode)
          api.get('/promotions')
        ]);
        
        const activeCategories = catRes.data || [];
        const enrichedGames = gamRes.data || [];
        const activePromotions = promoRes.data || [];
        
        setCategories(activeCategories);
        setGames(enrichedGames);
        setPromotions(activePromotions);
        localStorage.setItem('catalog_categories', JSON.stringify(activeCategories));
        localStorage.setItem('catalog_games', JSON.stringify(enrichedGames));
        localStorage.setItem('catalog_promotions', JSON.stringify(activePromotions));
        
        setError(null);
      } catch (err) {
        console.error(`Fetch attempt ${retryCount + 1} failed:`, err);
        
        // Retry logic: up to 2 retries
        if (retryCount < 2) {
          const delay = retryCount === 0 ? 2000 : 5000;
          setTimeout(() => fetchData(retryCount + 1), delay);
          return;
        }

        if (!localStorage.getItem('catalog_games')) {
          setError('Network slow or server busy. Retrying in background...');
        }
      } finally {
        if (retryCount === 0 || !error) {
          setLoading(false);
        }
      }
    };

    // Initial load logic
    if (games.length === 0 && !localStorage.getItem('catalog_games')) {
      setLoading(true);
    }
    fetchData();

    // Real-time updates: fetch every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredGames = games.filter(g => {
    const matchesCategory = !selectedCategory || 
      (typeof g.categoryId === 'string' ? g.categoryId === selectedCategory._id : g.categoryId?._id === selectedCategory._id);
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.reload();
  };

  const toggleFavorite = (e: React.MouseEvent, gameId: string) => {
    e.stopPropagation();
    const newFavs = favorites.includes(gameId) 
      ? favorites.filter(id => id !== gameId)
      : [...favorites, gameId];
    setFavorites(newFavs);
    localStorage.setItem('favorites', JSON.stringify(newFavs));
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-blue-400 font-black uppercase tracking-widest text-xs animate-pulse">Loading Marketplace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center">
        <div className="text-center p-8 bg-[#121926] rounded-3xl border border-red-500/20">
          <div className="text-red-500 mb-4 flex justify-center">
            <ShieldCheck size={48} />
          </div>
          <h2 className="text-white font-black text-xl mb-2">Something went wrong</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f18] text-slate-300 font-sans">
      {/* Navigation Bar */}
      <nav className="bg-[#121926]/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 md:h-20 items-center gap-4">
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 cursor-pointer" onClick={() => navigate('/')}>
              <div className="bg-black p-1 rounded-lg md:rounded-xl text-white shadow-lg shadow-black/20 flex items-center justify-center">
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
              <span className="text-lg md:text-2xl font-black text-white tracking-tighter uppercase italic">
                Blasky
              </span>
            </div>

            {/* Desktop Search - Hidden on mobile */}
            <div className="hidden md:flex flex-1 max-w-md relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Search games, services..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-2.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-white placeholder:text-slate-600"
              />
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <button 
                onClick={() => navigate('/favorites')}
                className="p-2 text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                title="Favorites"
              >
                <Heart size={24} fill={favorites.length > 0 ? "currentColor" : "none"} className={favorites.length > 0 ? "text-red-500" : ""} />
                {favorites.length > 0 && (
                  <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest text-slate-500">Wishlist</span>
                )}
              </button>
              <button 
                onClick={() => navigate('/cart')}
                className="relative p-2 text-slate-400 hover:text-white transition-colors"
              >
                <ShoppingCart size={24} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#121926]">
                    {cartCount}
                  </span>
                )}
              </button>
              {user ? (
                <div className="flex items-center gap-2 md:gap-3">
                  <button 
                    onClick={() => navigate('/history')}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all text-[10px] md:text-xs font-bold uppercase tracking-widest"
                  >
                    <Clock size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">History</span>
                  </button>
                  <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-3 border-l border-slate-800">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-[10px] md:text-xs uppercase">
                      {user.name[0]}
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="text-[9px] md:text-[10px] font-black text-slate-500 hover:text-red-400 uppercase tracking-widest transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => navigate('/auth')}
                  className="px-4 md:px-6 py-2 md:py-2.5 rounded-xl bg-blue-600 text-white font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
                >
                  <span className="hidden sm:inline">Login / Register</span>
                  <span className="sm:hidden">Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest mb-8">
            <Zap size={14} /> Instant Delivery • 100% Secure
          </div>
          <h1 className="text-5xl md:text-8xl font-black text-white leading-[1.1] mb-8 tracking-tighter">
            Digital Market <br/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-500">Mastered.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 mb-12 max-w-2xl mx-auto font-medium">
            The ultimate platform for gamers. Keys, Top-ups, Accounts and Services delivered instantly to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#catalog" className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-2xl shadow-blue-900/40 hover:-translate-y-1">
              Browse Catalog <ArrowRight size={20} />
            </a>
            <button className="bg-white/5 border border-slate-800 text-white px-10 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-white/10 transition-all backdrop-blur-sm">
              Our Services
            </button>
          </div>
        </div>
      </header>

      {/* Events & Promotions Section */}
      {promotions.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Megaphone size={20} className="text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider">Events & Promotions</h2>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-8">
            {promotions.length > 0 && (
              <div 
                onClick={() => promotions[0].link && (promotions[0].link.startsWith('http') ? window.open(promotions[0].link, '_blank') : navigate(promotions[0].link))}
                className={`group flex flex-col md:flex-row items-center gap-8 ${promotions[0].link ? 'cursor-pointer' : ''}`}
              >
                <div className="flex-none w-full md:w-1/2 lg:w-2/5 overflow-hidden p-2">
                  {promotions[0].image ? (
                    <img 
                      src={getFullImageUrl(promotions[0].image)} 
                      alt={promotions[0].title} 
                      className="max-w-full h-auto object-contain rounded-2xl group-hover:scale-105 transition-transform duration-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-slate-600"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-megaphone"><path d="m3 11 18-5v12L3 13v-2Z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg></div>';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                      <Megaphone size={64} className="text-slate-600" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-3xl md:text-4xl font-black text-white mb-4 group-hover:text-blue-400 transition-colors">{promotions[0].title}</h3>
                  <p className="text-base text-slate-300 leading-relaxed mb-6">{promotions[0].description}</p>
                  
                  {promotions[0].link && (
                    <div className="inline-flex items-center gap-2 text-sm font-black text-blue-500 uppercase tracking-widest">
                      Learn More <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Catalog Section */}
      <section id="catalog" className="py-24 bg-[#0a0f18]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
            <div>
              <h2 className="text-4xl font-black text-white mb-4 tracking-tight">Product Catalog</h2>
              <p className="text-slate-500 font-medium">Explore thousands of premium digital services.</p>
            </div>
            
            {/* Mobile/Tablet Category Scroll */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border-2 ${!selectedCategory ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
              >
                All items
              </button>
              {categories.map(cat => (
                <button
                  key={cat._id}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border-2 ${selectedCategory?._id === cat._id ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Search for Mobile */}
          <div className="md:hidden mb-8 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-white placeholder:text-slate-600"
            />
          </div>

          {/* Game Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
            {filteredGames.map((game: any) => (
              <div 
                key={game._id}
                onClick={() => game.isActive !== false && navigate(`/product/${game._id}`)}
                className={`group bg-[#121926] rounded-2xl md:rounded-3xl p-3 md:p-4 border border-slate-800 transition-all duration-500 flex flex-col h-full ${
                  game.isActive !== false 
                    ? 'cursor-pointer hover:shadow-2xl hover:shadow-blue-900/10 hover:-translate-y-1' 
                    : 'opacity-60 cursor-not-allowed'
                }`}
              >
                <div className={`aspect-square mb-3 overflow-hidden rounded-xl md:rounded-2xl bg-slate-800 border border-slate-700 relative flex-shrink-0 ${game.isActive === false ? 'grayscale' : ''}`}>
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
                  
                  {/* Favorite Button */}
                  <button
                    onClick={(e) => toggleFavorite(e, game._id)}
                    className={`absolute top-2 right-2 p-1.5 md:p-2 rounded-lg shadow-lg transition-all z-10 ${
                      favorites.includes(game._id)
                        ? 'bg-white text-red-500'
                        : 'bg-black/40 backdrop-blur-md border border-white/10 text-white/70 hover:text-white'
                    }`}
                  >
                    <Heart size={14} fill={favorites.includes(game._id) ? "currentColor" : "none"} />
                  </button>

                  {game.isActive === false && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-red-600 text-white text-[8px] md:text-[10px] font-black px-2 md:px-3 py-1 md:py-1.5 rounded-full uppercase tracking-widest shadow-xl">OutOfStock</span>
                    </div>
                  )}
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

          {!loading && filteredGames.length === 0 && (
            <div className="text-center py-40 bg-[#121926]/50 rounded-[40px] border border-slate-800 border-dashed">
              <Layers size={48} className="mx-auto text-slate-700 mb-6" />
              <h3 className="text-2xl font-black text-white mb-2">No products found</h3>
              <p className="text-slate-500">Try adjusting your filters or search terms.</p>
            </div>
          )}
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-24 border-y border-slate-800/50 bg-[#0a0f18]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-12">
          <div className="flex items-center gap-6 group">
            <div className="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
              <Zap size={32} />
            </div>
            <div>
              <h4 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Instant Delivery</h4>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">Automatic fulfillment ensures your order arrives in seconds.</p>
            </div>
          </div>
          <div className="flex items-center gap-6 group">
            <div className="w-20 h-20 rounded-3xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20 group-hover:scale-110 transition-transform">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h4 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Safe & Secure</h4>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">Every transaction is protected by bank-level encryption.</p>
            </div>
          </div>
          <div className="flex items-center gap-6 group">
            <div className="w-20 h-20 rounded-3xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
              <MessageSquare size={32} />
            </div>
            <div>
              <h4 className="text-xl font-black text-white mb-2 uppercase tracking-tight">24/7 Support</h4>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">Our experts are always here to help you with anything.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a0f18] text-slate-500 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-16 mb-20">
            <div className="col-span-2 space-y-8">
              <div className="flex items-center gap-3">
                <div className="bg-black p-1 rounded-xl text-white flex items-center justify-center shadow-lg shadow-black/20">
               <img 
                 src={getFullImageUrl('/logo.png')} 
                 alt="Blasky Logo" 
                 className="w-10 h-10 object-contain" 
                 onError={(e) => {
                   (e.target as HTMLImageElement).style.display = 'none';
                   (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-blue-500"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-gamepad-2"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="13" r="1"/><circle cx="18" cy="11" r="1"/><path d="M18 20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/></svg></div>';
                 }}
               />
             </div>
            <span className="text-2xl font-black text-white tracking-tighter uppercase">Blasky Game Shop</span>
          </div>
          <p className="max-w-sm text-base leading-relaxed">
            The most trusted digital marketplace. We provide safe, fast, and reliable services for gamers worldwide since 2024.
          </p>
              <div className="flex gap-6">
                <a href="#" className="hover:text-blue-500 transition-colors"><Globe size={20}/></a>
                <a href="#" className="hover:text-blue-500 transition-colors"><Share2 size={20}/></a>
                <a href="#" className="hover:text-blue-500 transition-colors"><ExternalLink size={20}/></a>
              </div>
            </div>
            
            <div className="space-y-8">
              <h4 className="text-white font-black uppercase tracking-widest text-sm">Quick Links</h4>
              <ul className="space-y-4 text-sm font-bold">
                <li><a href="#" className="hover:text-white transition-colors">Catalog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Track Order</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Use</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
            
            <div className="space-y-8">
              <h4 className="text-white font-black uppercase tracking-widest text-sm">Customer Help</h4>
              <ul className="space-y-4 text-sm font-bold">
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Refunds</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Support</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Payment Info</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-12 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-6 text-sm font-bold">
            <p>© 2026 Blasky Game Shop. All rights reserved.</p>
            <p>Made with ❤️ for Gamers</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
