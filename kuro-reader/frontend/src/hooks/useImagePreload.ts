/**
 * USE IMAGE PRELOAD - Intelligent image preloading hooks
 * Preloads images with Cloudinary optimization support
 */

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { CloudinaryPresets, shouldUseCloudinary } from '@/utils/cloudinaryHelper';

// ========== TYPES ==========

interface ImageItem {
  cover?: string;
  coverUrl?: string;
  url?: string;
}

type ImageInput = string | ImageItem;

interface PreloadOptions {
  preset?: keyof typeof CloudinaryPresets;
  priority?: boolean;
  limit?: number;
}

interface ImagePreloaderProps {
  images: ImageInput[];
  preset?: keyof typeof CloudinaryPresets;
  children: ReactNode;
}

// ========== UTILITY FUNCTIONS ==========

export function preloadImage(imageUrl: string, options: PreloadOptions = {}): Promise<HTMLImageElement> {
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
      (img as HTMLImageElement & { fetchPriority: string }).fetchPriority = 'high';
    }
    
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    
    img.src = optimizedUrl;
  });
}

export async function preloadImages(imageUrls: string[] = [], options: PreloadOptions = {}): Promise<(HTMLImageElement | null)[]> {
  const promises = imageUrls
    .filter(Boolean)
    .slice(0, options.limit || 10)
    .map(url => preloadImage(url, options).catch(() => null));

  return Promise.all(promises);
}

// ========== HOOKS ==========

export function useImagePreload(images: ImageInput[] = [], preset: keyof typeof CloudinaryPresets = 'mangaCover'): void {
  useEffect(() => {
    if (!images || images.length === 0) return;

    const imagesToPreload = images.slice(0, 6);
    const links: HTMLLinkElement[] = [];

    imagesToPreload.forEach((item) => {
      const imageUrl = typeof item === 'string' 
        ? item 
        : (item?.cover || item?.coverUrl || item?.url);
        
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
      
      if ('fetchPriority' in link) {
        (link as HTMLLinkElement & { fetchPriority: string }).fetchPriority = 'high';
      }
      
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

export function useImagePreloadSingle(imageUrl?: string, preset: keyof typeof CloudinaryPresets = 'mangaCover'): void {
  useImagePreload(imageUrl ? [imageUrl] : [], preset);
}

export function useImagePrefetch(images: ImageInput[] = [], preset: keyof typeof CloudinaryPresets = 'mangaCover'): void {
  useEffect(() => {
    if (!images || images.length === 0) return;

    const prefetch = (): void => {
      images.slice(0, 12).forEach((item) => {
        const imageUrl = typeof item === 'string' 
          ? item 
          : (item?.cover || item?.coverUrl || item?.url);
          
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

export function ImagePreloader({ images, preset = 'mangaCover', children }: ImagePreloaderProps): ReactNode {
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

