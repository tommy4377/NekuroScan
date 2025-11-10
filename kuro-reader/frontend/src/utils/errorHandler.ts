/**
 * ERROR HANDLER - Gestione Errori
 * Gestione errori uniforme per chiamate API e UI
 */

import type { UseToastOptions } from '@chakra-ui/react';

// ========== TYPES ==========

export interface APIErrorOptions {
  message: string;
  statusCode?: number;
  code?: string | null;
  retryAfter?: number | null;
}

export interface ErrorInfo {
  title: string;
  message: string;
  code?: string | null;
  retryAfter?: number | null;
}

export type ErrorHandlerFunction = (error: Error | APIError, customMessage?: string | null) => void;

// ========== API ERROR CLASS ==========

/**
 * Classe per errori API con info dettagliate
 */
export class APIError extends Error {
  readonly statusCode: number;
  readonly code: string | null;
  readonly retryAfter: number | null;
  readonly isAPIError: boolean = true;
  
  constructor(message: string, statusCode: number = 500, code: string | null = null, retryAfter: number | null = null) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
    this.retryAfter = retryAfter;
    
    // Mantieni stack trace corretto
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Check se l'errore è recuperabile con retry
   */
  isRetryable(): boolean {
    return this.statusCode === 429 || 
           this.statusCode >= 500 || 
           this.code === 'NETWORK_ERROR';
  }
  
  /**
   * Get delay in ms per retry
   */
  getRetryDelay(): number {
    if (this.retryAfter) {
      return this.retryAfter * 1000;
    }
    
    // Exponential backoff: 1s, 2s, 4s, 8s
    return Math.min(1000 * Math.pow(2, 3), 8000);
  }
}

// ========== RESPONSE PARSER ==========

/**
 * Parser risposta API standardizzato
 * Gestisce sia { success, data } che { success, error }
 */
export async function parseAPIResponse<T = any>(response: Response): Promise<T> {
  // Gestione rate limiting
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    throw new APIError(
      'Troppe richieste, riprova tra poco',
      429,
      'RATE_LIMIT',
      retryAfter ? parseInt(retryAfter, 10) : 60
    );
  }
  
  // Gestione altri errori HTTP
  if (!response.ok) {
    let errorMessage = `Errore ${response.status}`;
    let errorCode = `HTTP_${response.status}`;
    
    try {
      const data = await response.json();
      errorMessage = data.error?.message || data.message || errorMessage;
      errorCode = data.error?.code || data.code || errorCode;
    } catch {
      // Response non è JSON, usa messaggio default
    }
    
    throw new APIError(errorMessage, response.status, errorCode);
  }
  
  // Parse risposta success
  const data = await response.json();
  
  // Formato standardizzato: { success: true, data: {...} }
  if (data.success === false) {
    throw new APIError(
      data.error?.message || data.message || 'Operazione fallita',
      response.status,
      data.error?.code || data.code
    );
  }
  
  return data.data || data;
}

// ========== API FETCH WRAPPER ==========

/**
 * Wrapper fetch con error handling automatico
 */
export async function apiFetch<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    return await parseAPIResponse<T>(response);
  } catch (error) {
    // Se è già APIError, rilancia
    if (error instanceof APIError) {
      throw error;
    }
    
    // Errori di rete
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      throw new APIError(
        'Errore di connessione. Verifica la tua connessione internet.',
        0,
        'NETWORK_ERROR'
      );
    }
    
    // Altri errori
    throw new APIError(errorMessage, 500, 'UNKNOWN_ERROR');
  }
}

// ========== ERROR MESSAGE HELPERS ==========

/**
 * Titoli errori basati su status code
 */
function getErrorTitle(statusCode: number): string {
  const titles: Record<number, string> = {
    400: 'Richiesta non valida',
    401: 'Non autorizzato',
    403: 'Accesso negato',
    404: 'Non trovato',
    409: 'Conflitto',
    429: 'Troppe richieste',
    500: 'Errore del server',
    503: 'Servizio non disponibile'
  };
  
  return titles[statusCode] ?? 'Errore';
}

/**
 * Error handler per componenti React
 * Converte errori in messaggi user-friendly
 */
export function getErrorMessage(error: Error | APIError): ErrorInfo {
  if (error instanceof APIError) {
    return {
      title: getErrorTitle(error.statusCode),
      message: error.message,
      code: error.code,
      retryAfter: error.retryAfter
    };
  }
  
  return {
    title: 'Errore',
    message: error.message || 'Si è verificato un errore imprevisto',
    code: 'UNKNOWN_ERROR'
  };
}

/**
 * Check se l'errore è un errore di rete
 */
export function isNetworkError(error: Error | APIError): boolean {
  return error instanceof APIError && error.code === 'NETWORK_ERROR';
}

/**
 * Check se l'errore è rate limit
 */
export function isRateLimitError(error: Error | APIError): boolean {
  return error instanceof APIError && error.code === 'RATE_LIMIT';
}

/**
 * Check se l'errore è di autenticazione
 */
export function isAuthError(error: Error | APIError): boolean {
  return error instanceof APIError && (error.statusCode === 401 || error.statusCode === 403);
}

// ========== REACT HOOK ==========

/**
 * Hook React per gestione errori con toast
 */
export function useErrorHandler(toast: (options: UseToastOptions) => void): ErrorHandlerFunction {
  return (error: Error | APIError, customMessage: string | null = null): void => {
    const errorInfo = getErrorMessage(error);
    
    toast({
      title: errorInfo.title,
      description: customMessage ?? errorInfo.message,
      status: 'error',
      duration: errorInfo.code === 'RATE_LIMIT' ? 8000 : 5000,
      isClosable: true
    });
    
    // Log per debugging (solo in dev)
    if (import.meta.env.DEV) {
      console.error('Error:', error);
    }
  };
}

// ========== RETRY HELPER ==========

/**
 * Retry function con exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | APIError | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Se non è retryable o è l'ultimo tentativo, lancia errore
      if (!(error instanceof APIError && error.isRetryable()) || attempt === maxRetries) {
        throw lastError;
      }
      
      // Calcola delay con exponential backoff
      const delay = error instanceof APIError 
        ? error.getRetryDelay() 
        : initialDelay * Math.pow(2, attempt);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError ?? new Error('Retry failed');
}

// ========== EXPORT ==========

export default {
  APIError,
  parseAPIResponse,
  apiFetch,
  getErrorMessage,
  useErrorHandler,
  isNetworkError,
  isRateLimitError,
  isAuthError,
  retryWithBackoff
};

