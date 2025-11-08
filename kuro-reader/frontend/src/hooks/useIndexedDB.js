// 🪝 HOOK: useIndexedDB - React hook per IndexedDB storage
import { useEffect, useState, useCallback } from 'react';
import dbManager, { STORES } from '../utils/indexedDBManager';

/**
 * Hook per gestire storage IndexedDB in React
 * 
 * @param {string} storeName - Nome dello store (da STORES)
 * @param {string} key - Chiave per il valore
 * @param {*} defaultValue - Valore di default se non trovato
 * @returns {[value, setValue, isLoading]} - Stato, setter, loading
 * 
 * @example
 * const [favorites, setFavorites, loading] = useIndexedDB(STORES.favorites, 'my-favorites', []);
 */
export const useIndexedDB = (storeName, key, defaultValue = null) => {
  const [value, setValue] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial value
  useEffect(() => {
    const loadValue = async () => {
      try {
        setIsLoading(true);
        const stored = await dbManager.get(storeName, key);
        setValue(stored !== null ? stored : defaultValue);
        setError(null);
      } catch (err) {
        console.error(`useIndexedDB load error (${storeName}/${key}):`, err);
        setError(err);
        setValue(defaultValue);
      } finally {
        setIsLoading(false);
      }
    };

    loadValue();
  }, [storeName, key]); // defaultValue non nelle deps per evitare loop

  // Update value
  const updateValue = useCallback(async (newValue) => {
    try {
      await dbManager.set(storeName, key, newValue);
      setValue(newValue);
      setError(null);
      return true;
    } catch (err) {
      console.error(`useIndexedDB update error (${storeName}/${key}):`, err);
      setError(err);
      return false;
    }
  }, [storeName, key]);

  return [value, updateValue, isLoading, error];
};

/**
 * Hook per migrare dati da localStorage a IndexedDB
 * Esegue la migrazione automaticamente al mount
 * 
 * @example
 * useMigrateFromLocalStorage(); // In App.jsx
 */
export const useMigrateFromLocalStorage = () => {
  const [migrated, setMigrated] = useState(false);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    const migrate = async () => {
      // Check se già migrato
      const migrationKey = 'indexeddb_migration_completed';
      if (localStorage.getItem(migrationKey) === 'true') {
        setMigrated(true);
        return;
      }

      try {
        setMigrating(true);
        
        await dbManager.migrateFromLocalStorage();
        
        // Mark migration as complete
        localStorage.setItem(migrationKey, 'true');
        setMigrated(true);
      } catch (err) {
        console.error('❌ Migration failed:', err);
        // Non bloccare l'app se la migrazione fallisce
      } finally {
        setMigrating(false);
      }
    };

    migrate();
  }, []);

  return { migrated, migrating };
};

/**
 * Hook per ottenere storage quota info
 * 
 * @example
 * const { usage, quota, percentage } = useStorageQuota();
 */
export const useStorageQuota = () => {
  const [quota, setQuota] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const estimate = await dbManager.getStorageEstimate();
        setQuota(estimate);
      } catch (err) {
        console.error('Failed to get storage estimate:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuota();
    
    // Refresh ogni 30 secondi
    const interval = setInterval(fetchQuota, 30000);
    return () => clearInterval(interval);
  }, []);

  return { ...quota, loading };
};

/**
 * Hook per cleanup automatico dati vecchi
 * 
 * @param {string} storeName - Store da pulire
 * @param {number} maxAge - Max età in ms (default 30 giorni)
 * 
 * @example
 * useAutoCleanup(STORES.history, 7 * 24 * 60 * 60 * 1000); // 7 giorni
 */
export const useAutoCleanup = (storeName, maxAge = 30 * 24 * 60 * 60 * 1000) => {
  useEffect(() => {
    const cleanup = async () => {
      try {
        const deleted = await dbManager.cleanupOldData(storeName, maxAge);
        if (deleted > 0) {
          console.log(`🧹 Cleaned up ${deleted} old items from ${storeName}`);
        }
      } catch (err) {
        console.error(`Cleanup error for ${storeName}:`, err);
      }
    };

    // Cleanup al mount
    cleanup();
    
    // Cleanup ogni giorno
    const interval = setInterval(cleanup, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [storeName, maxAge]);
};

export default useIndexedDB;

