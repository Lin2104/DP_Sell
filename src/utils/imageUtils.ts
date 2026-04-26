const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Helper to handle relative image URLs from the backend.
 * It prepends the API base URL if the path is relative.
 */
export const getFullImageUrl = (path: string) => {
  if (!path) return '';
  
  // If it's already an absolute URL (Cloudinary, external, or Base64), return as is
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  
  // If it's a local frontend asset, return as is
  if (path === '/logo.png' || path.startsWith('/assets/')) return path;

  // Prepend base URL for relative paths (legacy or fallback)
  const base = API_BASE_URL.replace(/\/+$/, '').replace(/\/api$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${base}${cleanPath}`;
};
