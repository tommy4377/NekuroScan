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

  // Initialize
  initAuth: async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (token && user) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      set({ user, token, isAuthenticated: true });
      
      try {
        const response = await axios.get('/auth/me');
        if (response.data.user) {
          const updatedUser = response.data.user;
          set({ user: updatedUser });
          localStorage.setItem('user', JSON.stringify(updatedUser));
          
          // Restore user data
          get().restoreUserData(updatedUser.id);
          
          // Start sync
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
      
      get().restoreUserData(user.id);
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
      
      get().persistUserData(user.id);
      await get().syncToServer();
      
      return { success: true, user };
      
    } catch (error) {
      const message = error.response?.data?.message || 'Registrazione fallita';
      set({ error: message, loading: false });
      return { success: false, error: message };
    }
  },

  // Logout con persistenza dati migliorata
  logout: async () => {
    const state = get();
    const userId = state.user?.id;
    
    if (userId) {
      // Salva tutti i dati locali prima del logout
      try {
        const dataToSave = {
          favorites: JSON.parse(localStorage.getItem('favorites') || '[]'),
          reading: JSON.parse(localStorage.getItem('reading') || '[]'),
          completed: JSON.parse(localStorage.getItem('completed') || '[]'),
          history: JSON.parse(localStorage.getItem('history') || '[]'),
          readingProgress: JSON.parse(localStorage.getItem('readingProgress') || '{}')
        };
        
        // Salva sul server se autenticato
        if (state.token) {
          await axios.post(
            '/user/sync',
            dataToSave,
            {
              headers: { Authorization: `Bearer ${state.token}` }
            }
          ).catch(err => console.error('Sync before logout failed:', err));
        }
        
        // Salva localmente per l'utente
        localStorage.setItem(`userData_${userId}`, JSON.stringify({
          ...dataToSave,
          avatar: localStorage.getItem('userAvatar'),
          settings: localStorage.getItem('settings'),
          profilePublic: localStorage.getItem('profilePublic'),
          includeAdult: localStorage.getItem('includeAdult'),
          searchMode: localStorage.getItem('searchMode'),
          preferredReadingMode: localStorage.getItem('preferredReadingMode'),
          preferredFitMode: localStorage.getItem('preferredFitMode'),
          savedAt: new Date().toISOString()
        }));
        
        console.log('User data saved before logout');
      } catch (error) {
        console.error('Error saving data before logout:', error);
      }
    }
    
    // Rimuovi solo i dati di autenticazione, non i dati dell'utente
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    
    // NON rimuovere i dati dell'utente (favorites, reading, etc.)
    // Così l'utente può continuare come ospite con i suoi dati
    
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
      syncStatus: 'idle',
      lastSync: null
    });
  },

  // Persist user data locally
  persistUserData: (userId) => {
    if (!userId) return;
    
    const userData = {
      avatar: localStorage.getItem('userAvatar'),
      favorites: localStorage.getItem('favorites'),
      reading: localStorage.getItem('reading'),
      completed: localStorage.getItem('completed'),
      history: localStorage.getItem('history'),
      readingProgress: localStorage.getItem('readingProgress'),
      bookmarks: localStorage.getItem('bookmarks'),
      settings: localStorage.getItem('settings'),
      profilePublic: localStorage.getItem('profilePublic'),
      includeAdult: localStorage.getItem('includeAdult'),
      searchMode: localStorage.getItem('searchMode'),
      preferredReadingMode: localStorage.getItem('preferredReadingMode'),
      preferredFitMode: localStorage.getItem('preferredFitMode'),
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(`userData_${userId}`, JSON.stringify(userData));
  },

  // Restore user data
  restoreUserData: (userId) => {
    if (!userId) return;
    
    const savedData = localStorage.getItem(`userData_${userId}`);
    if (!savedData) return;
    
    try {
      const userData = JSON.parse(savedData);
      
      Object.entries(userData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && key !== 'timestamp') {
          localStorage.setItem(key, value);
        }
      });
      
      console.log('User data restored from saved state');
    } catch (error) {
      console.error('Error restoring user data:', error);
    }
  },

  // Persist local data
  persistLocalData: async () => {
    const userId = get().user?.id;
    if (userId) {
      get().persistUserData(userId);
      
      if (get().isAuthenticated) {
        try {
          await get().syncToServer();
        } catch (error) {
          console.error('Final sync failed:', error);
        }
      }
    }
  },

  // Sync favorites
  syncFavorites: async (favorites) => {
    const token = get().token;
    if (!token) return;
    
    try {
      await axios.post('/user/favorites', { favorites });
      console.log('Favorites synced');
      return true;
    } catch (error) {
      console.error('Failed to sync favorites:', error);
      return false;
    }
  },

  // Sync all data to server
  syncToServer: async () => {
    const token = get().token;
    if (!token) return;
    
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
      
      console.log('Data synced to server');
      return true;
      
    } catch (error) {
      console.error('Sync to server error:', error);
      set({ syncStatus: 'error' });
      return false;
    }
  },

  // Sync from server
  syncFromServer: async () => {
    const token = get().token;
    if (!token) return;
    
    set({ syncStatus: 'syncing' });
    
    try {
      const response = await axios.get('/user/data');
      const { favorites, reading, completed, history, readingProgress } = response.data;
      
      // Merge with local data
      const localFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      const mergedFavorites = get().mergeArrays(favorites, localFavorites, 'url');
      localStorage.setItem('favorites', JSON.stringify(mergedFavorites));
      
      const localReading = JSON.parse(localStorage.getItem('reading') || '[]');
      const mergedReading = get().mergeArrays(reading, localReading, 'url');
      localStorage.setItem('reading', JSON.stringify(mergedReading));
      
      const localCompleted = JSON.parse(localStorage.getItem('completed') || '[]');
      const mergedCompleted = get().mergeArrays(completed, localCompleted, 'url');
      localStorage.setItem('completed', JSON.stringify(mergedCompleted));
      
      const localHistory = JSON.parse(localStorage.getItem('history') || '[]');
      const mergedHistory = get().mergeArrays(history, localHistory, 'url');
      localStorage.setItem('history', JSON.stringify(mergedHistory.slice(0, 200)));
      
      // Merge reading progress
      const localProgress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
      readingProgress?.forEach(progress => {
        const local = localProgress[progress.mangaUrl];
        if (!local || new Date(progress.updatedAt) > new Date(local.timestamp || 0)) {
          localProgress[progress.mangaUrl] = {
            chapterId: progress.mangaUrl,
            chapterIndex: progress.chapterIndex,
            page: progress.pageIndex,
            pageIndex: progress.pageIndex,
            timestamp: progress.updatedAt
          };
        }
      });
      localStorage.setItem('readingProgress', JSON.stringify(localProgress));
      
      set({ 
        syncStatus: 'synced',
        lastSync: new Date().toISOString()
      });
      
      console.log('Data synced from server');
      return true;
      
    } catch (error) {
      console.error('Sync from server error:', error);
      set({ syncStatus: 'error' });
      return false;
    }
  },

  // Helper: merge arrays keeping most recent
  mergeArrays: (serverArray, localArray, key) => {
    const merged = new Map();
    
    serverArray?.forEach(item => {
      merged.set(item[key], item);
    });
    
    localArray?.forEach(item => {
      const existing = merged.get(item[key]);
      if (!existing || 
          new Date(item.lastRead || item.addedAt || 0) > 
          new Date(existing.lastRead || existing.addedAt || 0)) {
        merged.set(item[key], item);
      }
    });
    
    return Array.from(merged.values());
  },

  // Auto sync
  startAutoSync: () => {
    const interval = setInterval(() => {
      if (get().isAuthenticated && get().syncStatus !== 'syncing') {
        get().syncToServer();
      }
    }, 60000); // Ogni minuto
    
    // Sync anche quando la finestra torna in focus
    const handleFocus = () => {
      if (get().isAuthenticated) {
        get().syncToServer();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  },

  // Update user profile
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

  // Change password
  changePassword: async (oldPassword, newPassword) => {
    try {
      const response = await axios.post('/auth/change-password', { 
        oldPassword, 
        newPassword 
      });
      
      if (response.data.success) {
        return { success: true };
      }
      
      return { success: false, error: 'Cambio password fallito' };
      
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Cambio password fallito' 
      };
    }
  },

  // Delete account
  deleteAccount: async (password) => {
    try {
      const response = await axios.delete('/user/account', {
        data: { password }
      });
      
      if (response.data.success) {
        // Clear all data
        localStorage.clear();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          syncStatus: 'idle',
          lastSync: null
        });
        return { success: true };
      }
      
      return { success: false, error: 'Eliminazione fallita' };
      
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Eliminazione account fallita'
      };
    }
  }
}));

export default useAuth;