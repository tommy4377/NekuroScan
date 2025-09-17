import { create } from 'zustand';
import axios from 'axios';
import { config } from '../config';

const API_URL = `${config.API_URL}/api`;

// Configura axios defaults
axios.defaults.baseURL = API_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';

const useAuth = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,

  // Login
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('/auth/login', {
        email,
        password
      });
      
      const { user, token } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      set({
        user,
        token,
        isAuthenticated: true,
        loading: false
      });
      
      return { success: true };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Login fallito',
        loading: false
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Register
  register: async (username, email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('/auth/register', {
        username,
        email,
        password
      });
      
      const { user, token } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      set({
        user,
        token,
        isAuthenticated: true,
        loading: false
      });
      
      return { success: true };
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Registrazione fallita',
        loading: false
      });
      return { success: false, error: error.response?.data?.message };
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({
      user: null,
      token: null,
      isAuthenticated: false
    });
  },

  // Check auth status
  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const response = await axios.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      set({
        user: response.data.user,
        isAuthenticated: true
      });
    } catch (error) {
      get().logout();
    }
  },

  // Sync favorites
  syncFavorites: async (favorites) => {
    const token = get().token;
    if (!token) return;
    
    try {
      await axios.post(
        '/user/favorites',
        { favorites },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Sync favorites error:', error);
    }
  },

  // Get user data
  getUserData: async () => {
    const token = get().token;
    if (!token) return null;
    
    try {
      const response = await axios.get('/user/data', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Get user data error:', error);
      return null;
    }
  }
}));

export default useAuth;
