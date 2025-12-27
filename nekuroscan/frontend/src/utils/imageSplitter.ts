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
 */
export async function getImageDimensions(imageUrl: string): Promise<ImageDimensions | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalHeight / img.naturalWidth
      });
    };
    
    img.onerror = () => {
      resolve(null);
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
 * ✅ FIX: Usa dimensioni standard per tipo + rilevamento barre nere
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
  
  const dimensions = await getImageDimensions(imageUrl);
  if (!dimensions) return 1;
  
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
  
  // Se l'immagine è troppo piccola (< 70% dell'altezza standard), probabilmente è una singola pagina
  if (dimensions.height < pageDims.height * 0.7) {
    return 1;
  }
  
  // Se l'immagine ha un rapporto aspect molto basso (quasi quadrata o orizzontale), è probabilmente una singola pagina
  if (dimensions.aspectRatio < minAspectRatio) {
    return 1;
  }
  
  // ✅ STRATEGIA 1: Rilevamento barre nere/spazi bianchi (più preciso)
  const cutPoints = await detectBlackBars(imageUrl, 15, 30);
  if (cutPoints.length > 0) {
    // Se abbiamo trovato barre nere, il numero di pagine è il numero di tagli + 1
    const pagesFromBars = cutPoints.length + 1;
    console.log(`[ImageSplitter] Found ${cutPoints.length} black bars in image, estimated ${pagesFromBars} page(s)`);
    return pagesFromBars;
  }
  
  // ✅ STRATEGIA 2: Stima basata su dimensioni fisse
  // Calcola quante "pagine standard" possono stare nell'immagine
  
  // Se la larghezza corrisponde approssimativamente alla larghezza standard (±40%),
  // possiamo stimare meglio basandoci solo sull'altezza
  const widthMatches = dimensions.width >= pageDims.width * 0.6 && 
                       dimensions.width <= pageDims.width * 1.6;
  
  let estimatedPages: number;
  
  if (widthMatches) {
    // Larghezza compatibile: stima basata sull'altezza con margine del 92%
    const effectiveHeight = dimensions.height * 0.92;
    estimatedPages = Math.max(1, Math.round(effectiveHeight / pageDims.height));
  } else {
    // Larghezza non standard: stima più conservativa basata su area
    const standardPageArea = pageDims.width * pageDims.height;
    const imageArea = dimensions.width * dimensions.height;
    const areaRatio = imageArea / standardPageArea;
    
    // Arrotonda per difetto per essere conservativi
    estimatedPages = Math.max(1, Math.floor(areaRatio));
  }
  
  // ✅ Limita la stima ragionevole (max 10 pagine per immagine)
  estimatedPages = Math.min(estimatedPages, 10);
  
  console.log(`[ImageSplitter] Image ${dimensions.width}x${dimensions.height}px, estimated ${estimatedPages} page(s) using ${pageDims.width}x${pageDims.height}px standard`);
  return estimatedPages;
}

/**
 * Stima il numero totale di pagine per un array di immagini
 * ✅ FIX: Usa dimensioni standard per tipo + rilevamento automatico
 */
export async function estimateTotalPages(
  pages: string[],
  options: {
    mangaType?: MangaType; // Tipo di manga (default: 'auto' - rilevamento automatico per immagine)
    estimatedPageHeight?: number; // Override altezza (se specificato, ignora mangaType)
    estimatedPageWidth?: number; // Override larghezza (se specificato, ignora mangaType)
    minAspectRatio?: number; // Rapporto minimo altezza/larghezza (default: 1.2)
    enabled?: boolean;
    maxConcurrent?: number; // Numero massimo di analisi parallele (default: 3)
  } = {}
): Promise<number> {
  const {
    mangaType = 'auto', // ✅ Rilevamento automatico per tipo
    estimatedPageHeight,
    estimatedPageWidth,
    minAspectRatio = 1.2,
    enabled = true,
    maxConcurrent = 3 // ✅ Ridotto per non sovraccaricare il browser
  } = options;
  
  if (!enabled || !pages || pages.length === 0) {
    return pages.length;
  }
  
  let totalPages = 0;
  
  // Processa immagini in batch per non sovraccaricare
  for (let i = 0; i < pages.length; i += maxConcurrent) {
    const batch = pages.slice(i, i + maxConcurrent);
    const promises = batch.map(url => 
      estimatePagesForImage(url, { 
        mangaType, // ✅ Passa tipo (o 'auto' per rilevamento automatico)
        estimatedPageHeight, 
        estimatedPageWidth,
        minAspectRatio, 
        enabled 
      })
    );
    
    const results = await Promise.all(promises);
    totalPages += results.reduce((sum, count) => sum + count, 0);
  }
  
  console.log(`[ImageSplitter] Total estimated pages: ${totalPages} (from ${pages.length} images, type: ${mangaType})`);
  return totalPages;
}

