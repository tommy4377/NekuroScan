// Sistema di raccomandazioni intelligenti basato sui generi e preferenze utente

export class RecommendationEngine {
  constructor() {
    this.userGenres = new Map();
    this.userTypes = new Map();
    this.userSources = new Map();
  }

  // Analizza i manga dell'utente per estrarre preferenze
  analyzeUserPreferences(userManga) {
    this.userGenres.clear();
    this.userTypes.clear();
    this.userSources.clear();

    userManga.forEach(manga => {
      // Analizza generi
      if (manga.genres && Array.isArray(manga.genres)) {
        manga.genres.forEach(genre => {
          const genreName = genre.genre || genre;
          this.userGenres.set(genreName, (this.userGenres.get(genreName) || 0) + 1);
        });
      }

      // Analizza tipo
      if (manga.type) {
        this.userTypes.set(manga.type, (this.userTypes.get(manga.type) || 0) + 1);
      }

      // Analizza fonte
      if (manga.source) {
        this.userSources.set(manga.source, (this.userSources.get(manga.source) || 0) + 1);
      }
    });

    console.log('📊 User preferences analyzed:', {
      genres: Array.from(this.userGenres.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5),
      types: Array.from(this.userTypes.entries()).sort((a, b) => b[1] - a[1]),
      sources: Array.from(this.userSources.entries()).sort((a, b) => b[1] - a[1])
    });
  }

  // Calcola il punteggio di raccomandazione per un manga
  calculateRecommendationScore(manga, userManga = []) {
    let score = 0;
    const userUrls = new Set(userManga.map(m => m.url));

    // Evita di raccomandare manga già posseduti
    if (userUrls.has(manga.url)) {
      return 0;
    }

    // Punteggio per generi
    if (manga.genres && Array.isArray(manga.genres)) {
      manga.genres.forEach(genre => {
        const genreName = genre.genre || genre;
        const userGenreCount = this.userGenres.get(genreName) || 0;
        score += userGenreCount * 10; // 10 punti per ogni manga con lo stesso genere
      });
    }

    // Punteggio per tipo
    if (manga.type && this.userTypes.has(manga.type)) {
      score += this.userTypes.get(manga.type) * 5; // 5 punti per tipo preferito
    }

    // Punteggio per fonte
    if (manga.source && this.userSources.has(manga.source)) {
      score += this.userSources.get(manga.source) * 3; // 3 punti per fonte preferita
    }

    // Bonus per manga popolari/trending
    if (manga.isTrending) score += 20;
    if (manga.isPopular) score += 15;
    if (manga.isRecent) score += 10;

    // Bonus per manga con molti capitoli (serie lunghe)
    if (manga.chaptersNumber && manga.chaptersNumber > 50) {
      score += 5;
    }

    return score;
  }

  // Genera raccomandazioni basate sui manga dell'utente
  generateRecommendations(allManga, userManga = []) {
    this.analyzeUserPreferences(userManga);

    const recommendations = allManga
      .map(manga => ({
        ...manga,
        recommendationScore: this.calculateRecommendationScore(manga, userManga)
      }))
      .filter(manga => manga.recommendationScore > 0)
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 20); // Top 20 raccomandazioni

    // Se non ci sono raccomandazioni personalizzate, usa i manga più popolari
    if (recommendations.length === 0) {
      const fallbackRecommendations = allManga
        .filter(manga => manga.isTrending || manga.isPopular)
        .slice(0, 12);
      
      console.log('🎯 No personalized recommendations, using popular manga:', fallbackRecommendations.length);
      return fallbackRecommendations;
    }

    console.log('🎯 Generated recommendations:', recommendations.slice(0, 5).map(m => ({
      title: m.title,
      score: m.recommendationScore,
      genres: m.genres?.map(g => g.genre || g).slice(0, 3)
    })));

    return recommendations;
  }

  // Genera raccomandazioni basate su una ricerca
  generateSearchRecommendations(searchResults, userManga = []) {
    if (!searchResults || searchResults.length === 0) {
      return [];
    }

    this.analyzeUserPreferences(userManga);

    // Prendi i primi risultati della ricerca e li ordina per punteggio di raccomandazione
    const recommendations = searchResults
      .slice(0, 10) // Limita a 10 risultati
      .map(manga => ({
        ...manga,
        recommendationScore: this.calculateRecommendationScore(manga, userManga)
      }))
      .sort((a, b) => b.recommendationScore - a.recommendationScore);

    return recommendations;
  }

  // Genera raccomandazioni basate su un manga specifico
  generateSimilarRecommendations(targetManga, allManga, userManga = []) {
    if (!targetManga || !targetManga.genres) {
      return [];
    }

    const targetGenres = new Set(targetManga.genres.map(g => g.genre || g));
    
    const similarManga = allManga
      .filter(manga => {
        // Evita il manga stesso
        if (manga.url === targetManga.url) return false;
        
        // Evita manga già posseduti
        const userUrls = new Set(userManga.map(m => m.url));
        if (userUrls.has(manga.url)) return false;

        // Deve avere almeno un genere in comune
        if (!manga.genres || !Array.isArray(manga.genres)) return false;
        
        const mangaGenres = new Set(manga.genres.map(g => g.genre || g));
        return [...targetGenres].some(genre => mangaGenres.has(genre));
      })
      .map(manga => {
        // Calcola punteggio di similarità
        const mangaGenres = new Set(manga.genres.map(g => g.genre || g));
        const commonGenres = [...targetGenres].filter(genre => mangaGenres.has(genre));
        
        let similarityScore = commonGenres.length * 10; // 10 punti per genere in comune
        
        // Bonus per stesso tipo
        if (manga.type === targetManga.type) {
          similarityScore += 5;
        }

        // Bonus per stessa fonte
        if (manga.source === targetManga.source) {
          similarityScore += 3;
        }

        return {
          ...manga,
          similarityScore,
          commonGenres
        };
      })
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 10);

    return similarManga;
  }
}

// Istanza singleton
export const recommendationEngine = new RecommendationEngine();
