/**
 * PROFILE TYPES - User profile and library types
 * Shared between frontend and backend
 */

// ========== INTERFACES ==========

export interface ProfileData {
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  isPublic: boolean;
  socialLinks?: {
    twitter?: string;
    discord?: string;
    instagram?: string;
    github?: string;
    tiktok?: string;
  };
  statistics?: {
    totalRead: number;
    chaptersRead: number;
    favoriteCount: number;
    listCount: number;
    followersCount: number;
    followingCount: number;
    viewCount: number;
  };
  badges?: string[];
}

export interface LibraryData {
  reading: MangaLibraryItem[];
  completed: MangaLibraryItem[];
  dropped: MangaLibraryItem[];
  favorites: MangaLibraryItem[];
}

export interface MangaLibraryItem {
  url: string;
  title: string;
  coverUrl?: string;
  source: string;
  lastChapterIndex?: number;
  lastPageIndex?: number;
  lastRead?: Date;
  status?: 'reading' | 'completed' | 'dropped' | 'plan_to_read';
  progress?: number;
  rating?: number;
  notes?: string;
}

export interface ReadingProgress {
  mangaUrl: string;
  chapterIndex: number;
  pageIndex: number;
  timestamp: Date;
  percentage?: number;
}

export interface Following {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  followedAt: Date;
}

export interface Follower {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  followedAt: Date;
}

// ========== REQUEST/RESPONSE TYPES ==========

export interface SyncLibraryRequest {
  reading?: MangaLibraryItem[];
  completed?: MangaLibraryItem[];
  dropped?: MangaLibraryItem[];
  favorites?: MangaLibraryItem[];
}

export interface SyncLibraryResponse {
  success: boolean;
  synced: {
    reading: number;
    completed: number;
    dropped: number;
    favorites: number;
  };
  timestamp: Date;
}

export interface GetProfileResponse {
  profile: ProfileData;
  library: LibraryData;
  following: Following[];
  followers: Follower[];
}

export interface UpdateStatsRequest {
  chaptersRead?: number;
  totalRead?: number;
  lastActive?: Date;
}

// ========== TYPE GUARDS ==========

export function isLibraryData(obj: unknown): obj is LibraryData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'reading' in obj &&
    'completed' in obj &&
    'dropped' in obj &&
    'favorites' in obj
  );
}

export function isReadingProgress(obj: unknown): obj is ReadingProgress {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'mangaUrl' in obj &&
    'chapterIndex' in obj &&
    'pageIndex' in obj
  );
}

export default {
  // Export all types
};

