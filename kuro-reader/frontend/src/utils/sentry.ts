/**
 * SENTRY - Error Tracking
 * Production error monitoring con Sentry.io
 */

import type * as SentryTypes from '@sentry/react';

// ========== TYPES ==========

export interface SentryUser {
  id?: string | number;
  username?: string;
  email?: string;
}

export interface SentryContext {
  [key: string]: any;
}

export type SentryLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

interface MockTransaction {
  finish: () => void;
  setStatus: (status: string) => void;
  setData: (key: string, value: any) => void;
}

// ========== STATE ==========

let Sentry: typeof SentryTypes | null = null;
let isInitialized = false;

// ========== INITIALIZATION ==========

/**
 * Inizializza Sentry solo se DSN è configurato e siamo in production
 */
export function initSentry(): boolean {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const isProd = import.meta.env.PROD;
  
  if (!dsn || !isProd) {
    return false;
  }
  
  try {
    // Dynamic import per non bloccare l'app se Sentry non è installato
    import('@sentry/react')
      .then(SentryModule => {
        Sentry = SentryModule;
        
        Sentry.init({
          dsn,
          integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration({
              maskAllText: true,
              blockAllMedia: true,
            }),
          ],
          
          // Performance Monitoring
          tracesSampleRate: 0.1,
          
          // Session Replay
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
          
          // Environment
          environment: 'production',
          release: `nekuro-scan@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
        
          // Filtra errori comuni non critici
          beforeSend(event, hint) {
            const error = hint?.originalException as Error;
            
            // Ignora errori di rete temporanei
            if (error?.message && (
              error.message.includes('Failed to fetch') ||
              error.message.includes('NetworkError') ||
              error.message.includes('Network request failed') ||
              error.message.includes('ECONNREFUSED')
            )) {
              return null;
            }
            
            // Ignora errori di estensioni browser
            if (error?.stack && (
              error.stack.includes('chrome-extension://') ||
              error.stack.includes('moz-extension://')
            )) {
              return null;
            }
            
            // Ignora cancellazioni utente
            if (error?.message && error.message.includes('user aborted')) {
              return null;
            }
            
            return event;
          },
          
          // Filtra breadcrumbs
          beforeBreadcrumb(breadcrumb) {
            // Ignora console.log breadcrumbs
            if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
              return null;
            }
            
            // Ignora UI clicks su elementi non importanti
            if (breadcrumb.category === 'ui.click') {
              const target = breadcrumb.message || '';
              if (target.includes('div') || target.includes('span')) {
                return null;
              }
            }
            
            return breadcrumb;
          },
        });
        
        isInitialized = true;
      })
      .catch(() => {
        // Silent fail - Sentry optional
      });
    
    return true;
  } catch (error) {
    return false;
  }
}

// ========== ERROR CAPTURE ==========

/**
 * Cattura errore manualmente
 */
export function captureError(error: Error, context: SentryContext = {}): void {
  if (!isInitialized || !Sentry) {
    console.error('Error (Sentry not available):', error, context);
    return;
  }
  
  Sentry.captureException(error, {
    contexts: { custom: context }
  });
}

/**
 * Cattura messaggio custom
 */
export function captureMessage(message: string, level: SentryLevel = 'info', context: SentryContext = {}): void {
  if (!isInitialized || !Sentry) return;
  
  Sentry.captureMessage(message, {
    level,
    contexts: { custom: context }
  });
}

// ========== USER CONTEXT ==========

/**
 * Setta user context
 */
export function setUser(user: SentryUser | null): void {
  if (!isInitialized || !Sentry) return;
  
  Sentry.setUser(user ? {
    id: String(user.id),
    username: user.username,
    email: user.email,
  } : null);
}

/**
 * Rimuovi user context (logout)
 */
export function clearUser(): void {
  setUser(null);
}

// ========== TAGS & CONTEXT ==========

/**
 * Aggiungi tag custom
 */
export function setTag(key: string, value: string | number | boolean): void {
  if (!isInitialized || !Sentry) return;
  
  Sentry.setTag(key, String(value));
}

/**
 * Aggiungi context custom
 */
export function setContext(name: string, context: SentryContext): void {
  if (!isInitialized || !Sentry) return;
  
  Sentry.setContext(name, context);
}

// ========== PERFORMANCE TRACKING ==========

/**
 * Traccia performance custom
 */
export function startTransaction(name: string, op: string = 'custom'): MockTransaction {
  if (!isInitialized || !Sentry) {
    return {
      finish: () => {},
      setStatus: () => {},
      setData: () => {},
    };
  }
  
  const transaction = Sentry.startTransaction({ name, op });
  
  return {
    finish: () => transaction.finish(),
    setStatus: (status: string) => transaction.setStatus(status),
    setData: (key: string, value: any) => transaction.setData(key, value),
  };
}

// ========== BREADCRUMBS ==========

/**
 * Aggiungi breadcrumb manualmente
 */
export function addBreadcrumb(message: string, category: string = 'custom', level: SentryLevel = 'info'): void {
  if (!isInitialized || !Sentry) return;
  
  Sentry.addBreadcrumb({
    message,
    category,
    level
  });
}

// ========== ADVANCED ==========

/**
 * Export Sentry instance per uso avanzato
 */
export function getSentry(): typeof SentryTypes | null {
  return Sentry;
}

/**
 * Check se Sentry è inizializzato
 */
export function isReady(): boolean {
  return isInitialized && Sentry !== null;
}

// ========== EXPORT ==========

export default {
  initSentry,
  captureError,
  captureMessage,
  setUser,
  clearUser,
  setTag,
  setContext,
  startTransaction,
  addBreadcrumb,
  getSentry,
  isReady
};

