/**
 * TYPES - Tipi Globali
 * Tipi comuni usati in tutto il progetto
 */

import type { ChangeEvent, FormEvent, MouseEvent, ReactNode, CSSProperties } from 'react';

// ========== UTILITY TYPES ==========

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type ID = string | number;
export type Timestamp = number | string | Date;

export type Dict<T = any> = Record<string, T>;
export type StringDict = Record<string, string>;
export type NumberDict = Record<string, number>;

export type AsyncFunction<T = void> = (...args: any[]) => Promise<T>;
export type VoidFunction = () => void;

// ========== STATUS & STATE ==========

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
export type NetworkState = 'online' | 'offline';

export interface LoadingStatus {
  isLoading: boolean;
  error: string | null;
  data: any;
}

// ========== ERROR HANDLING ==========

export interface ErrorResponse {
  message: string;
  error?: string;
  statusCode?: number;
  details?: any;
}

export interface ApiError extends Error {
  response?: {
    status: number;
    data: ErrorResponse;
  };
}

// ========== PAGINATION ==========

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ========== SEARCH & FILTER ==========

export interface SearchParams {
  query: string;
  filters?: Dict<any>;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  query: string;
}

// ========== USER & AUTH ==========

export interface User {
  id: number;
  username: string;
  email: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserProfile {
  userId: number;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  isPublic: boolean;
  socialLinks?: SocialLinks;
  viewCount: number;
  badges: string[];
}

export interface SocialLinks {
  twitter?: string;
  discord?: string;
  instagram?: string;
  github?: string;
  tiktok?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ========== READING PROGRESS ==========

export interface ReadingProgress {
  mangaUrl: string;
  mangaTitle: string;
  chapterIndex: number;
  pageIndex: number;
  totalPages: number;
  updatedAt: Timestamp;
}

// ========== LIBRARY & LISTS ==========

export type LibraryStatus = 'reading' | 'completed' | 'dropped' | 'plan_to_read';

export interface LibraryEntry {
  mangaUrl: string;
  mangaTitle: string;
  coverUrl?: string;
  source?: string;
  status: LibraryStatus;
  rating?: number;
  notes?: string;
  addedAt: Timestamp;
  updatedAt: Timestamp;
}

// ========== NOTIFICATION ==========

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Timestamp;
  read: boolean;
}

// ========== COMPONENT PROPS ==========

export interface BaseComponentProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface WithLoading {
  isLoading?: boolean;
}

export interface WithError {
  error?: string | null;
}

export interface WithOptional {
  optional?: boolean;
}

// ========== FORM & INPUT ==========

export type InputChangeHandler = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
export type FormSubmitHandler = (event: FormEvent<HTMLFormElement>) => void;
export type ButtonClickHandler = (event: MouseEvent<HTMLButtonElement>) => void;

export interface FormField<T = string> {
  value: T;
  error: string | null;
  touched: boolean;
}

export interface FormState {
  [key: string]: FormField;
}

// ========== CACHE & STORAGE ==========

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt?: number;
}

export interface StorageAdapter {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
}

// ========== THEME & STYLE ==========

export type ColorMode = 'light' | 'dark';
export type ThemeMode = ColorMode | 'system';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  accentColor: string;
}

// ========== ROUTE & NAVIGATION ==========

export interface RouteParams {
  [key: string]: string | undefined;
}

export interface NavigationItem {
  path: string;
  label: string;
  icon?: ReactNode;
  badge?: number;
  external?: boolean;
}

// ========== IMAGE & MEDIA ==========

export interface ImageData {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  placeholder?: string;
}

export interface ImageLoadEvent {
  target: HTMLImageElement;
  naturalWidth: number;
  naturalHeight: number;
}

// ========== VIRTUAL SCROLL ==========

export interface VirtualItem {
  index: number;
  start: number;
  size: number;
  end: number;
}

export interface VirtualScrollProps {
  itemCount: number;
  itemSize: number | ((index: number) => number);
  height: number;
  width?: number;
}

