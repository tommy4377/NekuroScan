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
  force?: boolean;
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
  login: (emailOrUsername: string, password: string) => Promise<any>;
  register: (username: string, email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  syncToServer: (opts?: SyncOptions) => Promise<boolean | void>;
  syncFromServer: (opts?: SyncOptions) => Promise<boolean | void>;
  startAutoSync: () => (() => void) | void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  syncFavorites: (favorites: Manga[]) => Promise<boolean>;
  syncReading: (reading: Manga[]) => Promise<boolean>;
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
    const { refreshAfter = true, force = false, reason = 'manual' } = opts;
    const token = get().token;
    if (!token) {
      console.log('⚠️ [syncToServer] No token, skipping');
      return false;
    }

    // Throttle: avoid spam if just synced (< 3s)
    const now = Date.now();
    const minGapMs = 3000;
    if (!force && now - get()._lastSyncAt < minGapMs) {
      console.log(`⏱️ [syncToServer] Throttled (${Math.round((now - get()._lastSyncAt)/1000)}s < 3s)`);
      return false;
    }

    // If sync already in flight, skip
    if (get()._syncInFlight && !force) {
      console.log('🔄 [syncToServer] Already in flight, skipping');
      return false;
    }

    const dataToSync = buildLocalPayload();
    const currentHash = hashPayload(dataToSync);
    const lastHash = get()._lastSyncedHash || localStorage.getItem('lastSyncedHash');

    console.log(`📤 [syncToServer] Syncing (${reason}):`, {
      favorites: dataToSync.favorites?.length || 0,
      reading: dataToSync.reading?.length || 0,
      completed: dataToSync.completed?.length || 0,
      dropped: dataToSync.dropped?.length || 0,
      history: dataToSync.history?.length || 0,
      progressKeys: Object.keys(dataToSync.readingProgress || {}).length
    });

    // If nothing changed and not forced, skip
    if (!force && currentHash === lastHash) {
      console.log('✅ [syncToServer] No changes detected');
      set({ lastSync: new Date().toISOString(), syncStatus: 'synced' });
      return true;
    }

    set({ syncStatus: 'syncing', _syncInFlight: true });

    try {
      const response = await axios.post(`${API_URL}/user/sync`, dataToSync);
      console.log('✅ [syncToServer] Server response:', response.data);

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

      console.log(`✅ [syncToServer] Complete (${reason})${refreshAfter ? ' + refreshed' : ''}`);
      return true;
      
    } catch (error: any) {
      console.error('❌ [syncToServer] Error:', error.response?.data || error.message);
      set({ syncStatus: 'error' });
      return false;
    } finally {
      set({ _syncInFlight: false });
    }
  },

  // SYNC FROM SERVER
  syncFromServer: async (opts: SyncOptions = {}) => {
    const { refreshAfter = true, reason = 'manual' } = opts;
    const token = get().token;
    if (!token) {
      console.log('⚠️ [syncFromServer] No token, skipping');
      return;
    }

    if (!(get().syncStatus === 'syncing' && get()._syncInFlight)) {
      set({ syncStatus: 'syncing' });
    }
    
    try {
      console.log(`📥 [syncFromServer] Fetching from server (${reason})...`);
      const response = await axios.get(`${API_URL}/user/data`);
      const {
        favorites = [],
        reading = [],
        completed = [],
        dropped = [],
        history = [],
        readingProgress = {},
        profile = {}
      } = response.data;
      
      console.log(`📥 [syncFromServer] Received:`, {
        favorites: favorites.length,
        reading: reading.length,
        completed: completed.length,
        dropped: dropped.length,
        history: history.length,
        progressKeys: Object.keys(readingProgress).length,
        profile: profile ? '✅' : '❌'
      });
      
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
          console.log('📸 [syncFromServer] Avatar saved:', profile.avatarUrl.substring(0, 50));
        } else {
          localStorage.removeItem('userAvatar');
        }
        
        if (profile.bannerUrl) {
          localStorage.setItem('userBanner', profile.bannerUrl);
          console.log('🖼️ [syncFromServer] Banner saved');
        } else {
          localStorage.removeItem('userBanner');
        }

        // Aggiorna user con profilo completo
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, profile };
          set({ user: updatedUser });
          localStorage.setItem('user', JSON.stringify(updatedUser));
          console.log('👤 [syncFromServer] User profile updated');
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

      console.log(`✅ [syncFromServer] Complete (${reason})`);
      
      if (refreshAfter) {
        window.dispatchEvent(new Event('library-updated'));
      }
      return true;
      
    } catch (error: any) {
      console.error('❌ [syncFromServer] Error:', error.response?.data || error.message);
      set({ syncStatus: 'error' });
      return false;
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
    const token = get().token;
    if (!token) {
      localStorage.setItem('favorites', JSON.stringify(favorites));
      return false;
    }

    try {
      localStorage.setItem('favorites', JSON.stringify(favorites));
      await axios.post(`${API_URL}/user/sync`, {
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

  // SYNC READING
  syncReading: async (reading: Manga[]) => {
    const token = get().token;
    if (!token) {
      localStorage.setItem('reading', JSON.stringify(reading));
      return false;
    }

    try {
      localStorage.setItem('reading', JSON.stringify(reading));
      await axios.post(`${API_URL}/user/sync`, {
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

  // PERSIST LOCAL DATA
  persistLocalData: async () => {
    if (get().isAuthenticated) {
      await get().syncToServer({ refreshAfter: false, reason: 'persist' });
    }
  }
}));

export default useAuth;

