/**
 * CONFIG - Configurazione Applicazione
 * Gestisce URLs e impostazioni ambiente
 * 
 * UPDATED: 2025-01-XX - NeKuroScan v5.0 - Unified Backend
 * Backend: nekuroscan-1r86.onrender.com (unified backend + proxy)
 * Frontend: Vercel (uses rewrites for API calls)
 */

// ========== TYPES ==========

export interface AppConfig {
  readonly API_URL: string;
  readonly PROXY_URL: string;
  readonly isDevelopment: boolean;
  readonly isProduction: boolean;
}

// ========== CONFIG ==========

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// In production on Vercel, use relative URLs (rewritten to backend via vercel.json)
// In development, use localhost URLs
export const config: AppConfig = {
  API_URL: isDevelopment 
    ? 'http://localhost:10000' 
    : '', // Empty string = relative URL, Vercel will rewrite
  PROXY_URL: isDevelopment 
    ? 'http://localhost:10000'  // Same as backend in unified setup
    : '', // Empty string = relative URL, Vercel will rewrite
  isDevelopment,
  isProduction
} as const;

// ========== ENVIRONMENT HELPERS ==========

export const getApiUrl = (path: string = ''): string => {
  const baseUrl = config.API_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // If baseUrl is empty (production), use relative URL
  return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
};

export const getProxyUrl = (imageUrl: string): string => {
  if (!imageUrl) return '';
  
  // Se è già un URL del proxy, ritorna così com'è
  if (imageUrl.includes('/api/image-proxy') || imageUrl.includes('/api/proxy')) {
    return imageUrl;
  }
  
  // Altrimenti costruisci l'URL del proxy (relativo in production)
  const encodedUrl = encodeURIComponent(imageUrl);
  const proxyBase = config.PROXY_URL || '';
  return `${proxyBase}/api/image-proxy?url=${encodedUrl}`;
};

// ========== EXPORT DEFAULT ==========

export default config;

