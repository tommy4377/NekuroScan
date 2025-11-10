// @ts-nocheck - Server file, gradual TypeScript migration
/* eslint-disable @typescript-eslint/no-explicit-any */
// ✅ CLOUDINARY HELPER (Proxy Server)
// Utility per ottimizzare immagini tramite Cloudinary

export function getCloudinaryUrl(imageUrl, options = {}) {
  const {
    width = null,
    height = null,
    crop = 'limit',
    quality = 'auto',
    format = 'auto',
    gravity = 'auto',
    aspectRatio = null
  } = options;

  if (!process.env.CLOUDINARY_CLOUD_NAME || !imageUrl) {
    return imageUrl;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const encodedUrl = encodeURIComponent(imageUrl);
  
  const params = [];
  
  if (width) params.push(`w_${width}`);
  if (height) params.push(`h_${height}`);
  if (aspectRatio) params.push(`ar_${aspectRatio}`);
  if (width || height) {
    params.push(`c_${crop}`);
    if (gravity !== 'auto') params.push(`g_${gravity}`);
  }
  
  params.push(`f_${format}`);
  params.push(`q_${quality}`);
  params.push('fl_progressive');
  params.push('fl_strip_profile');
  params.push('fl_immutable_cache');
  
  const transformations = params.join(',');
  
  return `https://res.cloudinary.com/${cloudName}/image/fetch/${transformations}/${encodedUrl}`;
}

export const CloudinaryPresets = {
  mangaCover: (url) => getCloudinaryUrl(url, {
    width: 400,
    height: 560,
    crop: 'fill',
    gravity: 'auto:subject',
    quality: '85',
    format: 'auto'
  }),
  
  mangaCoverSmall: (url) => getCloudinaryUrl(url, {
    width: 200,
    height: 280,
    crop: 'fill',
    gravity: 'auto:subject',
    quality: 'auto:good',
    format: 'auto'
  }),
  
  mangaPage: (url) => getCloudinaryUrl(url, {
    width: 1200,
    crop: 'limit',
    quality: 'auto:eco',
    format: 'auto'
  }),
  
  mangaPageMobile: (url) => getCloudinaryUrl(url, {
    width: 800,
    crop: 'limit',
    quality: 'auto:eco',
    format: 'auto'
  }),
  
  avatar: (url) => getCloudinaryUrl(url, {
    width: 200,
    height: 200,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto:good',
    format: 'auto'
  }),
  
  banner: (url) => getCloudinaryUrl(url, {
    width: 1200,
    height: 400,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    format: 'auto'
  }),
  
  logo: (url) => getCloudinaryUrl(url, {
    width: 512,
    height: 512,
    crop: 'fit',
    quality: 'auto:best',
    format: 'auto'
  }),
  
  placeholder: (url) => getCloudinaryUrl(url, {
    width: 50,
    quality: 'auto:low',
    format: 'auto'
  })
};

export default {
  getCloudinaryUrl,
  CloudinaryPresets
};

