import { create } from 'zustand';
import axios from 'axios';
import { config } from '../config';

const API_URL = `${config.API_URL}/api`;

// Configurazione axios
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
      
      // Verifica validità token
      try {
        const response = await axios.get('/auth/me');
        if (response.data.user) {
          set({ user: response.data.user });
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      } catch (error) {
        console.error('Token validation failed:', error);
        // Token scaduto, pulisci auth
        get().logout();
      }
    }
  },

  // Login
  login: async (emailOrUsername, password) => {
    set({ loading: true, error: null });
    
    try {
      // Validazione input
      if (!emailOrUsername || !password) {
        throw new Error('Email/Username e password sono richiesti');
      }
      
      const response = await axios.post('/auth/login', {
        emailOrUsername: emailOrUsername.trim(),
        password: password
      });
      
      const { user, token } = response.data;
      
      // Salva in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Configura axios header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      set({
        user,
        token,
        isAuthenticated: true,
        loading: false,
        error: null
      });
      
      // Sincronizza dati dal server
      try {
        await get().syncFromServer();
      } catch (syncError) {
        console.error('Sync error:', syncError);
      }
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Login fallito';
      set({
        error: errorMessage,
        loading: false
      });
      return { success: false, error: errorMessage };
    }
  },

  // Register
  register: async (username, email, password) => {
    set({ loading: true, error: null });
    
    try {
      // Validazione
      if (!username || !email || !password) {
        throw new Error('Tutti i campi sono richiesti');
      }
      
      if (password.length < 6) {
        throw new Error('La password deve essere di almeno 6 caratteri');
      }
      
      const response = await axios.post('/auth/register', {
        username: username.trim(),
        email: email.trim().toLowerCase(),
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
        loading: false,
        error: null
      });
      
      // Sync local data to server
      try {
        await get().syncToServer();
      } catch (syncError) {
        console.error('Sync error:', syncError);
      }
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Registrazione fallita';
      set({
        error: errorMessage,
        loading: false
      });
      return { success: false, error: errorMessage };
    }
  },

  // Logout
  logout: () => {
    // Pulisci localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Rimuovi header Authorization
    delete axios.defaults.headers.common['Authorization'];
    
    // Reset stato
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null
    });
  },

  // Update profile
  updateProfile: async (profileData) => {
    const token = get().token;
    if (!token) return { success: false, error: 'Non autenticato' };
    
    try {
      const response = await axios.put('/user/profile', profileData);
      const updatedUser = response.data.user;
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
      
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Update profile error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Errore aggiornamento profilo' 
      };
    }
  },

  // Persist local data before logout
  persistLocalData: async () => {
    const token = get().token;
    if (!token) return;
    
    try {
      await get().syncToServer();
    } catch (error) {
      console.error('Error persisting data:', error);
    }
  },

  // Subscribe to notifications
  subscribeToNotifications: async (subscription) => {
    const token = get().token;
    if (!token) return { success: false };
    
    try {
      await axios.post('/notifications/subscribe', { subscription });
      return { success: true };
    } catch (error) {
      console.error('Subscribe error:', error);
      return { success: false };
    }
  },

  // Sync to server
  syncToServer: async () => {
    const token = get().token;
    if (!token) return;
    
    try {
      // Sync favorites
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      if (favorites.length > 0) {
        await axios.post('/user/favorites', { favorites });
      }
      
      // Sync library
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
        if (progress.chapterIndex !== undefined) {
          await axios.post('/user/progress', {
            mangaUrl,
            mangaTitle: progress.chapterTitle || '',
            chapterIndex: progress.chapterIndex,
            pageIndex: progress.page || 0
          });
        }
      }
      
    } catch (error) {
      console.error('Sync to server error:', error);
    }
  },

  // Sync from server
  syncFromServer: async () => {
    const token = get().token;
    if (!token) return;
    
    try {
      const response = await axios.get('/user/data');
      const { favorites, reading, completed, history, readingProgress } = response.data;
      
      // Merge con dati locali
      if (favorites && favorites.length > 0) {
        const localFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        const mergedFavorites = [...favorites];
        localFavorites.forEach(local => {
          if (!mergedFavorites.find(f => f.url === local.url)) {
            mergedFavorites.push(local);
          }
        });
        localStorage.setItem('favorites', JSON.stringify(mergedFavorites));
      }
      
      // Update library
      if (reading && reading.length > 0) {
        localStorage.setItem('reading', JSON.stringify(reading));
      }
      if (completed && completed.length > 0) {
        localStorage.setItem('completed', JSON.stringify(completed));
      }
      if (history && history.length > 0) {
        localStorage.setItem('history', JSON.stringify(history));
      }
      
      // Update reading progress
      if (readingProgress && readingProgress.length > 0) {
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
      }
      
    } catch (error) {
      console.error('Sync from server error:', error);
    }
  },

  // Sync favorites
  syncFavorites: async (favorites) => {
    const token = get().token;
    if (!token) return;
    
    try {
      await axios.post('/user/favorites', { favorites });
    } catch (error) {
      console.error('Sync favorites error:', error);
    }
  },

  // Auto-sync periodically
  startAutoSync: () => {
    const syncInterval = setInterval(() => {
      if (get().isAuthenticated) {
        get().syncToServer();
      }
    }, 60000); // Sync ogni minuto
    
    return () => clearInterval(syncInterval);
  }
}));

export default useAuth;