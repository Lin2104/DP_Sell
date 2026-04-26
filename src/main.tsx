import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import Home from './Home.tsx'
import ProductRouter from './ProductRouter.tsx'
import AdminPanel from './AdminPanel.tsx'
import Auth from './Auth.tsx'
import History from './History.tsx'
import Cart from './Cart.tsx'
import Favorites from './Favorites.tsx'
import ResetPassword from './ResetPassword.tsx'
import './index.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '260795159492-7ep0n8ohhrs34ipqq7kdk1tnas8l73lj.apps.googleusercontent.com'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
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
  </GoogleOAuthProvider>
);
