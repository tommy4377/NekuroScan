/**
 * USE AUTH - Authentication & User Management
 * Zustand store with server sync capabilities
 * 
 * CRITICAL FIX: 2025-11-10
 * - Changed login payload from {email} to {emailOrUsername}
 * - Added comprehensive debug logging
 * - Fixed: Backend API mismatch causing 400 errors
 */

import { create } from 'zustand';
import axios from 'axios';
import { config } from '@/config';
import type { User } from '@/types';
import type { Manga } from '@/types/manga';

// ========== TYPES ==========

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SyncOptions {
  refreshAfter?: boolean;
  reason?: string;
}

interface AuthState {
  // User data
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  syncStatus: SyncStatus;
  lastSync: number | null;
  
  // Internal sync control
  _syncInFlight: boolean;
  _lastSyncedHash: string | null;
  _lastSyncAt: number;
  _autoSyncActive: boolean;
  _stopAutoSync: (() => void) | null;
}

interface AuthActions {
  initAuth: () => Promise<void>;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  syncToServer: (opts?: SyncOptions) => Promise<void>;
  syncFromServer: (opts?: SyncOptions) => Promise<void>;
  startAutoSync: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  syncFavorites: (favorites: Manga[]) => Promise<void>;
  syncReading: (reading: Manga[]) => Promise<void>;
  persistLocalData: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

// ========== CONSTANTS ==========

const API_URL = `${config.API_URL}/api`;

const USER_LOCAL_KEYS = [
  'user', 'token', 'userAvatar', 'userBanner', 'profilePublic',
  'favorites', 'reading', 'completed', 'dropped', 'history',
  'readingProgress', 'lastSyncedHash', 'notifications',
  'notificationSettings', 'userTheme', 'userPreferences'
] as const;

// ========== UTILITIES ==========

const sortDeep = (v: any): any => {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object') {
    return Object.keys(v)
      .sort()
      .reduce((acc, k) => {
        acc[k] = sortDeep(v[k]);
        return acc;
      }, {} as Record<string, any>);
  }
  return v;
};

const hashPayload = (obj: any): string => {
  try {
    return JSON.stringify(sortDeep(obj));
  } catch {
    return '';
  }
};

