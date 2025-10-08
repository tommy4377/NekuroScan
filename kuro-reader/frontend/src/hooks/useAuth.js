// ✅ USEAUTH.JS v3.8 - PULIZIA COMPLETA LOCALSTORAGE
import { create } from 'zustand';
import axios from 'axios';
import { config } from '../config';

const API_URL = `${config.API_URL}/api`;

// ✅ AXIOS SETUP
axios.defaults.baseURL = API_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';

const savedToken = localStorage.getItem('token');
if (savedToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}

// ========= UTILS =========
const sortDeep = (v) => {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object') {
    return Object.keys(v)
      .sort()
      .reduce((acc, k) => {
        acc[k] = sortDeep(v[k]);
        return acc;
      }, {});
  }
  return v;
};

const hashPayload = (obj) => {
  try {
    return JSON.stringify(sortDeep(obj));
  } catch {
    return '';
  }
};

const readLS = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const setItemIfChanged = (key, value) => {
  const newStr = JSON.stringify(value);
  const oldStr = localStorage.getItem(key);
  if (oldStr !== newStr) localStorage.setItem(key, newStr);
};

const buildLocalPayload = () => ({
  favorites: readLS('favorites', []),
  reading: readLS('reading', []),
  completed: readLS('completed', []),
  dropped: readLS('dropped', []),
  history: readLS('history', []),
  readingProgress: readLS('readingProgress', {})
});

// ✅ LISTA COMPLETA CHIAVI LOCALSTORAGE DA PULIRE
const USER_LOCAL_KEYS = [
  'user',
  'token',
  'userAvatar',
  'userBanner',
  'profilePublic',
  'favorites',
  'reading',
  'completed',
  'dropped',
  'history',
  'readingProgress',
  'lastSyncedHash',
  'notifications',
  'notificationSettings',
  'userTheme',
  'userPreferences'
];

