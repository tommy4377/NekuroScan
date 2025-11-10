/**
 * BOOKMARKS MANAGER - Bookmark system for manga pages
 * LocalStorage-based with import/export capabilities
 */

import type { Bookmark } from '@/types/manga';

// ========== CONSTANTS ==========

const STORAGE_KEY = 'bookmarks';

// ========== TYPES ==========

interface BookmarkInput {
  mangaUrl: string;
  mangaTitle: string;
  chapterUrl: string;
  chapterTitle: string;
  pageNumber: number;
  note?: string;
}

// ========== MANAGER ==========

export const bookmarksManager = {
  addBookmark(input: BookmarkInput): Bookmark {
    const bookmarks = this.getAll();
    
    const bookmark: Bookmark = {
      id: `${input.mangaUrl}-${input.chapterUrl}-${input.pageNumber}`,
      mangaUrl: input.mangaUrl,
      mangaTitle: input.mangaTitle,
      chapterUrl: input.chapterUrl,
      chapterTitle: input.chapterTitle,
      pageNumber: input.pageNumber,
      note: input.note,
      createdAt: Date.now()
    };
    
    // Avoid duplicates
    const existing = bookmarks.findIndex(b => b.id === bookmark.id);
    if (existing !== -1) {
      bookmarks[existing] = bookmark;
    } else {
      bookmarks.push(bookmark);
    }
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    } catch (error) {
      console.error('Failed to save bookmark:', error);
    }
    
    return bookmark;
  },

  removeBookmark(bookmarkId: string): Bookmark[] {
    const bookmarks = this.getAll();
    const filtered = bookmarks.filter(b => b.id !== bookmarkId);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove bookmark:', error);
    }
    
    return filtered;
  },

  getAll(): Bookmark[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  getByManga(mangaUrl: string): Bookmark[] {
    return this.getAll().filter(b => b.mangaUrl === mangaUrl);
  },

  getByChapter(mangaUrl: string, chapterUrl: string): Bookmark[] {
    return this.getAll().filter(b => 
      b.mangaUrl === mangaUrl && b.chapterUrl === chapterUrl
    );
  },

  isBookmarked(mangaUrl: string, chapterUrl: string, pageNumber: number): boolean {
    const id = `${mangaUrl}-${chapterUrl}-${pageNumber}`;
    return this.getAll().some(b => b.id === id);
  },

  export(): void {
    const bookmarks = this.getAll();
    const blob = new Blob([JSON.stringify(bookmarks, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nekuro-bookmarks-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  import(file: File): Promise<Bookmark[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const result = e.target?.result;
          if (typeof result !== 'string') {
            throw new Error('Invalid file content');
          }
          
          const imported: Bookmark[] = JSON.parse(result);
          const existing = this.getAll();
          const merged = [...existing, ...imported];
          
          // Deduplicate
          const unique = Array.from(
            new Map(merged.map(b => [b.id, b])).values()
          );
          
          localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
          resolve(unique);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  },

  count(): number {
    return this.getAll().length;
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
};

export default bookmarksManager;

