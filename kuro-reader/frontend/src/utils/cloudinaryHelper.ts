/**
 * CLOUDINARY HELPER - Frontend image optimization
 * Lightweight utility for Cloudinary URL generation (no SDK needed)
 */

// ========== TYPES ==========

type CropMode = 'limit' | 'fill' | 'fit' | 'scale' | 'pad' | 'crop' | 'thumb';
type GravityMode = 'auto' | 'auto:subject' | 'face' | 'center' | 'north' | 'south' | 'east' | 'west';
type QualityMode = 'auto' | 'auto:best' | 'auto:good' | 'auto:eco' | 'auto:low' | string;

interface CloudinaryOptions {
  width?: number | null;
  height?: number | null;
  crop?: CropMode;
  quality?: QualityMode;
  format?: 'auto' | 'webp' | 'jpeg' | 'png' | 'avif';
  gravity?: GravityMode;
  aspectRatio?: string | null;
}

type PresetName = 'mangaCover' | 'mangaCoverSmall' | 'mangaPage' | 'mangaPageMobile' | 'avatar' | 'banner' | 'logo' | 'placeholder';

interface CloudinaryPresets {
  [key: string]: (url: string) => string;
}

interface UseCloudinaryImageResult {
  src: string;
  srcSet: string;
  loading: 'lazy' | 'eager';
}

// ========== CONSTANTS ==========

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const USE_CLOUDINARY = import.meta.env.VITE_USE_CLOUDINARY === 'true';
const API_URL = import.meta.env.VITE_API_URL || 'https://kuro-proxy-server.onrender.com';

// ========== CORE FUNCTIONS ==========

export function getCloudinaryUrl(imageUrl: string, options: CloudinaryOptions = {}): string {
  if (!USE_CLOUDINARY || !CLOUDINARY_CLOUD_NAME || !imageUrl) {
    return imageUrl;
  }
  
  // Already Cloudinary URL
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

  const encodedUrl = encodeURIComponent(imageUrl);
  const params: string[] = [];
  
  // Dimensions
  if (width) params.push(`w_${width}`);
  if (height) params.push(`h_${height}`);
  if (aspectRatio) params.push(`ar_${aspectRatio}`);
  if (width || height) {
    params.push(`c_${crop}`);
    if (gravity !== 'auto' && crop !== 'limit') {
      params.push(`g_${gravity}`);
    }
  }
  
  // Quality and format (AVIF > WebP > JPEG automatic)
  params.push(`f_${format}`);
  params.push(`q_${quality}`);
  
  // Optimizations
  params.push('fl_progressive');
  params.push('fl_strip_profile');
  params.push('fl_immutable_cache');
  
  const transformations = params.join(',');
  
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/${transformations}/${encodedUrl}`;
}

// ========== PRESETS ==========

export const CloudinaryPresets: CloudinaryPresets = {
  mangaCover: (url: string) => getCloudinaryUrl(url, {
    width: 400,
    height: 560,
    crop: 'fill',
    gravity: 'auto:subject',
    quality: '85',
    format: 'auto'
  }),
  
  mangaCoverSmall: (url: string) => getCloudinaryUrl(url, {
    width: 200,
    height: 280,
    crop: 'fill',
    gravity: 'auto:subject',
    quality: 'auto:good',
    format: 'auto'
  }),
  
  mangaPage: (url: string) => getCloudinaryUrl(url, {
    width: 1200,
    crop: 'limit',
    quality: 'auto:eco',
    format: 'auto'
  }),
  
  mangaPageMobile: (url: string) => getCloudinaryUrl(url, {
    width: 800,
    crop: 'limit',
    quality: 'auto:eco',
    format: 'auto'
  }),
  
  avatar: (url: string) => getCloudinaryUrl(url, {
    width: 200,
    height: 200,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto:good',
    format: 'auto'
  }),
  
  banner: (url: string) => getCloudinaryUrl(url, {
    width: 1200,
    height: 400,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    format: 'auto'
  }),
  
  logo: (url: string) => getCloudinaryUrl(url, {
    width: 512,
    height: 512,
    crop: 'fit',
    quality: 'auto:best',
    format: 'auto'
  }),
  
  placeholder: (url: string) => {
    if (!url) return '';
    return getCloudinaryUrl(url, {
      width: 50,
      quality: 'auto:low',
      format: 'auto'
    });
  }
};

// ========== SRCSET GENERATION ==========

export function generateSrcSet(imageUrl: string, preset: PresetName = 'mangaCover'): string {
  if (!USE_CLOUDINARY || !imageUrl) return '';
  
  const widthsMap: Record<PresetName, number[]> = {
    mangaCover: [200, 400, 600],
    mangaCoverSmall: [100, 200, 300],
    mangaPage: [800, 1200, 1600],
    mangaPageMobile: [400, 800, 1200],
    avatar: [100, 200, 300],
    banner: [800, 1200, 1600],
    logo: [256, 512, 1024],
    placeholder: [50, 100]
  };
  
  const widths = widthsMap[preset] || [400, 800, 1200];
  
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

// ========== REACT HOOK ==========

export function useCloudinaryImage(imageUrl: string, preset: PresetName = 'mangaCover'): UseCloudinaryImageResult {
  if (!imageUrl) {
    return { src: '', srcSet: '', loading: 'lazy' };
  }
  
  if (!USE_CLOUDINARY) {
    return {
      src: imageUrl,
      srcSet: '',
      loading: 'lazy'
    };
  }
  
  const presetFn = CloudinaryPresets[preset];
  const src = presetFn ? presetFn(imageUrl) : getCloudinaryUrl(imageUrl);
  const srcSet = generateSrcSet(imageUrl, preset);
  
  return {
    src,
    srcSet,
    loading: 'lazy'
  };
}

// ========== HELPERS ==========

export function shouldUseCloudinary(): boolean {
  return USE_CLOUDINARY && !!CLOUDINARY_CLOUD_NAME;
}

export function getOptimizedImageUrl(imageUrl: string, options: CloudinaryOptions = {}): string {
  if (!imageUrl) return '';
  
  // Use Cloudinary if enabled
  if (shouldUseCloudinary()) {
    return getCloudinaryUrl(imageUrl, options);
  }
  
  // Fallback to internal proxy
  const encodedUrl = encodeURIComponent(imageUrl);
  const params = new URLSearchParams();
  
  if (options.width) params.set('w', options.width.toString());
  if (options.height) params.set('h', options.height.toString());
  if (options.quality && options.quality !== 'auto') {
    params.set('q', options.quality.toString());
  }
  
  const queryString = params.toString();
  return `${API_URL}/api/image-proxy?url=${encodedUrl}${queryString ? `&${queryString}` : ''}`;
}

// ========== DEFAULT EXPORT ==========

export default {
  getCloudinaryUrl,
  CloudinaryPresets,
  useCloudinaryImage,
  generateSrcSet,
  shouldUseCloudinary,
  getOptimizedImageUrl
};

