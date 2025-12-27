/**
 * IMAGE SPLITTER - Detect image dimensions and estimate page count for vertical images
 * ✅ FIX: Page counter per manga/manhwa/manhua verticali
 * 
 * Strategie implementate:
 * 1. Rilevamento barre nere/spazi bianchi (se presenti)
 * 2. Dimensioni fisse basate su tipo:
 *    - Manga: ~1650x2500px (2:3)
 *    - Manhwa: ~1080x2500px (segmenti verticali)
 *    - Manhua: ~1080x2500px (simile manhwa)
 *    - Webtoon: ~1080x1920px (per segmento schermo)
 */

export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export type MangaType = 'manga' | 'manhwa' | 'manhua' | 'webtoon' | 'auto';

interface PageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

// Dimensioni standard per tipo
const STANDARD_DIMENSIONS: Record<MangaType, PageDimensions> = {
  manga: {
    width: 1650,  // Media standard manga digitale
    height: 2500, // Media standard manga digitale
    aspectRatio: 2500 / 1650 // ~1.52 (2:3)
  },
  manhwa: {
    width: 1080,  // Standard manhwa verticale
    height: 2500, // Segmento standard
    aspectRatio: 2500 / 1080 // ~2.31
  },
  manhua: {
    width: 1080,  // Standard manhua verticale
    height: 2500, // Segmento standard
    aspectRatio: 2500 / 1080 // ~2.31
  },
  webtoon: {
    width: 1080,  // Standard webtoon (larghezza smartphone)
    height: 1920, // Segmento schermo smartphone
    aspectRatio: 1920 / 1080 // ~1.78 (16:9)
  },
  auto: {
    width: 1650,  // Default: usa manga come riferimento
    height: 2500,
    aspectRatio: 2500 / 1650
  }
};

/**
 * Determina automaticamente il tipo di manga basandosi sulle dimensioni
 */
function detectMangaType(dimensions: ImageDimensions): MangaType {
  const { width, height, aspectRatio } = dimensions;
  
  // Webtoon: larghezza fissa ~1080px, altezza molto variabile
  if (width >= 800 && width <= 1200 && aspectRatio > 2.0) {
    return 'webtoon';
  }
  
  // Manhwa/Manhua: larghezza ~1080px, altezza variabile ma meno estrema
  if (width >= 800 && width <= 1200 && aspectRatio > 1.5) {
    return 'manhwa';
  }
  
  // Manga: proporzione 2:3 tipica (1.3-1.6)
  if (aspectRatio >= 1.3 && aspectRatio <= 1.7) {
    return 'manga';
  }
  
  // Default: auto (usa dimensioni manga standard)
  return 'auto';
}

/**
 * Carica un'immagine e rileva le sue dimensioni reali
 * ✅ FIX: Gestisce CORS e proxy URLs
 */
export async function getImageDimensions(imageUrl: string): Promise<ImageDimensions | null> {
  return new Promise((resolve) => {
    const img = new Image();
    
    // ✅ Prova prima senza CORS, poi con CORS se necessario
    img.crossOrigin = 'anonymous';
    
    const timeout = setTimeout(() => {
      resolve(null);
    }, 5000); // Timeout di 5 secondi
    
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const width = img.naturalWidth || img.width || 0;
        const height = img.naturalHeight || img.height || 0;
        
        if (width > 0 && height > 0) {
          resolve({
            width,
            height,
            aspectRatio: height / width
          });
        } else {
          resolve(null);
        }
      } catch (error) {
        console.warn('[ImageSplitter] Error getting dimensions:', error);
        resolve(null);
      }
    };
    
    img.onerror = (error) => {
      clearTimeout(timeout);
      // ✅ Se fallisce con CORS, prova senza (per immagini da stesso dominio)
      if (img.crossOrigin === 'anonymous') {
        const img2 = new Image();
        img2.onload = () => {
          try {
            const width = img2.naturalWidth || img2.width || 0;
            const height = img2.naturalHeight || img2.height || 0;
            if (width > 0 && height > 0) {
              resolve({
                width,
                height,
                aspectRatio: height / width
              });
            } else {
              resolve(null);
            }
          } catch (e) {
            resolve(null);
          }
        };
        img2.onerror = () => resolve(null);
        img2.src = imageUrl;
      } else {
        resolve(null);
      }
    };
    
    img.src = imageUrl;
  });
}

/**
 * Analizza un'immagine per trovare barre nere orizzontali usando Canvas API
 */
