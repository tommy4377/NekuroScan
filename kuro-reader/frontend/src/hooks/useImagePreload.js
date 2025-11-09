// ✅ useImagePreload - Hook per preload intelligente delle immagini
import { useEffect } from 'react';
import { CloudinaryPresets, shouldUseCloudinary } from '../utils/cloudinaryHelper';

export function useImagePreload(images = [], preset = 'mangaCover') {
  useEffect(() => {
    if (!images || images.length === 0) return;

    const imagesToPreload = images.slice(0, 6);
    const links = [];

    imagesToPreload.forEach((item) => {
      const imageUrl = item?.cover || item?.coverUrl || item?.url || item;
      if (!imageUrl) return;

      const optimizedUrl = shouldUseCloudinary() && CloudinaryPresets[preset]
        ? CloudinaryPresets[preset](imageUrl)
        : imageUrl;

      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = optimizedUrl;
      
      if (shouldUseCloudinary()) {
        link.type = 'image/avif';
      }
      
      link.fetchPriority = 'high';
      
      document.head.appendChild(link);
      links.push(link);
    });

    return () => {
      setTimeout(() => {
        links.forEach(link => link.remove());
      }, 10000);
    };
  }, [images, preset]);
}

export function useImagePreloadSingle(imageUrl, preset = 'mangaCover') {
  useImagePreload(imageUrl ? [imageUrl] : [], preset);
}

export function preloadImage(imageUrl, options = {}) {
  return new Promise((resolve, reject) => {
    if (!imageUrl) {
      reject(new Error('No image URL'));
      return;
    }

    const { preset = 'mangaCover', priority = true } = options;

    const optimizedUrl = shouldUseCloudinary() && CloudinaryPresets[preset]
      ? CloudinaryPresets[preset](imageUrl)
      : imageUrl;

    const img = new Image();
    
    if (priority && 'fetchPriority' in img) {
      img.fetchPriority = 'high';
    }
    
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    
    img.src = optimizedUrl;
  });
}

export async function preloadImages(imageUrls = [], options = {}) {
  const promises = imageUrls
    .filter(Boolean)
    .slice(0, options.limit || 10)
    .map(url => preloadImage(url, options).catch(() => null));

  return Promise.all(promises);
}

export function useImagePrefetch(images = [], preset = 'mangaCover') {
  useEffect(() => {
    if (!images || images.length === 0) return;

    const prefetch = () => {
      images.slice(0, 12).forEach((item) => {
        const imageUrl = item?.cover || item?.coverUrl || item?.url || item;
        if (!imageUrl) return;

        const optimizedUrl = shouldUseCloudinary() && CloudinaryPresets[preset]
          ? CloudinaryPresets[preset](imageUrl)
          : imageUrl;

        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'image';
        link.href = optimizedUrl;
        
        document.head.appendChild(link);
      });
    };

    if ('requestIdleCallback' in window) {
      const idleCallbackId = requestIdleCallback(prefetch, { timeout: 2000 });
      return () => cancelIdleCallback(idleCallbackId);
    } else {
      const timeoutId = setTimeout(prefetch, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [images, preset]);
}

export function ImagePreloader({ images, preset, children }) {
  useImagePreload(images, preset);
  return children;
}

export default {
  useImagePreload,
  useImagePreloadSingle,
  useImagePrefetch,
  preloadImage,
  preloadImages,
  ImagePreloader
};

