import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ms_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('ms_token');
      localStorage.removeItem('ms_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export function fileUrl(fileIdOrUrl) {
  if (!fileIdOrUrl) return null;
  if (typeof fileIdOrUrl === 'string' && fileIdOrUrl.startsWith('/api/')) return `${BACKEND_URL}${fileIdOrUrl}`;
  return `${API_BASE}/uploads/${fileIdOrUrl}`;
}

export function downloadUrl(fileId) {
  return `${API_BASE}/uploads/${fileId}/download`;
}
