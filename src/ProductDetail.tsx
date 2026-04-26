import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getFullImageUrl } from './utils/imageUtils';
import { 
  ShieldCheck, 
  Zap, 
  Gamepad,
  MessageSquare, 
  Copy, 
  Check, 
  ArrowLeft,
  Star,
  User,
  Hash,
  Mail,
  Upload,
  ShoppingCart,
  Clock,
  Gamepad2,
  Package
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface Game {
  _id: string;
  name: string;
  categoryId: any;
  icon: string;
  description?: string;
  benefits?: string[];
  purchaseInfo?: string[];
  inputConfig?: {
    label: string;
    placeholder: string;
    key: string;
    required: boolean;
  }[];
}

interface Review {
  _id: string;
  userName: string;
  userEmail: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface Product {
  _id: string;
  gameId: string;
  name: string;
  price: number;
  icon: string;
  isActive?: boolean;
}

interface PaymentMethod {
  _id: string;
  name: string;
  accountName: string;
  phoneNumber: string;
  logo: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Create axios instance with timeout
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000 // 30 second timeout
});

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [transactionScreenshot, setTransactionScreenshot] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [mmpayQR, setMmpayQR] = useState<string | null>(null);
  const [pollingOrderId, setPollingOrderId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    const autoGenerateMMQR = async () => {
      // Check if all inputs are filled
      const allInputsFilled = Object.keys(inputValues).length > 0 && 
                              Object.values(inputValues).every(v => v.trim() !== '');

      if (
        selectedPayment?.name?.toUpperCase() === 'MMQR' && 
        selectedProduct && 
        allInputsFilled && 
        customerName && 
        !mmpayQR && 
        !isGeneratingQR &&
        !pollingOrderId &&
        !isPaid
      ) {
        setIsGeneratingQR(true);
        setStatus('Generating QR Code...');
        
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;

        try {
          const response = await api.post(`/orders`, {
            gameType: game?.name,
            gameId: game?._id, // Use game._id directly
            productId: selectedProduct._id,
            amount: `${selectedProduct.name} (${selectedProduct.price} MMK)`,
            paymentMethod: selectedPayment.name,
            transactionId: inputValues.gameId || customerName,
            transactionScreenshot: undefined,
            customerInfo: { 
              name: user ? user.name : 'Web User',
              userId: user ? user.id : undefined
            }
          });
          
          const orderId = response.data.orderId;
          console.log('Auto-Generating QR for Order:', orderId);
          await handleMMPay(orderId, selectedProduct.price, `${game?.name} - ${selectedProduct.name}`);
          setStatus('QR Code generated. Please scan and pay.');
          setPollingOrderId(orderId);
        } catch (err) {
          console.error('Auto-generation failed:', err);
          setStatus('❌ Error generating QR. Please try again.');
        } finally {
          setIsGeneratingQR(false);
        }
      }
    };

    autoGenerateMMQR();
  }, [selectedPayment, selectedProduct, inputValues, customerName, mmpayQR, isGeneratingQR, pollingOrderId, game]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewForm, setReviewForm] = useState({ userName: '', userEmail: '', rating: 5, comment: '' });
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let interval: any;
    if (pollingOrderId) {
      interval = setInterval(async () => {
        try {
          const res = await api.get(`/orders/${pollingOrderId}/status`);
          console.log('Polling Status for:', pollingOrderId, res.data);
          
          if (res.data.paymentStatus === 'paid') {
            setStatus(`✅ Payment successful! Order ID: ${pollingOrderId}`);
            setMmpayQR(null);
            setPollingOrderId(null);
            setIsPaid(true);
            clearInterval(interval);
            
            // Optional: Clear form after success
            setTimeout(() => {
              setStatus(null);
              setInputValues({});
              setCustomerName('');
              setSelectedPayment(null);
              setIsPaid(false);
            }, 5000);
          } else {
            setStatus('⌛ Awaiting payment... Please scan the QR code.');
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 3000); // Poll every 3 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pollingOrderId]);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));

    const fetchData = async () => {
      try {
        const res = await api.get(`/games/${id}?full=true`);
        setGame(res.data.game);
        setProducts(res.data.products || []);
        setPaymentMethods((res.data.paymentMethods || []).filter((pm: any) => pm.isActive !== false));
        setReviews(res.data.reviews || []);
      } catch (err) {
        console.error('Error fetching game details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handlePostReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewStatus('Posting...');
    try {
      await api.post(`/reviews`, { ...reviewForm, gameId: id });
      setReviewStatus('✅ Review posted!');
      setReviewForm({ userName: '', userEmail: '', rating: 5, comment: '' });
      // Refresh reviews
      const revRes = await api.get(`/reviews/${id}`);
      setReviews(revRes.data);
    } catch (err) {
      setReviewStatus('❌ Error posting review.');
    }
  };

  const handleMMPay = async (orderId: string, amount: number, productName: string) => {
    try {
      console.log('Sending request to /payments/mmpay/create-qr with:', { orderId, amount, productName });
      const res = await api.post('/payments/mmpay/create-qr', {
        orderId,
        amount,
        items: [{ name: productName, amount, quantity: 1 }]
      });
      console.log('MMPay API Response:', res.data);
      if (res.data && res.data.qrCode) {
        setMmpayQR(res.data.qrCode);
      } else {
        console.error('No qrCode in response:', res.data);
      }
    } catch (err) {
      console.error('Failed to create MMQR:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!game || !selectedProduct || !selectedPayment) return;
    setStatus('Submitting...');
    
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    try {
      const response = await api.post(`/orders`, {
        gameType: game.name,
        gameId: game._id, // Use game._id directly
        productId: selectedProduct._id,
        zoneId: inputValues.zoneId,
        amount: `${selectedProduct.name} (${selectedProduct.price} MMK)`,
        paymentMethod: selectedPayment.name,
        transactionId: inputValues.gameId || customerName,
        transactionScreenshot: selectedPayment.name?.toUpperCase() === 'MMQR' ? undefined : transactionScreenshot,
        customerInfo: { 
          name: user ? user.name : 'Web User',
          userId: user ? user.id : undefined
        }
      });

      const orderId = response.data.orderId;
      
      if (selectedPayment.name?.toUpperCase() === 'MMQR') {
        setStatus('Generating QR Code...');
        console.log('Generating QR for Order:', orderId);
        await handleMMPay(orderId, selectedProduct.price, `${game.name} - ${selectedProduct.name}`);
        setStatus('QR Code generated. Please scan and pay.');
        setPollingOrderId(orderId); // Start polling
      } else {
        setStatus(`✅ Order created! ID: ${orderId}`);
        setTimeout(() => {
          setStatus(null);
          setInputValues({});
          setCustomerName('');
          setTransactionScreenshot(null);
          setSelectedPayment(null);
        }, 5000);
      }
    } catch (err) {
      setStatus('❌ Error creating order. Please try again.');
    }
  };

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

  if (loading) return <div className="min-h-screen bg-[#0a0f18] text-white flex items-center justify-center">Loading...</div>;
  if (!game) return <div className="min-h-screen bg-[#0a0f18] text-white flex items-center justify-center">Game not found.</div>;

  return (
    <div className="min-h-screen bg-[#0a0f18] text-slate-300 font-sans pb-32 lg:pb-20">
      {/* Navigation */}
      <nav className="bg-[#121926] border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between gap-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors flex-shrink-0">
            <ArrowLeft size={20} /> <span className="hidden sm:inline text-sm font-bold">Back to Catalog</span>
          </button>
          
          <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="bg-black p-1 rounded-lg text-white shadow-lg shadow-black/20">
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
            <span className="text-sm md:text-lg font-bold text-white uppercase tracking-tighter">Blasky Game Shop</span>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {user ? (
              <div className="flex items-center gap-2 md:gap-3">
                <button 
                  onClick={() => navigate('/history')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest"
                >
                  <Clock size={14} /> <span className="hidden sm:inline">History</span>
                </button>
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-[10px] md:text-xs uppercase">
                  {user.name[0]}
                </div>
              </div>
            ) : (
              <button 
                onClick={() => navigate('/auth')}
                className="px-3 md:px-4 py-1.5 rounded-lg bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 pt-6 lg:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6 lg:gap-8">
          
          {/* Main Content */}
          <div className="space-y-6 lg:space-y-8 order-1 lg:order-1">
            {/* Header Section */}
            <div className="bg-[#121926] rounded-2xl lg:rounded-3xl p-6 lg:p-8 border border-slate-800 shadow-xl">
              <div className="flex flex-col sm:flex-row gap-6 lg:gap-8 items-center sm:items-start text-center sm:text-left">
                <div className="w-24 h-24 lg:w-64 lg:h-64 aspect-square rounded-xl lg:rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 shadow-2xl flex-shrink-0">
                  {game.icon ? (
                    <img 
                      src={getFullImageUrl(game.icon)} 
                      className="w-full h-full object-cover" 
                      alt={game.name} 
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center');
                        (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-slate-500"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-gamepad-2"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="13" r="1"/><circle cx="18" cy="11" r="1"/><path d="M18 20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/></svg></div>';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                      <Gamepad2 size={64} />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3 lg:space-y-4">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                    <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] lg:text-xs font-bold uppercase tracking-wider border border-blue-500/20">
                      {game.categoryId?.name || 'Category'}
                    </span>
                    <div className="flex items-center gap-1 text-yellow-500 scale-90 lg:scale-100">
                      <Zap size={16} fill="currentColor" className="text-blue-400" />
                      <span className="text-blue-400 text-xs lg:text-sm font-bold uppercase tracking-widest ml-1">Top-up Service</span>
                    </div>
                  </div>
                  <h1 className="text-2xl lg:text-4xl font-black text-white leading-tight uppercase tracking-tight">
                    {game.name}
                  </h1>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-4 lg:gap-6 text-xs lg:text-sm text-slate-400 font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-blue-400" />
                      <span>Instant Delivery</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-green-400" />
                      <span>Verified Seller</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Variation Selection Section */}
            <div className="bg-[#121926] rounded-2xl lg:rounded-3xl p-6 lg:p-8 border border-slate-800 shadow-xl space-y-4 lg:space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600/20 p-1.5 rounded-lg text-blue-400">
                  <ShoppingCart size={18} />
                </div>
                <h2 className="text-sm lg:text-xl font-bold text-white uppercase tracking-widest">Select Variation</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                {products.map((p: any) => (
                  <button
                    key={p._id}
                    onClick={() => p.isActive !== false && setSelectedProduct(selectedProduct?._id === p._id ? null : p)}
                    disabled={p.isActive === false}
                    className={`group relative flex flex-col justify-between p-4 lg:p-5 rounded-xl lg:rounded-2xl border-2 transition-all text-left ${
                      selectedProduct?._id === p._id 
                        ? 'border-blue-600 bg-blue-600/10' 
                        : p.isActive !== false 
                          ? 'border-slate-800 bg-slate-900/50 hover:border-slate-700' 
                          : 'border-slate-800/50 bg-slate-900/20 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {p.icon ? (
                        <div className={`w-10 h-10 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 flex-shrink-0 ${p.isActive === false ? 'grayscale' : ''}`}>
                          <img 
                            src={getFullImageUrl(p.icon)} 
                            className="w-full h-full object-cover" 
                            alt={p.name} 
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center');
                              (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-slate-500"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></div>';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 flex-shrink-0">
                          <Package size={20} />
                        </div>
                      )}
                      <div className="space-y-1">
                        <span className={`block font-bold text-sm lg:text-base transition-colors ${
                          selectedProduct?._id === p._id 
                            ? 'text-white' 
                            : p.isActive !== false 
                              ? 'text-slate-400 group-hover:text-slate-300' 
                              : 'text-slate-600'
                        }`}>
                          {p.name}
                        </span>
                        {p.isActive === false && (
                          <span className="inline-block px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-500 text-[8px] font-black uppercase tracking-widest border border-red-500/20">
                            OutOfStock
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className={`text-base lg:text-lg font-black ${
                        selectedProduct?._id === p._id 
                          ? 'text-blue-400' 
                          : p.isActive !== false 
                            ? 'text-slate-500' 
                            : 'text-slate-700'
                      }`}>
                        {p.price} <span className="text-[10px] font-bold uppercase">MMK</span>
                      </span>
                      {selectedProduct?._id === p._id && (
                        <div className="bg-blue-600 rounded-full p-1 animate-in zoom-in duration-300">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tabs Section */}
            <div className="bg-[#121926] rounded-2xl lg:rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="flex border-b border-slate-800 overflow-x-auto no-scrollbar">
                <button 
                  onClick={() => setActiveTab('details')}
                  className={`px-6 lg:px-8 py-3 lg:py-4 font-bold text-xs lg:text-sm whitespace-nowrap transition-all ${activeTab === 'details' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Description
                </button>
                <button 
                  onClick={() => setActiveTab('reviews')}
                  className={`px-6 lg:px-8 py-3 lg:py-4 font-bold text-xs lg:text-sm whitespace-nowrap transition-all ${activeTab === 'reviews' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Reviews ({reviews.length})
                </button>
              </div>

              <div className="p-6 lg:p-8">
                {activeTab === 'details' && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="space-y-4">
                      <h3 className="text-lg lg:text-xl font-bold text-white uppercase tracking-widest">Product description</h3>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {game.benefits?.map((benefit, i) => (
                          <div key={i} className="flex items-start gap-3 text-xs lg:text-sm font-medium">
                            <div className="mt-0.5 bg-green-500/20 p-0.5 rounded text-green-500">
                              <Check size={12} />
                            </div>
                            <p>{benefit}</p>
                          </div>
                        ))}
                        {(!game.benefits || game.benefits.length === 0) && (
                          <>
                            <div className="flex items-start gap-3 text-xs lg:text-sm font-medium">
                              <div className="mt-0.5 bg-green-500/20 p-0.5 rounded text-green-500">
                                <Check size={12} />
                              </div>
                              <p>Full access and 100% guarantee</p>
                            </div>
                            <div className="flex items-start gap-3 text-xs lg:text-sm font-medium">
                              <div className="mt-0.5 bg-green-500/20 p-0.5 rounded text-green-500">
                                <Check size={12} />
                              </div>
                              <p>Instant delivery after payment</p>
                            </div>
                            <div className="flex items-start gap-3 text-xs lg:text-sm font-medium">
                              <div className="mt-0.5 bg-green-500/20 p-0.5 rounded text-green-500">
                                <Check size={12} />
                              </div>
                              <p>Secure payment methods only</p>
                            </div>
                            <div className="flex items-start gap-3 text-xs lg:text-sm font-medium">
                              <div className="mt-0.5 bg-green-500/20 p-0.5 rounded text-green-500">
                                <Check size={12} />
                              </div>
                              <p>24/7 Support available</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="prose prose-invert max-w-none text-slate-400 leading-relaxed whitespace-pre-wrap text-sm lg:text-base">
                      {game.description || 'No detailed description provided for this product.'}
                    </div>

                    {/* Steam Offline Activation Guide */}
                    {((typeof game.categoryId === 'object' && game.categoryId?.name?.toLowerCase().includes('steam')) || 
                      (typeof game.categoryId === 'string' && game.categoryId.toLowerCase().includes('steam'))) && (
                      <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2 uppercase tracking-widest">
                              <Gamepad size={24} className="text-blue-400" />
                              Steam Offline Activation Guide
                            </h3>
                            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-tighter border border-blue-500/30">
                              JambaStore Official Guide
                            </span>
                          </div>
                          
                          <div className="mb-6 p-4 rounded-xl bg-slate-900/40 border border-slate-800/50">
                            <p className="text-slate-400 text-sm leading-relaxed">
                              This product is a <span className="text-blue-400 font-bold">Steam Offline Activation</span> key. 
                              It allows you to play the full game at a fraction of the cost. 
                              Your progress is saved locally and remains private to you.
                            </p>
                          </div>

                          <div className="space-y-4 text-sm lg:text-base">
                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 group hover:border-blue-500/30 transition-colors">
                              <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-400 text-slate-900 text-xs font-black">1</span>
                                LOGIN TO ACCOUNT
                              </h4>
                              <p className="text-slate-300 ml-8">Open Steam and login using the provided <span className="text-white font-medium">Username & Password</span>. If Steam is already open, log out of your personal account first.</p>
                            </div>

                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 group hover:border-blue-500/30 transition-colors">
                              <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-400 text-slate-900 text-xs font-black">2</span>
                                DOWNLOAD THE GAME
                              </h4>
                              <p className="text-slate-300 ml-8">Go to your <span className="text-white font-medium">Library</span>, find your game, and start the download. Ensure it reaches <span className="text-blue-400 font-bold">100% completion</span> before proceeding.</p>
                            </div>

                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 group hover:border-blue-500/30 transition-colors">
                              <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-400 text-slate-900 text-xs font-black">3</span>
                                FIRST LAUNCH (ONLINE)
                              </h4>
                              <p className="text-slate-300 ml-8">Launch the game once while <span className="text-green-400 font-bold">ONLINE</span> to activate the license. Once you reach the main menu, exit the game immediately.</p>
                            </div>

                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 group hover:border-blue-500/30 transition-colors">
                              <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-400 text-slate-900 text-xs font-black">4</span>
                                DISABLE STEAM CLOUD
                              </h4>
                              <p className="text-slate-300 ml-8">Right-click the game in Library → <span className="text-white font-medium">Properties</span> → <span className="text-white font-medium">General</span> → Toggle <span className="text-red-400 font-bold">OFF</span> "Steam Cloud" to keep your saves local.</p>
                            </div>

                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 group hover:border-blue-500/30 transition-colors">
                              <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-400 text-slate-900 text-xs font-black">5</span>
                                SWITCH TO OFFLINE MODE
                              </h4>
                              <p className="text-slate-300 ml-8">In Steam, click "Steam" (top left) → <span className="text-white font-medium">Go Offline...</span> → <span className="text-blue-400 font-bold">Restart in Offline Mode</span>. You are now ready to play!</p>
                            </div>

                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                              <p className="text-red-500 text-xs font-black flex items-center gap-2 uppercase tracking-widest">
                                <Zap size={14} /> Critical Rules - Must Follow:
                              </p>
                              <ul className="mt-3 space-y-2 text-xs text-slate-400 list-disc ml-5">
                                <li><span className="text-red-400 font-bold">DO NOT</span> change account details (Password, Email, or Profile).</li>
                                <li><span className="text-red-400 font-bold">DO NOT</span> enable Steam Guard or Mobile Authenticator.</li>
                                <li><span className="text-red-400 font-bold">ALWAYS</span> stay in "Offline Mode" when playing the game.</li>
                                <li>Avoid updating the game unless absolutely necessary.</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-5 lg:p-6 rounded-xl lg:rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-3">
                      <h4 className="text-white font-bold flex items-center gap-2 text-sm lg:text-base uppercase tracking-widest">
                        <Zap size={18} className="text-blue-400" />
                        After purchase you will receive:
                      </h4>
                      <ul className="space-y-2 text-xs lg:text-sm font-medium">
                        {game.purchaseInfo?.map((info, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <Check size={12} className="text-blue-400" />
                            {info}
                          </li>
                        ))}
                        {(!game.purchaseInfo || game.purchaseInfo.length === 0) && (
                          <>
                            <li className="flex items-center gap-2">
                              <Check size={12} className="text-blue-400" />
                              Detailed instructions for activation
                            </li>
                            <li className="flex items-center gap-2">
                              <Check size={12} className="text-blue-400" />
                              Login credentials or license key
                            </li>
                            <li className="flex items-center gap-2">
                              <Check size={12} className="text-blue-400" />
                              Customer support for any issues
                            </li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    {/* Review Form */}
                    <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 space-y-4">
                      <h4 className="text-sm font-bold text-white uppercase tracking-widest">Write a Review</h4>
                      <form onSubmit={handlePostReview} className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <input 
                            type="text" 
                            placeholder="Your Name"
                            value={reviewForm.userName}
                            onChange={(e) => setReviewForm({ ...reviewForm, userName: e.target.value })}
                            className="w-full px-4 py-2 bg-[#0a0f18] border border-slate-800 rounded-lg outline-none focus:border-blue-500 text-sm"
                            required
                          />
                          <input 
                            type="email" 
                            placeholder="Your Email"
                            value={reviewForm.userEmail}
                            onChange={(e) => setReviewForm({ ...reviewForm, userEmail: e.target.value })}
                            className="w-full px-4 py-2 bg-[#0a0f18] border border-slate-800 rounded-lg outline-none focus:border-blue-500 text-sm"
                            required
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rating:</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button 
                                key={star} 
                                type="button" 
                                onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                                className="text-yellow-500"
                              >
                                <Star size={20} fill={star <= reviewForm.rating ? 'currentColor' : 'none'} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <textarea 
                          placeholder="Your review comment..."
                          value={reviewForm.comment}
                          onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                          className="w-full px-4 py-3 bg-[#0a0f18] border border-slate-800 rounded-lg outline-none focus:border-blue-500 text-sm h-24 resize-none"
                          required
                        />
                        <button 
                          type="submit" 
                          disabled={reviewStatus === 'Posting...'}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-500 transition-all disabled:opacity-50"
                        >
                          {reviewStatus || 'Post Review'}
                        </button>
                      </form>
                    </div>

                    {/* Reviews List */}
                    <div className="space-y-4">
                      {reviews.length > 0 ? (
                        reviews.map((review) => (
                          <div key={review._id} className="p-6 rounded-2xl bg-[#121926] border border-slate-800 space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-400 font-bold uppercase">
                                  {review.userName[0]}
                                </div>
                                <div>
                                  <h5 className="font-bold text-white text-sm">{review.userName}</h5>
                                  <div className="flex items-center gap-1 text-yellow-500">
                                    {[...Array(5)].map((_, i) => (
                                      <Star key={i} size={10} fill={i < review.rating ? 'currentColor' : 'none'} />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] text-slate-500 font-bold uppercase">{new Date(review.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed italic">"{review.comment}"</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <MessageSquare size={32} className="mx-auto text-slate-700 mb-2" />
                          <p className="text-slate-500 text-sm italic">No reviews yet. Be the first to review!</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 order-2 lg:order-2">
            {/* Purchase Card */}
            <div id="purchase-form" className="bg-[#121926] rounded-2xl lg:rounded-3xl p-6 border border-slate-800 shadow-2xl lg:sticky lg:top-24">
              <div className="mb-6 text-center lg:text-left">
                <div className="flex items-baseline justify-center lg:justify-start gap-2">
                  <span className="text-3xl lg:text-4xl font-black text-white tracking-tighter">
                    {selectedProduct ? selectedProduct.price : '---'}
                  </span>
                  <span className="text-slate-500 font-bold uppercase tracking-widest text-xs lg:text-sm">MMK</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  {(game.inputConfig && game.inputConfig.length > 0) ? (
                    game.inputConfig.map((config) => (
                      <div key={config.key} className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{config.label}</label>
                        <div className="relative group">
                          {config.key.toLowerCase().includes('id') ? (
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={16} />
                          ) : config.key.toLowerCase().includes('email') ? (
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={16} />
                          ) : (
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={16} />
                          )}
                          <input 
                            type="text" 
                            value={inputValues[config.key] || ''} 
                            onChange={(e) => setInputValues({ ...inputValues, [config.key]: e.target.value })}
                            placeholder={config.placeholder}
                            className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-white text-sm placeholder:text-slate-600"
                            required={config.required}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Game ID</label>
                        <div className="relative group">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={16} />
                          <input 
                            type="text" 
                            value={inputValues['gameId'] || ''} 
                            onChange={(e) => setInputValues({ ...inputValues, gameId: e.target.value })}
                            placeholder="Enter Game ID"
                            className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-white text-sm placeholder:text-slate-600"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Zone ID</label>
                        <div className="relative group">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={16} />
                          <input 
                            type="text" 
                            value={inputValues['zoneId'] || ''} 
                            onChange={(e) => setInputValues({ ...inputValues, zoneId: e.target.value })}
                            placeholder="Zone ID (Optional)"
                            className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-white text-sm placeholder:text-slate-600"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.map((pm) => (
                      <button
                        key={pm._id}
                        type="button"
                        onClick={() => {
                          setSelectedPayment(pm);
                          if (pm.name?.toUpperCase() === 'MMQR') {
                            setMmpayQR(null);
                            setPollingOrderId(null);
                          }
                        }}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${selectedPayment?._id === pm._id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'}`}
                      >
                        <img 
                          src={getFullImageUrl(pm.logo)} 
                          className="h-6 lg:h-8 object-contain" 
                          alt={pm.name} 
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center');
                            (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-slate-500"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-credit-card"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" x2="22" y1="10"/></svg></div>';
                          }}
                        />
                        <span className={`text-[9px] lg:text-[10px] font-bold uppercase tracking-wider ${selectedPayment?._id === pm._id ? 'text-blue-400' : 'text-slate-500'}`}>{pm.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedPayment && selectedPayment.name?.toUpperCase() === 'MMQR' && !isPaid && (
                  <div className="space-y-4">
                    {!mmpayQR && (
                      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-center animate-pulse">
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                          {!selectedProduct || Object.keys(inputValues).length === 0 || !customerName 
                            ? 'Please complete form to show QR' 
                            : 'Generating QR Code...'}
                        </p>
                      </div>
                    )}
                    
                    {mmpayQR && (
                      <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 animate-in zoom-in duration-300">
                        <div className="text-center space-y-1">
                          <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Scan to Pay</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Dynamic MMQR Code</p>
                        </div>
                        <div className="aspect-square w-full max-w-[200px] mx-auto bg-white rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center p-2">
                          <QRCodeSVG value={mmpayQR} size={200} />
                        </div>
                        {pollingOrderId && (
                          <button 
                            type="button"
                            onClick={async () => {
                              try {
                                await api.post('/payments/mmpay/simulate-success', { orderId: pollingOrderId });
                              } catch (err) {
                                console.error('Simulation failed:', err);
                              }
                            }}
                            className="w-full py-2 bg-yellow-500/10 text-yellow-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500/20 transition-all border border-yellow-500/20"
                          >
                            🧪 Simulate Payment (Sandbox Only)
                          </button>
                        )}
                        <div className="text-center">
                          <p className="text-lg font-black text-slate-900">{selectedProduct?.price} MMK</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Automatic verification active</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            setMmpayQR(null);
                            setStatus(null);
                            setSelectedPayment(null);
                            setInputValues({});
                            setCustomerName('');
                          }}
                          className="w-full py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                          Cancel / Reset
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {selectedPayment && selectedPayment.name !== 'MMQR' && (
                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Transfer Details</p>
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-[9px] font-black text-blue-400 uppercase tracking-widest">Secure</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase">{selectedPayment.accountName}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-black text-white tracking-tighter">{selectedPayment.phoneNumber}</p>
                        <button 
                          type="button"
                          onClick={() => copyToClipboard(selectedPayment.phoneNumber)}
                          className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                        >
                          {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {selectedPayment && selectedPayment.name !== 'MMQR' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Payment Proof</label>
                    <label className="flex items-center justify-center w-full h-32 lg:h-40 border-2 border-dashed border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-900/50 transition-all overflow-hidden relative group">
                      {transactionScreenshot ? (
                        <div className="w-full h-full relative">
                          <img 
                            src={transactionScreenshot} 
                            className="w-full h-full object-cover" 
                            alt="Proof" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image-off"><line x1="2" y1="2" x2="22" y2="22"/><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"/><line x1="14.5" y1="15.8" x2="15" y2="15.5"/><path d="M21 21H6a2 2 0 0 1-2-2V5c0-.7.3-1.3.7-1.7"/><path d="m21 15-3.3-3.3c-.39-.39-1.03-.39-1.42 0L15 13"/><path d="m9 13-3 3"/></svg></div>';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-[10px] font-bold uppercase tracking-widest">Change Image</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-slate-500 group-hover:text-slate-400 transition-colors">
                          <div className="bg-slate-800 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                            <Upload size={24} />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-widest">Upload Screenshot</span>
                        </div>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{selectedPayment?.name === 'MMQR' ? 'WhatsApp/Telegram Name' : 'Your Name'}</label>
                  <input 
                    type="text" 
                    value={customerName} 
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-white text-sm placeholder:text-slate-600"
                    required
                  />
                </div>

                {selectedPayment && selectedPayment.name?.toUpperCase() !== 'MMQR' && (
                  <button 
                    type="submit" 
                    disabled={!selectedProduct || !selectedPayment || !transactionScreenshot || status === 'Submitting...'}
                    className="w-full flex items-center justify-center gap-3 py-4 lg:py-5 bg-blue-600 text-white rounded-2xl lg:rounded-3xl font-black text-xs lg:text-sm uppercase tracking-widest hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <ShoppingCart size={18} />
                    <span>Buy Now - {selectedProduct ? `${selectedProduct.price} MMK` : '...'}</span>
                  </button>
                )}
              </form>

              {status && (
                <div className={`mt-4 p-4 rounded-xl text-[10px] font-bold text-center uppercase tracking-widest ${status.includes('✅') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                  {status}
                </div>
              )}

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <ShieldCheck size={14} className="text-green-500" />
                  Secure deal
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <Zap size={14} className="text-blue-500" />
                  Instant delivery
                </div>
              </div>
            </div>

            {/* Guaranteed Section */}
            <div className="bg-[#121926] rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
              <h5 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Our Guarantee</h5>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <ShieldCheck size="14" className="text-green-500" />
                  100% Safe Payment
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <Zap size="14" className="text-blue-500" />
                  Instant delivery
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Button */}
      <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40">
        <button 
          onClick={() => document.getElementById('purchase-form')?.scrollIntoView({ behavior: 'smooth' })}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-blue-900/50 flex items-center justify-center gap-3 active:scale-95 transition-all"
        >
          <ShoppingCart size={18} />
          <span>Buy Now - {selectedProduct ? selectedProduct.price : '...'} MMK</span>
        </button>
      </div>
    </div>
  );
};

export default ProductDetail;
