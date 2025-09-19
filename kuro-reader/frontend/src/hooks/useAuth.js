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
  syncStatus: 'idle', // idle, syncing, synced, error
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
          
          // Restore user-specific data
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
      
      // Save auth data
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
      
      // Restore user data
      get().restoreUserData(user.id);
      
      // Sync from server
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
      
      // Save current local data for this user
      get().persistUserData(user.id);
      
      // Sync to server
      await get().syncToServer();
      
      return { success: true, user };
      
    } catch (error) {
      const message = error.response?.data?.message || 'Registrazione fallita';
      set({ error: message, loading: false });
      return { success: false, error: message };
    }
  },

  // Logout
  logout: () => {
    const userId = get().user?.id;
    
    // Save user data before logout
    if (userId) {
      get().persistUserData(userId);
    }
    
    // Clear auth
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    
    // Clear temporary data
    localStorage.removeItem('userAvatar');
    
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
      preferredFitMode: localStorage.getItem('preferredFitMode')
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
      
      // Restore each item if it exists
      Object.entries(userData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          localStorage.setItem(key, value);
        }
      });
      
    } catch (error) {
      console.error('Error restoring user data:', error);
    }
  },

  // Persist just local data (called before logout)
  persistLocalData: async () => {
    const userId = get().user?.id;
    if (userId) {
      get().persistUserData(userId);
      
      // Try to sync to server one last time
      if (get().isAuthenticated) {
        try {
          await get().syncToServer();
        } catch (error) {
          console.error('Final sync failed:', error);
        }
      }
    }
  },

  // Sync to server
  syncToServer: async () => {
    const token = get().token;
    if (!token) return;
    
    set({ syncStatus: 'syncing' });
    
    try {
      // Favorites
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      if (favorites.length > 0) {
        await axios.post('/user/favorites', { favorites });
      }
      
      // Library data
      const reading = JSON.parse(localStorage.getItem('reading') || '[]');
      const completed = JSON.parse(localStorage.getItem('completed') || '[]');
      const history = JSON.parse(localStorage.getItem('history') || '[]');
      
      await axios.post('/user/library', { reading, completed, history });
      
      // Reading progress - batch update
      const readingProgress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
      const progressArray = Object.entries(readingProgress).map(([mangaUrl, progress]) => ({
        mangaUrl,
        mangaTitle: progress.chapterTitle || '',
        chapterIndex: progress.chapterIndex || 0,
        pageIndex: progress.page || 0
      }));
      
      if (progressArray.length > 0) {
        // Send in batches of 10
        for (let i = 0; i < progressArray.length; i += 10) {
          const batch = progressArray.slice(i, i + 10);
          await Promise.all(batch.map(p => 
            axios.post('/user/progress', p).catch(e => console.error('Progress sync error:', e))
          ));
        }
      }
      
      set({ 
        syncStatus: 'synced', 
        lastSync: new Date().toISOString() 
      });
      
    } catch (error) {
      console.error('Sync to server error:', error);
      set({ syncStatus: 'error' });
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
      
      // Merge favorites
      const localFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      const mergedFavorites = get().mergeArrays(favorites, localFavorites, 'url');
      localStorage.setItem('favorites', JSON.stringify(mergedFavorites));
      
      // Merge library
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
            timestamp: progress.updatedAt
          };
        }
      });
      localStorage.setItem('readingProgress', JSON.stringify(localProgress));
      
      set({ 
        syncStatus: 'synced',
        lastSync: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Sync from server error:', error);
      set({ syncStatus: 'error' });
    }
  },

  // Helper: merge arrays keeping most recent
  mergeArrays: (serverArray, localArray, key) => {
    const merged = new Map();
    
    // Add server items
    serverArray?.forEach(item => {
      merged.set(item[key], item);
    });
    
    // Add/update local items
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
    }, 60000); // Every minute
    
    return () => clearInterval(interval);
  },

  // Update user profile
  updateProfile: async (updates) => {
    set({ loading: true });
    
    try {
      const response = await axios.put('/user/profile', updates);
      const updatedUser = response.data.user;
      
      set({ user: updatedUser, loading: false });
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return { success: true, user: updatedUser };
      
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
      await axios.post('/auth/change-password', { oldPassword, newPassword });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Cambio password fallito' 
      };
    }
  }
}));

export default useAuth;
