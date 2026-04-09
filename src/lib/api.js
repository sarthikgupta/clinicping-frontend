import axios from 'axios';
import { create } from 'zustand';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('cp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cp_token');
      localStorage.removeItem('cp_user');
      localStorage.removeItem('cp_clinic');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('cp_user') || 'null'),
  clinic: JSON.parse(localStorage.getItem('cp_clinic') || 'null'),
  token: localStorage.getItem('cp_token') || null,

  isAdmin: () => get().user?.role === 'admin',
  isDoctor: () => ['doctor', 'admin'].includes(get().user?.role),
  isReceptionist: () => get().user?.role === 'receptionist',
  role: () => get().user?.role || null,

  login: async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('cp_token', data.token);
    localStorage.setItem('cp_user', JSON.stringify(data.user));
    localStorage.setItem('cp_clinic', JSON.stringify(data.clinic));
    set({ token: data.token, user: data.user, clinic: data.clinic });
    return data;
  },

  signup: async (form) => {
    const { data } = await api.post('/api/auth/signup', form);
    localStorage.setItem('cp_token', data.token);
    localStorage.setItem('cp_user', JSON.stringify(data.user));
    localStorage.setItem('cp_clinic', JSON.stringify(data.clinic));
    set({ token: data.token, user: data.user, clinic: data.clinic });
    return data;
  },

  logout: () => {
    localStorage.removeItem('cp_token');
    localStorage.removeItem('cp_user');
    localStorage.removeItem('cp_clinic');
    set({ token: null, user: null, clinic: null });
  },
}));