const readLS = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const setItemIfChanged = (key: string, value: any): void => {
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

// ========== AXIOS SETUP ==========

axios.defaults.baseURL = API_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';

const savedToken = localStorage.getItem('token');
if (savedToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}

// ========== STORE ==========

const useAuth = create<AuthStore>((set, get) => ({
  // STATE
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,
  syncStatus: 'idle',
  lastSync: null,
  
  _syncInFlight: false,
  _lastSyncedHash: localStorage.getItem('lastSyncedHash') || null,
  _lastSyncAt: 0,
  _autoSyncActive: false,
  _stopAutoSync: null,

  // INIT AUTH
  initAuth: async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    // ✅ FIX: Come JS - se abbiamo token E user, setta SUBITO lo stato
    if (token && user) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      set({ user, token, isAuthenticated: true });

      try {
        // POI verifica con server (ma UI è già loggata)
        const response = await axios.get(`${API_URL}/auth/me`);
        
        // ✅ FIX: response.data è direttamente l'user, non response.data.user
        if (response.data && response.data.username) {
          const updatedUser = response.data;
          set({ user: updatedUser });
          localStorage.setItem('user', JSON.stringify(updatedUser));
          
          // Load data from server once
          await get().syncFromServer({ reason: 'init' });
        }
      } catch (error) {
        console.error('[initAuth] Token validation failed:', error);
        // ✅ Solo se 401/403 fa logout, altrimenti mantiene sessione locale
        if ((error as any).response?.status === 401 || (error as any).response?.status === 403) {
          get().logout();
        }
      }
    } else {
      // Nessun token o user, logout pulito
      set({ isAuthenticated: false, user: null });
    }
  },

  // LOGIN
  login: async (emailOrUsername: string, password: string) => {
    set({ loading: true, error: null });
    
    try {
      console.log('[useAuth] 📤 Sending login request...');
      const response = await axios.post(`${API_URL}/auth/login`, {
        emailOrUsername: emailOrUsername.toLowerCase().trim(),  // ✅ FIX: Sanitize input
        password
      });
      console.log('[useAuth] ✅ Login response received:', response.status);

      const { token, user } = response.data;
      
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
        error: null  // ✅ Clear any previous errors
      });
      
      // Start auto-sync after login
      get().startAutoSync();
      
      // Sync local data to server
      await get().syncToServer({ reason: 'login' });
      
      console.log('[useAuth] ✅ Login complete');
      return { success: true, user };  // ✅ Return format matching old version
      
    } catch (error: any) {
      console.error('[useAuth] ❌ Login error:', error);
      const errorMessage = error.response?.data?.message || 'Login failed';
      set({ error: errorMessage, loading: false });
      return { success: false, error: errorMessage };  // ✅ Return instead of throw
    }
  },

  // REGISTER
  register: async (username: string, email: string, password: string) => {
    set({ loading: true, error: null });
    
    try {
      console.log('[useAuth] 📤 Sending register request...');
      const response = await axios.post(`${API_URL}/auth/register`, {
        username: username.toLowerCase().trim(),  // ✅ FIX: Sanitize input
        email: email.toLowerCase().trim(),        // ✅ FIX: Sanitize input
        password
      });
      console.log('[useAuth] ✅ Register response received:', response.status);

      const { token, user } = response.data;
      
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
      
      // Start auto-sync
      get().startAutoSync();
      
      // Sync from server
      await get().syncFromServer({ reason: 'register' });
      
      console.log('[useAuth] ✅ Register complete');
      return { success: true, user };  // ✅ Return format matching old version
      
    } catch (error: any) {
      console.error('[useAuth] ❌ Register error:', error);
      const errorMessage = error.response?.data?.message || 'Registration failed';
      set({ error: errorMessage, loading: false });
      return { success: false, error: errorMessage };  // ✅ Return instead of throw
    }
  },

  // LOGOUT
  logout: async () => {
    // Stop auto-sync
    const stopFn = get()._stopAutoSync;
    if (stopFn) stopFn();
    
    // Clear localStorage
    USER_LOCAL_KEYS.forEach(key => localStorage.removeItem(key));
    
    // Clear axios auth
    delete axios.defaults.headers.common['Authorization'];
    
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      _syncInFlight: false,
      _lastSyncedHash: null,
      _autoSyncActive: false,
      _stopAutoSync: null
    });
  },

  // SYNC TO SERVER
  syncToServer: async (opts: SyncOptions = {}) => {
    const { refreshAfter = false } = opts;
    const state = get();
    
    if (!state.isAuthenticated || state._syncInFlight) return;
    
    const payload = buildLocalPayload();
    const currentHash = hashPayload(payload);
    
    // Skip if no changes
    if (currentHash === state._lastSyncedHash) {
      return;
    }
    
    set({ _syncInFlight: true, syncStatus: 'syncing' });
    
    try {
      await axios.post(`${API_URL}/user/sync`, payload);
      
      set({
        _syncInFlight: false,
        _lastSyncedHash: currentHash,
        _lastSyncAt: Date.now(),
        syncStatus: 'success',
        lastSync: Date.now()
      });
      
      localStorage.setItem('lastSyncedHash', currentHash);
      
      if (refreshAfter) {
        await get().syncFromServer({ refreshAfter: false });
      }
    } catch (error) {
      set({ 
        _syncInFlight: false,
        syncStatus: 'error'
      });
    }
  },

  // SYNC FROM SERVER
  syncFromServer: async (opts: SyncOptions = {}) => {
    const { refreshAfter = true } = opts;
    const state = get();
    
    if (!state.isAuthenticated) return;
    
    try {
      const response = await axios.get(`${API_URL}/user/data`);
      const { favorites, reading, completed, dropped } = response.data;
      
      // Update localStorage
      setItemIfChanged('favorites', favorites || []);
      setItemIfChanged('reading', reading || []);
      setItemIfChanged('completed', completed || []);
      setItemIfChanged('dropped', dropped || []);
      
      set({ lastSync: Date.now() });
      
      if (refreshAfter) {
        window.dispatchEvent(new Event('library-updated'));
      }
    } catch (error) {
      // Silent fail
    }
  },

  // START AUTO-SYNC
  startAutoSync: () => {
    const state = get();
    if (state._autoSyncActive) return;
    
    set({ _autoSyncActive: true });
    
    const interval = setInterval(() => {
      const current = get();
      if (current.isAuthenticated) {
        current.syncToServer({ refreshAfter: false });
      }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    const stopFn = () => {
      clearInterval(interval);
      set({ _autoSyncActive: false, _stopAutoSync: null });
    };
    
    set({ _stopAutoSync: stopFn });
  },

  // UPDATE PROFILE
  updateProfile: async (updates: Partial<User>) => {
    const state = get();
    if (!state.user) return;
    
    try {
      const response = await axios.put(`${API_URL}/user/profile`, updates);
      
      if (response.data.success) {
        const updatedUser = { ...state.user, ...updates };
        set({ user: updatedUser });
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      throw error;
    }
  },

  // SYNC FAVORITES
  syncFavorites: async (favorites: Manga[]) => {
    setItemIfChanged('favorites', favorites);
    await get().syncToServer({ refreshAfter: false });
  },

  // SYNC READING
  syncReading: async (reading: Manga[]) => {
    setItemIfChanged('reading', reading);
    await get().syncToServer({ refreshAfter: false });
  },

  // PERSIST LOCAL DATA
  persistLocalData: async () => {
    await get().syncToServer({ refreshAfter: false });
  }
}));

export default useAuth;

