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
import { cleanupOrphanedLocalStorageData } from '@/utils/cleanupLocalStorage'; // ✅ Pulizia dati orfani

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

// API_URL includes /api - so paths should be relative to /api (e.g., /auth/login, not /api/auth/login)
const API_URL = config.API_URL ? `${config.API_URL}/api` : '/api';

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
    if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }
  } catch {
    // Silent fail
  }
  return fallback;
};

const setItemIfChanged = (key: string, value: any): void => {
  try {
    if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
      const newStr = JSON.stringify(value);
      const oldStr = localStorage.getItem(key);
      if (oldStr !== newStr) localStorage.setItem(key, newStr);
    }
  } catch {
    // Silent fail
  }
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

// baseURL should be the base (without /api) - paths in axios calls include /api
axios.defaults.baseURL = config.API_URL || '';
axios.defaults.headers.common['Content-Type'] = 'application/json';

// ✅ MOBILE FIX: Try-catch per localStorage access at top level
try {
  if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    }
  }
} catch (e) {
  // Silent fail - localStorage non disponibile (modalità privata)
}

// ========== STORE ==========

// ✅ MOBILE FIX: Helper function per leggere localStorage in modo sicuro
const safeGetItem = (key: string, fallback: any = null): any => {
  try {
    if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch (e) {
    // Silent fail
  }
  return fallback;
};

const safeParseItem = (key: string, fallback: any = null): any => {
  try {
    if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    }
  } catch (e) {
    // Silent fail
  }
  return fallback;
};