export async function detectBlackBars(
  imageUrl: string,
  threshold: number = 15, // Soglia di nero (0-255)
  minBarHeight: number = 30 // Altezza minima barra nera in pixel
): Promise<number[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve([]);
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Analizza ogni riga orizzontale per trovare barre nere
        const blackRows: number[] = [];
        const sampleWidth = Math.min(canvas.width, 300); // Campiona parte centrale
        const startX = Math.floor((canvas.width - sampleWidth) / 2);
        
        for (let y = 0; y < canvas.height; y += 2) { // Salta ogni 2 righe per performance
          let blackPixels = 0;
          let totalPixels = 0;
          
          // Campiona pixel centrali della riga
          for (let x = startX; x < startX + sampleWidth; x += 3) { // Salta pixel per performance
            const idx = (y * canvas.width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const brightness = (r + g + b) / 3;
            
            if (brightness < threshold) {
              blackPixels++;
            }
            totalPixels++;
          }
          
          // Se più dell'85% della riga è nera, considerala parte di una barra nera
          if (totalPixels > 0 && (blackPixels / totalPixels) > 0.85) {
            blackRows.push(y);
          }
        }
        
        if (blackRows.length < minBarHeight) {
          resolve([]);
          return;
        }
        
        // Raggruppa righe nere consecutive in barre
        const bars: { start: number; end: number }[] = [];
        let currentStart = blackRows[0];
        let currentEnd = blackRows[0];
        
        for (let i = 1; i < blackRows.length; i++) {
          if (blackRows[i] - currentEnd <= 5) {
            // Continua la barra
            currentEnd = blackRows[i];
          } else {
            // Nuova barra se la precedente è abbastanza alta
            if (currentEnd - currentStart >= minBarHeight) {
              bars.push({ start: currentStart, end: currentEnd });
            }
            currentStart = blackRows[i];
            currentEnd = blackRows[i];
          }
        }
        
        // Aggiungi ultima barra
        if (currentEnd - currentStart >= minBarHeight) {
          bars.push({ start: currentStart, end: currentEnd });
        }
        
        // Trova i punti di taglio (centro delle barre nere)
        const cutPoints = bars.map(bar => Math.floor((bar.start + bar.end) / 2));
        
        resolve(cutPoints);
      } catch (error) {
        console.warn('[ImageSplitter] Error detecting black bars:', error);
        resolve([]);
      }
    };
    
    img.onerror = () => {
      resolve([]);
    };
    
    img.src = imageUrl;
  });
}

/**
 * Stima il numero di pagine per un'immagine verticale basandosi sulle dimensioni
 * ✅ FIX: Versione semplificata e più robusta
 */
export async function estimatePagesForImage(
  imageUrl: string,
  options: {
    mangaType?: MangaType; // Tipo di manga (default: 'auto' - rilevamento automatico)
    estimatedPageHeight?: number; // Override altezza (se specificato, ignora mangaType)
    estimatedPageWidth?: number; // Override larghezza (se specificato, ignora mangaType)
    minAspectRatio?: number; // Rapporto minimo altezza/larghezza (default: 1.2)
    enabled?: boolean;
  } = {}
): Promise<number> {
  const {
    mangaType = 'auto',
    estimatedPageHeight,
    estimatedPageWidth,
    minAspectRatio = 1.2,
    enabled = true
  } = options;
  
  if (!enabled) return 1;
  
  // ✅ Ottieni dimensioni (con gestione errori robusta)
  const dimensions = await getImageDimensions(imageUrl);
  if (!dimensions || dimensions.width === 0 || dimensions.height === 0) {
    return 1; // Fallback: 1 pagina se non riusciamo a ottenere dimensioni
  }
  
  // Determina dimensioni standard da usare
  let pageDims: PageDimensions;
  
  if (estimatedPageHeight && estimatedPageWidth) {
    // Override: usa dimensioni personalizzate
    pageDims = {
      width: estimatedPageWidth,
      height: estimatedPageHeight,
      aspectRatio: estimatedPageHeight / estimatedPageWidth
    };
  } else {
    // Rileva tipo automaticamente se 'auto'
    const detectedType = mangaType === 'auto' ? detectMangaType(dimensions) : mangaType;
    pageDims = STANDARD_DIMENSIONS[detectedType];
  }
  
  // ✅ Validazioni base
  // Se l'immagine è troppo piccola (< 60% dell'altezza standard), probabilmente è una singola pagina
  if (dimensions.height < pageDims.height * 0.6) {
    return 1;
  }
  
  // Se l'immagine ha un rapporto aspect molto basso (quasi quadrata o orizzontale), è probabilmente una singola pagina
  if (dimensions.aspectRatio < minAspectRatio) {
    return 1;
  }
  
  // ✅ STRATEGIA PRINCIPALE: Stima basata su altezza (più semplice e veloce)
  // Calcola quante "pagine standard" possono stare nell'immagine
  // Usa un margine dell'88% per evitare sovrastime
  const effectiveHeight = dimensions.height * 0.88;
  let estimatedPages = Math.max(1, Math.round(effectiveHeight / pageDims.height));
  
  // ✅ Aggiustamento basato su larghezza se disponibile
  // Se la larghezza è molto diversa, potrebbe essere necessario aggiustare
  const widthRatio = dimensions.width / pageDims.width;
  if (widthRatio < 0.7 || widthRatio > 1.5) {
    // Larghezza molto diversa: stima più conservativa
    const areaRatio = (dimensions.width * dimensions.height) / (pageDims.width * pageDims.height);
    estimatedPages = Math.max(1, Math.floor(areaRatio * 0.9));
  }
  
  // ✅ Limita la stima ragionevole (max 8 pagine per immagine per evitare errori)
  estimatedPages = Math.min(estimatedPages, 8);
  
  return estimatedPages;
}

