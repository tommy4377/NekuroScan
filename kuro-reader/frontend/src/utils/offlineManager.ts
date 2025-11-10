/**
 * OFFLINE MANAGER - Offline chapter download system
 * Uses IndexedDB for complete chapter storage with images
 */

import type { Manga, Chapter } from '@/types/manga';

// ========== TYPES ==========

interface DownloadProgress {
  current: number;
  total: number;
  percentage: number;
}

interface DownloadError {
  index: number;
  url: string;
  error: string;
}

interface DownloadResult {
  success: boolean;
  message?: string;
  chapter?: ChapterData;
  downloaded?: number;
  total?: number;
  errors?: DownloadError[];
  alreadyDownloaded?: boolean;
  error?: string;
}

interface DeleteResult {
  success: boolean;
  deletedImages?: number;
  error?: string;
}

interface StorageInfo {
  used: number;
  quota: number;
  usedMB: string;
  quotaMB: string;
  percentage: string;
}

interface ChapterData {
  id: string;
  mangaUrl: string;
  mangaTitle: string;
  mangaCover: string | undefined;
  chapterUrl: string;
  chapterTitle: string;
  chapterIndex: number;
  source: string;
  pages: string[];
  downloadedImages: string[];
  downloadDate: string;
  size: number;
  chapters: Chapter[] | undefined;
}

interface ImageData {
  url: string;
  blob: Blob;
  chapterId: string;
}

type ProgressCallback = (progress: DownloadProgress) => void;

// ========== CONSTANTS ==========

const DB_NAME = 'NeKuroOffline';
const DB_VERSION = 1;
const STORES = {
  CHAPTERS: 'chapters',
  IMAGES: 'images'
} as const;

const FETCH_TIMEOUT = 15000; // 15s
const PROXY_TIMEOUT = 20000; // 20s

// ========== CLASS ==========

class OfflineManager {
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Chapters store
        if (!db.objectStoreNames.contains(STORES.CHAPTERS)) {
          const chapterStore = db.createObjectStore(STORES.CHAPTERS, { keyPath: 'id' });
          chapterStore.createIndex('mangaUrl', 'mangaUrl', { unique: false });
          chapterStore.createIndex('downloadDate', 'downloadDate', { unique: false });
        }

