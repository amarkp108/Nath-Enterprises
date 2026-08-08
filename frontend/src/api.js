import axios from 'axios';

/** Production: https://nath-enterprises.onrender.com — local: empty (Vite proxy) */
export const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const api = axios.create({
  baseURL: API_ORIGIN ? `${API_ORIGIN}/api` : '/api',
});

/** Resolve /uploads/... paths against API origin in production */
export const assetUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
