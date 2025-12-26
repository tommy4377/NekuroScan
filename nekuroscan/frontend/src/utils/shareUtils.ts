/**
 * SHARE UTILS - Utility per condivisione native e social
 * Supporta Web Share API e fallback clipboard
 */

import type { Manga } from '@/types/manga';

// ========== TYPES ==========

type SocialPlatform = 'twitter' | 'facebook' | 'whatsapp' | 'telegram' | 'reddit';

interface ShareData {
  title: string;
  text: string;
  url: string;
}

interface ShareResult {
  success: boolean;
  method?: 'native' | 'clipboard';
  cancelled?: boolean;
  text?: string;
  error?: string;
}

interface CustomList {
  name: string;
  manga: Manga[];
  [key: string]: any;
}

interface ShareUtils {
  isSupported(): boolean;
  shareManga(manga: Manga): Promise<ShareResult>;
  shareProfile(username: string): Promise<ShareResult>;
  shareCustomList(list: CustomList): Promise<ShareResult>;
  fallbackShare(shareData: ShareData): Promise<ShareResult>;
  getSocialShareUrl(platform: SocialPlatform, data: ShareData): string | null;
}

// ========== IMPLEMENTATION ==========

export const shareUtils: ShareUtils = {
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'share' in navigator;
  },

  async shareManga(manga: Manga): Promise<ShareResult> {
    const shareData: ShareData = {
      title: manga.title,
      text: `Leggi ${manga.title} su NeKuro Scan!`,
      url: window.location.href
    };

    if (this.isSupported()) {
      try {
        await navigator.share(shareData);
        return { success: true, method: 'native' };
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          return { success: false, cancelled: true };
        }
        return this.fallbackShare(shareData);
      }
    }
    
    return this.fallbackShare(shareData);
  },

  async shareProfile(username: string): Promise<ShareResult> {
    const url = `${window.location.origin}/user/${username}`;
    const shareData: ShareData = {
      title: `Profilo di ${username}`,
      text: `Guarda il profilo di ${username} su NeKuro Scan`,
      url
    };

    if (this.isSupported()) {
      try {
        await navigator.share(shareData);
        return { success: true, method: 'native' };
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          return { success: false, cancelled: true };
        }
        return this.fallbackShare(shareData);
      }
    }
    
    return this.fallbackShare(shareData);
  },

  async shareCustomList(list: CustomList): Promise<ShareResult> {
    const shareData: ShareData = {
      title: list.name,
      text: `Guarda la mia lista "${list.name}" con ${list.manga.length} manga`,
      url: window.location.href
    };

    if (this.isSupported()) {
      try {
        await navigator.share(shareData);
        return { success: true, method: 'native' };
      } catch (error) {
        return this.fallbackShare(shareData);
      }
    }
    
    return this.fallbackShare(shareData);
  },

  async fallbackShare(shareData: ShareData): Promise<ShareResult> {
    try {
      await navigator.clipboard.writeText(shareData.url);
      return { 
        success: true, 
        method: 'clipboard', 
        text: shareData.url 
      };
    } catch (error: any) {
      return { 
        success: false, 
        error: error?.message || 'Failed to copy to clipboard' 
      };
    }
  },

  getSocialShareUrl(platform: SocialPlatform, data: ShareData): string | null {
    const { url, title, text } = data;
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedText = encodeURIComponent(text);

    const platforms: Record<SocialPlatform, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`
    };

    return platforms[platform] ?? null;
  }
};

export default shareUtils;

