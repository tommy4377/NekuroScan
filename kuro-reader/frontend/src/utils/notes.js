// 📝 NOTES.JS - Sistema Note Personali su Capitoli/Pagine

export const notesManager = {
  // Aggiungi o aggiorna nota
  saveNote(mangaUrl, chapterId, pageNumber, noteText) {
    const notes = this.getAll();
    
    const note = {
      id: `${mangaUrl}-${chapterId}-${pageNumber}`,
      mangaUrl,
      chapterId,
      pageNumber,
      text: noteText.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const existingIndex = notes.findIndex(n => n.id === note.id);
    
    if (existingIndex !== -1) {
      notes[existingIndex] = {
        ...notes[existingIndex],
        text: note.text,
        updatedAt: note.updatedAt
      };
    } else {
      notes.push(note);
    }
    
    localStorage.setItem('notes', JSON.stringify(notes));
    return note;
  },

  // Rimuovi nota
  removeNote(noteId) {
    const notes = this.getAll();
    const filtered = notes.filter(n => n.id !== noteId);
    localStorage.setItem('notes', JSON.stringify(filtered));
    return filtered;
  },

  // Ottieni tutte le note
  getAll() {
    try {
      return JSON.parse(localStorage.getItem('notes') || '[]');
    } catch {
      return [];
    }
  },

  // Ottieni note per manga
  getByManga(mangaUrl) {
    return this.getAll().filter(n => n.mangaUrl === mangaUrl);
  },

  // Ottieni note per capitolo
  getByChapter(mangaUrl, chapterId) {
    return this.getAll().filter(n => 
      n.mangaUrl === mangaUrl && n.chapterId === chapterId
    );
  },

  // Ottieni nota per pagina specifica
  getForPage(mangaUrl, chapterId, pageNumber) {
    const id = `${mangaUrl}-${chapterId}-${pageNumber}`;
    return this.getAll().find(n => n.id === id);
  },

  // Controlla se c'è una nota per una pagina
  hasNote(mangaUrl, chapterId, pageNumber) {
    return !!this.getForPage(mangaUrl, chapterId, pageNumber);
  },

  // Export notes
  export() {
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

  // Import notes
  import(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          const existing = this.getAll();
          
          // Merge con deduplica (preferisce importate)
          const merged = [...imported, ...existing];
          const unique = Array.from(
            new Map(merged.map(n => [n.id, n])).values()
          );
          
          localStorage.setItem('notes', JSON.stringify(unique));
          resolve(unique);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  },

  // Conta note
  count() {
    return this.getAll().length;
  },

  // Statistiche
  getStats() {
    const notes = this.getAll();
    const byManga = {};
    
    notes.forEach(note => {
      byManga[note.mangaUrl] = (byManga[note.mangaUrl] || 0) + 1;
    });
    
    return {
      total: notes.length,
      uniqueManga: Object.keys(byManga).length,
      mostAnnotated: Object.entries(byManga)
        .sort((a, b) => b[1] - a[1])[0]
    };
  }
};

export default notesManager;