/**
 * Stima il numero totale di pagine per un array di immagini
 * ✅ FIX: Versione semplificata e più veloce
 */
export async function estimateTotalPages(
  pages: string[],
  options: {
    mangaType?: MangaType; // Tipo di manga (default: 'auto' - rilevamento automatico per immagine)
    estimatedPageHeight?: number; // Override altezza (se specificato, ignora mangaType)
    estimatedPageWidth?: number; // Override larghezza (se specificato, ignora mangaType)
    minAspectRatio?: number; // Rapporto minimo altezza/larghezza (default: 1.2)
    enabled?: boolean;
    maxConcurrent?: number; // Numero massimo di analisi parallele (default: 2)
  } = {}
): Promise<number> {
  const {
    mangaType = 'auto',
    estimatedPageHeight,
    estimatedPageWidth,
    minAspectRatio = 1.2,
    enabled = true,
    maxConcurrent = 2 // ✅ Ridotto a 2 per non sovraccaricare
  } = options;
  
  if (!enabled || !pages || pages.length === 0) {
    return pages.length;
  }
  
  // ✅ Se abbiamo poche immagini, processa tutte insieme
  if (pages.length <= 5) {
    try {
      const results = await Promise.all(
        pages.map(url => 
          estimatePagesForImage(url, { 
            mangaType,
            estimatedPageHeight, 
            estimatedPageWidth,
            minAspectRatio, 
            enabled 
          }).catch(() => 1) // ✅ Fallback: 1 pagina se errore
        )
      );
      const total = results.reduce((sum, count) => sum + count, 0);
      console.log(`[ImageSplitter] Estimated ${total} pages from ${pages.length} images`);
      return total;
    } catch (error) {
      console.warn('[ImageSplitter] Error estimating pages, using image count:', error);
      return pages.length;
    }
  }
  
  // ✅ Per molte immagini, processa in batch
  let totalPages = 0;
  let processed = 0;
  
  for (let i = 0; i < pages.length; i += maxConcurrent) {
    const batch = pages.slice(i, i + maxConcurrent);
    try {
      const promises = batch.map(url => 
        estimatePagesForImage(url, { 
          mangaType,
          estimatedPageHeight, 
          estimatedPageWidth,
          minAspectRatio, 
          enabled 
        }).catch(() => 1) // ✅ Fallback: 1 pagina se errore
      );
      
      const results = await Promise.all(promises);
      totalPages += results.reduce((sum, count) => sum + count, 0);
      processed += batch.length;
      
      // ✅ Log progressivo
      if (processed % 10 === 0 || processed === pages.length) {
        console.log(`[ImageSplitter] Processed ${processed}/${pages.length} images, estimated ${totalPages} pages so far`);
      }
    } catch (error) {
      console.warn(`[ImageSplitter] Error processing batch, adding ${batch.length} pages as fallback:`, error);
      totalPages += batch.length; // ✅ Fallback: aggiungi numero di immagini nel batch
    }
  }
  
  console.log(`[ImageSplitter] Total estimated pages: ${totalPages} (from ${pages.length} images)`);
  return totalPages;
}

