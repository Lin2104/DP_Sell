import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './Home.tsx'
import ProductRouter from './ProductRouter.tsx'
import AdminPanel from './AdminPanel.tsx'
import Auth from './Auth.tsx'
import History from './History.tsx'
import Cart from './Cart.tsx'
import Favorites from './Favorites.tsx'
import ResetPassword from './ResetPassword.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/product/:id" element={<ProductRouter />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/history" element={<History />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/favorites" element={<Favorites />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
    </Routes>
  </BrowserRouter>
);
