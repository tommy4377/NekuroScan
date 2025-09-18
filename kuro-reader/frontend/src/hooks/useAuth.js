import { create } from 'zustand';
import axios from 'axios';
import { config } from '../config';

const API_URL = `${config.API_URL}/api`;

axios.defaults.baseURL = API_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Configura token dall'inizio se esiste
const savedToken = localStorage.getItem('token');
if (savedToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}

const useAuth = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,

  // Initialize auth on app start
  initAuth: async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (token && user) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      set({
        user,
        token,
        isAuthenticated: true
      });
      
      // Verify token is still valid
      try {
        const response = await axios.get('/auth/me');
        if (response.data.user) {
          set({ user: response.data.user });
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      } catch (error) {
        // Token expired, clear auth
        get().logout();
      }
    }
  },

  // Login - FIX: supporta username o email
  login: async (emailOrUsername, password) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('/auth/login', {
        emailOrUsername,
        password
      });
      
      const { user, token } = response.data;
      
      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Set axios header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      set({
        user,
        token,
        isAuthenticated: true,
        loading: false
      });
      
      // Sync library data from server
      await get().syncFromServer();
      
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
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      set({
        user,
        token,
        isAuthenticated: true,
        loading: false
      });
      
      // Sync local data to server
      await get().syncToServer();
      
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
    delete axios.defaults.headers.common['Authorization'];
    
    set({
      user: null,
      token: null,
      isAuthenticated: false
    });
  },

  // Sync library data to server
  syncToServer: async () => {
    const token = get().token;
    if (!token) return;
    
    try {
      // Sync favorites
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      await axios.post('/user/favorites', { favorites });
      
      // Sync library (reading, completed, history)
      const reading = JSON.parse(localStorage.getItem('reading') || '[]');
      const completed = JSON.parse(localStorage.getItem('completed') || '[]');
      const history = JSON.parse(localStorage.getItem('history') || '[]');
      
      await axios.post('/user/library', {
        reading,
        completed,
        history
      });
      
      // Sync reading progress
      const readingProgress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
      for (const [mangaUrl, progress] of Object.entries(readingProgress)) {
        await axios.post('/user/progress', {
          mangaUrl,
          mangaTitle: progress.chapterTitle || '',
          chapterIndex: progress.chapterIndex,
          pageIndex: progress.page || 0
        });
      }
      
    } catch (error) {
      console.error('Sync to server error:', error);
    }
  },

  // Sync library data from server
  syncFromServer: async () => {
    const token = get().token;
    if (!token) return;
    
    try {
      const response = await axios.get('/user/data');
      const { favorites, reading, completed, history, readingProgress } = response.data;
      
      // Merge with local data
      const localFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      const mergedFavorites = [...favorites];
      localFavorites.forEach(local => {
        if (!mergedFavorites.find(f => f.url === local.url)) {
          mergedFavorites.push(local);
        }
      });
      localStorage.setItem('favorites', JSON.stringify(mergedFavorites));
      
      // Update library
      if (reading.length > 0) {
        localStorage.setItem('reading', JSON.stringify(reading));
      }
      if (completed.length > 0) {
        localStorage.setItem('completed', JSON.stringify(completed));
      }
      if (history.length > 0) {
        localStorage.setItem('history', JSON.stringify(history));
      }
      
      // Update reading progress
      const localProgress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
      readingProgress.forEach(progress => {
        localProgress[progress.mangaUrl] = {
          chapterId: progress.mangaUrl,
          chapterIndex: progress.chapterIndex,
          page: progress.pageIndex,
          timestamp: progress.updatedAt
        };
      });
      localStorage.setItem('readingProgress', JSON.stringify(localProgress));
      
    } catch (error) {
      console.error('Sync from server error:', error);
    }
  },

  // Auto-sync periodically when logged in
  startAutoSync: () => {
    const syncInterval = setInterval(() => {
      if (get().isAuthenticated) {
        get().syncToServer();
      }
    }, 60000); // Sync every minute
    
    return () => clearInterval(syncInterval);
  }
}));

export default useAuth;
