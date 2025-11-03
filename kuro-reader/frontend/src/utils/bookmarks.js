// 🔖 BOOKMARKS.JS - Sistema Segnalibri Pagine

export const bookmarksManager = {
  // Salva un segnalibro
  addBookmark(mangaUrl, chapterId, pageNumber, note = '') {
    const bookmarks = this.getAll();
    
    const bookmark = {
      id: `${mangaUrl}-${chapterId}-${pageNumber}`,
      mangaUrl,
      chapterId,
      pageNumber,
      note,
      createdAt: new Date().toISOString()
    };
    
    // Evita duplicati
    const existing = bookmarks.findIndex(b => b.id === bookmark.id);
    if (existing !== -1) {
      bookmarks[existing] = bookmark;
    } else {
      bookmarks.push(bookmark);
    }
    
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    return bookmark;
  },

  // Rimuovi segnalibro
  removeBookmark(bookmarkId) {
    const bookmarks = this.getAll();
    const filtered = bookmarks.filter(b => b.id !== bookmarkId);
    localStorage.setItem('bookmarks', JSON.stringify(filtered));
    return filtered;
  },

  // Ottieni tutti i segnalibri
  getAll() {
    try {
      return JSON.parse(localStorage.getItem('bookmarks') || '[]');
    } catch {
      return [];
    }
  },

  // Ottieni segnalibri per un manga specifico
  getByManga(mangaUrl) {
    return this.getAll().filter(b => b.mangaUrl === mangaUrl);
  },

  // Ottieni segnalibri per un capitolo specifico
  getByChapter(mangaUrl, chapterId) {
    return this.getAll().filter(b => 
      b.mangaUrl === mangaUrl && b.chapterId === chapterId
    );
  },

  // Controlla se una pagina è segnata
  isBookmarked(mangaUrl, chapterId, pageNumber) {
    const id = `${mangaUrl}-${chapterId}-${pageNumber}`;
    return this.getAll().some(b => b.id === id);
  },

  // Esporta segnalibri
  export() {
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

  // Importa segnalibri
  import(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          const existing = this.getAll();
          const merged = [...existing, ...imported];
          
          // Deduplica
          const unique = Array.from(
            new Map(merged.map(b => [b.id, b])).values()
          );
          
          localStorage.setItem('bookmarks', JSON.stringify(unique));
          resolve(unique);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  },

  // Conta segnalibri
  count() {
    return this.getAll().length;
  }
};

export default bookmarksManager;

