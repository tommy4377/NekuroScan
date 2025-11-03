// 🔗 SHARE UTILS - Utility per condivisione native

export const shareUtils = {
  // Check se Web Share API è supportata
  isSupported() {
    return typeof navigator !== 'undefined' && 'share' in navigator;
  },

  // Condividi manga
  async shareManga(manga) {
    const shareData = {
      title: manga.title,
      text: `Leggi ${manga.title} su NeKuro Scan!`,
      url: window.location.href
    };

    if (this.isSupported()) {
      try {
        await navigator.share(shareData);
        return { success: true, method: 'native' };
      } catch (error) {
        if (error.name === 'AbortError') {
          return { success: false, cancelled: true };
        }
        // Fallback a clipboard
        return this.fallbackShare(shareData);
      }
    } else {
      return this.fallbackShare(shareData);
    }
  },

  // Condividi profilo
  async shareProfile(username) {
    const url = `${window.location.origin}/user/${username}`;
    const shareData = {
      title: `Profilo di ${username}`,
      text: `Guarda il profilo di ${username} su NeKuro Scan`,
      url
    };

    if (this.isSupported()) {
      try {
        await navigator.share(shareData);
        return { success: true, method: 'native' };
      } catch (error) {
        if (error.name === 'AbortError') {
          return { success: false, cancelled: true };
        }
        return this.fallbackShare(shareData);
      }
    } else {
      return this.fallbackShare(shareData);
    }
  },

  // Condividi lista personalizzata
  async shareCustomList(list) {
    const shareData = {
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
    } else {
      return this.fallbackShare(shareData);
    }
  },

  // Fallback: copia in clipboard
  async fallbackShare(shareData) {
    try {
      const text = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
      await navigator.clipboard.writeText(shareData.url);
      return { success: true, method: 'clipboard', text: shareData.url };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Condividi su social (genera link)
  getSocialShareUrl(platform, data) {
    const { url, title, text } = data;
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedText = encodeURIComponent(text);

    const platforms = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`
    };

    return platforms[platform] || null;
  }
};

export default shareUtils;

