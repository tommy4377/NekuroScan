/**
 * IMAGE FORMATS - WebP with PNG fallback utility
 * Provides modern image formats with graceful degradation
 */

// ========== TYPES ==========

export interface ImageSource {
  webp: string;
  fallback: string;
}

// ========== UTILITIES ==========

/**
 * Get optimized image path with WebP and PNG fallback
 * @param path - Base path to image (without extension)
 * @returns Object with webp and fallback paths
 */
export function getOptimizedImage(path: string): ImageSource {
  // Remove .png or .webp extension if present
  const basePath = path.replace(/\.(png|webp)$/, '');
  
  return {
    webp: `${basePath}.webp`,
    fallback: `${basePath}.png`
  };
}

/**
 * Get WebP path, preferring WebP over PNG
 * @param path - Path to PNG image
 * @returns WebP path
 */
export function getWebPPath(path: string): string {
  return path.replace(/\.png$/, '.webp');
}

/**
 * Check if browser supports WebP
 */
export function supportsWebP(): boolean {
  if (typeof window === 'undefined') return false;
  
  const elem = document.createElement('canvas');
  if (elem.getContext && elem.getContext('2d')) {
    return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  return false;
}

/**
 * Get optimal image format based on browser support
 * @param pngPath - Path to PNG image
 * @returns Optimal image path (WebP if supported, PNG otherwise)
 */
export function getOptimalImageFormat(pngPath: string): string {
  return supportsWebP() ? getWebPPath(pngPath) : pngPath;
}

export default {
  getOptimizedImage,
  getWebPPath,
  supportsWebP,
  getOptimalImageFormat
};

