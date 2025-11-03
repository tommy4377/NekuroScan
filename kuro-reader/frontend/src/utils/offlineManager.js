// 📥 OFFLINE MANAGER - Sistema Download Capitoli Offline
// Utilizza IndexedDB per salvare capitoli completi

const DB_NAME = 'NeKuroOffline';
const DB_VERSION = 1;
const STORES = {
  CHAPTERS: 'chapters',
  IMAGES: 'images'
};

class OfflineManager {
  constructor() {
    this.db = null;
    this.initDB();
  }

  // Inizializza IndexedDB
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store per metadata capitoli
        if (!db.objectStoreNames.contains(STORES.CHAPTERS)) {
          const chapterStore = db.createObjectStore(STORES.CHAPTERS, { keyPath: 'id' });
          chapterStore.createIndex('mangaUrl', 'mangaUrl', { unique: false });
          chapterStore.createIndex('downloadDate', 'downloadDate', { unique: false });
        }

        // Store per immagini
        if (!db.objectStoreNames.contains(STORES.IMAGES)) {
          const imageStore = db.createObjectStore(STORES.IMAGES, { keyPath: 'url' });
          imageStore.createIndex('chapterId', 'chapterId', { unique: false });
        }
      };
    });
  }

  // Scarica un capitolo completo offline
  async downloadChapter(manga, chapter, chapterIndex, source) {
    try {
      if (!this.db) await this.initDB();

      const chapterId = `${manga.url}-${chapter.url}`;
      
      // Controlla se già scaricato
      const existing = await this.getChapter(chapterId);
      if (existing) {
        return { success: true, message: 'Capitolo già scaricato' };
      }

      // Scarica tutte le immagini
      const imageUrls = chapter.pages || [];
      const downloadedImages = [];

      for (let i = 0; i < imageUrls.length; i++) {
        try {
          const response = await fetch(imageUrls[i]);
          const blob = await response.blob();
          
          await this.saveImage(imageUrls[i], blob, chapterId);
          downloadedImages.push(imageUrls[i]);
        } catch (error) {
          console.error(`Failed to download image ${i}:`, error);
        }
      }

      // Salva metadata capitolo
      const chapterData = {
        id: chapterId,
        mangaUrl: manga.url,
        mangaTitle: manga.title,
        mangaCover: manga.coverUrl || manga.cover,
        chapterUrl: chapter.url,
        chapterTitle: chapter.title,
        chapterIndex,
        source,
        pages: imageUrls,
        downloadedImages,
        downloadDate: new Date().toISOString(),
        size: downloadedImages.length
      };

      await this.saveChapter(chapterData);

      return {
        success: true,
        message: `Scaricato ${downloadedImages.length}/${imageUrls.length} immagini`,
        chapter: chapterData
      };

    } catch (error) {
      console.error('Error downloading chapter:', error);
      return { success: false, error: error.message };
    }
  }

  // Salva capitolo in IndexedDB
  async saveChapter(chapterData) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.CHAPTERS], 'readwrite');
      const store = transaction.objectStore(STORES.CHAPTERS);
      const request = store.put(chapterData);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Salva immagine in IndexedDB
  async saveImage(url, blob, chapterId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.IMAGES], 'readwrite');
      const store = transaction.objectStore(STORES.IMAGES);
      const request = store.put({ url, blob, chapterId });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Ottieni capitolo
  async getChapter(chapterId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.CHAPTERS], 'readonly');
      const store = transaction.objectStore(STORES.CHAPTERS);
      const request = store.get(chapterId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Ottieni immagine
  async getImage(url) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.IMAGES], 'readonly');
      const store = transaction.objectStore(STORES.IMAGES);
      const request = store.get(url);

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.blob) {
          resolve(URL.createObjectURL(result.blob));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Ottieni tutti i capitoli scaricati
  async getAllDownloaded() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.CHAPTERS], 'readonly');
      const store = transaction.objectStore(STORES.CHAPTERS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Ottieni capitoli per manga
  async getByManga(mangaUrl) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.CHAPTERS], 'readonly');
      const store = transaction.objectStore(STORES.CHAPTERS);
      const index = store.index('mangaUrl');
      const request = index.getAll(mangaUrl);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Elimina capitolo
  async deleteChapter(chapterId) {
    try {
      // Elimina metadata
      const transaction1 = this.db.transaction([STORES.CHAPTERS], 'readwrite');
      const chapterStore = transaction1.objectStore(STORES.CHAPTERS);
      await new Promise((resolve, reject) => {
        const request = chapterStore.delete(chapterId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Elimina immagini
      const transaction2 = this.db.transaction([STORES.IMAGES], 'readwrite');
      const imageStore = transaction2.objectStore(STORES.IMAGES);
      const index = imageStore.index('chapterId');
      const imagesRequest = index.getAll(chapterId);

      return new Promise((resolve, reject) => {
        imagesRequest.onsuccess = () => {
          const images = imagesRequest.result;
          let deleted = 0;

          images.forEach(img => {
            imageStore.delete(img.url);
            deleted++;
          });

          resolve({ success: true, deletedImages: deleted });
        };
        imagesRequest.onerror = () => reject(imagesRequest.error);
      });

    } catch (error) {
      console.error('Error deleting chapter:', error);
      return { success: false, error: error.message };
    }
  }

  // Ottieni spazio utilizzato
  async getStorageInfo() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage,
        quota: estimate.quota,
        usedMB: (estimate.usage / 1024 / 1024).toFixed(2),
        quotaMB: (estimate.quota / 1024 / 1024).toFixed(2),
        percentage: ((estimate.usage / estimate.quota) * 100).toFixed(1)
      };
    }
    return null;
  }

  // Controlla se capitolo è scaricato
  async isDownloaded(mangaUrl, chapterUrl) {
    const chapterId = `${mangaUrl}-${chapterUrl}`;
    const chapter = await this.getChapter(chapterId);
    return !!chapter;
  }

  // Pulisci tutto
  async clearAll() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.CHAPTERS, STORES.IMAGES], 'readwrite');
      
      transaction.objectStore(STORES.CHAPTERS).clear();
      transaction.objectStore(STORES.IMAGES).clear();

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const offlineManager = new OfflineManager();
export default offlineManager;

