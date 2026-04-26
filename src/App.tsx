import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getFullImageUrl } from './utils/imageUtils';
import { 
  Gamepad2, 
  ShoppingCart, 
  Send, 
  User, 
  Hash, 
  ShieldCheck, 
  Zap, 
  MessageSquare,
  Globe,
  Share2,
  ExternalLink,
  ArrowRight,
  ChevronRight,
  Image as ImageIcon,
  Upload,
  Info,
  Copy,
  Check,
  Package
} from 'lucide-react';

interface PaymentMethod {
  _id: string;
  name: string;
  accountName: string;
  phoneNumber: string;
  logo: string;
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
}

interface Product {
  _id: string;
  gameId: string;
  name: string;
  price: number;
  icon: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const App: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState<number | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [transactionScreenshot, setTransactionScreenshot] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [gameId, setGameId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [payRes, catRes, gamRes, prodRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/payment-methods`),
          axios.get(`${API_BASE_URL}/categories`),
          axios.get(`${API_BASE_URL}/games`),
          axios.get(`${API_BASE_URL}/products`)
        ]);
        setPaymentMethods((payRes.data || []).filter((pm: any) => pm.isActive !== false));
        setCategories(catRes.data);
        setGames(gamRes.data || []);
        setProducts(prodRes.data || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGame || !selectedPayment) return;
    setStatus('Submitting...');
    try {
      const response = await axios.post(`${API_BASE_URL}/orders`, {
        gameType: selectedGame.name,
        gameId,
        zoneId: selectedGame.name.toLowerCase().includes('legends') ? zoneId : undefined,
        amount: `${amount} (${price} MMK)`,
        paymentMethod: selectedPayment.name,
        transactionId,
        transactionScreenshot,
        customerInfo: {
          name: 'Web User'
        }
      });
      setStatus(`✅ Order created! ID: ${response.data.orderId}`);
      setTimeout(() => {
        setStatus(null);
        setGameId('');
        setZoneId('');
        setAmount('');
        setPrice(null);
        setSelectedGame(null);
        setSelectedPayment(null);
        setTransactionId('');
        setTransactionScreenshot(null);
      }, 5000);
    } catch (err) {
      setStatus('❌ Error creating order. Please try again.');
    }
  };

  const filteredGames = games.filter(g => g.categoryId === selectedCategory?._id || (typeof g.categoryId === 'object' && (g.categoryId as any)._id === selectedCategory?._id));
  const filteredProducts = products.filter(p => p.gameId === selectedGame?._id);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setTransactionScreenshot(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg text-white">
                <Gamepad2 size={24} />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                GameShop
              </span>
            </div>
            <div className="hidden md:flex space-x-8 text-sm font-medium">
              <a href="#" className="text-blue-600">Home</a>
              <a href="#games" className="text-slate-600 hover:text-blue-600 transition-colors">Games</a>
              <a href="#" className="text-slate-600 hover:text-blue-600 transition-colors">Support</a>
              <a href="#" className="text-slate-600 hover:text-blue-600 transition-colors">Contact</a>
            </div>
            <button className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-blue-700 transition-all shadow-sm">
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-6">
              <Zap size={16} /> Fast & Secure Top-up
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
              Level Up Your Game <br/>
              <span className="text-blue-600">Instantly.</span>
            </h1>
            <p className="text-lg text-slate-600 mb-8 max-w-lg">
              Get your Mobile Legends Diamonds and PUBG UC delivered in seconds. Safe, reliable, and the best prices in the market.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <a href="#games" className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                Start Shopping <ArrowRight size={20} />
              </a>
              <button className="bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
                Learn More
              </button>
            </div>
            <div className="mt-10 flex items-center gap-6 justify-center md:justify-start grayscale opacity-60">
              <div className="flex items-center gap-2"><ShieldCheck size={20}/> Secure Payment</div>
              <div className="flex items-center gap-2"><Zap size={20}/> Instant Delivery</div>
            </div>
          </div>
          <div className="flex-1 relative">
            <div className="absolute -top-10 -left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl"></div>
            <img 
              src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800" 
              alt="Gaming" 
              className="rounded-3xl shadow-2xl relative z-10 w-full object-cover aspect-video"
            />
          </div>
        </div>
      </header>

      {/* Category & Game Selection */}
      <section id="games" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Explore Our Services</h2>
            <p className="text-slate-600">Choose a category to find what you need.</p>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            {categories.map(cat => (
              <button
                key={cat._id}
                onClick={() => {
                  setSelectedCategory(cat);
                  setSelectedGame(null);
                }}
                className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all border-2 ${selectedCategory?._id === cat._id ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
          
          {selectedCategory && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 max-w-6xl mx-auto animate-in fade-in zoom-in-95 duration-300">
              {filteredGames.map((game) => (
                <div 
                  key={game._id}
                  onClick={() => {
                    setSelectedGame(game);
                    setAmount('');
                    setPrice(null);
                  }}
                  className={`group cursor-pointer bg-white rounded-3xl p-4 border-2 transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col items-center text-center ${selectedGame?._id === game._id ? 'border-blue-600 ring-4 ring-blue-50' : 'border-transparent'}`}
                >
                  <div className="w-20 h-20 mb-4 overflow-hidden rounded-2xl bg-slate-50 group-hover:scale-110 transition-transform duration-500">
                    {game.icon ? (
                      <img 
                        src={getFullImageUrl(game.icon)} 
                        className="w-full h-full object-cover" 
                        alt={game.name} 
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center');
                          (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-slate-500"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-gamepad-2"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="13" r="1"/><circle cx="18" cy="11" r="1"/><path d="M18 20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/></svg></div>';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <Gamepad2 size={32} />
                      </div>
                    )}
                  </div>
                  <h3 className="text-slate-900 font-bold text-sm">{game.name}</h3>
                  <div className="mt-3 flex items-center text-blue-600 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    View Offers <ChevronRight size={12} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Order Form Modal-like Section */}
      {selectedGame && (
        <section className="py-20 bg-white border-y border-slate-100 scroll-mt-20" id="order-form">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
              <div className="bg-blue-600 px-8 py-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                  {selectedGame.icon ? (
                    <img 
                      src={getFullImageUrl(selectedGame.icon)} 
                      className="w-12 h-12 rounded-xl border-2 border-white/20 bg-white/10 p-1" 
                      alt={selectedGame.name} 
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center');
                        (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-white/40"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-gamepad-2"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="13" r="1"/><circle cx="18" cy="11" r="1"/><path d="M18 20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/></svg></div>';
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl border-2 border-white/20 bg-white/10 flex items-center justify-center text-white/40">
                      <Gamepad2 size={24} />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold">{selectedGame.name}</h2>
                    <p className="text-blue-100 text-sm">{selectedGame.description || 'Fill details to place order'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedGame(null)}
                  className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
                >
                  Change
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <User size={16} className="text-blue-600" /> Player ID / Username
                    </label>
                    <input 
                      type="text" 
                      value={gameId} 
                      onChange={(e) => setGameId(e.target.value)}
                      placeholder="Enter ID"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none"
                      required
                    />
                  </div>

                  {selectedGame.name.toLowerCase().includes('legends') && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Hash size={16} className="text-blue-600" /> Zone ID
                      </label>
                      <input 
                        type="text" 
                        value={zoneId} 
                        onChange={(e) => setZoneId(e.target.value)}
                        placeholder="Enter Zone ID"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none"
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <ShoppingCart size={16} className="text-blue-600" /> Select Variation / Amount
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredProducts.map((p) => (
                      <div 
                        key={p._id}
                        onClick={() => {
                          setAmount(p.name);
                          setPrice(p.price);
                        }}
                        className={`cursor-pointer p-3 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center gap-2 ${amount === p.name ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md shadow-blue-100' : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-white'}`}
                      >
                        {p.icon ? (
                          <img 
                            src={getFullImageUrl(p.icon)} 
                            className="w-10 h-10 object-contain rounded-lg bg-white p-1" 
                            alt={p.name} 
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></div>';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center text-slate-400">
                            <Package size={20} />
                          </div>
                        )}
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold leading-tight">{p.name}</span>
                          <span className={`text-[10px] font-medium uppercase tracking-wider mt-1 ${amount === p.name ? 'text-blue-500' : 'text-slate-400'}`}>{p.price} MMK</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {filteredProducts.length === 0 && (
                    <p className="text-center py-4 text-slate-400 text-sm italic">No variations available for this selection yet.</p>
                  )}
                </div>

                {/* Payment Section */}
                <div className="space-y-6 pt-4 border-t border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800">Payment Information</h3>
                  
                  {selectedPayment && (
                    <div className="bg-blue-50 p-4 rounded-2xl space-y-2 border border-blue-100 animate-in fade-in slide-in-from-top-2">
                      <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                        <Info size={16} /> Merchant Details for {selectedPayment.name}:
                      </p>
                      <p className="text-sm text-blue-700">Account: <span className="font-bold">{selectedPayment.accountName}</span></p>
                      <div className="flex items-center justify-between bg-white/50 p-2 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-700">Phone: <span className="font-bold text-lg">{selectedPayment.phoneNumber}</span></p>
                        <button 
                          type="button"
                          onClick={() => copyToClipboard(selectedPayment.phoneNumber)}
                          className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-white px-2 py-1 rounded-md border border-blue-200 transition-all"
                        >
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-xs text-blue-600 mt-2 italic">* Please transfer the exact amount and upload screenshot.</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700">Choose Payment Method</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {paymentMethods.map((pm) => (
                        <div 
                          key={pm._id}
                          onClick={() => setSelectedPayment(pm)}
                          className={`cursor-pointer p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${selectedPayment?._id === pm._id ? 'border-blue-600 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
                        >
                          <img 
                            src={getFullImageUrl(pm.logo)} 
                            alt={pm.name} 
                            className="w-12 h-12 rounded-lg object-contain bg-white" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center');
                              (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-slate-500"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-credit-card"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" x2="22" y1="10"/></svg></div>';
                            }}
                          />
                          <span className="font-bold text-xs">{pm.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <User size={16} className="text-blue-600" /> Your Name / Account Name
                      </label>
                      <input 
                        type="text" 
                        value={transactionId} 
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <ImageIcon size={16} className="text-blue-600" /> Payment Screenshot
                      </label>
                      <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-all overflow-hidden">
                        {transactionScreenshot ? (
                          <img 
                            src={transactionScreenshot} 
                            className="w-full h-full object-cover" 
                            alt="Screenshot" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image-off"><line x1="2" y1="2" x2="22" y2="22"/><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"/><line x1="14.5" y1="15.8" x2="15" y2="15.5"/><path d="M21 21H6a2 2 0 0 1-2-2V5c0-.7.3-1.3.7-1.7"/><path d="m21 15-3.3-3.3c-.39-.39-1.03-.39-1.42 0L15 13"/><path d="m9 13-3 3"/></svg></div>';
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-slate-400">
                            <Upload size={24} />
                            <span className="text-xs font-medium">Click to upload image</span>
                          </div>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </label>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={!amount || !gameId || (selectedGame.name.toLowerCase().includes('legends') && !zoneId) || !selectedPayment || !transactionScreenshot || status === 'Submitting...'}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'Submitting...' ? (
                    <div className="flex items-center gap-2 animate-pulse">
                      Processing...
                    </div>
                  ) : (
                    <><Send size={20} /> Place Order Now</>
                  )}
                </button>
              </form>

              {status && (
                <div className={`mx-8 mb-8 p-4 rounded-xl text-center font-medium ${status.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                  {status}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why Choose Us?</h2>
            <p className="text-slate-600">We provide the best gaming services for players worldwide.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-orange-100 text-orange-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                <Zap size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Lightning Fast</h3>
              <p className="text-slate-600 leading-relaxed">Our automated system processes your top-up in seconds. No more waiting for manual processing.</p>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-green-100 text-green-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Safe & Secure</h3>
              <p className="text-slate-600 leading-relaxed">We use official channels and secure payment gateways to ensure your account remains safe.</p>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
              <div className="bg-blue-100 text-blue-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                <MessageSquare size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">24/7 Support</h3>
              <p className="text-slate-600 leading-relaxed">Our dedicated support team is available 24/7 to assist you with any questions or issues.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-blue-600 p-2 rounded-lg text-white">
                  <Gamepad2 size={24} />
                </div>
                <span className="text-xl font-bold text-white">GameShop</span>
              </div>
              <p className="max-w-xs mb-8">
                The most trusted gaming currency platform. Fast delivery, secure payments, and 24/7 support for all your gaming needs.
              </p>
              <div className="flex gap-4">
                <a href="#" className="hover:text-blue-500 transition-colors"><Globe size={20}/></a>
                <a href="#" className="hover:text-blue-500 transition-colors"><Share2 size={20}/></a>
                <a href="#" className="hover:text-blue-500 transition-colors"><ExternalLink size={20}/></a>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6">Quick Links</h4>
              <ul className="space-y-4 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Home</a></li>
                <li><a href="#games" className="hover:text-white transition-colors">Games</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Track Order</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6">Legal</h4>
              <ul className="space-y-4 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Refund Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-800 text-sm flex flex-col md:flex-row justify-between items-center gap-4 text-center">
            <p>© 2026 GameShop. All rights reserved.</p>
            <p>Made with ❤️ for Gamers</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