const useAuth = create((set, get) => ({
  // ========= STATE =========
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,
  syncStatus: 'idle',
  lastSync: null,

  // Anti-loop internals
  _syncInFlight: false,
  _lastSyncedHash: localStorage.getItem('lastSyncedHash') || null,
  _lastSyncAt: 0,
  _autoSyncActive: false,
  _stopAutoSync: null,

  // ========= INIT AUTH =========
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
          // Load data from server once
          await get().syncFromServer({ reason: 'init' });
        }
      } catch (error) {
        console.error('Token validation failed:', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          get().logout();
        }
      }
    }
  },

  // ========= LOGIN =========
  login: async (emailOrUsername, password) => {
    set({ loading: true, error: null });
    
    try {
      const response = await axios.post('/auth/login', {
        emailOrUsername: emailOrUsername.toLowerCase().trim(),
        password
      });

      const { user, token } = response.data;
      
      // ✅ PULISCI TUTTO PRIMA DI SALVARE I NUOVI DATI
      USER_LOCAL_KEYS.forEach(key => localStorage.removeItem(key));
      
      // Salva nuovi dati
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

      // Carica dati dal server
      await get().syncFromServer({ reason: 'login' });

      return { success: true, user };
      
    } catch (error) {
      console.warn('Backend login failed, trying offline mode:', error.message);
      
      // Fallback: modalità offline
      if (error.code === 'ERR_NETWORK' || error.message.includes('CORS') || error.message.includes('NetworkError')) {
        // Crea un utente temporaneo per modalità offline
        const offlineUser = {
          id: Date.now(),
          username: emailOrUsername.toLowerCase().trim(),
          email: emailOrUsername.includes('@') ? emailOrUsername.toLowerCase().trim() : `${emailOrUsername}@offline.local`,
          isOffline: true
        };
        
        // ✅ PULISCI TUTTO PRIMA DI SALVARE I NUOVI DATI
        USER_LOCAL_KEYS.forEach(key => localStorage.removeItem(key));
        
        // Salva utente offline
        localStorage.setItem('user', JSON.stringify(offlineUser));
        localStorage.setItem('token', 'offline-token');
        
        set({
          user: offlineUser,
          token: 'offline-token',
          isAuthenticated: true,
          loading: false,
          error: null
        });
        
        return { 
          success: true, 
          user: offlineUser,
          isOffline: true 
        };
      }
      
      const message = error.response?.data?.message || 'Login fallito';
      set({ error: message, loading: false });
      return { success: false, error: message };
    }
  },

  // ========= REGISTER =========
  register: async (username, email, password) => {
    set({ loading: true, error: null });
    
    try {
      const response = await axios.post('/auth/register', {
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        password
      });

      const { user, token } = response.data;
      
      // ✅ PULISCI TUTTO PRIMA DI SALVARE I NUOVI DATI
      USER_LOCAL_KEYS.forEach(key => localStorage.removeItem(key));
      
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

      await get().syncFromServer({ reason: 'register' });

      return { success: true, user };
      
    } catch (error) {
      console.warn('Backend register failed, trying offline mode:', error.message);
      
      // Fallback: modalità offline
      if (error.code === 'ERR_NETWORK' || error.message.includes('CORS') || error.message.includes('NetworkError')) {
        // Crea un utente temporaneo per modalità offline
        const offlineUser = {
          id: Date.now(),
          username: username.toLowerCase().trim(),
          email: email.toLowerCase().trim(),
          isOffline: true
        };
        
        // ✅ PULISCI TUTTO PRIMA DI SALVARE I NUOVI DATI
        USER_LOCAL_KEYS.forEach(key => localStorage.removeItem(key));
        
        // Salva utente offline
        localStorage.setItem('user', JSON.stringify(offlineUser));
        localStorage.setItem('token', 'offline-token');
        
        set({
          user: offlineUser,
          token: 'offline-token',
          isAuthenticated: true,
          loading: false,
          error: null
        });
        
        return { 
          success: true, 
          user: offlineUser,
          isOffline: true 
        };
      }
      
      const message = error.response?.data?.message || 'Registrazione fallita';
      set({ error: message, loading: false });
      return { success: false, error: message };
    }
  },

  // ========= LOGOUT =========
  logout: async () => {
    const state = get();
    
    if (state.isAuthenticated) {
      try {
        await get().syncToServer({ force: true, refreshAfter: false, reason: 'logout' });
      } catch (error) {
        console.error('Sync before logout failed:', error);
      }
    }

    // Stop autosync if running
    try {
      const stop = get()._stopAutoSync;
      if (stop) stop();
    } catch {}

    // ✅ PULISCI TUTTO IL LOCALSTORAGE RELATIVO ALL'UTENTE
    USER_LOCAL_KEYS.forEach(key => localStorage.removeItem(key));
    
    delete axios.defaults.headers.common['Authorization'];

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
      syncStatus: 'idle',
      lastSync: null,
      _lastSyncedHash: null,
      _syncInFlight: false,
      _lastSyncAt: 0
    });
  },

  // ========= SYNC TO SERVER =========
  syncToServer: async (opts = {}) => {
    const { refreshAfter = true, force = false, reason = 'manual' } = opts;
    const token = get().token;
    if (!token) return false;

    // Throttle: avoid spam if just synced (< 3s)
    const now = Date.now();
    const minGapMs = 3000;
    if (!force && now - get()._lastSyncAt < minGapMs) {
      return false;
    }

    // If sync already in flight, skip
    if (get()._syncInFlight && !force) {
      return false;
    }

    const dataToSync = buildLocalPayload();
    const currentHash = hashPayload(dataToSync);
    const lastHash = get()._lastSyncedHash || localStorage.getItem('lastSyncedHash');

    // If nothing changed and not forced, skip
    if (!force && currentHash === lastHash) {
      set({ lastSync: new Date().toISOString(), syncStatus: 'synced' });
      return true;
    }

    set({ syncStatus: 'syncing', _syncInFlight: true });

    try {
      await axios.post('/user/sync', dataToSync);

      // Update hash and timestamp
      set({ _lastSyncedHash: currentHash, _lastSyncAt: Date.now() });
      localStorage.setItem('lastSyncedHash', currentHash);

      // Optional refresh
      if (refreshAfter) {
        await get().syncFromServer({ reason: `after-sync:${reason}` });
      } else {
        set({
          syncStatus: 'synced',
          lastSync: new Date().toISOString()
        });
      }

      console.log(`✅ Synced (${reason})${refreshAfter ? ' + refreshed' : ''}`);
      return true;
      
    } catch (error) {
      console.error('❌ Sync to server error:', error);
      set({ syncStatus: 'error' });
      return false;
    } finally {
      set({ _syncInFlight: false });
    }
  },

  // ========= SYNC FROM SERVER (with complete profile data) =========
  syncFromServer: async (opts = {}) => {
    const { reason = 'manual' } = opts;
    const token = get().token;
    if (!token) return false;

    if (!(get().syncStatus === 'syncing' && get()._syncInFlight)) {
      set({ syncStatus: 'syncing' });
    }

    try {
      const response = await axios.get('/user/data');
      const {
        favorites = [],
        reading = [],
        completed = [],
        dropped = [],
        history = [],
        readingProgress = {},
        profile = {}
      } = response.data;

      // ✅ SALVA TUTTI I DATI (incluso profilo completo)
      setItemIfChanged('favorites', favorites);
      setItemIfChanged('reading', reading);
      setItemIfChanged('completed', completed);
      setItemIfChanged('dropped', dropped);
      setItemIfChanged('history', history);
      setItemIfChanged('readingProgress', readingProgress);

      // ✅ SALVA DATI PROFILO
      if (profile) {
        // Salva stato pubblico
        localStorage.setItem('profilePublic', profile.isPublic ? 'true' : 'false');
        
        // ✅ SALVA AVATAR E BANNER
        if (profile.avatarUrl) {
          localStorage.setItem('userAvatar', profile.avatarUrl);
        } else {
          localStorage.removeItem('userAvatar');
        }
        
        if (profile.bannerUrl) {
          localStorage.setItem('userBanner', profile.bannerUrl);
        } else {
          localStorage.removeItem('userBanner');
        }

        // Aggiorna user con profilo completo
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, profile };
          set({ user: updatedUser });
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      }

      // Update hash and state
      const newHash = hashPayload({ favorites, reading, completed, dropped, history, readingProgress });
      set({ _lastSyncedHash: newHash, _lastSyncAt: Date.now() });
      localStorage.setItem('lastSyncedHash', newHash);

      set({
        syncStatus: 'synced',
        lastSync: new Date().toISOString()
      });

      console.log(`✅ Data loaded from server (${reason})`);
      return true;
      
    } catch (error) {
      console.error('❌ Sync from server error:', error);
      set({ syncStatus: 'error' });
      return false;
    }
  },

  // ========= AUTO SYNC =========
  startAutoSync: () => {
    const state = get();
    if (state._autoSyncActive) {
      return state._stopAutoSync || (() => {});
    }

    const tick = () => {
      if (get().isAuthenticated) {
        get().syncToServer({ refreshAfter: false, reason: 'autosync' });
      }
    };

    const interval = setInterval(tick, 30000); // Every 30s
    
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    window.addEventListener('visibilitychange', onVisibility);

    const cleanup = () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', onVisibility);
      set({ _autoSyncActive: false, _stopAutoSync: null });
    };

    set({ _autoSyncActive: true, _stopAutoSync: cleanup });
    return cleanup;
  },

  // ========= UPDATE PROFILE =========
  updateProfile: async (updates) => {
    set({ loading: true });
    
    try {
      const response = await axios.put('/user/profile', updates);
      
      if (response.data.success && response.data.profile) {
        const profile = response.data.profile;
        const updatedUser = { ...get().user, profile };
        
        // Aggiorna stato
        set({ user: updatedUser, loading: false });
        
        // ✅ SALVA TUTTO NEL LOCALSTORAGE
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('profilePublic', profile.isPublic ? 'true' : 'false');
        
        if (profile.avatarUrl) {
          localStorage.setItem('userAvatar', profile.avatarUrl);
        } else {
          localStorage.removeItem('userAvatar');
        }
        
        if (profile.bannerUrl) {
          localStorage.setItem('userBanner', profile.bannerUrl);
        } else {
          localStorage.removeItem('userBanner');
        }
        
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

  // ========= SYNC SHORTCUTS =========
  syncFavorites: async (favorites) => {
    const token = get().token;
    if (!token) {
      localStorage.setItem('favorites', JSON.stringify(favorites));
      return false;
    }

    try {
      localStorage.setItem('favorites', JSON.stringify(favorites));
      await axios.post('/user/sync', {
        ...buildLocalPayload(),
        favorites
      });
      await get().syncFromServer({ reason: 'favorites' });
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
        ...buildLocalPayload(),
        reading
      });
      await get().syncFromServer({ reason: 'reading' });
      return true;
    } catch (error) {
      console.error('❌ Failed to sync reading list:', error);
      return false;
    }
  },

  // ========= PERSIST LOCAL DATA =========
  persistLocalData: async () => {
    if (get().isAuthenticated) {
      await get().syncToServer({ refreshAfter: false, reason: 'persist' });
    }
  }
}));

export default useAuth;