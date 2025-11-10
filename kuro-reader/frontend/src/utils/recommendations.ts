/**
 * RECOMMENDATION ENGINE - Intelligent manga recommendations
 * Based on user preferences, genres, and reading patterns
 */

import type { Manga } from '@/types/manga';

// ========== TYPES ==========

interface MangaWithScore extends Manga {
  recommendationScore: number;
}

interface SimilarManga extends Manga {
  similarityScore: number;
  commonGenres: string[];
}

interface UserPreferences {
  genres: Map<string, number>;
  types: Map<string, number>;
  sources: Map<string, number>;
}

// ========== CLASS ==========

export class RecommendationEngine {
  private userGenres: Map<string, number> = new Map();
  private userTypes: Map<string, number> = new Map();
  private userSources: Map<string, number> = new Map();

  analyzeUserPreferences(userManga: Manga[]): void {
    this.userGenres.clear();
    this.userTypes.clear();
    this.userSources.clear();

    userManga.forEach(manga => {
      // Analyze genres
      if (manga.genres && Array.isArray(manga.genres)) {
        manga.genres.forEach(genre => {
          const genreName = typeof genre === 'string' ? genre : genre;
          this.userGenres.set(genreName, (this.userGenres.get(genreName) || 0) + 1);
        });
      }

      // Analyze type
      if (manga.type) {
        this.userTypes.set(manga.type, (this.userTypes.get(manga.type) || 0) + 1);
      }

      // Analyze source
      if (manga.source) {
        this.userSources.set(manga.source, (this.userSources.get(manga.source) || 0) + 1);
      }
    });
  }

  calculateRecommendationScore(manga: Manga, userManga: Manga[] = []): number {
    let score = 0;
    const userUrls = new Set(userManga.map(m => m.url));

    // Skip manga user already has
    if (userUrls.has(manga.url)) {
      return 0;
    }

    // Score for genres
    if (manga.genres && Array.isArray(manga.genres)) {
      manga.genres.forEach(genre => {
        const genreName = typeof genre === 'string' ? genre : genre;
        const userGenreCount = this.userGenres.get(genreName) || 0;
        score += userGenreCount * 10;
      });
    }

    // Score for type
    if (manga.type && this.userTypes.has(manga.type)) {
      score += (this.userTypes.get(manga.type) || 0) * 5;
    }

    // Score for source
    if (manga.source && this.userSources.has(manga.source)) {
      score += (this.userSources.get(manga.source) || 0) * 3;
    }

    // Bonus for trending/popular
    if (manga.isTrending) score += 20;
    if (manga.isPopular) score += 15;
    if (manga.isRecent) score += 10;

    // Bonus for long series
    const chaptersNumber = manga.chaptersNumber || manga.totalChapters;
    if (chaptersNumber && chaptersNumber > 50) {
      score += 5;
    }

    return score;
  }

  generateRecommendations(allManga: Manga[], userManga: Manga[] = []): MangaWithScore[] {
    this.analyzeUserPreferences(userManga);

    const recommendations = allManga
      .map(manga => ({
        ...manga,
        recommendationScore: this.calculateRecommendationScore(manga, userManga)
      }))
      .filter(manga => manga.recommendationScore > 0)
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 20);

    // Fallback to popular manga if no personalized recommendations
    if (recommendations.length === 0) {
      return allManga
        .filter(manga => manga.isTrending || manga.isPopular)
        .slice(0, 12)
        .map(manga => ({ ...manga, recommendationScore: 0 }));
    }

    return recommendations;
  }

  generateSearchRecommendations(searchResults: Manga[], userManga: Manga[] = []): MangaWithScore[] {
    if (!searchResults || searchResults.length === 0) {
      return [];
    }

    this.analyzeUserPreferences(userManga);

    return searchResults
      .slice(0, 10)
      .map(manga => ({
        ...manga,
        recommendationScore: this.calculateRecommendationScore(manga, userManga)
      }))
      .sort((a, b) => b.recommendationScore - a.recommendationScore);
  }

  generateSimilarRecommendations(
    targetManga: Manga, 
    allManga: Manga[], 
    userManga: Manga[] = []
  ): SimilarManga[] {
    if (!targetManga?.genres) {
      return [];
    }

    const targetGenres = new Set(
      targetManga.genres.map(g => typeof g === 'string' ? g : g)
    );
    const userUrls = new Set(userManga.map(m => m.url));
    
    const similarManga = allManga
      .filter(manga => {
        if (manga.url === targetManga.url) return false;
        if (userUrls.has(manga.url)) return false;
        if (!manga.genres || !Array.isArray(manga.genres)) return false;
        
        const mangaGenres = new Set(manga.genres.map(g => typeof g === 'string' ? g : g));
        return [...targetGenres].some(genre => mangaGenres.has(genre));
      })
      .map(manga => {
        const mangaGenres = new Set(manga.genres!.map(g => typeof g === 'string' ? g : g));
        const commonGenres = [...targetGenres].filter(genre => mangaGenres.has(genre));
        
        let similarityScore = commonGenres.length * 10;
        
        if (manga.type === targetManga.type) similarityScore += 5;
        if (manga.source === targetManga.source) similarityScore += 3;

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

  getUserPreferences(): UserPreferences {
    return {
      genres: new Map(this.userGenres),
      types: new Map(this.userTypes),
      sources: new Map(this.userSources)
    };
  }

  clear(): void {
    this.userGenres.clear();
    this.userTypes.clear();
    this.userSources.clear();
  }
}

// ========== SINGLETON ==========

export const recommendationEngine = new RecommendationEngine();

export default recommendationEngine;

