// ✅ CLOUDINARY HELPER - Image Optimization & Delivery
// Converte URL immagini esterne in URL Cloudinary ottimizzate (AVIF/WebP auto)

/**
 * Genera URL Cloudinary ottimizzato per un'immagine esterna
 * Usa f_auto (AVIF/WebP/JPEG in base al browser) e q_auto (qualità ottimale)
 * 
 * @param {string} imageUrl - URL originale dell'immagine
 * @param {Object} options - Opzioni di trasformazione
 * @returns {string} - URL Cloudinary ottimizzato
 */
export function getCloudinaryUrl(imageUrl, options = {}) {
  const {
    width = null,
    height = null,
    crop = 'limit',  // non taglia, limita solo dimensioni max
    quality = 'auto',
    format = 'auto',  // AVIF/WebP/JPEG automatico
    gravity = 'auto',
    aspectRatio = null,
    blur = null,
    progressive = true,
    stripMetadata = true,
    secure = true
  } = options;

  // Se Cloudinary non è configurato, ritorna URL originale
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.warn('⚠️  Cloudinary not configured, returning original URL');
    return imageUrl;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  
  // Encode URL per fetch remoto
  const encodedUrl = encodeURIComponent(imageUrl);
  
  // Costruisci transformations
  const transformations = [];
  
  // Dimensioni
  const sizeParams = [];
  if (width) sizeParams.push(`w_${width}`);
  if (height) sizeParams.push(`h_${height}`);
  if (aspectRatio) sizeParams.push(`ar_${aspectRatio}`);
  if (sizeParams.length > 0) {
    sizeParams.push(`c_${crop}`);
    if (gravity !== 'auto') sizeParams.push(`g_${gravity}`);
  }
  
  // Qualità e formato
  const qualityParams = [];
  qualityParams.push(`f_${format}`);  // f_auto = AVIF > WebP > JPEG
  qualityParams.push(`q_${quality}`); // q_auto = qualità ottimale
  
  // Ottimizzazioni
  const optimizationParams = [];
  if (progressive) optimizationParams.push('fl_progressive');
  if (stripMetadata) optimizationParams.push('fl_strip_profile');
  if (blur) optimizationParams.push(`e_blur:${blur}`);
  
  // Combina tutti i params
  const allParams = [
    ...sizeParams,
    ...qualityParams,
    ...optimizationParams
  ].join(',');
  
  // Genera URL finale
  const protocol = secure ? 'https' : 'http';
  const cloudinaryUrl = `${protocol}://res.cloudinary.com/${cloudName}/image/fetch/${allParams}/${encodedUrl}`;
  
  return cloudinaryUrl;
}

/**
 * Preset ottimizzazioni per diversi tipi di immagini
 */
export const CloudinaryPresets = {
  // Copertine manga (priorità: qualità visiva)
  mangaCover: (url) => getCloudinaryUrl(url, {
    width: 400,
    height: 600,
    crop: 'fill',
    gravity: 'auto:subject',
    quality: '85',  // Qualità alta per copertine
    format: 'auto'
  }),
  
  // Copertine manga (thumbnail piccolo)
  mangaCoverThumb: (url) => getCloudinaryUrl(url, {
    width: 200,
    height: 280,
    crop: 'fill',
    gravity: 'auto:subject',
    quality: 'auto:good',
    format: 'auto'
  }),
  
  // Pagine capitoli manga (priorità: dimensioni file)
  mangaPage: (url) => getCloudinaryUrl(url, {
    width: 1200,
    crop: 'limit',
    quality: 'auto:eco',  // Bilancia qualità/dimensioni per pagine
    format: 'auto'
  }),
  
  // Pagine capitoli manga (mobile)
  mangaPageMobile: (url) => getCloudinaryUrl(url, {
    width: 800,
    crop: 'limit',
    quality: 'auto:eco',
    format: 'auto'
  }),
  
  // Avatar utenti
  avatar: (url) => getCloudinaryUrl(url, {
    width: 200,
    height: 200,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto:good',
    format: 'auto'
  }),
  
  // Banner utenti
  banner: (url) => getCloudinaryUrl(url, {
    width: 1200,
    height: 400,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    format: 'auto'
  }),
  
  // Logo sito
  logo: (url) => getCloudinaryUrl(url, {
    width: 512,
    height: 512,
    crop: 'fit',
    quality: 'auto:best',
    format: 'auto',
    progressive: false  // Logo piccolo, non serve progressive
  }),
  
  // Placeholder blurred (LQIP - Low Quality Image Placeholder)
  placeholder: (url) => getCloudinaryUrl(url, {
    width: 50,
    quality: 'auto:low',
    format: 'auto',
    blur: 100
  })
};

/**
 * Verifica se un URL è già Cloudinary
 */
export function isCloudinaryUrl(url) {
  return url && url.includes('res.cloudinary.com');
}

/**
 * Helper per generare srcset responsive
 * Genera multiple versioni dell'immagine per responsive images
 */
export function generateSrcSet(imageUrl, widths = [400, 800, 1200, 1600]) {
  if (!imageUrl) return '';
  
  return widths
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

/**
 * Helper per Image Optimization API endpoint
 * Da usare nel proxy per ottimizzare immagini on-the-fly
 */
export function optimizeProxiedImage(imageUrl, queryParams = {}) {
  const {
    w,        // width
    h,        // height
    q = 'auto',  // quality
    f = 'auto',  // format
    mobile = false
  } = queryParams;
  
  // Se è già Cloudinary, ritorna as-is
  if (isCloudinaryUrl(imageUrl)) {
    return imageUrl;
  }
  
  const options = {
    quality: q,
    format: f
  };
  
  // Se specificate dimensioni, usale
  if (w) options.width = parseInt(w);
  if (h) options.height = parseInt(h);
  
  // Se mobile, usa preset mobile
  if (mobile && !w && !h) {
    return CloudinaryPresets.mangaPageMobile(imageUrl);
  }
  
  return getCloudinaryUrl(imageUrl, options);
}

export default {
  getCloudinaryUrl,
  CloudinaryPresets,
  isCloudinaryUrl,
  generateSrcSet,
  optimizeProxiedImage
};

