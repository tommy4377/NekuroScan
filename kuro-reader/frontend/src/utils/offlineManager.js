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
  async downloadChapter(manga, chapter, chapterIndex, source, onProgress = null) {
    try {
      if (!this.db) await this.initDB();

      const chapterId = `${manga.url}-${chapter.url}`;
      
      // Controlla se già scaricato
      const existing = await this.getChapter(chapterId);
      if (existing) {
        return { success: true, message: 'Capitolo già scaricato', alreadyDownloaded: true };
      }

      // Validazione pagine
      if (!chapter.pages || !Array.isArray(chapter.pages) || chapter.pages.length === 0) {
        throw new Error('Nessuna pagina da scaricare');
      }

      // Scarica tutte le immagini
      const imageUrls = chapter.pages;
      const downloadedImages = [];
      const errors = [];

      for (let i = 0; i < imageUrls.length; i++) {
        try {
          // Report progress
          if (onProgress) {
            onProgress({
              current: i + 1,
              total: imageUrls.length,
              percentage: Math.round(((i + 1) / imageUrls.length) * 100)
            });
          }
          
          let response;
          let blob;
          
          // TENTATIVO 1: Fetch diretto con timeout
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
            
            response = await fetch(imageUrls[i], {
              mode: 'cors',
              credentials: 'omit',
              signal: controller.signal
            });
            
            clearTimeout(timeout);
            
            if (response.ok) {
              blob = await response.blob();
              
              // Validazione blob
              if (blob.size === 0) {
                throw new Error('Empty blob received');
              }
            }
          } catch (directError) {
            console.log(`Direct fetch failed for image ${i + 1}/${imageUrls.length}, trying proxy...`);
          }
          
          // TENTATIVO 2: Tramite proxy se diretto fallisce
          if (!blob) {
            try {
              const proxyUrl = `${window.location.origin.includes('localhost') 
                ? 'http://localhost:10001' 
                : 'https://kuro-proxy-server.onrender.com'}/api/image-proxy?url=${encodeURIComponent(imageUrls[i])}`;
              
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout per proxy
              
              response = await fetch(proxyUrl, { signal: controller.signal });
              clearTimeout(timeout);
              
              if (response.ok) {
                blob = await response.blob();
                
                if (blob.size === 0) {
                  throw new Error('Empty blob from proxy');
                }
              }
            } catch (proxyError) {
              const errorMsg = `Proxy fetch failed for image ${i + 1}/${imageUrls.length}: ${proxyError.message}`;
              console.error(errorMsg);
              errors.push({ index: i, url: imageUrls[i], error: errorMsg });
              continue; // Salta questa immagine
            }
          }
          
          if (blob) {
            await this.saveImage(imageUrls[i], blob, chapterId);
            downloadedImages.push(imageUrls[i]);
          } else {
            const errorMsg = `Failed to get blob for image ${i + 1}/${imageUrls.length}`;
            console.error(errorMsg);
            errors.push({ index: i, url: imageUrls[i], error: errorMsg });
          }
        } catch (error) {
          const errorMsg = `Failed to download image ${i + 1}/${imageUrls.length}: ${error.message}`;
          console.error(errorMsg);
          errors.push({ index: i, url: imageUrls[i], error: error.message });
        }
      }

      // Scarica anche la cover del manga
      let mangaCoverBlob = null;
      const coverUrl = manga.coverUrl || manga.cover;
      if (coverUrl) {
        try {
          const coverResponse = await fetch(coverUrl);
          if (coverResponse.ok) {
            mangaCoverBlob = await coverResponse.blob();
            await this.saveImage(`cover_${manga.url}`, mangaCoverBlob, chapterId);
            console.log('✅ Cover manga salvata offline');
          }
        } catch (coverError) {
          console.log('⚠️ Cover non salvata:', coverError.message);
        }
      }

      // Salva metadata capitolo
      const chapterData = {
        id: chapterId,
        mangaUrl: manga.url,
        mangaTitle: manga.title,
        mangaCover: coverUrl, // Salva URL originale, recupereremo il blob quando serve
        chapterUrl: chapter.url,
        chapterTitle: chapter.title,
        chapterIndex,
        source,
        pages: imageUrls, // URL originali
        downloadedImages, // URL effettivamente scaricati
        downloadDate: new Date().toISOString(),
        size: downloadedImages.length,
        chapters: manga.chapters // Salva lista completa capitoli per navigazione offline
      };

      // Salva metadata solo se almeno alcune immagini sono state scaricate
      if (downloadedImages.length === 0) {
        throw new Error('Nessuna immagine scaricata con successo');
      }
      
      await this.saveChapter(chapterData);

      const successRate = (downloadedImages.length / imageUrls.length) * 100;
      
      return {
        success: true,
        message: `Scaricato ${downloadedImages.length}/${imageUrls.length} immagini (${Math.round(successRate)}%)`,
        chapter: chapterData,
        downloaded: downloadedImages.length,
        total: imageUrls.length,
        errors: errors.length > 0 ? errors : undefined
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

  // Ottieni capitolo con blob URLs pronti
  async getChapter(chapterId) {
    return new Promise(async (resolve, reject) => {
      try {
        const transaction = this.db.transaction([STORES.CHAPTERS], 'readonly');
        const store = transaction.objectStore(STORES.CHAPTERS);
        const request = store.get(chapterId);

        request.onsuccess = async () => {
          const chapter = request.result;
          if (!chapter) {
            resolve(null);
            return;
          }
          
          // Converti le immagini in blob URLs
          const blobPages = [];
          for (const pageUrl of chapter.pages) {
            try {
              const blobUrl = await this.getImage(pageUrl);
              if (blobUrl) {
                blobPages.push(blobUrl);
              } else {
                console.warn(`⚠️ Blob non trovato per: ${pageUrl}`);
                blobPages.push(null);
              }
            } catch (err) {
              console.error(`Errore recupero blob:`, err);
              blobPages.push(null);
            }
          }
          
          // Filtra solo blob validi
          const validBlobs = blobPages.filter(Boolean);
          
          if (validBlobs.length === 0) {
            console.error('❌ Nessun blob valido trovato per il capitolo');
            resolve(null);
            return;
          }
          
          console.log(`✅ Recuperati ${validBlobs.length}/${chapter.pages.length} blob per capitolo offline`);
          
          // Recupera anche la cover se disponibile
          let coverBlobUrl = chapter.mangaCover;
          try {
            const coverBlob = await this.getImage(`cover_${chapter.mangaUrl}`);
            if (coverBlob) {
              coverBlobUrl = coverBlob;
            }
          } catch (err) {
            console.log('Cover blob non trovata, uso URL originale');
          }
          
          resolve({
            ...chapter,
            pages: validBlobs,
            mangaCover: coverBlobUrl
          });
        };
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
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

