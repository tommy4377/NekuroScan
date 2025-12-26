/**
 * CUSTOM LISTS MANAGER - User-created manga lists
 * Full CRUD operations with import/export and statistics
 */

import type { Manga } from '@/types/manga';

// ========== TYPES ==========

interface CustomListManga {
  url: string;
  title: string;
  cover?: string;
  type?: string;
  source?: string;
  addedAt: string;
}

export interface CustomList {
  id: string;
  name: string;
  description: string;
  color: string;
  manga: CustomListManga[];
  createdAt: string;
  updatedAt: string;
}

interface ListStats {
  total: number;
  totalManga: number;
  averageSize: number;
}

interface ListUpdates {
  name?: string;
  description?: string;
  color?: string;
}

// ========== CONSTANTS ==========

const STORAGE_KEY = 'customLists';

// ========== MANAGER ==========

export const customListsManager = {
  getAll(): CustomList[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  create(name: string, description: string = '', color: string = 'purple'): CustomList {
    const lists = this.getAll();
    
    // Check duplicates
    if (lists.some(l => l.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('A list with this name already exists');
    }
    
    const now = new Date().toISOString();
    const newList: CustomList = {
      id: `list-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: name.trim(),
      description: description.trim(),
      color,
      manga: [],
      createdAt: now,
      updatedAt: now
    };
    
    lists.push(newList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    return newList;
  },

  update(listId: string, updates: ListUpdates): CustomList {
    const lists = this.getAll();
    const index = lists.findIndex(l => l.id === listId);
    
    if (index === -1) throw new Error('List not found');
    
    const currentList = lists[index]!;
    const updatedList: CustomList = {
      id: currentList.id,
      name: updates.name ?? currentList.name,
      description: updates.description ?? currentList.description,
      color: updates.color ?? currentList.color,
      manga: currentList.manga,
      createdAt: currentList.createdAt,
      updatedAt: new Date().toISOString()
    };
    
    lists[index] = updatedList;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    return updatedList;
  },

  delete(listId: string): CustomList[] {
    const lists = this.getAll();
    const filtered = lists.filter(l => l.id !== listId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  },

  addManga(listId: string, manga: Manga): CustomList {
    const lists = this.getAll();
    const list = lists.find(l => l.id === listId);
    
    if (!list) throw new Error('List not found');
    
    // Check duplicates
    if (list.manga.some(m => m.url === manga.url)) {
      throw new Error('Manga already exists in this list');
    }
    
    list.manga.push({
      url: manga.url,
      title: manga.title,
      cover: manga.coverUrl,
      type: manga.type,
      source: manga.source,
      addedAt: new Date().toISOString()
    });
    
    list.updatedAt = new Date().toISOString();
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    return list;
  },

  removeManga(listId: string, mangaUrl: string): CustomList {
    const lists = this.getAll();
    const index = lists.findIndex(l => l.id === listId);
    
    if (index === -1) throw new Error('List not found');
    
    const currentList = lists[index]!;
    const updatedList: CustomList = {
      id: currentList.id,
      name: currentList.name,
      description: currentList.description,
      color: currentList.color,
      manga: currentList.manga.filter(m => m.url !== mangaUrl),
      createdAt: currentList.createdAt,
      updatedAt: new Date().toISOString()
    };
    
    lists[index] = updatedList;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    return updatedList;
  },

  getById(listId: string): CustomList | undefined {
    return this.getAll().find(l => l.id === listId);
  },

  isMangaInList(listId: string, mangaUrl: string): boolean {
    const list = this.getById(listId);
    return list ? list.manga.some(m => m.url === mangaUrl) : false;
  },

  getListsForManga(mangaUrl: string): CustomList[] {
    return this.getAll().filter(list => 
      list.manga.some(m => m.url === mangaUrl)
    );
  },

  export(): void {
    const lists = this.getAll();
    const blob = new Blob([JSON.stringify(lists, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nekuro-custom-lists-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  import(file: File): Promise<CustomList[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const result = e.target?.result;
          if (typeof result !== 'string') {
            throw new Error('Invalid file content');
          }
          
          const imported: CustomList[] = JSON.parse(result);
          const existing = this.getAll();
          
          // Merge without ID duplication
          const merged = [...existing, ...imported];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          resolve(merged);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  },

  getStats(): ListStats {
    const lists = this.getAll();
    const totalManga = lists.reduce((sum, l) => sum + l.manga.length, 0);
    
    return {
      total: lists.length,
      totalManga,
      averageSize: lists.length > 0 
        ? Math.round(totalManga / lists.length)
        : 0
    };
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
};

export default customListsManager;

