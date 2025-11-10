/**
 * CLOUDINARY HELPER - Frontend Image Optimization
 * Lightweight utility per generare URL Cloudinary ottimizzati (no SDK needed)
 * 
 * MIGRATED: 2025-11-10 from JS to TypeScript
 */

// ========== TYPES ==========

interface CloudinaryOptions {
  width?: number | null;
  height?: number | null;
  crop?: string;
  quality?: string;
  format?: string;
  gravity?: string;
  aspectRatio?: string | null;
}

interface CloudinaryImage {
  src: string;
  srcSet: string;
  loading: 'lazy' | 'eager';
}

// ========== CONFIG ==========

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const USE_CLOUDINARY = import.meta.env.VITE_USE_CLOUDINARY === 'true';

// ========== CORE FUNCTIONS ==========

/**
 * Genera URL Cloudinary ottimizzato per un'immagine
 * Usa f_auto (AVIF > WebP > JPEG) e q_auto (qualità ottimale)
 */
export function getCloudinaryUrl(imageUrl: string, options: CloudinaryOptions = {}): string {
  // Se Cloudinary disabilitato o non configurato, ritorna URL originale
  if (!USE_CLOUDINARY || !CLOUDINARY_CLOUD_NAME || !imageUrl) {
    return imageUrl;
  }
  
  // Se è già Cloudinary, ritorna as-is
  if (imageUrl.includes('res.cloudinary.com')) {
    return imageUrl;
  }

  const {
    width = null,
    height = null,
    crop = 'limit',
    quality = 'auto',
    format = 'auto',
    gravity = 'auto',
    aspectRatio = null
  } = options;

  // Encode URL per fetch remoto
  const encodedUrl = encodeURIComponent(imageUrl);
  
  // Costruisci params di trasformazione
  const params: string[] = [];
  
  // Dimensioni
  if (width) params.push(`w_${width}`);
  if (height) params.push(`h_${height}`);
  if (aspectRatio) params.push(`ar_${aspectRatio}`);
  if (width || height) {
    params.push(`c_${crop}`);
    if (gravity !== 'auto' && crop !== 'limit') {
      params.push(`g_${gravity}`);
    }
  }
  
  // Qualità e formato (AVIF > WebP > JPEG automatico)
  params.push(`f_${format}`);
  params.push(`q_${quality}`);
  
  // Ottimizzazioni
  params.push('fl_progressive');       // Progressive JPEG
  params.push('fl_strip_profile');     // Rimuovi metadata EXIF
  params.push('fl_immutable_cache');   // Cache permanente
  
  const transformations = params.join(',');
  
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/${transformations}/${encodedUrl}`;
}

// ========== PRESETS ==========

/**
 * Preset ottimizzazioni per diversi tipi di immagini
 */
export const CloudinaryPresets = {
  // Copertina manga (card grid)
  mangaCover: (url: string) => getCloudinaryUrl(url, {
    width: 400,
    height: 560,
    crop: 'fill',
    gravity: 'auto:subject',
    quality: '85',
    format: 'auto'
  }),
  
  // Copertina manga (thumbnail piccolo)
  mangaCoverSmall: (url: string) => getCloudinaryUrl(url, {
    width: 200,
    height: 280,
    crop: 'fill',
    gravity: 'auto:subject',
    quality: 'auto:good',
    format: 'auto'
  }),
  
  // Pagina capitolo manga (desktop)
  mangaPage: (url: string) => getCloudinaryUrl(url, {
    width: 1200,
    crop: 'limit',
    quality: 'auto:eco',
    format: 'auto'
  }),
  
  // Pagina capitolo manga (mobile)
  mangaPageMobile: (url: string) => getCloudinaryUrl(url, {
    width: 800,
    crop: 'limit',
    quality: 'auto:eco',
    format: 'auto'
  }),
  
  // Avatar utente
  avatar: (url: string) => getCloudinaryUrl(url, {
    width: 200,
    height: 200,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto:good',
    format: 'auto'
  }),
  
  // Banner utente
  banner: (url: string) => getCloudinaryUrl(url, {
    width: 1200,
    height: 400,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    format: 'auto'
  }),
  
  // Logo sito
  logo: (url: string) => getCloudinaryUrl(url, {
    width: 512,
    height: 512,
    crop: 'fit',
    quality: 'auto:best',
    format: 'auto'
  }),
  
  // Placeholder blurred (LQIP - Low Quality Image Placeholder)
  placeholder: (url: string) => {
    if (!url) return '';
    return getCloudinaryUrl(url, {
      width: 50,
      quality: 'auto:low',
      format: 'auto'
    });
  }
};

// ========== HOOKS ==========

/**
 * Hook React per Cloudinary URL con dimensioni responsive
 */
export function useCloudinaryImage(imageUrl: string, preset: keyof typeof CloudinaryPresets = 'mangaCover'): CloudinaryImage {
  if (!imageUrl) return { src: '', srcSet: '', loading: 'lazy' };
  
  // Se Cloudinary disabilitato, usa URL originale
  if (!USE_CLOUDINARY) {
    return {
      src: imageUrl,
      srcSet: '',
      loading: 'lazy'
    };
  }
  
  const src = CloudinaryPresets[preset] 
    ? CloudinaryPresets[preset](imageUrl)
    : getCloudinaryUrl(imageUrl);
  
  // Genera srcSet per responsive images
  const srcSet = generateSrcSet(imageUrl, preset);
  
  return {
    src,
    srcSet,
    loading: 'lazy'
  };
}

/**
 * Genera srcSet responsive per <img>
 */
export function generateSrcSet(imageUrl: string, preset: keyof typeof CloudinaryPresets | string = 'mangaCover'): string {
  if (!USE_CLOUDINARY || !imageUrl) return '';
  
  const widths: Record<string, number[]> = {
    mangaCover: [200, 400, 600],
    mangaPage: [800, 1200, 1600],
    avatar: [100, 200, 300],
    banner: [800, 1200, 1600]
  };
  
  const selectedWidths = widths[preset] || [400, 800, 1200];
  
  return selectedWidths
    .map(width => {
      const url = getCloudinaryUrl(imageUrl, { 
        width, 
        crop: 'limit',
        quality: 'auto',
        format: 'auto'
      });
      return `${url} ${width}w`;
    })
    .join(', ');
}

// ========== HELPERS ==========

/**
 * Helper per determinare se usare Cloudinary
 */
export function shouldUseCloudinary(): boolean {
  return USE_CLOUDINARY && !!CLOUDINARY_CLOUD_NAME;
}

/**
 * Wrapper per immagini con fallback
 */
export function getOptimizedImageUrl(imageUrl: string, options: CloudinaryOptions = {}): string {
  if (!imageUrl) return '';
  
  // Se Cloudinary abilitato, usa Cloudinary
  if (shouldUseCloudinary()) {
    return getCloudinaryUrl(imageUrl, options);
  }
  
  // Altrimenti, usa il proxy interno (backend)
  const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'https://kuro-proxy-server.onrender.com';
  const encodedUrl = encodeURIComponent(imageUrl);
  
  // Aggiungi query params per resize se specificate
  const params = new URLSearchParams();
  if (options.width) params.set('w', options.width.toString());
  if (options.height) params.set('h', options.height.toString());
  if (options.quality) params.set('q', options.quality);
  
  const queryString = params.toString();
  return `${PROXY_URL}/api/image-proxy?url=${encodedUrl}${queryString ? `&${queryString}` : ''}`;
}

// ========== EXPORTS ==========

export default {
  getCloudinaryUrl,
  CloudinaryPresets,
  useCloudinaryImage,
  generateSrcSet,
  shouldUseCloudinary,
  getOptimizedImageUrl
};
