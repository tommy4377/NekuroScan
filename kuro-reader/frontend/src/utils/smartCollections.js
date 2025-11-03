// 🎯 SMART COLLECTIONS - Collezioni automatiche intelligenti

export const smartCollections = {
  // Genera collezione "Quasi finiti"
  getAlmostFinished() {
    const reading = JSON.parse(localStorage.getItem('reading') || '[]');
    return {
      id: 'almost-finished',
      name: '🎯 Quasi Finiti',
      description: 'Manga con progresso > 80%',
      manga: reading.filter(m => m.progress > 80),
      color: 'green',
      auto: true
    };
  },

  // Genera collezione "Abbandonati da tempo"
  getStale() {
    const reading = JSON.parse(localStorage.getItem('reading') || '[]');
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    return {
      id: 'stale',
      name: '⏰ Non letti da 30+ giorni',
      description: 'Manga che non leggi da più di un mese',
      manga: reading.filter(m => {
        const lastRead = new Date(m.lastRead).getTime();
        return lastRead < thirtyDaysAgo;
      }),
      color: 'orange',
      auto: true
    };
  },

  // Genera collezione "Appena iniziati"
  getJustStarted() {
    const reading = JSON.parse(localStorage.getItem('reading') || '[]');
    
    return {
      id: 'just-started',
      name: '🌱 Appena Iniziati',
      description: 'Progresso < 10%',
      manga: reading.filter(m => m.progress < 10),
      color: 'cyan',
      auto: true
    };
  },

  // Genera collezione "In corso"
  getInProgress() {
    const reading = JSON.parse(localStorage.getItem('reading') || '[]');
    
    return {
      id: 'in-progress',
      name: '📖 In Corso',
      description: 'Progresso tra 10% e 80%',
      manga: reading.filter(m => m.progress >= 10 && m.progress <= 80),
      color: 'blue',
      auto: true
    };
  },

  // Genera collezione "Nuovi capitoli disponibili" (simulato)
  getNewChapters() {
    const reading = JSON.parse(localStorage.getItem('reading') || '[]');
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    // Simula rilevamento nuovi capitoli (da implementare con backend)
    const all = [...reading, ...favorites];
    const unique = Array.from(new Map(all.map(m => [m.url, m])).values());
    
    return {
      id: 'new-chapters',
      name: '🆕 Nuovi Capitoli',
      description: 'Manga con nuovi capitoli disponibili',
      manga: unique.filter(() => Math.random() > 0.7), // Placeholder
      color: 'purple',
      auto: true
    };
  },

  // Genera collezione "Preferiti non letti"
  getUnreadFavorites() {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const reading = JSON.parse(localStorage.getItem('reading') || '[]');
    const completed = JSON.parse(localStorage.getItem('completed') || '[]');
    
    const readOrCompleted = [...reading, ...completed].map(m => m.url);
    
    return {
      id: 'unread-favorites',
      name: '❤️ Preferiti da Leggere',
      description: 'Preferiti che non hai ancora iniziato',
      manga: favorites.filter(m => !readOrCompleted.includes(m.url)),
      color: 'pink',
      auto: true
    };
  },

  // Genera collezione per genere preferito
  getByTopGenre() {
    const reading = JSON.parse(localStorage.getItem('reading') || '[]');
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    // Conta generi
    const genreCounts = {};
    [...reading, ...favorites].forEach(manga => {
      if (manga.genres) {
        manga.genres.forEach(g => {
          const genre = g.genre || g;
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      }
    });
    
    // Trova top genre
    const topGenre = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (!topGenre) return null;
    
    return {
      id: 'top-genre',
      name: `🎨 Genere: ${topGenre[0]}`,
      description: `I tuoi manga ${topGenre[0]}`,
      manga: [...reading, ...favorites].filter(m => 
        m.genres?.some(g => (g.genre || g) === topGenre[0])
      ),
      color: 'teal',
      auto: true
    };
  },

  // Ottieni tutte le collezioni smart
  getAll() {
    const collections = [
      this.getAlmostFinished(),
      this.getInProgress(),
      this.getJustStarted(),
      this.getStale(),
      this.getNewChapters(),
      this.getUnreadFavorites(),
      this.getByTopGenre()
    ].filter(c => c && c.manga.length > 0);
    
    return collections;
  },

  // Ottieni collezione per ID
  getById(id) {
    return this.getAll().find(c => c.id === id);
  }
};

export default smartCollections;

