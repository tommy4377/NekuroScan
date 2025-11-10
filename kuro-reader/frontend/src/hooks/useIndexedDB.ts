/**
 * USE INDEXED DB - React hooks for IndexedDB storage
 * Provides React-friendly interface for IndexedDB operations
 */

import { useEffect, useState, useCallback } from 'react';
import dbManager, { STORES } from '@/utils/indexedDBManager';

// ========== TYPES ==========

type StoreValue = unknown;

interface MigrationState {
  migrated: boolean;
  migrating: boolean;
}

// ========== HOOKS ==========

/**
 * Hook to manage IndexedDB storage in React
 * @param storeName - Store name (from STORES)
 * @param key - Key for the value
 * @param defaultValue - Default value if not found
 * @returns [value, setValue, isLoading, error]
 */
export function useIndexedDB<T = StoreValue>(
  storeName: keyof typeof STORES,
  key: string,
  defaultValue: T | null = null
): [T | null, (newValue: T) => Promise<boolean>, boolean, Error | null] {
  const [value, setValue] = useState<T | null>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load initial value
  useEffect(() => {
    const loadValue = async (): Promise<void> => {
      try {
        setIsLoading(true);
        const stored = await dbManager.get(STORES[storeName], key);
        setValue(stored !== null ? (stored as T) : defaultValue);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setValue(defaultValue);
      } finally {
        setIsLoading(false);
      }
    };

    loadValue();
  }, [storeName, key]); // defaultValue not in deps to avoid loop

  // Update value
  const updateValue = useCallback(async (newValue: T): Promise<boolean> => {
    try {
      await dbManager.set(STORES[storeName], key, newValue);
      setValue(newValue);
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return false;
    }
  }, [storeName, key]);

  return [value, updateValue, isLoading, error];
}

/**
 * Hook to migrate data from localStorage to IndexedDB
 * Executes migration automatically on mount
 */
export function useMigrateFromLocalStorage(): MigrationState {
  const [migrated, setMigrated] = useState(false);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    const migrate = async (): Promise<void> => {
      // Check if already migrated
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
      } catch {
        // Don't block app if migration fails
      } finally {
        setMigrating(false);
      }
    };

    migrate();
  }, []);

  return { migrated, migrating };
}

/**
 * Hook for specific IndexedDB operations with better error handling
 */
export function useIndexedDBOperations<T>(storeName: keyof typeof STORES) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const get = useCallback(async (key: string): Promise<T | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await dbManager.get(STORES[storeName], key);
      return result as T | null;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Get operation failed'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [storeName]);

  const set = useCallback(async (key: string, value: T): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      await dbManager.set(STORES[storeName], key, value);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Set operation failed'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [storeName]);

  const remove = useCallback(async (key: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      await dbManager.delete(STORES[storeName], key);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Delete operation failed'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [storeName]);

  const getAll = useCallback(async (): Promise<T[]> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await dbManager.getAll(STORES[storeName]);
      return result as T[];
    } catch (err) {
      setError(err instanceof Error ? err : new Error('GetAll operation failed'));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [storeName]);

  return {
    get,
    set,
    remove,
    getAll,
    isLoading,
    error
  };
}

export default useIndexedDB;

