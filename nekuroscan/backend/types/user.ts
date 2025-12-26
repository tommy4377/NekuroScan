/**
 * USER TYPES - Shared user types between frontend and backend
 * These types ensure consistency across the entire stack
 */

// ========== ENUMS ==========

export enum UserRole {
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED'
}

// ========== INTERFACES ==========

export interface UserProfile {
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
}

export interface UserStatistics {
  totalRead: number;
  chaptersRead: number;
  favoriteCount: number;
  listCount: number;
  followersCount: number;
  followingCount: number;
  viewCount: number;
  lastActive: Date;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  profile?: UserProfile;
  statistics?: UserStatistics;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface UserPublic {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  statistics?: Partial<UserStatistics>;
  badges?: string[];
  isPublic: boolean;
}

export interface UserSession {
  userId: string;
  username: string;
  role: UserRole;
  token: string;
  expiresAt: Date;
}

// ========== REQUEST/RESPONSE TYPES ==========

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
  expiresIn: number;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  isPublic?: boolean;
  socialLinks?: UserProfile['socialLinks'];
}

export interface FollowRequest {
  targetUsername: string;
}

export interface SearchUsersRequest {
  query: string;
  limit?: number;
  includePrivate?: boolean;
}

export interface SearchUsersResponse {
  users: UserPublic[];
  total: number;
}

// ========== TYPE GUARDS ==========

export function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'username' in obj &&
    'email' in obj
  );
}

export function isAuthResponse(obj: unknown): obj is AuthResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'success' in obj &&
    'token' in obj &&
    'user' in obj
  );
}

export default {
  UserRole,
  UserStatus
};

