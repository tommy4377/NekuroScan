/**
 * INDEXEDDB MANAGER - Robust storage for critical data
 * ~1GB quota vs localStorage's 5MB, with automatic fallback
 */

// ========== TYPES ==========

interface StorageEstimate {
  usage: number;
  quota: number;
  percentage: number;
  usageFormatted: string;
  quotaFormatted: string;
}

interface StoredItem<T = any> {
  id: string | number;
  value: T;
  timestamp: number;
}

type StoreMode = 'readonly' | 'readwrite';

// ========== CONSTANTS ==========

const DB_NAME = 'NeKuroScan';
const DB_VERSION = 1;

export const STORES = {
  favorites: 'favorites',
  library: 'library',
  readingProgress: 'readingProgress',
  history: 'history',
  notes: 'notes',
  customLists: 'customLists'
} as const;

type StoreName = typeof STORES[keyof typeof STORES];

const DEFAULT_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

// ========== CLASS ==========

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private readonly isSupported: boolean;

  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'indexedDB' in window;
  }

  async init(): Promise<boolean> {
    if (!this.isSupported) {
      return false;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create stores
        Object.values(STORES).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { 
              keyPath: 'id', 
              autoIncrement: true 
            });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        });
      };
    });
  }

  private async getStore(storeName: StoreName, mode: StoreMode = 'readonly'): Promise<IDBObjectStore> {
    if (!this.db) {
      await this.init();
    }
    
    const transaction = this.db!.transaction([storeName], mode);
    return transaction.objectStore(storeName);
  }

  // ========== CRUD OPERATIONS ==========

  async set<T>(storeName: StoreName, key: string, value: T): Promise<IDBValidKey> {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      const data: StoredItem<T> = {
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
      // Fallback to localStorage
      try {
        localStorage.setItem(`idb_${storeName}_${key}`, JSON.stringify(value));
      } catch {
        // Silent fail
      }
      throw error;
    }
  }

  async get<T = any>(storeName: StoreName, key: string): Promise<T | null> {
    try {
      const store = await this.getStore(storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => {
          const result = request.result as StoredItem<T> | undefined;
          resolve(result ? result.value : null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      // Fallback to localStorage
      try {
        const item = localStorage.getItem(`idb_${storeName}_${key}`);
        return item ? JSON.parse(item) : null;
      } catch {
        return null;
      }
    }
  }

  async getAll<T = any>(storeName: StoreName): Promise<Array<StoredItem<T>>> {
    try {
      const store = await this.getStore(storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const results = (request.result as StoredItem<T>[]).map(item => ({
            id: item.id,
            value: item.value,
            timestamp: item.timestamp
          }));
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  }

  async delete(storeName: StoreName, key: string): Promise<boolean> {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      
      return new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch {
      // Fallback to localStorage
      try {
        localStorage.removeItem(`idb_${storeName}_${key}`);
      } catch {
        // Silent fail
      }
      return false;
    }
  }

  async clear(storeName: StoreName): Promise<boolean> {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return false;
    }
  }

  // ========== MIGRATION ==========

  async migrateFromLocalStorage(): Promise<void> {
    const migrations: Array<{ key: string; store: StoreName }> = [
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
        }
      } catch {
        // Silent fail
      }
    }
  }

  // ========== QUOTA MANAGEMENT ==========

  async getStorageEstimate(): Promise<StorageEstimate | null> {
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      
      return {
        usage,
        quota,
        percentage: quota > 0 ? (usage / quota) * 100 : 0,
        usageFormatted: this.formatBytes(usage),
        quotaFormatted: this.formatBytes(quota)
      };
    }
    return null;
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
  }

  // ========== CLEANUP ==========

  async cleanupOldData(storeName: StoreName, maxAge: number = DEFAULT_MAX_AGE): Promise<number> {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      const index = store.index('timestamp');
      const cutoff = Date.now() - maxAge;
      
      return new Promise((resolve, reject) => {
        const request = index.openCursor();
        let deleteCount = 0;
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
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
    } catch {
      return 0;
    }
  }
}

// ========== SINGLETON ==========

const dbManager = new IndexedDBManager();

// Auto-init
if (typeof window !== 'undefined') {
  dbManager.init().catch(() => {
    // Silent fail - will fallback to localStorage
  });
}

export default dbManager;

