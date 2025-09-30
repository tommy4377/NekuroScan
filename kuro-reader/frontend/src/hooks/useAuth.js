import { create } from 'zustand';
import axios from 'axios';
import { config } from '../config';

const API_URL = `${config.API_URL}/api`;

// Axios setup
axios.defaults.baseURL = API_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Set token if exists
const savedToken = localStorage.getItem('token');
if (savedToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}

const useAuth = create((set, get) => ({
  // State
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,
  syncStatus: 'idle',
  lastSync: null,

  // Initialize - LOAD DATA FROM SERVER
  initAuth: async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (token && user) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      set({ user, token, isAuthenticated: true });
      
      try {
        // Get fresh user data from server
        const response = await axios.get('/auth/me');
        if (response.data.user) {
          const updatedUser = response.data.user;
          set({ user: updatedUser });
          localStorage.setItem('user', JSON.stringify(updatedUser));
          
          // Load all user data from server
          await get().syncFromServer();
        }
      } catch (error) {
        console.error('Token validation failed:', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          get().logout();
        }
      }
    }
  },

  // Login
  login: async (emailOrUsername, password) => {
    set({ loading: true, error: null });
    
    try {
      const response = await axios.post('/auth/login', {
        emailOrUsername: emailOrUsername.toLowerCase().trim(),
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
      
      // Load user data from server after login
      await get().syncFromServer();
      
      return { success: true, user };
      
    } catch (error) {
      const message = error.response?.data?.message || 'Login fallito';
      set({ error: message, loading: false });
      return { success: false, error: message };
    }
  },

  // Register
  register: async (username, email, password) => {
    set({ loading: true, error: null });
    
    try {
      const response = await axios.post('/auth/register', {
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
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
      
      return { success: true, user };
      
    } catch (error) {
      const message = error.response?.data?.message || 'Registrazione fallita';
      set({ error: message, loading: false });
      return { success: false, error: message };
    }
  },

  // Logout
  logout: async () => {
    const state = get();
    
    // Save data before logout
    if (state.isAuthenticated) {
      await get().syncToServer();
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
      syncStatus: 'idle',
      lastSync: null
    });
  },

syncToServer: async () => {
  const token = get().token;
  if (!token) return false;
  
  set({ syncStatus: 'syncing' });
  
  try {
    const dataToSync = {
      favorites: JSON.parse(localStorage.getItem('favorites') || '[]'),
      reading: JSON.parse(localStorage.getItem('reading') || '[]'),
      completed: JSON.parse(localStorage.getItem('completed') || '[]'),
      history: JSON.parse(localStorage.getItem('history') || '[]'),
      readingProgress: JSON.parse(localStorage.getItem('readingProgress') || '{}')
    };
    
    await axios.post('/user/sync', dataToSync);
    
    set({ 
      syncStatus: 'synced', 
      lastSync: new Date().toISOString() 
    });
    
    console.log('✅ Data synced to server');
    return true;
    
  } catch (error) {
    console.error('❌ Sync to server error:', error);
    set({ syncStatus: 'error' });
    return false;
  }
},

  // Sync FROM server - LOAD ALL DATA
  syncFromServer: async () => {
    const token = get().token;
    if (!token) return false;
    
    set({ syncStatus: 'syncing' });
    
    try {
      const response = await axios.get('/user/data');
      const { 
        favorites = [], 
        reading = [], 
        completed = [], 
        history = [], 
        readingProgress = {},
        profile = {}
      } = response.data;
      
      // Save to localStorage
      localStorage.setItem('favorites', JSON.stringify(favorites));
      localStorage.setItem('reading', JSON.stringify(reading));
      localStorage.setItem('completed', JSON.stringify(completed));
      localStorage.setItem('history', JSON.stringify(history));
      localStorage.setItem('readingProgress', JSON.stringify(readingProgress));
      
      // Save profile data
      if (profile) {
        localStorage.setItem('profilePublic', profile.isPublic ? 'true' : 'false');
        
        // Update user with profile data
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, profile };
          set({ user: updatedUser });
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      }
      
      set({ 
        syncStatus: 'synced',
        lastSync: new Date().toISOString()
      });
      
      console.log('✅ Data loaded from server');
      return true;
      
    } catch (error) {
      console.error('❌ Sync from server error:', error);
      set({ syncStatus: 'error' });
      return false;
    }
  },

  // Auto sync
  startAutoSync: () => {
    // Sync every 30 seconds if authenticated
    const interval = setInterval(() => {
      if (get().isAuthenticated && get().syncStatus !== 'syncing') {
        get().syncToServer();
      }
    }, 30000);
    
    // Sync when window gets focus
    const handleFocus = () => {
      if (get().isAuthenticated) {
        get().syncToServer();
      }
    };
    
    // Sync before page unload
    const handleBeforeUnload = () => {
      if (get().isAuthenticated) {
        get().syncToServer();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  },

  // Update profile
  updateProfile: async (updates) => {
    set({ loading: true });
    
    try {
      const response = await axios.put('/user/profile', updates);
      
      if (response.data.success) {
        const updatedUser = { ...get().user, profile: response.data.profile };
        set({ user: updatedUser, loading: false });
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return { success: true, user: updatedUser };
      }
      
      return { success: false, error: 'Aggiornamento fallito' };
      
    } catch (error) {
      set({ loading: false });
      return { 
        success: false, 
        error: error.response?.data?.message || 'Aggiornamento fallito' 
      };
    }
  },

  syncFavorites: async (favorites) => {
    const token = get().token;
    if (!token) {
      // Save only locally if not logged in
      localStorage.setItem('favorites', JSON.stringify(favorites));
      return false;
    }
    
    try {
      // Save locally first
      localStorage.setItem('favorites', JSON.stringify(favorites));
      
      // Then sync to server IMMEDIATELY
      await axios.post('/user/sync', { 
        favorites,
        reading: JSON.parse(localStorage.getItem('reading') || '[]'),
        completed: JSON.parse(localStorage.getItem('completed') || '[]'),
        history: JSON.parse(localStorage.getItem('history') || '[]'),
        readingProgress: JSON.parse(localStorage.getItem('readingProgress') || '{}')
      });
      
      console.log('✅ Favorites synced');
      return true;
    } catch (error) {
      console.error('❌ Failed to sync favorites:', error);
      return false;
    }
  },
  
  syncReading: async (reading) => {
    const token = get().token;
    if (!token) {
      localStorage.setItem('reading', JSON.stringify(reading));
      return false;
    }
    
    try {
      localStorage.setItem('reading', JSON.stringify(reading));
      
      await axios.post('/user/sync', { 
        reading,
        favorites: JSON.parse(localStorage.getItem('favorites') || '[]'),
        completed: JSON.parse(localStorage.getItem('completed') || '[]'),
        history: JSON.parse(localStorage.getItem('history') || '[]'),
        readingProgress: JSON.parse(localStorage.getItem('readingProgress') || '{}')
      });
      
      console.log('✅ Reading list synced');
      return true;
    } catch (error) {
      console.error('❌ Failed to sync reading list:', error);
      return false;
    }
  }
}));

export default useAuth;