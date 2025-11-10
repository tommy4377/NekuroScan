/**
 * API TYPES - HTTP API request/response types
 * Shared between frontend and backend
 */

// ========== GENERIC API TYPES ==========

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp?: Date;
}

export interface PaginatedResponse<T> {
  results: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiError {
  success: false;
  error: string;
  code: string;
  statusCode: number;
  details?: unknown;
}

// ========== RATE LIMITING ==========

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

export interface RateLimitResponse {
  success: false;
  error: string;
  rateLimit: RateLimitInfo;
  retryAfter: number;
}

// ========== VALIDATION ==========

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationErrorResponse {
  success: false;
  error: string;
  validationErrors: ValidationError[];
}

// ========== HEALTH CHECK ==========

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  services: {
    database: 'connected' | 'disconnected' | 'error';
    storage: 'connected' | 'disconnected' | 'error';
    cache?: 'connected' | 'disconnected' | 'error';
  };
  version: string;
}

// ========== SYNC ==========

export interface SyncRequest {
  lastSyncTimestamp?: Date;
  forceSync?: boolean;
}

export interface SyncResponse<T> {
  success: boolean;
  data: T;
  syncedAt: Date;
  conflicts?: {
    field: string;
    local: unknown;
    remote: unknown;
    resolved: unknown;
  }[];
}

// ========== NOTIFICATION ==========

export interface NotificationPayload {
  userId: string;
  type: 'chapter_release' | 'follow' | 'comment' | 'like' | 'system';
  title: string;
  message: string;
  link?: string;
  imageUrl?: string;
  data?: Record<string, unknown>;
}

export interface NotificationResponse {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: Date;
}

// ========== UPLOAD ==========

export interface UploadResponse {
  success: boolean;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  publicUrl?: string;
}

// ========== BATCH OPERATIONS ==========

export interface BatchRequest<T> {
  operations: T[];
  continueOnError?: boolean;
}

export interface BatchResponse<T> {
  success: boolean;
  results: T[];
  errors: {
    index: number;
    error: string;
  }[];
  successCount: number;
  errorCount: number;
}

// ========== TYPE GUARDS ==========

export function isApiError(obj: unknown): obj is ApiError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'success' in obj &&
    obj.success === false &&
    'error' in obj
  );
}

export function isPaginatedResponse<T>(obj: unknown): obj is PaginatedResponse<T> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'results' in obj &&
    'total' in obj &&
    'hasMore' in obj
  );
}

export function isValidationErrorResponse(obj: unknown): obj is ValidationErrorResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'success' in obj &&
    obj.success === false &&
    'validationErrors' in obj
  );
}

export default {
  // Export all types
};