const useAuth = create<AuthStore>((set, get) => ({
  // STATE
  // ✅ MOBILE FIX: Usa helper functions per accesso sicuro
  user: safeParseItem('user', null),
  token: safeGetItem('token'),
  isAuthenticated: !!safeGetItem('token'),
  loading: false,
  error: null,
  syncStatus: 'idle',
  lastSync: null,
  
  _syncInFlight: false,
  _lastSyncedHash: safeGetItem('lastSyncedHash'),
  _lastSyncAt: 0,
  _autoSyncActive: false,
  _stopAutoSync: null,

  // INIT AUTH
  initAuth: async () => {
    // ✅ MOBILE FIX: Try-catch per localStorage access
    let token: string | null = null;
    let user: any = null;
    
    try {
      if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
        token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        user = userStr ? JSON.parse(userStr) : null;
      }
    } catch (e) {
      // Silent fail - localStorage non disponibile
      set({ isAuthenticated: false, user: null });
      return;
    }
    
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
          // ✅ MOBILE FIX: Try-catch per localStorage.setItem
          try {
            if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
              localStorage.setItem('user', JSON.stringify(updatedUser));
            }
          } catch (e) {
            // Silent fail
          }
          
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
      
      // ✅ MOBILE FIX: Try-catch per localStorage operations
      try {
        if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
          // ✅ PULISCI TUTTO PRIMA DI SALVARE I NUOVI DATI
          USER_LOCAL_KEYS.forEach(key => {
            try {
              localStorage.removeItem(key);
            } catch (e) {
              // Silent fail per ogni removeItem
            }
          });
          
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
        }
      } catch (e) {
        // Silent fail - localStorage non disponibile
        console.warn('[useAuth.login] localStorage not available, continuing without persistence');
      }
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      set({ 
        user, 
        token, 
        isAuthenticated: true, 
        loading: false,
        error: null  // ✅ Clear any previous errors
      });
      
      // ✅ FIX CRITICO: Prima SCARICA dal server, POI synca eventuale locale
      console.log('[useAuth] 📥 Loading data from server...');
      await get().syncFromServer({ reason: 'login' });
      
      // POI synca eventuale dato locale che era già presente
      console.log('[useAuth] 📤 Syncing local data to server...');
      await get().syncToServer({ reason: 'login-merge', force: true });
      
      // ✅ FIX: Pulisci dati orfani dopo sync
      console.log('[useAuth] 🧹 Cleaning orphaned data...');
      cleanupOrphanedLocalStorageData();
      
      // Start auto-sync after login
      get().startAutoSync();
      
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
      
      // ✅ MOBILE FIX: Try-catch per localStorage operations
      try {
        if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
          // ✅ PULISCI TUTTO PRIMA DI SALVARE I NUOVI DATI
          USER_LOCAL_KEYS.forEach(key => {
            try {
              localStorage.removeItem(key);
            } catch (e) {
              // Silent fail per ogni removeItem
            }
          });
          
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
        }
      } catch (e) {
        // Silent fail - localStorage non disponibile
        console.warn('[useAuth.login] localStorage not available, continuing without persistence');
      }
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      set({ 
        user, 
        token, 
        isAuthenticated: true, 
        loading: false,
        error: null
      });
      
      // ✅ FIX: Al register non ci sono dati vecchi, quindi non synca
      console.log('[useAuth] 📥 Loading data from server (should be empty for new user)...');
      await get().syncFromServer({ reason: 'register' });
      
      // Start auto-sync
      get().startAutoSync();
      
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
    // ✅ MOBILE FIX: Try-catch per localStorage access
    let lastHash = get()._lastSyncedHash;
    if (!lastHash) {
      try {
        if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
          lastHash = localStorage.getItem('lastSyncedHash');
        }
      } catch (e) {
        // Silent fail
      }
    }

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
      // ✅ MOBILE FIX: Try-catch per localStorage.setItem
      try {
        if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
          localStorage.setItem('lastSyncedHash', currentHash);
        }
      } catch (e) {
        // Silent fail
      }

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
        // ✅ MOBILE FIX: Try-catch per tutte le operazioni localStorage
        try {
          if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
            // Salva stato pubblico
            localStorage.setItem('profilePublic', profile.isPublic ? 'true' : 'false');
            
            // ✅ SALVA AVATAR E BANNER
            if (profile.avatarUrl) {
              localStorage.setItem('userAvatar', profile.avatarUrl);
              console.log('📸 [syncFromServer] Avatar saved:', profile.avatarUrl.substring(0, 50));
            } else {
              try {
                localStorage.removeItem('userAvatar');
              } catch (e) {
                // Silent fail
              }
            }
            
            if (profile.bannerUrl) {
              localStorage.setItem('userBanner', profile.bannerUrl);
              console.log('🖼️ [syncFromServer] Banner saved');
            } else {
              try {
                localStorage.removeItem('userBanner');
              } catch (e) {
                // Silent fail
              }
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
        } catch (e) {
          console.warn('[syncFromServer] localStorage operations failed:', e);
        }
      }

      // Update hash and state
      const newHash = hashPayload({ favorites, reading, completed, dropped, history, readingProgress });
      set({ _lastSyncedHash: newHash, _lastSyncAt: Date.now() });
      // ✅ MOBILE FIX: Try-catch per localStorage.setItem
      try {
        if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
          localStorage.setItem('lastSyncedHash', newHash);
        }
      } catch (e) {
        // Silent fail
      }

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
        // ✅ MOBILE FIX: Try-catch per localStorage.setItem
        try {
          if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        } catch (e) {
          // Silent fail
        }
      }
    } catch (error) {
      throw error;
    }
  },

  // SYNC FAVORITES
  syncFavorites: async (favorites: Manga[]) => {
    const token = get().token;
    if (!token) {
      // ✅ MOBILE FIX: Try-catch per localStorage.setItem
      try {
        if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
          localStorage.setItem('favorites', JSON.stringify(favorites));
        }
      } catch (e) {
        // Silent fail
      }
      return false;
    }

    try {
      // ✅ MOBILE FIX: Try-catch per localStorage.setItem
      try {
        if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
          localStorage.setItem('favorites', JSON.stringify(favorites));
        }
      } catch (e) {
        // Silent fail
      }
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
      // ✅ MOBILE FIX: Try-catch per localStorage.setItem
      try {
        if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
          localStorage.setItem('reading', JSON.stringify(reading));
        }
      } catch (e) {
        // Silent fail
      }
      return false;
    }

    try {
      // ✅ MOBILE FIX: Try-catch per localStorage.setItem
      try {
        if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
          localStorage.setItem('reading', JSON.stringify(reading));
        }
      } catch (e) {
        // Silent fail
      }
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

