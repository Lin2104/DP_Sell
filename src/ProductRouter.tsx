import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ProductDetail from './ProductDetail.tsx';
import DigitalProductDetail from './DigitalProductDetail.tsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const ProductRouter: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [type, setType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGameType = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/games/${id}?light=true`, { timeout: 10000 });
        const gameType = res.data.game.categoryId?.type || 'top-up';
        setType(gameType);
      } catch (err) {
        console.error('Error fetching game type:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGameType();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-blue-400 font-black uppercase tracking-widest text-xs animate-pulse">Initializing...</p>
      </div>
    </div>
  );
  if (!type) return <div className="min-h-screen bg-[#0a0f18] text-white flex items-center justify-center font-black uppercase tracking-widest text-red-500">Product not found</div>;

  return type === 'digital-product' ? <DigitalProductDetail /> : <ProductDetail />;
};

export default ProductRouter;
