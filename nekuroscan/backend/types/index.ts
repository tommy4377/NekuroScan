/**
 * BACKEND TYPES - Central export for all backend types
 * Import from this file to get all types
 */

// Re-export all user types
export * from './user';
export * from './profile';
export * from './api';

// ========== CONVENIENCE EXPORTS ==========

import type { User, UserPublic, UserRole, UserStatus } from './user';
import type { LibraryData, MangaLibraryItem, ReadingProgress } from './profile';
import type { ApiResponse, ApiError, PaginatedResponse, RateLimitResponse } from './api';

export type {
  // User types
  User,
  UserPublic,
  UserRole,
  UserStatus,
  
  // Library types
  LibraryData,
  MangaLibraryItem,
  ReadingProgress,
  
  // API types
  ApiResponse,
  ApiError,
  PaginatedResponse,
  RateLimitResponse
};

