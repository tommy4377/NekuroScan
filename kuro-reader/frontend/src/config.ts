/**
 * CONFIG - Configurazione Applicazione
 * Gestisce URLs e impostazioni ambiente
 * 
 * UPDATED: 2025-11-10 - Production URLs verified
 * Backend: kuro-auth-backend.onrender.com
 * Proxy: kuro-proxy-server.onrender.com
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

export const config: AppConfig = {
  API_URL: isDevelopment 
    ? 'http://localhost:10000' 
    : 'https://kuro-auth-backend.onrender.com',
  PROXY_URL: isDevelopment 
    ? 'http://localhost:10001' 
    : 'https://kuro-proxy-server.onrender.com',
  isDevelopment,
  isProduction
} as const;

// ========== ENVIRONMENT HELPERS ==========

export const getApiUrl = (path: string = ''): string => {
  const baseUrl = config.API_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

export const getProxyUrl = (imageUrl: string): string => {
  if (!imageUrl) return '';
  
  // Se è già un URL del proxy, ritorna così com'è
  if (imageUrl.includes(config.PROXY_URL)) {
    return imageUrl;
  }
  
  // Altrimenti costruisci l'URL del proxy
  const encodedUrl = encodeURIComponent(imageUrl);
  return `${config.PROXY_URL}/proxy?url=${encodedUrl}`;
};

// ========== EXPORT DEFAULT ==========

export default config;

