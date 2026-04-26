import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getFullImageUrl } from './utils/imageUtils';
import { 
  CheckCircle, 
  XCircle, 
  RefreshCcw, 
  Package, 
  CreditCard,
  User,
  Gamepad2,
  Upload,
  Image as ImageIcon,
  LayoutDashboard,
  Settings,
  ShoppingBag,
  Trash2,
  Plus,
  Coins,
  Layers,
  Gamepad,
  MessageSquare,
  Star,
  Cpu,
  Activity,
  Zap,
  Key,
  FileText,
  Megaphone,
  Check,
  Pencil,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

interface Order {
  _id: string;
  gameType: string;
  gameId: string | { _id: string; name: string };
  zoneId?: string;
  amount: string;
  paymentMethod: string;
  transactionId?: string;
  transactionScreenshot?: string;
  hasScreenshot?: boolean;
  paymentStatus: 'pending' | 'paid' | 'rejected';
  orderStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected';
  customerInfo?: {
    name?: string;
    email?: string;
    telegramId?: string;
  };
  createdAt: string;
}

interface PaymentMethod {
  _id: string;
  name: string;
  accountName: string;
  phoneNumber: string;
  logo: string;
  isActive?: boolean;
}

interface Category {
  _id: string;
  name: string;
  type?: string;
}

interface Game {
  _id: string;
  name: string;
  categoryId: Category | string;
  icon: string;
  description?: string;
  benefits?: string[];
  purchaseInfo?: string[];
  trailerUrl?: string;
  soldCount?: number;
  isActive?: boolean;
  systemRequirements?: {
    os: string;
    processor: string;
    memory: string;
    graphics: string;
    storage: string;
  };
  inputConfig?: {
    label: string;
    placeholder: string;
    key: string;
    required: boolean;
  }[];
  platiUrls?: string[];
}

interface Review {
  _id: string;
  gameId: Game | string;
  userName: string;
  userEmail: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface Product {
  _id: string;
  gameId: { _id: string; name: string } | string;
  name: string;
  price: number;
  icon: string;
  isActive?: boolean;
  platiUrls?: string[];
  isDigital?: boolean;
}

interface DigitalKey {
  _id: string;
  gameId: { _id: string; name: string } | string;
  key: string;
  isUsed: boolean;
  orderId?: string;
  createdAt: string;
}

interface ProductGuide {
  _id: string;
  gameId: { _id: string; name: string } | string;
  description: string;
  setupGuide: string;
  additionalInfo: string;
}

interface UserAccount {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}

interface Promotion {
  _id: string;
  title: string;
  description: string;
  image: string;
  link?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Create axios instance with timeout to prevent hanging requests
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000 // 30 second timeout
});

// Add a request interceptor to include the auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add a response interceptor to handle unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Unauthorized access - redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Use window.location for hard redirect as we are outside of React component
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

const INITIAL_GAME_STATE = { 
  name: '', 
  categoryId: '', 
  icon: '', 
  description: '',
  benefits: '',
  purchaseInfo: '',
  trailerUrl: '',
  isActive: true,
  soldCount: 0,
  systemRequirements: {
    os: '',
    processor: '',
    memory: '',
    graphics: '',
    storage: ''
  },
  inputConfig: [] as { label: string; placeholder: string; key: string; required: boolean; }[]
};

const AdminPanel = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [digitalKeys, setDigitalKeys] = useState<DigitalKey[]>([]);
  const [productGuides, setProductGuides] = useState<ProductGuide[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showScreenshot, setShowScreenshot] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'payments' | 'categories' | 'games' | 'products' | 'reviews' | 'ai' | 'keys' | 'users' | 'admins' | 'promotions' | 'plati'>('orders');

  const [editingPlatiGame, setEditingPlatiGame] = useState<Game | null>(null);
  const [platiGameId, setPlatiGameId] = useState('');
  const [platiUrlsText, setPlatiUrlsText] = useState('');

  const [newKey, setNewKey] = useState({ gameId: '', key: '' });
  const [newGuide, setNewGuide] = useState({ gameId: '', description: '', setupGuide: '', additionalInfo: '' });
  const [newPromotion, setNewPromotion] = useState({ title: '', description: '', image: '', link: '', isActive: true });
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  
  // User/Admin State
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [admins, setAdmins] = useState<UserAccount[]>([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' as 'user' | 'admin' });
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // AI State
  const [aiApiKey, setAiApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [aiIsRunning, setAiIsRunning] = useState(false);
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Games Pagination & Search State
  const [gameSearch, setGameSearch] = useState('');
  const [gamePage, setGamePage] = useState(1);

  // Orders Pagination & Search State
  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersPage, setOrdersPage] = useState(1);
  const ordersPerPage = 10;

  // Products Pagination & Search State
  const [productsSearch, setProductsSearch] = useState('');
  const [productsPage, setProductsPage] = useState(1);
  const productsPerPage = 10;

  // Plati Pagination & Search State
  const [platiSearch, setPlatiSearch] = useState('');
  const [platiPage, setPlatiPage] = useState(1);
  const platiPerPage = 10;

  const [tabLoading, setTabLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Forms State
  const [newCategory, setNewCategory] = useState({ name: '', type: 'top-up' });
  const [newGame, setNewGame] = useState(INITIAL_GAME_STATE);
  const [newProduct, setNewProduct] = useState({ gameId: '', name: '', price: 0, icon: '', isActive: true });
  const [newPM, setNewPM] = useState({ name: '', accountName: '', phoneNumber: '', logo: '', isActive: true });

  useEffect(() => {
    if (activeTab === 'users' || activeTab === 'admins') {
      setNewUser({ 
        name: '', 
        email: '', 
        password: '', 
        role: activeTab === 'admins' ? 'admin' : 'user' 
      });
      setEditingUser(null);
    }
  }, [activeTab]);

  const isFetchingCoreRef = useRef(false);
  const isFetchingTabRef = useRef(false);

  const fetchCoreData = async () => {
    if (isFetchingCoreRef.current) return;
    isFetchingCoreRef.current = true;
    try {
      console.log('Fetching core data (categories/games)...');
      const cat = await api.get('/categories?all=true');
      setCategories(cat.data);
      localStorage.setItem('catalog_categories', JSON.stringify(cat.data));

      // Fetch games without icons initially to save bandwidth/prevent timeouts
      const gam = await api.get('/games?all=true&light=true&skipPrice=true');
      setGames(gam.data);
      localStorage.setItem('catalog_games', JSON.stringify(gam.data));

      // Fetch products without icons initially
      const prod = await api.get('/products?all=true&light=true');
      setProducts(prod.data);
    } catch (err) {
      console.warn('Core data fetch failed:', err);
    } finally {
      isFetchingCoreRef.current = false;
    }
  };

  const fetchTabData = async (isInitial = false) => {
    // Skip polling if we are on tabs that are already handled by fetchCoreData
    // and don't need additional polling (categories)
    if (activeTab === 'categories') {
      return;
    }

    if (isFetchingTabRef.current) {
      console.log('Already fetching tab data, skipping poll...');
      return;
    }
    
    if (isInitial) {
      setTabLoading(true);
      setFetchError(null);
    }

    isFetchingTabRef.current = true;
    try {
      console.log(`Polling data for tab: ${activeTab} (Initial: ${isInitial})`);
      if (activeTab === 'orders') {
        const res = await api.get('/orders');
        let ordersData = [];
        if (Array.isArray(res.data)) {
          ordersData = res.data;
        } else if (res.data && typeof res.data === 'object') {
          if (Array.isArray(res.data.orders)) ordersData = res.data.orders;
          else if (Array.isArray(res.data.data)) ordersData = res.data.data;
          else if (res.data._id) ordersData = [res.data];
        }
        setOrders(ordersData);
      } else if (activeTab === 'payments') {
        const res = await api.get('/payment-methods?all=true');
        setPaymentMethods(res.data);
      } else if (activeTab === 'products') {
        console.log(`Fetching products for tab: ${activeTab}`);
        const res = await api.get('/products?all=true&light=true');
        setProducts(res.data);
      } else if (activeTab === 'games') {
        console.log(`Fetching games for tab: ${activeTab}`);
        const res = await api.get('/games?all=true&light=true&skipPrice=true');
        setGames(res.data);
      } else if (activeTab === 'reviews') {
        const res = await api.get('/admin/reviews');
        setReviews(res.data);
      } else if (activeTab === 'ai') {
        const res = await api.get('/ai/status');
        setAiIsRunning(res.data.isRunning);
        setAiLogs(res.data.logs);
      } else if (activeTab === 'keys') {
        const [keysRes, guidesRes] = await Promise.all([
          api.get('/admin/digital-keys'),
          api.get('/admin/product-guides')
        ]);
        setDigitalKeys(keysRes.data);
        setProductGuides(guidesRes.data);
      } else if (activeTab === 'users') {
        const res = await api.get('/admin/users?role=user');
        setUsers(res.data);
      } else if (activeTab === 'admins') {
        const res = await api.get('/admin/users?role=admin');
        setAdmins(res.data);
      } else if (activeTab === 'promotions') {
        const res = await api.get('/promotions?all=true');
        setPromotions(res.data);
      } else if (activeTab === 'plati') {
        const res = await api.get('/products?all=true&light=true');
        setProducts(res.data);
      }
    } catch (err: any) {
      console.error(`Tab specific fetch failed for ${activeTab}:`, err);
      if (isInitial) {
        setFetchError(err.message || 'Failed to fetch data. Please try again.');
      }
    } finally {
      isFetchingTabRef.current = false;
      if (isInitial) setTabLoading(false);
    }
  };

  const handleViewScreenshot = async (id: string) => {
    try {
      const res = await api.get(`/orders/${id}`);
      if (res.data.transactionScreenshot) {
        setShowScreenshot(res.data.transactionScreenshot);
      } else {
        alert('No screenshot found for this order');
      }
    } catch (err) {
      console.error('Error fetching screenshot:', err);
      alert('Failed to load screenshot');
    }
  };

  const handleStartAI = async () => {
    if (!aiApiKey) return alert('Please enter Gemini API Key');
    try {
      localStorage.setItem('gemini_api_key', aiApiKey);
      const res = await api.post('/ai/start', { apiKey: aiApiKey });
      setAiIsRunning(true);
      setAiLogs(res.data.logs);
      alert('Gemini AI Agent started!');
    } catch (err) { alert('Failed to start AI Agent'); }
  };

  const handleStopAI = async () => {
    try {
      await api.post('/ai/stop');
      setAiIsRunning(false);
      alert('AI Agent stopped.');
    } catch (err) { alert('Failed to stop AI Agent'); }
  };

  const handlePromotionUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditing = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEditing && editingPromotion) {
          setEditingPromotion({ ...editingPromotion, image: reader.result as string });
        } else {
          setNewPromotion({ ...newPromotion, image: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await api.post('/admin/promotions', newPromotion);
      setNewPromotion({ title: '', description: '', image: '', link: '', isActive: true });
      await fetchTabData();
      alert('Promotion created!');
    } catch (err) { alert('Failed to create promotion'); }
    finally { setSaving(false); }
  };

  const handleUpdatePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromotion || saving) return;
    setSaving(true);
    try {
      await api.put(`/admin/promotions/${editingPromotion._id}`, editingPromotion);
      setEditingPromotion(null);
      await fetchTabData();
      alert('Promotion updated!');
    } catch (err) { alert('Failed to update promotion'); }
    finally { setSaving(false); }
  };

  const handleDeletePromotion = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this promotion?')) return;
    try {
      await api.delete(`/admin/promotions/${id}`);
      fetchTabData();
      alert('Promotion deleted!');
    } catch (err) { alert('Failed to delete promotion'); }
  };

  const fetchOrders = () => fetchTabData(); // Alias for compatibility

  useEffect(() => {
    // Check if user is logged in and is an admin
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!token || !userStr) {
      navigate('/auth');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (user.role !== 'admin') {
        navigate('/');
        return;
      }
    } catch (err) {
      navigate('/auth');
      return;
    }

    // 1. Load from cache
    const cachedCategories = localStorage.getItem('catalog_categories');
    const cachedGames = localStorage.getItem('catalog_games');
    if (cachedCategories && cachedGames) {
      setCategories(JSON.parse(cachedCategories));
      setGames(JSON.parse(cachedGames));
      setLoading(false);
    }

    const init = async () => {
      if (orders.length === 0 && games.length === 0 && !localStorage.getItem('catalog_games')) {
        setLoading(true);
      }
      // Only fetch core data (categories/games/products) once on mount
      // Tab specific data will be fetched by the useEffect below
      fetchCoreData();
      
      // Give it a bit of time to try fetching before hiding spinner if no cache
      setTimeout(() => setLoading(false), 2000);
    };
    init();

    // Safety reset for fetch locks
    const safetyInterval = setInterval(() => {
      isFetchingCoreRef.current = false;
      isFetchingTabRef.current = false;
    }, 30000);
    return () => clearInterval(safetyInterval);
  }, []); // Run ONCE on mount

  useEffect(() => {
    // Fetch tab-specific data immediately when tab changes with loading state
    fetchTabData(true);
    
    // Set up polling for tab data ONLY (without loading state)
    const interval = setInterval(() => fetchTabData(false), 20000); // 20s is safer
    return () => clearInterval(interval);
  }, [activeTab]);

  // Simplified upload handlers
  const handlePMUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewPM({ ...newPM, logo: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleGameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewGame({ ...newGame, icon: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleProductIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewProduct({ ...newProduct, icon: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  // CRUD Actions
  const addPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await api.post('/payment-methods', newPM);
      setNewPM({ name: '', accountName: '', phoneNumber: '', logo: '', isActive: true });
      await fetchTabData();
      alert('Payment method added!');
    } catch (err) { alert('Error adding payment method'); }
    finally { setSaving(false); }
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, newCategory);
        alert('Category updated!');
      } else {
        await api.post('/categories', newCategory);
        alert('Category added!');
      }
      setNewCategory({ name: '', type: 'top-up' });
      setEditingCategory(null);
      await fetchCoreData();
    } catch (err) { alert('Error saving category'); }
    finally { setSaving(false); }
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setNewCategory({ name: cat.name, type: cat.type || 'top-up' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const gameData = {
        ...newGame,
        benefits: typeof newGame.benefits === 'string' ? newGame.benefits.split('\n').filter(b => b.trim() !== '') : newGame.benefits,
        purchaseInfo: typeof newGame.purchaseInfo === 'string' ? newGame.purchaseInfo.split('\n').filter(p => p.trim() !== '') : newGame.purchaseInfo
      };
      
      if (editingGame) {
        await api.put(`/games/${editingGame._id}`, gameData);
        alert('Game updated!');
      } else {
        await api.post('/games', gameData);
        alert('Game added!');
      }

      setNewGame(INITIAL_GAME_STATE);
      setEditingGame(null);
      await fetchCoreData();
    } catch (err) { alert('Error saving game'); }
    finally { setSaving(false); }
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, newProduct);
        alert('Product updated!');
      } else {
        await api.post('/products', newProduct);
        alert('Product added!');
      }
      setNewProduct({ gameId: '', name: '', price: 0, icon: '', isActive: true });
      setEditingProduct(null);
      await fetchTabData();
    } catch (err) { alert('Error saving product'); }
    finally { setSaving(false); }
  };

  const saveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      if (editingUser) {
        await api.put(`/admin/users/${editingUser._id}`, newUser);
        alert(`${newUser.role === 'admin' ? 'Admin' : 'User'} updated!`);
      } else {
        await api.post('/admin/users', newUser);
        alert(`${newUser.role === 'admin' ? 'Admin' : 'User'} added!`);
      }
      setNewUser({ name: '', email: '', password: '', role: activeTab === 'admins' ? 'admin' : 'user' });
      setEditingUser(null);
      await fetchTabData();
    } catch (err: any) {
      alert(`Error saving user: ${err.response?.data?.error || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = (user: UserAccount) => {
    setEditingUser(user);
    setNewUser({
      name: user.name,
      email: user.email,
      password: '', // Don't show password
      role: user.role
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleStatus = async (type: string, id: string, currentStatus: boolean) => {
    if (saving) return;
    setSaving(true);
    try {
      let endpoint = `${type}s`;
      if (type === 'payment-method') endpoint = 'payment-methods';
      
      await api.put(`/${endpoint}/${id}`, { isActive: !currentStatus });
      
      if (type === 'game' || type === 'category') {
        await fetchCoreData();
      } else {
        await fetchTabData();
      }
    } catch (err: any) {
      console.error(`Error toggling status for ${type}:`, err);
      alert(`Error toggling status: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (type: string, id: string) => {
    if (!confirm(`Delete this ${type}?`) || saving) return;
    setSaving(true);
    try {
      console.log(`Deleting ${type} with ID: ${id}`);
      let endpoint = `${type}s`;
      if (type === 'category') endpoint = 'categories';
      if (type === 'admin/reviews') endpoint = 'admin/reviews';
      if (type === 'payment-method') endpoint = 'payment-methods'; // Explicitly handle this too
      if (type === 'user') endpoint = 'admin/users';
      
      const res = await api.delete(`/${endpoint}/${id}`);
      console.log('Delete response:', res.data);
      
      if (type === 'game' || type === 'category') {
        await fetchCoreData();
      } else {
        await fetchTabData();
      }
    } catch (err: any) { 
      console.error(`Error deleting ${type}:`, err);
      const msg = err.response?.data?.error || err.message || 'Unknown error';
      alert(`Error deleting ${type}: ${msg}`); 
    } finally {
      setSaving(false);
    }
  };

  const handleEditProduct = async (product: Product) => {
    try {
      // Fetch full product details including icon if missing
      const res = await api.get(`/products/${product._id}`);
      const fullProduct = res.data;
      setEditingProduct(fullProduct);
      setNewProduct({
        gameId: fullProduct.gameId,
        name: fullProduct.name,
        price: fullProduct.price,
        icon: fullProduct.icon,
        isActive: fullProduct.isActive !== false
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert('Failed to fetch product details');
    }
  };

  const handleEditGame = async (game: Game) => {
    try {
      // Fetch full game details including icon and screenshots
      // The backend /games/:id returns { game, products }
      const res = await api.get(`/games/${game._id}?all=true`);
      const fullGame = res.data.game;
      
      setEditingGame(fullGame);
      setNewGame({
        name: fullGame.name,
        categoryId: typeof fullGame.categoryId === 'string' ? fullGame.categoryId : fullGame.categoryId?._id || '',
        icon: fullGame.icon,
        description: fullGame.description || '',
        benefits: fullGame.benefits?.join('\n') || '',
        purchaseInfo: fullGame.purchaseInfo?.join('\n') || '',
        trailerUrl: fullGame.trailerUrl || '',
        isActive: fullGame.isActive !== false,
        soldCount: fullGame.soldCount || 0,
        systemRequirements: {
          os: fullGame.systemRequirements?.os || '',
          processor: fullGame.systemRequirements?.processor || '',
          memory: fullGame.systemRequirements?.memory || '',
          graphics: fullGame.systemRequirements?.graphics || '',
          storage: fullGame.systemRequirements?.storage || ''
        },
        inputConfig: fullGame.inputConfig || []
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert('Failed to fetch game details');
    }
  };

  const updateStatus = async (id: string, orderStatus: string, paymentStatus: string, isAuto: boolean = false) => {
    try {
      await api.patch(`/orders/${id}/status`, {
        orderStatus,
        paymentStatus,
        isAuto
      });
      fetchTabData();
    } catch (err) {
      alert('Error updating order');
    }
  };

  const handleEditPlati = (game: Game) => {
    setEditingPlatiGame(game);
    setPlatiGameId(game._id);
    setPlatiUrlsText(game.platiUrls?.join('\n') || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlatiSubmit = async () => {
    const urls = platiUrlsText.split('\n').map(u => u.trim()).filter(u => u);

    if (!platiGameId || urls.length === 0) {
      alert('Please select a game and enter at least one URL');
      return;
    }

    try {
      if (editingPlatiGame) {
        await api.put('/admin/plati-urls', { gameId: platiGameId, urls });
        alert('Plati URLs updated successfully!');
      } else {
        await api.post('/admin/plati-urls', { gameId: platiGameId, urls });
        alert('Plati URLs added successfully!');
      }
      setPlatiUrlsText('');
      setPlatiGameId('');
      setEditingPlatiGame(null);
      fetchTabData();
    } catch (err) {
      alert(`Failed to ${editingPlatiGame ? 'update' : 'add'} Plati URLs`);
    }
  };

  // Games Filtering and Pagination
  const filteredGames = games.filter(g => 
    g.name.toLowerCase().includes(gameSearch.toLowerCase()) ||
    (typeof g.categoryId === 'object' && g.categoryId.name.toLowerCase().includes(gameSearch.toLowerCase()))
  );

  const gamesPerPage = 10;
  const totalGamePages = Math.ceil(filteredGames.length / gamesPerPage);
  const paginatedGames = filteredGames.slice((gamePage - 1) * gamesPerPage, gamePage * gamesPerPage);

  // Orders Filtering and Pagination
  const filteredOrders = (Array.isArray(orders) ? orders : []).filter(o => {
    const search = ordersSearch.toLowerCase();
    const last6Id = o._id.slice(-6).toLowerCase();
    const transactionId = o.transactionId?.toLowerCase() || '';
    const email = o.customerInfo?.email?.toLowerCase() || '';
    const gameName = typeof o.gameId === 'object' ? o.gameId.name.toLowerCase() : '';
    const gameIdStr = typeof o.gameId === 'object' ? o.gameId._id.toLowerCase() : o.gameId.toLowerCase();
    
    return last6Id.includes(search) || transactionId.includes(search) || email.includes(search) || gameName.includes(search) || gameIdStr.includes(search);
  });
  const totalOrderPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const paginatedOrders = filteredOrders.slice((ordersPage - 1) * ordersPerPage, ordersPage * ordersPerPage);

  // Products Filtering and Pagination
  const filteredProductsList = (() => {
    const search = productsSearch.toLowerCase();
    if (!search) return products;

    const gameLookup = new Map(games.map(g => [g._id, g]));

    return products.filter(p => {
      const pName = p.name.toLowerCase();
      // Handle both populated object and ID string
      let gName = '';
      if (typeof p.gameId === 'object' && p.gameId !== null) {
        gName = p.gameId.name.toLowerCase();
      } else if (typeof p.gameId === 'string') {
        gName = gameLookup.get(p.gameId)?.name.toLowerCase() || '';
      }
      
      return pName.includes(search) || gName.includes(search);
    });
  })();
  const totalProductPages = Math.ceil(filteredProductsList.length / productsPerPage);
  const paginatedProducts = filteredProductsList.slice((productsPage - 1) * productsPerPage, productsPage * productsPerPage);

  // Plati Filtering and Pagination
  const filteredPlatiGames = games.filter(g => 
    g.platiUrls && g.platiUrls.length > 0 && 
    g.name.toLowerCase().includes(platiSearch.toLowerCase())
  );
  const totalPlatiPages = Math.ceil(filteredPlatiGames.length / platiPerPage);
  const paginatedPlatiGames = filteredPlatiGames.slice((platiPage - 1) * platiPerPage, platiPage * platiPerPage);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin text-blue-600"><RefreshCcw size={48} /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-500">Manage orders, payments and products</p>
          </div>
          <button 
            onClick={fetchOrders}
            className="p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-all text-blue-600"
          >
            <RefreshCcw size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white p-1 rounded-xl border border-slate-200 w-full md:w-fit overflow-x-auto no-scrollbar whitespace-nowrap">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all flex-shrink-0 ${activeTab === 'orders' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <LayoutDashboard size={18} /> Orders
          </button>
          <button 
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all flex-shrink-0 ${activeTab === 'payments' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Settings size={18} /> Payments
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all flex-shrink-0 ${activeTab === 'categories' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Layers size={18} /> Category
          </button>
          <button 
            onClick={() => setActiveTab('games')}
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all flex-shrink-0 ${activeTab === 'games' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Gamepad size={18} /> Add Games
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all flex-shrink-0 ${activeTab === 'products' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <ShoppingBag size={18} /> Add Product
          </button>
          <button 
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all flex-shrink-0 ${activeTab === 'reviews' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <MessageSquare size={18} /> Reviews
          </button>
          <button 
            onClick={() => setActiveTab('keys')}
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all flex-shrink-0 ${activeTab === 'keys' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Key size={18} /> Keys
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all flex-shrink-0 ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <User size={18} /> Users
          </button>
          <button 
            onClick={() => setActiveTab('admins')}
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all flex-shrink-0 ${activeTab === 'admins' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Settings size={18} /> Admins
          </button>
          <button 
            onClick={() => setActiveTab('promotions')}
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all flex-shrink-0 ${activeTab === 'promotions' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Megaphone size={18} /> Promotions
          </button>
          <button 
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all flex-shrink-0 ${activeTab === 'ai' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Cpu size={18} /> AI 24/7
          </button>
          <button
            onClick={() => setActiveTab('plati')}
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all flex-shrink-0 ${activeTab === 'plati' ? 'bg-green-600 text-white shadow-lg shadow-green-100' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <ShoppingBag size={18} /> Plati Links
          </button>
        </div>

        {/* Global Tab Loading & Error States */}
        {tabLoading && (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest animate-pulse">Loading {activeTab}...</p>
          </div>
        )}

        {fetchError && !tabLoading && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="bg-red-100 text-red-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-red-900 font-bold mb-2">Connection Timeout</h3>
            <p className="text-red-600 text-sm mb-6 max-w-md mx-auto">{fetchError}</p>
            <button 
              onClick={() => fetchTabData(true)}
              className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-100 flex items-center gap-2 mx-auto"
            >
              <RefreshCcw size={16} /> Retry Now
            </button>
          </div>
        )}

        {/* Orders Tab */}
        {!tabLoading && !fetchError && activeTab === 'orders' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Package className="text-blue-600" /> Customer Orders
              </h2>
              
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search by last 6 IDs or customer name..."
                  value={ordersSearch}
                  onChange={(e) => {
                    setOrdersSearch(e.target.value);
                    setOrdersPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all"
                />
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order ID</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Details</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Player Info</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount / Method</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedOrders.map((order) => (
                      <tr key={order._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-mono font-black text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200 w-fit">
                              #{order._id.slice(-6).toUpperCase()}
                            </span>
                            <span className="text-[8px] font-mono text-slate-400">
                              {order._id}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                              <Gamepad2 size={16} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm capitalize">{(order.gameType || 'Unknown Game').replace('-', ' ')}</p>
                              <p className="text-[10px] text-slate-500 font-medium">
                                {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'No Date'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-900 flex items-center gap-1">
                              <User size={12} className="text-slate-400" /> {order.transactionId || (typeof order.gameId === 'string' ? order.gameId : 'No ID')}
                            </p>
                            {order.customerInfo?.email && (
                              <p className="text-[10px] text-blue-500 font-bold lowercase tracking-tight bg-blue-50 px-1.5 py-0.5 rounded w-fit">
                                {order.customerInfo.email}
                              </p>
                            )}
                            {order.zoneId && (
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                                Zone: {order.zoneId}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-blue-600">{order.amount || 'No Amount'}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{(order.paymentMethod || 'None').toUpperCase()}</p>
                              <button 
                                onClick={() => handleViewScreenshot(order._id)}
                                className="text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1 text-[10px] font-bold"
                              >
                                <ImageIcon size={12} /> PROOF
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest w-fit ${
                              order.orderStatus === 'completed' ? 'bg-green-100 text-green-700' :
                              order.orderStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              order.orderStatus === 'processing' ? 'bg-blue-100 text-blue-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {order.orderStatus}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest w-fit ${
                              order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                              order.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {order.paymentStatus}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {(order.orderStatus === 'pending' || (order.orderStatus as any) === 'awaiting_payment') ? (
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => updateStatus(order._id, 'processing', 'paid', true)}
                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3"
                                title="Auto Top-up"
                              >
                                <Zap size={14} /> Auto
                              </button>
                              <button 
                                onClick={() => updateStatus(order._id, 'processing', 'paid', false)}
                                className="p-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all shadow-lg shadow-slate-100 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3"
                                title="Manual Top-up"
                              >
                                <User size={14} /> Manual
                              </button>
                              <button 
                                onClick={() => updateStatus(order._id, 'rejected', 'rejected')}
                                className="p-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-all flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3"
                                title="Reject"
                              >
                                <XCircle size={14} /> Reject
                              </button>
                            </div>
                          ) : order.orderStatus === 'processing' ? (
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => updateStatus(order._id, 'completed', 'paid')}
                                className="px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg shadow-emerald-100"
                              >
                                <Check size={12} /> Finish
                              </button>
                              <div className="text-blue-600 animate-spin flex items-center">
                                <RefreshCcw size={16} />
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2 text-slate-400">
                              <CheckCircle size={16} className={order.orderStatus === 'completed' ? 'text-green-500' : ''} />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalOrderPages > 1 && (
                <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <p className="text-xs font-bold text-slate-500">
                    Showing <span className="text-slate-900">{((ordersPage - 1) * ordersPerPage) + 1}</span> to <span className="text-slate-900">{Math.min(ordersPage * ordersPerPage, filteredOrders.length)}</span> of <span className="text-slate-900">{filteredOrders.length}</span> orders
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOrdersPage(prev => Math.max(prev - 1, 1))}
                      disabled={ordersPage === 1}
                      className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="flex items-center gap-1">
                      {/* Show limited pages if there are many */}
                      {(() => {
                        const pages = [];
                        const maxVisible = 5;
                        let start = Math.max(1, ordersPage - Math.floor(maxVisible / 2));
                        let end = Math.min(totalOrderPages, start + maxVisible - 1);
                        if (end - start + 1 < maxVisible) {
                          start = Math.max(1, end - maxVisible + 1);
                        }
                        for (let i = start; i <= end; i++) {
                          pages.push(i);
                        }
                        return pages.map(i => (
                          <button
                            key={i}
                            onClick={() => setOrdersPage(i)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                              ordersPage === i
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {i}
                          </button>
                        ));
                      })()}
                    </div>
                    <button
                      onClick={() => setOrdersPage(prev => Math.min(prev + 1, totalOrderPages))}
                      disabled={ordersPage === totalOrderPages}
                      className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {filteredOrders.length === 0 && (
                <div className="text-center py-20 bg-white">
                  <Package size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 font-medium">No orders found.</p>
                  <div className="mt-4 p-4 bg-slate-50 rounded-xl inline-block border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Debug Info</p>
                    <p className="text-[10px] text-slate-500">API: {API_BASE_URL}/orders</p>
                    <p className="text-[10px] text-slate-500">Last Fetch: {new Date().toLocaleTimeString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {!tabLoading && !fetchError && activeTab === 'payments' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <CreditCard className="text-blue-600" /> Payment Methods
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Add New PM Form */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
                <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Add Payment Method</h3>
                <form onSubmit={addPaymentMethod} className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Method Name (e.g. KBZPay)" 
                    value={newPM.name}
                    onChange={(e) => setNewPM({ ...newPM, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="Account Name" 
                    value={newPM.accountName}
                    onChange={(e) => setNewPM({ ...newPM, accountName: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="Phone Number" 
                    value={newPM.phoneNumber}
                    onChange={(e) => setNewPM({ ...newPM, phoneNumber: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    required
                  />
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center justify-between">
                      Custom Input Fields
                      <button 
                        type="button"
                        onClick={() => setNewGame({ ...newGame, inputConfig: [...newGame.inputConfig, { label: '', placeholder: '', key: '', required: true }] })}
                        className="bg-blue-50 text-blue-600 p-1 rounded hover:bg-blue-100 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </label>
                    {newGame.inputConfig.map((config, index) => (
                      <div key={index} className="p-3 bg-slate-50 rounded-lg space-y-2 relative group">
                        <button 
                          type="button"
                          onClick={() => {
                            const updated = [...newGame.inputConfig];
                            updated.splice(index, 1);
                            setNewGame({ ...newGame, inputConfig: updated });
                          }}
                          className="absolute -top-1 -right-1 bg-red-100 text-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={10} />
                        </button>
                        <input 
                          type="text" 
                          placeholder="Label (e.g. User ID)" 
                          value={config.label}
                          onChange={(e) => {
                            const updated = [...newGame.inputConfig];
                            updated[index].label = e.target.value;
                            setNewGame({ ...newGame, inputConfig: updated });
                          }}
                          className="w-full px-3 py-1.5 rounded border border-slate-200 text-xs outline-none"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            type="text" 
                            placeholder="Key (e.g. userId)" 
                            value={config.key}
                            onChange={(e) => {
                              const updated = [...newGame.inputConfig];
                              updated[index].key = e.target.value;
                              setNewGame({ ...newGame, inputConfig: updated });
                            }}
                            className="w-full px-3 py-1.5 rounded border border-slate-200 text-xs outline-none"
                          />
                          <input 
                            type="text" 
                            placeholder="Placeholder" 
                            value={config.placeholder}
                            onChange={(e) => {
                              const updated = [...newGame.inputConfig];
                              updated[index].placeholder = e.target.value;
                              setNewGame({ ...newGame, inputConfig: updated });
                            }}
                            className="w-full px-3 py-1.5 rounded border border-slate-200 text-xs outline-none"
                          />
                        </div>
                      </div>
                    ))}
                    {newGame.inputConfig.length === 0 && (
                      <p className="text-[10px] text-slate-400 italic">No custom fields (defaults to Game ID + Zone ID)</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Logo Icon</label>
                    <label className="flex items-center justify-center w-full h-16 border-2 border-dashed border-slate-100 rounded-lg cursor-pointer hover:bg-slate-50 overflow-hidden">
                      {newPM.logo ? (
                        <img 
                          src={getFullImageUrl(newPM.logo)} 
                          className="h-full object-contain" 
                          alt="Logo" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-slate-300"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-upload"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>';
                          }}
                        />
                      ) : (
                        <Upload size={20} className="text-slate-300" />
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handlePMUpload} />
                    </label>
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition-all">
                    Save Method
                  </button>
                </form>
              </div>

              {/* List PMs */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Info</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paymentMethods.map((pm) => (
                          <tr key={pm._id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {pm.logo ? (
                                  <img 
                                    src={getFullImageUrl(pm.logo)} 
                                    className="w-10 h-10 object-contain bg-slate-50 rounded-lg p-1.5" 
                                    alt={pm.name} 
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-credit-card"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" x2="22" y1="10"/></svg></div>';
                                    }}
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                    <CreditCard size={16} />
                                  </div>
                                )}
                                <p className="font-bold text-slate-900 text-sm">{pm.name}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-0.5">
                                <p className="text-sm font-bold text-slate-900">{pm.accountName}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{pm.phoneNumber}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => toggleStatus('payment-method', pm._id, !!pm.isActive)}
                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                  pm.isActive 
                                    ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                }`}
                              >
                                {pm.isActive ? 'Enabled' : 'Disabled'}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => deleteItem('payment-method', pm._id)}
                                className="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Products with no matching game */}
                {products.filter(p => {
                  const pGameId = (p.gameId && typeof p.gameId === 'object') ? (p.gameId as any)._id : p.gameId;
                  return !games.some(g => g?._id === pGameId);
                }).length > 0 && (
                  <div className="bg-red-50 p-6 rounded-2xl border border-red-100 mt-8">
                    <h3 className="text-red-600 font-bold mb-4 flex items-center gap-2">
                      <Trash2 size={16} /> Products with Deleted Games
                    </h3>
                    <div className="bg-white rounded-xl overflow-hidden">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <tbody className="divide-y divide-slate-100">
                            {products.filter(p => {
                              const pGameId = (p.gameId && typeof p.gameId === 'object') ? (p.gameId as any)._id : p.gameId;
                              return !games.some(g => g?._id === pGameId);
                            }).map(p => (
                              <tr key={p._id}>
                                <td className="px-6 py-3 font-bold text-slate-900 text-sm">{p.name}</td>
                                <td className="px-6 py-3 text-right">
                                  <button 
                                    onClick={() => deleteItem('product', p._id)}
                                    className="text-red-400 hover:text-red-600"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Categories Tab */}
        {!tabLoading && !fetchError && activeTab === 'categories' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Layers className="text-blue-600" /> Categories
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
                <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                  {editingCategory ? <Settings size={16} /> : <Plus size={16} />}
                  {editingCategory ? 'Edit Category' : 'Add Category'}
                </h3>
                <form onSubmit={addCategory} className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Category Name (e.g. VPN)" 
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    required
                  />
                  <select
                    value={newCategory.type}
                    onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                  >
                    <option value="top-up">Top-up (Traditional Layout)</option>
                    <option value="digital-product">Digital Product (Steam/Offline Layout)</option>
                  </select>
                  <div className="flex gap-2">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className={`flex-1 bg-slate-900 text-white py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition-all ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {saving ? 'Saving...' : (editingCategory ? 'Update' : 'Save')} Category
                  </button>
                    {editingCategory && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingCategory(null);
                          setNewCategory({ name: '', type: 'top-up' });
                        }}
                        className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold hover:bg-slate-50 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[400px]">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category Name</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {categories.map((cat) => (
                          <tr key={cat._id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <span className="font-bold text-slate-900 text-sm">{cat.name}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">
                                {cat.type || 'top-up'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                              <button 
                                onClick={() => handleEditCategory(cat)}
                                className="text-blue-400 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-lg"
                                title="Edit Category"
                              >
                                <Pencil size={18} />
                              </button>
                              <button 
                                onClick={() => deleteItem('category', cat._id)}
                                className="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                                title="Delete Category"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Games Tab */}
        {!tabLoading && !fetchError && activeTab === 'games' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Gamepad className="text-blue-600" /> Games & Services
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit lg:sticky lg:top-24 max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
                  <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                    {editingGame ? <Settings size={16} /> : <Plus size={16} />}
                    {editingGame ? 'Edit Game' : 'Add Game/Service'}
                  </h3>
                  <form onSubmit={addGame} className="space-y-4">
                  <select
                    value={newGame.categoryId}
                    onChange={(e) => setNewGame({ ...newGame, categoryId: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.filter(c => c !== null).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                  <input 
                    type="text" 
                    placeholder="Name (e.g. NordVPN)" 
                    value={newGame.name}
                    onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    required
                  />
                  <textarea 
                    placeholder="Game Description" 
                    value={newGame.description}
                    onChange={(e) => setNewGame({ ...newGame, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none h-24"
                  />
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Benefits (one per line)</label>
                    <textarea 
                      placeholder="e.g. Full access&#10;Instant delivery" 
                      value={newGame.benefits}
                      onChange={(e) => setNewGame({ ...newGame, benefits: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none h-20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">After Purchase Info (one per line)</label>
                    <textarea 
                      placeholder="e.g. Activation steps&#10;Login credentials" 
                      value={newGame.purchaseInfo}
                      onChange={(e) => setNewGame({ ...newGame, purchaseInfo: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none h-20"
                    />
                  </div>
                  <input 
                    type="text" 
                    placeholder="YouTube Trailer Link (Optional)" 
                    value={newGame.trailerUrl}
                    onChange={(e) => setNewGame({ ...newGame, trailerUrl: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                  />

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Manual Sold Count</label>
                    <input 
                      type="number" 
                      value={newGame.soldCount}
                      onChange={(e) => setNewGame({ ...newGame, soldCount: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>

                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <label className="text-xs font-bold text-slate-500 uppercase">System Requirements</label>
                    <input 
                      type="text" 
                      placeholder="OS (e.g. Windows 10 64-bit)" 
                      value={newGame.systemRequirements.os}
                      onChange={(e) => setNewGame({ ...newGame, systemRequirements: { ...newGame.systemRequirements, os: e.target.value } })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                    <input 
                      type="text" 
                      placeholder="Processor (e.g. Intel i5-4460)" 
                      value={newGame.systemRequirements.processor}
                      onChange={(e) => setNewGame({ ...newGame, systemRequirements: { ...newGame.systemRequirements, processor: e.target.value } })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                    <input 
                      type="text" 
                      placeholder="Memory (e.g. 8 GB RAM)" 
                      value={newGame.systemRequirements.memory}
                      onChange={(e) => setNewGame({ ...newGame, systemRequirements: { ...newGame.systemRequirements, memory: e.target.value } })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                    <input 
                      type="text" 
                      placeholder="Graphics (e.g. GTX 760)" 
                      value={newGame.systemRequirements.graphics}
                      onChange={(e) => setNewGame({ ...newGame, systemRequirements: { ...newGame.systemRequirements, graphics: e.target.value } })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                    <input 
                      type="text" 
                      placeholder="Storage (e.g. 50 GB available space)" 
                      value={newGame.systemRequirements.storage}
                      onChange={(e) => setNewGame({ ...newGame, systemRequirements: { ...newGame.systemRequirements, storage: e.target.value } })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Icon</label>
                    <label className="flex items-center justify-center w-full h-16 border-2 border-dashed border-slate-100 rounded-lg cursor-pointer hover:bg-slate-50 overflow-hidden">
                      {newGame.icon ? (
                        <img 
                          src={getFullImageUrl(newGame.icon)} 
                          className="h-full object-contain" 
                          alt="Icon" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-slate-300"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-upload"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>';
                          }}
                        />
                      ) : (
                        <Upload size={20} className="text-slate-300" />
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handleGameUpload} />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="submit" 
                      disabled={saving}
                      className={`flex-1 bg-slate-900 text-white py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition-all ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {saving ? 'Saving...' : (editingGame ? 'Update Game' : 'Save Game')}
                    </button>
                    {editingGame && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingGame(null);
                          setNewGame(INITIAL_GAME_STATE);
                        }}
                        className="px-4 py-2 border border-slate-200 rounded-lg font-bold text-sm hover:bg-slate-50 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
            <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Game List</h3>
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text"
                        placeholder="Search games or categories..."
                        value={gameSearch}
                        onChange={(e) => {
                          setGameSearch(e.target.value);
                          setGamePage(1);
                        }}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Game / Service</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">SoldCount</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedGames.map((g) => (
                          <tr key={g._id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {g.icon ? (
                                  <img 
                                    src={getFullImageUrl(g.icon)} 
                                    className="w-10 h-10 object-contain bg-slate-50 rounded-lg p-1.5" 
                                    alt={g.name}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-gamepad-2"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="13" r="1"/><circle cx="18" cy="11" r="1"/><path d="M18 20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/></svg></div>';
                                    }}
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                    <Gamepad2 size={16} />
                                  </div>
                                )}
                                <p className="font-bold text-slate-900 text-sm">{g.name}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded">
                                {typeof g.categoryId === 'object' ? g.categoryId.name : 'Unknown'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-slate-600">{g.soldCount || 0}</span>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => toggleStatus('game', g._id, !!g.isActive)}
                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                  g.isActive 
                                    ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                                }`}
                              >
                                {g.isActive ? 'Available' : 'Out of Stock'}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-1">
                                <button 
                                  onClick={() => handleEditGame(g)}
                                  className="text-blue-400 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-lg"
                                >
                                  <Settings size={18} />
                                </button>
                                <button 
                                  onClick={() => deleteItem('game', g._id)}
                                  className="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination Controls */}
                  {totalGamePages > 1 && (
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <p className="text-xs font-bold text-slate-500">
                        Showing <span className="text-slate-900">{((gamePage - 1) * gamesPerPage) + 1}</span> to <span className="text-slate-900">{Math.min(gamePage * gamesPerPage, filteredGames.length)}</span> of <span className="text-slate-900">{filteredGames.length}</span> games
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setGamePage(prev => Math.max(prev - 1, 1))}
                          disabled={gamePage === 1}
                          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <div className="flex items-center gap-1">
                          {[...Array(totalGamePages)].map((_, i) => (
                            <button
                              key={i + 1}
                              onClick={() => setGamePage(i + 1)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                gamePage === i + 1
                                  ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setGamePage(prev => Math.min(prev + 1, totalGamePages))}
                          disabled={gamePage === totalGamePages}
                          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {!tabLoading && !fetchError && activeTab === 'products' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="text-blue-600" /> Product Management
              </h2>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search products or games..."
                  value={productsSearch}
                  onChange={(e) => {
                    setProductsSearch(e.target.value);
                    setProductsPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Add/Edit Product Form */}
              <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit lg:sticky lg:top-24 max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
                  <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                    {editingProduct ? <Settings size={16} /> : <Plus size={16} />}
                    {editingProduct ? 'Edit Product' : 'Add Game Amount'}
                  </h3>
                  <form onSubmit={addProduct} className="space-y-4">
                  <select
                    value={newProduct.gameId}
                    onChange={(e) => setNewProduct({ ...newProduct, gameId: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    required
                  >
                    <option value="">Select Game</option>
                    {games.filter(g => g !== null).map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
                  </select>
                  <input 
                    type="text" 
                    placeholder="Product Name (e.g. 100 Diamonds)" 
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    required
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Price (MMK)</label>
                      <input 
                        type="number" 
                        placeholder="1500" 
                        value={newProduct.price || ''}
                        onChange={(e) => setNewProduct({ ...newProduct, price: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Product Icon</label>
                      <label className="flex items-center justify-center w-full h-10 border-2 border-dashed border-slate-100 rounded-lg cursor-pointer hover:bg-slate-50 overflow-hidden">
                        {newProduct.icon ? (
                          <img 
                            src={getFullImageUrl(newProduct.icon)} 
                            className="h-full object-contain" 
                            alt="Icon" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-slate-300"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-upload"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>';
                            }}
                          />
                        ) : (
                          <Upload size={16} className="text-slate-300" />
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={handleProductIconUpload} />
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="submit" 
                      disabled={saving}
                      className={`flex-1 bg-slate-900 text-white py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition-all ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {saving ? 'Saving...' : (editingProduct ? 'Update Product' : 'Save Product')}
                    </button>
                    {editingProduct && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingProduct(null);
                          setNewProduct({ gameId: '', name: '', price: 0, icon: '', isActive: true });
                        }}
                        className="px-4 py-2 border border-slate-200 rounded-lg font-bold text-sm hover:bg-slate-50 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* List Products */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Game</th>
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Price</th>
                        <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const gameLookup = new Map(games.map(g => [g._id, g]));
                        return paginatedProducts.map((p) => {
                          const gameIdStr = typeof p.gameId === 'object' ? p.gameId._id : p.gameId;
                          const productGame = gameLookup.get(gameIdStr);
                          return (
                            <tr key={p._id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-3">
                                  {p.icon ? (
                                    <img 
                                      src={getFullImageUrl(p.icon)} 
                                      className="w-8 h-8 object-contain bg-slate-50 rounded p-1" 
                                      alt={p.name}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></div>';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-slate-400">
                                      <Package size={12} />
                                    </div>
                                  )}
                                  <p className="font-bold text-slate-900 text-sm">{p.name}</p>
                                </div>
                              </td>
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-2">
                                  {productGame?.icon && (
                                    <img 
                                      src={getFullImageUrl(productGame.icon)} 
                                      className="w-5 h-5 object-contain" 
                                      alt="" 
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-gamepad-2"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="13" r="1"/><circle cx="18" cy="11" r="1"/><path d="M18 20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/></svg></div>';
                                      }}
                                    />
                                  )}
                                  <span className="text-xs font-bold text-slate-600">{productGame?.name || (typeof p.gameId === 'object' ? p.gameId.name : 'Unknown')}</span>
                                </div>
                              </td>
                              <td className="px-6 py-3">
                                <p className="text-blue-600 font-bold text-sm flex items-center gap-1">
                                  <Coins size={14} /> {p.price} MMK
                                </p>
                              </td>
                              <td className="px-6 py-3">
                                <button
                                  onClick={() => toggleStatus('product', p._id, !!p.isActive)}
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                                    p.isActive 
                                      ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                                      : 'bg-red-100 text-red-600 hover:bg-red-200'
                                  }`}
                                >
                                  {p.isActive ? 'Available' : 'Out of Stock'}
                                </button>
                              </td>
                              <td className="px-6 py-3 text-right">
                                <div className="flex justify-end gap-1">
                                  <button 
                                    onClick={() => handleEditProduct(p)}
                                    className="text-slate-400 hover:text-blue-500 transition-colors p-1.5 hover:bg-blue-50 rounded-lg"
                                  >
                                    <Settings size={18} />
                                  </button>
                                  <button 
                                    onClick={() => deleteItem('product', p._id)}
                                    className="text-red-400 hover:text-red-600 transition-colors p-1.5 hover:bg-red-50 rounded-lg"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    {filteredProductsList.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-xs italic">
                            No products found matching your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Pagination Controls */}
                {totalProductPages > 1 && (
                  <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-500">
                      Showing <span className="text-slate-900">{((productsPage - 1) * productsPerPage) + 1}</span> to <span className="text-slate-900">{Math.min(productsPage * productsPerPage, filteredProductsList.length)}</span> of <span className="text-slate-900">{filteredProductsList.length}</span> products
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setProductsPage(prev => Math.max(prev - 1, 1))}
                        disabled={productsPage === 1}
                        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div className="flex items-center gap-1">
                        {(() => {
                          const pages = [];
                          const maxVisible = 5;
                          let start = Math.max(1, productsPage - Math.floor(maxVisible / 2));
                          let end = Math.min(totalProductPages, start + maxVisible - 1);
                          if (end - start + 1 < maxVisible) {
                            start = Math.max(1, end - maxVisible + 1);
                          }
                          for (let i = start; i <= end; i++) {
                            pages.push(i);
                          }
                          return pages.map(i => (
                            <button
                              key={i}
                              onClick={() => setProductsPage(i)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                productsPage === i
                                  ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {i}
                            </button>
                          ));
                        })()}
                      </div>
                      <button
                        onClick={() => setProductsPage(prev => Math.min(prev + 1, totalProductPages))}
                        disabled={productsPage === totalProductPages}
                        className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Promotions Tab */}
        {!tabLoading && !fetchError && activeTab === 'promotions' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Megaphone className="text-blue-600" /> Promotions & Events
            </h2>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Form Section */}
              <div className="lg:col-span-1">
                <form 
                  onSubmit={editingPromotion ? handleUpdatePromotion : handleCreatePromotion}
                  className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 sticky top-8"
                >
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Promotion Title</label>
                      <input 
                        type="text" 
                        placeholder="Summer Sale 2024" 
                        value={editingPromotion ? editingPromotion.title : newPromotion.title}
                        onChange={(e) => editingPromotion 
                          ? setEditingPromotion({ ...editingPromotion, title: e.target.value })
                          : setNewPromotion({ ...newPromotion, title: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                      <textarea 
                        placeholder="Get 20% off on all Steam keys!" 
                        value={editingPromotion ? editingPromotion.description : newPromotion.description}
                        onChange={(e) => editingPromotion 
                          ? setEditingPromotion({ ...editingPromotion, description: e.target.value })
                          : setNewPromotion({ ...newPromotion, description: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none min-h-[100px]"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Target Link (Optional)</label>
                      <input 
                        type="text" 
                        placeholder="/category/steam" 
                        value={editingPromotion ? editingPromotion.link : newPromotion.link}
                        onChange={(e) => editingPromotion 
                          ? setEditingPromotion({ ...editingPromotion, link: e.target.value })
                          : setNewPromotion({ ...newPromotion, link: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Promotion Image</label>
                      <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-100 rounded-lg cursor-pointer hover:bg-slate-50 overflow-hidden relative group">
                        {(editingPromotion ? editingPromotion.image : newPromotion.image) ? (
                          <>
                            <img 
                              src={getFullImageUrl(editingPromotion ? editingPromotion.image : newPromotion.image)} 
                              className="w-full h-full object-cover" 
                              alt="Promotion" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Upload size={24} className="text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-slate-400">
                            <Upload size={24} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Upload Banner</span>
                          </div>
                        )}
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*" 
                          onChange={(e) => handlePromotionUpload(e, !!editingPromotion)} 
                        />
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="promoActive"
                        checked={editingPromotion ? editingPromotion.isActive : newPromotion.isActive}
                        onChange={(e) => editingPromotion 
                          ? setEditingPromotion({ ...editingPromotion, isActive: e.target.checked })
                          : setNewPromotion({ ...newPromotion, isActive: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="promoActive" className="text-sm font-medium text-slate-700">Active Promotion</label>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      type="submit" 
                      disabled={saving}
                      className={`flex-1 bg-slate-900 text-white py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition-all ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {saving ? 'Saving...' : (editingPromotion ? 'Update Promotion' : 'Create Promotion')}
                    </button>
                    {editingPromotion && (
                      <button 
                        type="button" 
                        onClick={() => setEditingPromotion(null)}
                        className="px-4 py-2 border border-slate-200 rounded-lg font-bold text-sm hover:bg-slate-50 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* List Section */}
              <div className="lg:col-span-2 space-y-4">
                {promotions.map((promo) => (
                  <div key={promo._id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4 items-start group">
                    <div className="w-32 h-20 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200 relative">
                      {promo.image ? (
                        <img 
                          src={getFullImageUrl(promo.image)} 
                          className="w-full h-full object-cover" 
                          alt={promo.title} 
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-slate-300"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ImageIcon size={24} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-900 truncate">{promo.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          promo.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {promo.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-2">{promo.description}</p>
                      {promo.link && (
                        <p className="text-[10px] font-mono text-blue-500 truncate mb-2">{promo.link}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setEditingPromotion(promo)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Settings size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeletePromotion(promo._id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {promotions.length === 0 && (
                  <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <Megaphone size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-medium">No promotions found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Plati Links Tab */}
        {!tabLoading && !fetchError && activeTab === 'plati' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="text-green-600" /> Plati.market Links
              </h2>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search by game name..."
                  value={platiSearch}
                  onChange={(e) => {
                    setPlatiSearch(e.target.value);
                    setPlatiPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-green-100 outline-none text-sm transition-all"
                />
              </div>
            </div>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit lg:sticky lg:top-24">
                <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">
                  {editingPlatiGame ? 'Edit Plati URLs' : 'Add Plati URL to Game'}
                </h3>
                <div className="space-y-4">
                  <select
                    value={platiGameId}
                    onChange={(e) => setPlatiGameId(e.target.value)}
                    disabled={!!editingPlatiGame}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-green-100 outline-none disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    <option value="">Select Game/Service</option>
                    {games.map(game => (
                      <option key={game._id} value={game._id}>{game.name}</option>
                    ))}
                  </select>
                  <textarea
                    value={platiUrlsText}
                    onChange={(e) => setPlatiUrlsText(e.target.value)}
                    placeholder="Paste Plati URLs here (one per line)&#10;e.g., https://plati.io/itm/express-vpn-global-key-1-month-instant-delivery/5449165"
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-green-100 outline-none h-32 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handlePlatiSubmit}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-green-700 transition-all"
                    >
                      {editingPlatiGame ? 'Update Plati URLs' : 'Add Plati URLs'}
                    </button>
                    {editingPlatiGame && (
                      <button
                        onClick={() => {
                          setEditingPlatiGame(null);
                          setPlatiGameId('');
                          setPlatiUrlsText('');
                        }}
                        className="px-4 py-2 border border-slate-200 rounded-lg font-bold text-sm hover:bg-slate-50 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Active Plati Automations</h3>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Game / Service</th>
                          <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Plati URLs</th>
                          <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedPlatiGames.map(game => (
                          <tr key={game._id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="font-bold text-sm text-slate-900">{game.name}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                {game.platiUrls?.map((url, idx) => (
                                  <div key={idx} className="text-[10px] text-blue-500 hover:underline truncate max-w-xs cursor-pointer" onClick={() => window.open(url, '_blank')}>
                                    {url}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleEditPlati(game)}
                                  className="text-blue-400 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-lg"
                                  title="Edit URLs"
                                >
                                  <Settings size={16} />
                                </button>
                                <button
                                  onClick={async () => {
                                    if(!confirm('Remove automation for this game?')) return;
                                    try {
                                      await api.delete('/admin/plati-urls', { data: { gameId: game._id } });
                                      fetchTabData();
                                    } catch (err) {
                                      alert('Failed to remove URLs');
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                                  title="Delete Automation"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredPlatiGames.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-6 py-12 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <ShoppingBag size={32} className="text-slate-200" />
                                <p className="text-slate-400 text-sm font-medium">No active Plati automations found.</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination Controls */}
                  {totalPlatiPages > 1 && (
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <p className="text-xs font-bold text-slate-500">
                        Showing <span className="text-slate-900">{((platiPage - 1) * platiPerPage) + 1}</span> to <span className="text-slate-900">{Math.min(platiPage * platiPerPage, filteredPlatiGames.length)}</span> of <span className="text-slate-900">{filteredPlatiGames.length}</span> games
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPlatiPage(prev => Math.max(prev - 1, 1))}
                          disabled={platiPage === 1}
                          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <div className="flex items-center gap-1">
                          {(() => {
                            const pages = [];
                            const maxVisible = 5;
                            let start = Math.max(1, platiPage - Math.floor(maxVisible / 2));
                            let end = Math.min(totalPlatiPages, start + maxVisible - 1);
                            if (end - start + 1 < maxVisible) {
                              start = Math.max(1, end - maxVisible + 1);
                            }
                            for (let i = start; i <= end; i++) {
                              pages.push(i);
                            }
                            return pages.map(i => (
                              <button
                                key={i}
                                onClick={() => setPlatiPage(i)}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                  platiPage === i
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {i}
                              </button>
                            ));
                          })()}
                        </div>
                        <button
                          onClick={() => setPlatiPage(prev => Math.min(prev + 1, totalPlatiPages))}
                          disabled={platiPage === totalPlatiPages}
                          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Tab */}
        {!tabLoading && !fetchError && activeTab === 'ai' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="text-indigo-600" /> AI 24/7 Automation
              </h2>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${aiIsRunning ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  {aiIsRunning ? 'Agent Active' : 'Agent Offline'}
                </span>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* AI Controls */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Gemini API Key</label>
                    <input 
                      type="password" 
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="Paste your API key here..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition-all"
                    />
                  </div>

                  <div className="space-y-3">
                    {!aiIsRunning ? (
                      <button 
                        onClick={handleStartAI}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                      >
                        <Zap size={18} fill="currentColor" />
                        Start 24/7 Automation
                      </button>
                    ) : (
                      <button 
                        onClick={handleStopAI}
                        className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-600 shadow-xl shadow-red-100 transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle size={18} />
                        Stop Automation
                      </button>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-3">
                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                      <Activity size={14} /> Agent Status
                    </h4>
                    <ul className="space-y-2 text-[10px] font-bold text-indigo-900/60 uppercase tracking-tight">
                      <li className="flex items-center gap-2">
                        <CheckCircle size={12} className="text-indigo-500" />
                        Auto-monitoring Orders
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle size={12} className="text-indigo-500" />
                        Market Research Active
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle size={12} className="text-indigo-500" />
                        Catalog Auto-updating
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* AI Logs */}
              <div className="lg:col-span-2">
                <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl h-[500px] flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <LayoutDashboard size={14} /> System Logs
                    </h3>
                    <button 
                      onClick={() => setAiLogs([])}
                      className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest"
                    >
                      Clear Logs
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 font-mono text-[11px]">
                    {aiLogs.map((log, i) => (
                      <div key={i} className="text-indigo-300/80 leading-relaxed border-l-2 border-indigo-500/20 pl-3 py-1 bg-indigo-500/5 rounded-r-lg">
                        {log}
                      </div>
                    ))}
                    {aiLogs.length === 0 && (
                      <div className="h-full flex items-center justify-center text-slate-600 uppercase tracking-widest text-xs font-bold italic">
                        Waiting for agent activity...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reviews Tab */}
        {!tabLoading && !fetchError && activeTab === 'reviews' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <MessageSquare className="text-blue-600" /> Customer Reviews
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rating & Comment</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Game / Date</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reviews.map((review) => (
                      <tr key={review._id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                              {(review.userName || 'U')[0]}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{review.userName || 'Unknown'}</p>
                              <p className="text-[10px] text-slate-500 font-medium">{review.userEmail || 'No Email'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex text-yellow-400">
                              {[...Array(5)].map((_, i) => <Star key={i} size={12} fill={i < review.rating ? 'currentColor' : 'none'} />)}
                            </div>
                            <p className="text-sm text-slate-700 italic max-w-md truncate" title={review.comment}>"{review.comment}"</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-600 flex items-center gap-1">
                              <Gamepad size={12} /> {(typeof review.gameId === 'object' && review.gameId !== null) ? (review.gameId as Game).name : 'Deleted Game'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => deleteItem('admin/reviews', review._id)}
                            className="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {reviews.length === 0 && (
                <div className="text-center py-20 bg-white">
                  <MessageSquare size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No reviews yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Keys Tab */}
        {!tabLoading && !fetchError && activeTab === 'keys' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Add Digital Keys Section */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Plus className="text-emerald-600" /> Add Digital Keys
                  </h2>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await api.post('/admin/digital-keys', newKey);
                      setNewKey({ ...newKey, key: '' });
                      fetchTabData();
                      alert('Keys added successfully!');
                    } catch (err) { alert('Error adding keys'); }
                  }} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Select Product</label>
                      <select 
                        value={newKey.gameId} 
                        onChange={(e) => setNewKey({ ...newKey, gameId: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-100 outline-none"
                        required
                      >
                        <option value="">Choose Game...</option>
                        {games.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Keys (One per line or comma separated)</label>
                      <textarea 
                        value={newKey.key} 
                        onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
                        rows={5}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-100 outline-none font-mono"
                        placeholder="KEY-123-ABC&#10;KEY-456-DEF"
                        required
                      />
                    </div>
                    <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-100">
                      Upload Keys
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText className="text-blue-600" /> Setup PDF Guide
                  </h2>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await api.post('/admin/product-guides', newGuide);
                      fetchTabData();
                      alert('Product guide saved!');
                    } catch (err) { alert('Error saving guide'); }
                  }} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Product</label>
                      <select 
                        value={newGuide.gameId} 
                        onChange={(e) => {
                          const existing = productGuides.find(g => (typeof g.gameId === 'object' ? g.gameId._id : g.gameId) === e.target.value);
                          setNewGuide(existing ? {
                            gameId: e.target.value,
                            description: existing.description,
                            setupGuide: existing.setupGuide,
                            additionalInfo: existing.additionalInfo
                          } : { gameId: e.target.value, description: '', setupGuide: '', additionalInfo: '' });
                        }}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                        required
                      >
                        <option value="">Choose Game...</option>
                        {games.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Description</label>
                      <textarea 
                        value={newGuide.description} 
                        onChange={(e) => setNewGuide({ ...newGuide, description: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                        placeholder="Product description for PDF..."
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Setup Guide</label>
                      <textarea 
                        value={newGuide.setupGuide} 
                        onChange={(e) => setNewGuide({ ...newGuide, setupGuide: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                        placeholder="Step 1: Download...&#10;Step 2: Enter Key..."
                        required
                      />
                    </div>
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-100">
                      Save Guide Template
                    </button>
                  </form>
                </div>
              </div>

              {/* Digital Keys Inventory */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Key className="text-emerald-600" /> Keys Inventory
                    </h2>
                    <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
                      <span className="text-emerald-600 bg-emerald-100 px-2 py-1 rounded">
                        Available: {digitalKeys.filter(k => !k.isUsed).length}
                      </span>
                      <span className="text-slate-400 bg-slate-100 px-2 py-1 rounded">
                        Used: {digitalKeys.filter(k => k.isUsed).length}
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Key</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {digitalKeys.map((key) => (
                          <tr key={key._id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-900 text-sm">
                                {typeof key.gameId === 'object' ? key.gameId.name : 'Unknown Game'}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium">
                                Added: {new Date(key.createdAt).toLocaleDateString()}
                              </p>
                            </td>
                            <td className="px-6 py-4 font-mono text-sm text-slate-600">
                              {key.key}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                key.isUsed ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-600'
                              }`}>
                                {key.isUsed ? 'Used' : 'Unused'}
                              </span>
                              {key.orderId && (
                                <p className="text-[9px] text-blue-500 font-bold mt-1 uppercase">Order: {key.orderId.slice(-6)}</p>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => deleteItem('admin/digital-keys', key._id)}
                                className="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {digitalKeys.length === 0 && (
                    <div className="text-center py-20 bg-white">
                      <Key size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No keys in inventory.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {!tabLoading && !fetchError && activeTab === 'users' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <User className="text-blue-600" /> User Accounts
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit lg:sticky lg:top-24">
                <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                  {editingUser ? <Settings size={16} /> : <Plus size={16} />}
                  {editingUser ? 'Edit User' : 'Add User'}
                </h3>
                <form onSubmit={saveUser} className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Name" 
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    required
                  />
                  <input 
                    type="email" 
                    placeholder="Email" 
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    required
                  />
                  <input 
                    type="password" 
                    placeholder={editingUser ? "Leave blank to keep same" : "Password"}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    required={!editingUser}
                  />
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'user' | 'admin' })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <div className="flex gap-2">
                    <button 
                      type="submit" 
                      disabled={saving}
                      className={`flex-1 bg-slate-900 text-white py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition-all ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {saving ? 'Saving...' : (editingUser ? 'Update User' : 'Save User')}
                    </button>
                    {editingUser && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingUser(null);
                          setNewUser({ name: '', email: '', password: '', role: 'user' });
                        }}
                        className="px-4 py-2 border border-slate-200 rounded-lg font-bold text-sm hover:bg-slate-50 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">User Details</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Joined</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {users.map((u) => (
                          <tr key={u._id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="space-y-0.5">
                                <p className="font-bold text-slate-900 text-sm">{u.name}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{u.email}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-slate-500 font-medium">
                                {new Date(u.createdAt).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => handleEditUser(u)}
                                  className="text-blue-400 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-lg"
                                >
                                  <Settings size={18} />
                                </button>
                                <button 
                                  onClick={() => deleteItem('user', u._id)}
                                  className="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admins Tab */}
        {!tabLoading && !fetchError && activeTab === 'admins' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Settings className="text-blue-600" /> Admin Accounts
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit lg:sticky lg:top-24">
                <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                  {editingUser ? <Settings size={16} /> : <Plus size={16} />}
                  {editingUser ? 'Edit Admin' : 'Add Admin'}
                </h3>
                <form onSubmit={saveUser} className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Name" 
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    required
                  />
                  <input 
                    type="email" 
                    placeholder="Email" 
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    required
                  />
                  <input 
                    type="password" 
                    placeholder={editingUser ? "Leave blank to keep same" : "Password"}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    required={!editingUser}
                  />
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'user' | 'admin' })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </select>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-slate-900 text-white py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition-all">
                      {editingUser ? 'Update Admin' : 'Save Admin'}
                    </button>
                    {editingUser && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingUser(null);
                          setNewUser({ name: '', email: '', password: '', role: 'user' });
                        }}
                        className="px-4 py-2 border border-slate-200 rounded-lg font-bold text-sm hover:bg-slate-50 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin Details</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Joined</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {admins.map((u) => (
                          <tr key={u._id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="space-y-0.5">
                                <p className="font-bold text-slate-900 text-sm">{u.name}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{u.email}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-slate-500 font-medium">
                                {new Date(u.createdAt).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => handleEditUser(u)}
                                  className="text-blue-400 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-lg"
                                >
                                  <Settings size={18} />
                                </button>
                                <button 
                                  onClick={() => deleteItem('user', u._id)}
                                  className="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Screenshot Modal */}
      {showScreenshot && (
        <div 
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowScreenshot(null)}
        >
          <div className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <button className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors">
              <XCircle size={24} />
            </button>
            <img 
              src={getFullImageUrl(showScreenshot)} 
              className="w-full h-auto max-h-[85vh] object-contain" 
              alt="Transaction Proof" 
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-64 flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image-off"><line x1="2" x2="22" y1="2" y2="22"/><path d="M10.41 10.41a2 2 0 1 1-2.82-2.82"/><line x1="10" x2="21" y1="21" y2="21"/><path d="M14.66 9a2 2 0 0 1 2.34 2.34"/><path d="M21 15v1.34"/><path d="M3 21h1"/><path d="M3 7v14"/><path d="M5.69 5.69A2 2 0 0 1 7 5h10a2 2 0 0 1 2 2v4.34"/></svg><span class="text-xs font-bold uppercase tracking-widest">Image Failed to Load</span></div>';
              }}
            />
            <div className="p-4 bg-white text-center">
              <p className="text-sm font-bold text-slate-900">Payment Screenshot Proof</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
