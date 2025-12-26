/**
 * NOTES MANAGER - Personal notes system for manga pages
 * LocalStorage-based with statistics and import/export
 */

import type { Note } from '@/types/manga';

// ========== CONSTANTS ==========

const STORAGE_KEY = 'notes';

// ========== TYPES ==========

interface NoteStats {
  total: number;
  uniqueManga: number;
  mostAnnotated?: [string, number];
}

// ========== MANAGER ==========

export const notesManager = {
  saveNote(mangaUrl: string, chapterUrl: string, pageNumber: number, content: string): Note {
    const notes = this.getAll();
    const now = Date.now();
    
    const note: Note = {
      id: `${mangaUrl}-${chapterUrl}-${pageNumber}`,
      mangaUrl,
      chapterUrl,
      pageNumber,
      content: content.trim(),
      createdAt: now,
      updatedAt: now
    };
    
    const existingIndex = notes.findIndex(n => n.id === note.id);
    
    if (existingIndex !== -1) {
      const existing = notes[existingIndex]!;
      const updatedNote: Note = {
        id: existing.id,
        mangaUrl: existing.mangaUrl,
        chapterUrl: existing.chapterUrl,
        pageNumber: existing.pageNumber,
        content: note.content,
        color: existing.color,
        position: existing.position,
        createdAt: existing.createdAt,
        updatedAt: note.updatedAt
      };
      notes[existingIndex] = updatedNote;
    } else {
      notes.push(note);
    }
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
      console.error('Failed to save note:', error);
    }
    
    return note;
  },

  removeNote(noteId: string): Note[] {
    const notes = this.getAll();
    const filtered = notes.filter(n => n.id !== noteId);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove note:', error);
    }
    
    return filtered;
  },

  getAll(): Note[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  getByManga(mangaUrl: string): Note[] {
    return this.getAll().filter(n => n.mangaUrl === mangaUrl);
  },

  getByChapter(mangaUrl: string, chapterUrl: string): Note[] {
    return this.getAll().filter(n => 
      n.mangaUrl === mangaUrl && n.chapterUrl === chapterUrl
    );
  },

  getForPage(mangaUrl: string, chapterUrl: string, pageNumber: number): Note | undefined {
    const id = `${mangaUrl}-${chapterUrl}-${pageNumber}`;
    return this.getAll().find(n => n.id === id);
  },

  hasNote(mangaUrl: string, chapterUrl: string, pageNumber: number): boolean {
    return !!this.getForPage(mangaUrl, chapterUrl, pageNumber);
  },

  export(): void {
    const notes = this.getAll();
    const blob = new Blob([JSON.stringify(notes, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nekuro-notes-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  import(file: File): Promise<Note[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const result = e.target?.result;
          if (typeof result !== 'string') {
            throw new Error('Invalid file content');
          }
          
          const imported: Note[] = JSON.parse(result);
          const existing = this.getAll();
          
          // Merge with deduplication (imported takes precedence)
          const merged = [...imported, ...existing];
          const unique = Array.from(
            new Map(merged.map(n => [n.id, n])).values()
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

  getStats(): NoteStats {
    const notes = this.getAll();
    const byManga: Record<string, number> = {};
    
    notes.forEach(note => {
      byManga[note.mangaUrl] = (byManga[note.mangaUrl] || 0) + 1;
    });
    
    const entries = Object.entries(byManga);
    const mostAnnotated = entries.length > 0
      ? entries.sort((a, b) => b[1] - a[1])[0] as [string, number]
      : undefined;
    
    return {
      total: notes.length,
      uniqueManga: Object.keys(byManga).length,
      mostAnnotated
    };
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
};

export default notesManager;

