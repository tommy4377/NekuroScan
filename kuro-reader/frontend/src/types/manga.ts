/**
 * TYPES - Manga & Reader
 * Tipi per manga, capitoli, e funzionalità di lettura
 */

import type { SyntheticEvent, CSSProperties } from 'react';
import type { Timestamp } from './index';

// ========== SOURCE ==========

export type MangaSource = 'mangaWorld' | 'mangaWorldAdult';

export interface SourceInfo {
  id: MangaSource;
  name: string;
  baseURL: string;
  isAdult: boolean;
}

// ========== MANGA ==========

export interface Manga {
  url: string;
  title: string;
  coverUrl?: string;
  source: MangaSource;
  type: 'manga' | 'light-novel';
  isAdult: boolean;
  
  // Optional fields
  author?: string;
  authors?: string[];  // ✅ FIX: API può ritornare array o string
  artist?: string;
  artists?: string[];  // ✅ FIX: API può ritornare array o string
  status?: MangaStatus;
  year?: number;
  genres?: string[];
  rating?: number;
  views?: number;
  description?: string;
  plot?: string;  // ✅ FIX: Alcuni componenti usano 'plot'
  synopsis?: string;  // ✅ FIX: Altri usano 'synopsis'
  chapters?: Chapter[];
  
  // Metadata
  lastChapter?: string;
  latestChapter?: string;  // ✅ FIX: Some API responses use 'latestChapter' instead of 'lastChapter'
  totalChapters?: number;
  chaptersNumber?: number;
  updatedAt?: Timestamp;
  
  // Flags
  isTrending?: boolean;
  isPopular?: boolean;
  isRecent?: boolean;
  progress?: number;
  lastRead?: string;
}

export type MangaStatus = 'ongoing' | 'completed' | 'hiatus' | 'cancelled';

export interface MangaDetails extends Manga {
  alternativeTitles?: string[];
  synopsis?: string;
  tags?: string[];
  chapters: Chapter[];
  related?: Manga[];
  recommendations?: Manga[];
  statistics?: MangaStatistics;
}

export interface MangaStatistics {
  views: number;
  favorites: number;
  readers: number;
  rating: number;
  ratingCount: number;
  comments: number;
}

// ========== CHAPTER ==========

export interface Chapter {
  id: string;
  title: string;
  url: string;
  chapterNumber?: number;
  volume?: number;
  pages: string[];
  
  // Metadata
  uploadDate?: Timestamp;
  views?: number;
  scanlator?: string;
  
  // Navigation
  nextChapter?: string;
  prevChapter?: string;
  mangaUrl?: string;
}

export interface ChapterListItem {
  id: string;
  title: string;
  url: string;
  chapterNumber?: number;
  volume?: number;
  uploadDate?: Timestamp;
  isRead?: boolean;
  isDownloaded?: boolean;
}

// ========== READER ==========

export type ReadingMode = 'single' | 'double' | 'webtoon';
export type ReadingDirection = 'ltr' | 'rtl';
export type PageFit = 'width' | 'height' | 'contain' | 'cover';

export interface ReaderSettings {
  readingMode: ReadingMode;
  direction: ReadingDirection;
  pageFit: PageFit;
  backgroundColor: string;
  autoRead: boolean;
  autoReadSpeed: number;
  showPageNumber: boolean;
  showProgress: boolean;
  imageScale: number;
  smoothScroll: boolean;
  preloadPages: number;
}

export interface ReaderState {
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  isFullscreen: boolean;
  showControls: boolean;
  showNotes: boolean;
  showBookmark: boolean;
  error: string | null;
}

export interface PageInfo {
  index: number;
  url: string;
  isLoaded: boolean;
  isVisible: boolean;
  naturalWidth?: number;
  naturalHeight?: number;
  error?: string;
}

// ========== BOOKMARK ==========

export interface Bookmark {
  id: string;
  mangaUrl: string;
  mangaTitle: string;
  chapterUrl: string;
  chapterTitle: string;
  pageNumber: number;
  note?: string;
  createdAt: Timestamp;
}

// ========== NOTE ==========