        // Images store
        if (!db.objectStoreNames.contains(STORES.IMAGES)) {
          const imageStore = db.createObjectStore(STORES.IMAGES, { keyPath: 'url' });
          imageStore.createIndex('chapterId', 'chapterId', { unique: false });
        }
      };
    });
  }

  async downloadChapter(
    manga: Manga,
    chapter: Chapter,
    chapterIndex: number,
    source: string,
    onProgress: ProgressCallback | null = null
  ): Promise<DownloadResult> {
    try {
      if (!this.db) await this.initDB();

      const chapterId = `${manga.url}-${chapter.url}`;
      
      // Check if already downloaded
      const existing = await this.getChapter(chapterId);
      if (existing) {
        return { success: true, message: 'Chapter already downloaded', alreadyDownloaded: true };
      }

      // Validate pages
      if (!chapter.pages || !Array.isArray(chapter.pages) || chapter.pages.length === 0) {
        throw new Error('No pages to download');
      }

      const imageUrls = chapter.pages;
      const downloadedImages: string[] = [];
      const errors: DownloadError[] = [];

      // Download all images
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        if (!imageUrl) {
          errors.push({ 
            index: i, 
            url: 'undefined', 
            error: 'Image URL is undefined' 
          });
          continue;
        }
        
        try {
          onProgress?.({
            current: i + 1,
            total: imageUrls.length,
            percentage: Math.round(((i + 1) / imageUrls.length) * 100)
          });
          
          const blob = await this.fetchImageWithFallback(imageUrl);
          
          if (blob) {
            await this.saveImage(imageUrl, blob, chapterId);
            downloadedImages.push(imageUrl);
          } else {
            errors.push({ 
              index: i, 
              url: imageUrl, 
              error: 'Failed to fetch image' 
            });
          }
        } catch (error: any) {
          errors.push({ 
            index: i, 
            url: imageUrl, 
            error: error?.message || 'Unknown error' 
          });
        }
      }

      // Download manga cover
      const coverUrl = manga.coverUrl;
      if (coverUrl) {
        try {
          const coverResponse = await fetch(coverUrl);
          if (coverResponse.ok) {
            const coverBlob = await coverResponse.blob();
            await this.saveImage(`cover_${manga.url}`, coverBlob, chapterId);
          }
        } catch {
          // Silent fail for cover
        }
      }

      // Save chapter metadata
      const chapterData: ChapterData = {
        id: chapterId,
        mangaUrl: manga.url,
        mangaTitle: manga.title,
        mangaCover: coverUrl || undefined,
        chapterUrl: chapter.url,
        chapterTitle: chapter.title || 'Untitled Chapter',
        chapterIndex,
        source,
        pages: imageUrls,
        downloadedImages,
        downloadDate: new Date().toISOString(),
        size: downloadedImages.length,
        chapters: manga.chapters
      };

      if (downloadedImages.length === 0) {
        throw new Error('No images successfully downloaded');
      }
      
      await this.saveChapter(chapterData);

      const successRate = (downloadedImages.length / imageUrls.length) * 100;
      
      return {
        success: true,
        message: `Downloaded ${downloadedImages.length}/${imageUrls.length} images (${Math.round(successRate)}%)`,
        chapter: chapterData,
        downloaded: downloadedImages.length,
        total: imageUrls.length,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error: any) {
      return { success: false, error: error?.message || 'Download failed' };
    }
  }

  private async fetchImageWithFallback(url: string): Promise<Blob | null> {
    // Try direct fetch
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
      
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        const blob = await response.blob();
        if (blob.size > 0) return blob;
      }
    } catch {
      // Try proxy fallback
    }
    
    // Try proxy
    try {
      const proxyUrl = `${window.location.origin.includes('localhost') 
        ? 'http://localhost:10001' 
        : 'https://kuro-proxy-server.onrender.com'}/api/image-proxy?url=${encodeURIComponent(url)}`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT);
      
      const response = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (response.ok) {
        const blob = await response.blob();
        if (blob.size > 0) return blob;
      }
    } catch {
      // Both failed
    }
    
    return null;
  }

  private async saveChapter(chapterData: ChapterData): Promise<IDBValidKey> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CHAPTERS], 'readwrite');
      const store = transaction.objectStore(STORES.CHAPTERS);
      const request = store.put(chapterData);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async saveImage(url: string, blob: Blob, chapterId: string): Promise<IDBValidKey> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.IMAGES], 'readwrite');
      const store = transaction.objectStore(STORES.IMAGES);
      const imageData: ImageData = { url, blob, chapterId };
      const request = store.put(imageData);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getChapter(chapterId: string): Promise<ChapterData | null> {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CHAPTERS], 'readonly');
      const store = transaction.objectStore(STORES.CHAPTERS);
      const request = store.get(chapterId);

      request.onsuccess = async () => {
        try {
          const chapter = request.result as ChapterData | undefined;
          if (!chapter) {
            resolve(null);
            return;
          }
          
          // Convert images to blob URLs
          const blobPages: (string | null)[] = [];
          for (const pageUrl of chapter.pages) {
            try {
              const blobUrl = await this.getImage(pageUrl);
              blobPages.push(blobUrl);
            } catch {
              blobPages.push(null);
            }
          }
          
          const validBlobs = blobPages.filter((b): b is string => b !== null);
          
          if (validBlobs.length === 0) {
            resolve(null);
            return;
          }
          
          // Get cover blob
          let coverBlobUrl = chapter.mangaCover;
          try {
            const coverBlob = await this.getImage(`cover_${chapter.mangaUrl}`);
            if (coverBlob) coverBlobUrl = coverBlob;
          } catch {
            // Use original URL
          }
          
          resolve({
            ...chapter,
            pages: validBlobs,
            mangaCover: coverBlobUrl
          });
        } catch (error) {
          reject(error);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  private async getImage(url: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.IMAGES], 'readonly');
      const store = transaction.objectStore(STORES.IMAGES);
      const request = store.get(url);

      request.onsuccess = () => {
        const result = request.result as ImageData | undefined;
        if (result?.blob) {
          resolve(URL.createObjectURL(result.blob));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllDownloaded(): Promise<ChapterData[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CHAPTERS], 'readonly');
      const store = transaction.objectStore(STORES.CHAPTERS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as ChapterData[] || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getByManga(mangaUrl: string): Promise<ChapterData[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CHAPTERS], 'readonly');
      const store = transaction.objectStore(STORES.CHAPTERS);
      const index = store.index('mangaUrl');
      const request = index.getAll(mangaUrl);

      request.onsuccess = () => resolve(request.result as ChapterData[] || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteChapter(chapterId: string): Promise<DeleteResult> {
    try {
      // Delete metadata
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([STORES.CHAPTERS], 'readwrite');
        const store = transaction.objectStore(STORES.CHAPTERS);
        const request = store.delete(chapterId);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Delete images
      const transaction = this.db!.transaction([STORES.IMAGES], 'readwrite');
      const imageStore = transaction.objectStore(STORES.IMAGES);
      const index = imageStore.index('chapterId');
      const imagesRequest = index.getAll(chapterId);

      return new Promise((resolve, reject) => {
        imagesRequest.onsuccess = () => {
          const images = imagesRequest.result as ImageData[];
          let deleted = 0;

          images.forEach(img => {
            imageStore.delete(img.url);
            deleted++;
          });

          resolve({ success: true, deletedImages: deleted });
        };
        imagesRequest.onerror = () => reject(imagesRequest.error);
      });

    } catch (error: any) {
      return { success: false, error: error?.message || 'Delete failed' };
    }
  }

  async getStorageInfo(): Promise<StorageInfo | null> {
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      
      return {
        used,
        quota,
        usedMB: (used / 1024 / 1024).toFixed(2),
        quotaMB: (quota / 1024 / 1024).toFixed(2),
        percentage: quota > 0 ? ((used / quota) * 100).toFixed(1) : '0'
      };
    }
    return null;
  }

  async isDownloaded(mangaUrl: string, chapterUrl: string): Promise<boolean> {
    const chapterId = `${mangaUrl}-${chapterUrl}`;
    const chapter = await this.getChapter(chapterId);
    return !!chapter;
  }

  async clearAll(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CHAPTERS, STORES.IMAGES], 'readwrite');
      
      transaction.objectStore(STORES.CHAPTERS).clear();
      transaction.objectStore(STORES.IMAGES).clear();

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// ========== SINGLETON ==========

export const offlineManager = new OfflineManager();

export default offlineManager;

