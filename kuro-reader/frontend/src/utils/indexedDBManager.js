// 💾 INDEXEDDB MANAGER - Storage robusto per dati critici (quota ~1GB vs localStorage 5MB)

const DB_NAME = 'NeKuroScan';
const DB_VERSION = 1;
const STORES = {
  favorites: 'favorites',
  library: 'library',
  readingProgress: 'readingProgress',
  history: 'history',
  notes: 'notes',
  customLists: 'customLists'
};

class IndexedDBManager {
  constructor() {
    this.db = null;
    this.isSupported = 'indexedDB' in window;
  }

  async init() {
    if (!this.isSupported) {
      console.warn('IndexedDB not supported, falling back to localStorage');
      return false;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create stores if they don't exist
        Object.values(STORES).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        });
      };
    });
  }

  async getStore(storeName, mode = 'readonly') {
    if (!this.db) {
      await this.init();
    }
    
    const transaction = this.db.transaction([storeName], mode);
    return transaction.objectStore(storeName);
  }

  // ========== CRUD OPERATIONS ==========

  async set(storeName, key, value) {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      const data = {
        id: key,
        value,
        timestamp: Date.now()
      };
      
      return new Promise((resolve, reject) => {
        const request = store.put(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`IndexedDB set error (${storeName}):`, error);
      // Fallback to localStorage
      try {
        localStorage.setItem(`idb_${storeName}_${key}`, JSON.stringify(value));
      } catch (e) {
        console.error('localStorage fallback failed:', e);
      }
      throw error;
    }
  }

  async get(storeName, key) {
    try {
      const store = await this.getStore(storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.value : null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`IndexedDB get error (${storeName}):`, error);
      // Fallback to localStorage
      try {
        const item = localStorage.getItem(`idb_${storeName}_${key}`);
        return item ? JSON.parse(item) : null;
      } catch (e) {
        return null;
      }
    }
  }

  async getAll(storeName) {
    try {
      const store = await this.getStore(storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const results = request.result.map(item => ({
            id: item.id,
            value: item.value,
            timestamp: item.timestamp
          }));
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`IndexedDB getAll error (${storeName}):`, error);
      return [];
    }
  }

  async delete(storeName, key) {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      
      return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`IndexedDB delete error (${storeName}):`, error);
      // Fallback to localStorage
      try {
        localStorage.removeItem(`idb_${storeName}_${key}`);
      } catch (e) {
        // Silent fail
      }
      return false;
    }
  }

  async clear(storeName) {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`IndexedDB clear error (${storeName}):`, error);
      return false;
    }
  }

  // ========== MIGRATION FROM LOCALSTORAGE ==========

  async migrateFromLocalStorage() {
    const migrations = [
      { key: 'favorites', store: STORES.favorites },
      { key: 'reading', store: STORES.library },
      { key: 'completed', store: STORES.library },
      { key: 'dropped', store: STORES.library },
      { key: 'history', store: STORES.history },
      { key: 'readingProgress', store: STORES.readingProgress },
      { key: 'customLists', store: STORES.customLists }
    ];

    for (const { key, store } of migrations) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          await this.set(store, key, parsed);
          console.log(`✅ Migrated ${key} to IndexedDB`);
        }
      } catch (error) {
        console.error(`Migration error for ${key}:`, error);
      }
    }
  }

  // ========== QUOTA MANAGEMENT ==========

  async getStorageEstimate() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        percentage: (estimate.usage / estimate.quota) * 100,
        usageFormatted: this.formatBytes(estimate.usage),
        quotaFormatted: this.formatBytes(estimate.quota)
      };
    }
    return null;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // ========== CLEANUP OLD DATA ==========

  async cleanupOldData(storeName, maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 giorni default
    try {
      const store = await this.getStore(storeName, 'readwrite');
      const index = store.index('timestamp');
      const cutoff = Date.now() - maxAge;
      
      return new Promise((resolve, reject) => {
        const request = index.openCursor();
        let deleteCount = 0;
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            if (cursor.value.timestamp < cutoff) {
              cursor.delete();
              deleteCount++;
            }
            cursor.continue();
          } else {
            resolve(deleteCount);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`Cleanup error for ${storeName}:`, error);
      return 0;
    }
  }
}

// Singleton instance
const dbManager = new IndexedDBManager();

// Auto-init on load
if (typeof window !== 'undefined') {
  dbManager.init().catch(err => {
    console.error('IndexedDB init failed:', err);
  });
}

export { STORES };
export default dbManager;

