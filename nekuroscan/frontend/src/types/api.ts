/**
 * TYPES - API & Response
 * Tipi per le richieste e risposte API
 */

import type { User, UserProfile, ReadingProgress, Timestamp } from './index';
import type { Manga, Chapter, MangaDetails } from './manga';

// ========== API CONFIG ==========

export interface ApiConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  retries?: number;
}

export interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
}

// ========== API RESPONSE ==========

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: number;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
  statusCode?: number;
}

// ========== MANGA API ==========

export interface SearchMangaRequest {
  query: string;
  limit?: number;
  includeAdult?: boolean;
}

export interface SearchMangaResponse {
  manga: Manga[];
  mangaAdult: Manga[];
  all: Manga[];
}

export interface MangaDetailsResponse {
  manga: MangaDetails;
  chapters: Chapter[];
  related?: Manga[];
}

export interface ChapterDataResponse {
  chapter: Chapter;
  pages: string[];
  nextChapter?: Chapter;
  prevChapter?: Chapter;
}

// ========== USER API ==========

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  isPublic?: boolean;
  socialLinks?: Record<string, string>;
  avatar?: File;
  banner?: File;
}

export interface UpdateProfileResponse {
  success: boolean;
  profile: UserProfile;
}

// ========== LIBRARY API ==========

export interface UserLibraryData {
  reading: Manga[];
  completed: Manga[];
  dropped: Manga[];
  favorites: Manga[];
}

export interface SyncLibraryRequest {
  reading?: string;
  completed?: string;
  dropped?: string;
  favorites?: string;
  history?: string;
  readingProgress?: ReadingProgress[];
}

export interface SyncLibraryResponse {
  success: boolean;
  message?: string;
}

// ========== FOLLOW API ==========

export interface FollowUserRequest {
  username: string;
}

export interface FollowUserResponse {
  success: boolean;
  following: boolean;
  message?: string;
}

export interface FollowersResponse {
  followers: PublicUser[];
}

export interface FollowingResponse {
  following: PublicUser[];
}

export interface PublicUser {
  id: number;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  followedAt?: Timestamp;
}

// ========== PROFILE API ==========

export interface PublicProfileResponse {
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  badges: string[];
  stats: ProfileStats;
  reading: Manga[];
  completed: Manga[];
  dropped: Manga[];
  favorites: Manga[];
  socialLinks?: Record<string, string>;
  joinedAt: Timestamp;
}

export interface ProfileStats {
  totalRead: number;
  favorites: number;
  completed: number;
  dropped: number;
  views: number;
  followers: number;
  following: number;
}

// ========== SEARCH API ==========

export interface SearchUsersRequest {
  q: string;
}

export interface SearchUsersResponse {
  users: PublicUser[];
}

// ========== NOTIFICATION API ==========

export interface MangaNotification {
  id: number;
  userId: number;
  mangaUrl: string;
  mangaTitle: string;
  enabled: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ToggleMangaNotificationRequest {
  mangaUrl: string;
  mangaTitle: string;
  enabled: boolean;
}

export interface ToggleMangaNotificationResponse {
  success: boolean;
  notification: MangaNotification;
}

export interface GetMangaNotificationsResponse {
  notifications: MangaNotification[];
}

// ========== STATS API ==========

export interface TrendingMangaResponse {
  trending: Manga[];
  period: 'daily' | 'weekly' | 'monthly';
}

export interface PopularMangaResponse {
  popular: Manga[];
  timeRange: string;
}

export interface MangaStatsResponse {
  views: number;
  favorites: number;
  readers: number;
  rating?: number;
}

// ========== CACHE API ==========

export interface CacheStats {
  size: number;
  entries: number;
  hitRate: number;
  missRate: number;
}

export interface CacheManifest {
  version: string;
  timestamp: number;
  entries: Array<{
    key: string;
    url: string;
    size: number;
    timestamp: number;
  }>;
}

// ========== EXPORT API ==========

export interface ExportUserDataResponse {
  user: User;
  profile: UserProfile;
  library: UserLibraryData;
  readingProgress: ReadingProgress[];
  history: any[];
  favorites: any[];
  exportedAt: Timestamp;
}

