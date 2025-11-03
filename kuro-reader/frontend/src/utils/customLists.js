// 📚 CUSTOM LISTS - Liste personalizzate utente

export const customListsManager = {
  // Ottieni tutte le liste
  getAll() {
    try {
      return JSON.parse(localStorage.getItem('customLists') || '[]');
    } catch {
      return [];
    }
  },

  // Crea nuova lista
  create(name, description = '', color = 'purple') {
    const lists = this.getAll();
    
    // Controlla duplicati
    if (lists.some(l => l.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('Una lista con questo nome esiste già');
    }
    
    const newList = {
      id: `list-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description: description.trim(),
      color,
      manga: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    lists.push(newList);
    localStorage.setItem('customLists', JSON.stringify(lists));
    return newList;
  },

  // Aggiorna lista
  update(listId, updates) {
    const lists = this.getAll();
    const index = lists.findIndex(l => l.id === listId);
    
    if (index === -1) throw new Error('Lista non trovata');
    
    lists[index] = {
      ...lists[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem('customLists', JSON.stringify(lists));
    return lists[index];
  },

  // Elimina lista
  delete(listId) {
    const lists = this.getAll();
    const filtered = lists.filter(l => l.id !== listId);
    localStorage.setItem('customLists', JSON.stringify(filtered));
    return filtered;
  },

  // Aggiungi manga a lista
  addManga(listId, manga) {
    const lists = this.getAll();
    const list = lists.find(l => l.id === listId);
    
    if (!list) throw new Error('Lista non trovata');
    
    // Controlla duplicati
    if (list.manga.some(m => m.url === manga.url)) {
      throw new Error('Manga già presente in questa lista');
    }
    
    list.manga.push({
      url: manga.url,
      title: manga.title,
      cover: manga.cover || manga.coverUrl,
      type: manga.type,
      source: manga.source,
      addedAt: new Date().toISOString()
    });
    
    list.updatedAt = new Date().toISOString();
    
    localStorage.setItem('customLists', JSON.stringify(lists));
    return list;
  },

  // Rimuovi manga da lista
  removeManga(listId, mangaUrl) {
    const lists = this.getAll();
    const list = lists.find(l => l.id === listId);
    
    if (!list) throw new Error('Lista non trovata');
    
    list.manga = list.manga.filter(m => m.url !== mangaUrl);
    list.updatedAt = new Date().toISOString();
    
    localStorage.setItem('customLists', JSON.stringify(lists));
    return list;
  },

  // Ottieni lista per ID
  getById(listId) {
    return this.getAll().find(l => l.id === listId);
  },

  // Controlla se manga è in lista
  isMangaInList(listId, mangaUrl) {
    const list = this.getById(listId);
    return list ? list.manga.some(m => m.url === mangaUrl) : false;
  },

  // Ottieni tutte le liste che contengono un manga
  getListsForManga(mangaUrl) {
    return this.getAll().filter(list => 
      list.manga.some(m => m.url === mangaUrl)
    );
  },

  // Export liste
  export() {
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

  // Import liste
  import(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          const existing = this.getAll();
          
          // Merge senza duplicare ID
          const merged = [...existing, ...imported];
          localStorage.setItem('customLists', JSON.stringify(merged));
          resolve(merged);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  },

  // Statistiche
  getStats() {
    const lists = this.getAll();
    return {
      total: lists.length,
      totalManga: lists.reduce((sum, l) => sum + l.manga.length, 0),
      averageSize: lists.length > 0 
        ? Math.round(lists.reduce((sum, l) => sum + l.manga.length, 0) / lists.length)
        : 0
    };
  }
};

export default customListsManager;