export interface Note {
  id: string;
  mangaUrl: string;
  chapterUrl: string;
  pageNumber: number;
  content: string;
  color?: string;
  position?: NotePosition;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface NotePosition {
  x: number;
  y: number;
}

// ========== DOWNLOAD ==========

export interface DownloadedChapter {
  mangaUrl: string;
  mangaTitle: string;
  chapterUrl: string;
  chapterTitle: string;
  pages: string[];
  downloadedAt: Timestamp;
  size: number;
}

export interface DownloadProgress {
  chapterUrl: string;
  progress: number;
  total: number;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  error?: string;
}

export interface DownloadQueue {
  items: DownloadQueueItem[];
  isProcessing: boolean;
  currentItem: DownloadQueueItem | null;
}

export interface DownloadQueueItem {
  id: string;
  manga: Manga;
  chapter: Chapter;
  priority: number;
  addedAt: Timestamp;
}

// ========== HISTORY ==========

export interface HistoryEntry {
  id: string;
  mangaUrl: string;
  mangaTitle: string;
  coverUrl?: string;
  chapterUrl?: string;
  chapterTitle?: string;
  pageNumber?: number;
  viewedAt: Timestamp;
  readingTime?: number;
}

// ========== GENRE & TAG ==========

export interface Genre {
  id: string;
  name: string;
  slug: string;
  description?: string;
  count?: number;
}

export interface Tag extends Genre {
  color?: string;
}

// ========== CATEGORY ==========

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  manga?: Manga[];
}

// ========== FILTER ==========

export interface MangaFilter {
  genres?: string[];
  excludeGenres?: string[];
  status?: MangaStatus[];
  year?: {
    min?: number;
    max?: number;
  };
  rating?: {
    min?: number;
    max?: number;
  };
  type?: ('manga' | 'light-novel')[];
  isAdult?: boolean;
}

export interface SortOptions {
  field: 'title' | 'rating' | 'views' | 'updated' | 'year';
  order: 'asc' | 'desc';
}

export interface SearchOptions {
  query?: string;
  filter?: MangaFilter;
  sort?: SortOptions;
  limit?: number;
  offset?: number;
}

// ========== IMAGE PROXY ==========

export interface ProxyImageProps {
  src: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  fit?: 'contain' | 'cover' | 'fill' | 'none';
  quality?: number;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  onLoad?: (event: SyntheticEvent<HTMLImageElement>) => void;
  onError?: (event: SyntheticEvent<HTMLImageElement>) => void;
  className?: string;
  style?: CSSProperties;
}

export interface ImageCacheEntry {
  url: string;
  blob: Blob;
  timestamp: number;
  size: number;
}

// ========== PRELOAD ==========

export interface PreloadOptions {
  priority?: 'high' | 'low';
  timeout?: number;
  retries?: number;
}

export interface PreloadResult {
  url: string;
  success: boolean;
  duration: number;
  error?: string;
}

export interface PreloadProgress {
  total: number;
  loaded: number;
  failed: number;
  percentage: number;
}

// ========== CHAPTER LOADING ==========

export interface ChapterLoadingScreenProps {
  chapterTitle: string;
  chapterPages: string[];
  currentPage?: number;
  totalPages?: number;
  onLoadComplete: () => void;
  minDelay?: number;
}

export interface LoadingTask {
  id: string;
  name: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  progress?: number;
}

// ========== READER CONTROLS ==========

export interface ReaderControlsProps {
  manga: Manga;
  chapter: Chapter;
  currentPage: number;
  totalPages: number;
  isFullscreen: boolean;
  readingMode: ReadingMode;
  onPageChange: (page: number) => void;
  onReadingModeChange: (mode: ReadingMode) => void;
  onToggleFullscreen: () => void;
  onNavigateChapter: (direction: 'next' | 'prev') => void;
  onClose: () => void;
}

// ========== MANGA CARD ==========

export interface MangaCardProps {
  manga: Manga;
  hideSource?: boolean;
  priority?: boolean;
  lazy?: boolean;
  showProgress?: boolean;
  progress?: number;
  onClick?: () => void;
}

