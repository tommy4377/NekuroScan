// 🐛 SENTRY ERROR TRACKING - Production error monitoring
// Setup: https://sentry.io/signup/ (free tier OK)
//
// Per attivare Sentry:
// 1. Crea account su sentry.io
// 2. Crea nuovo progetto "NeKuro Scan" (React)
// 3. Copia il DSN fornito
// 4. Aggiungi variabile env: VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
// 5. Rebuild frontend: npm run build

let Sentry = null;
let isInitialized = false;

// Inizializza Sentry solo se DSN è configurato e siamo in production
export const initSentry = () => {
  // Sentry attivo SOLO in production con DSN configurato
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const isProd = import.meta.env.PROD;
  
  if (!dsn || !isProd) {
    console.log('📊 Sentry: Disabled (no DSN or not in production)');
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
              maskAllText: true, // Privacy: maschera testo sensibile
              blockAllMedia: true, // Privacy: blocca media
            }),
          ],
          
          // Performance Monitoring
          tracesSampleRate: 0.1, // 10% delle transazioni (evita sovraccarico)
          
          // Session Replay
          replaysSessionSampleRate: 0.1, // 10% delle sessioni normali
          replaysOnErrorSampleRate: 1.0, // 100% delle sessioni con errori
          
          // Environment
          environment: 'production',
          release: `nekuro-scan@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
        
        // Filtra errori comuni non critici
        beforeSend(event, hint) {
          const error = hint.originalException;
          
          // Ignora errori di rete temporanei
          if (error && error.message && (
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError') ||
            error.message.includes('Network request failed') ||
            error.message.includes('ECONNREFUSED')
          )) {
            return null; // Non inviare a Sentry
          }
          
          // Ignora errori di estensioni browser
          if (error && error.stack && (
            error.stack.includes('chrome-extension://') ||
            error.stack.includes('moz-extension://')
          )) {
            return null;
          }
          
          // Ignora cancellazioni utente
          if (error && error.message && error.message.includes('user aborted')) {
            return null;
          }
          
          return event;
        },
        
        // Filtra breadcrumbs (traccia eventi) per ridurre noise
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
      console.log('📊 Sentry: Initialized successfully');
    }).catch(err => {
      console.warn('📊 Sentry: Failed to initialize', err.message);
    });
    
    return true;
  } catch (error) {
    console.warn('📊 Sentry: Initialization error', error);
    return false;
  }
};

// Helper per catturare errori manualmente
export const captureError = (error, context = {}) => {
  if (!isInitialized || !Sentry) {
    console.error('Error (Sentry not available):', error, context);
    return;
  }
  
  Sentry.captureException(error, {
    contexts: { custom: context }
  });
};

// Helper per catturare messaggi custom
export const captureMessage = (message, level = 'info', context = {}) => {
  if (!isInitialized || !Sentry) {
    console.log(`Message (Sentry not available) [${level}]:`, message, context);
    return;
  }
  
  Sentry.captureMessage(message, {
    level,
    contexts: { custom: context }
  });
};

// Helper per settaggi utente context
export const setUser = (user) => {
  if (!isInitialized || !Sentry) return;
  
  Sentry.setUser({
    id: user?.id,
    username: user?.username,
    email: user?.email,
  });
};

// Helper per rimuovere user context (logout)
export const clearUser = () => {
  if (!isInitialized || !Sentry) return;
  
  Sentry.setUser(null);
};

// Helper per aggiungere tags custom
export const setTag = (key, value) => {
  if (!isInitialized || !Sentry) return;
  
  Sentry.setTag(key, value);
};

// Helper per tracciare performance custom
export const startTransaction = (name, op = 'custom') => {
  if (!isInitialized || !Sentry) {
    return {
      finish: () => {},
      setStatus: () => {},
      setData: () => {},
    };
  }
  
  return Sentry.startTransaction({
    name,
    op,
  });
};

// Export Sentry instance per uso avanzato (opzionale)
export const getSentry = () => Sentry;

export default {
  initSentry,
  captureError,
  captureMessage,
  setUser,
  clearUser,
  setTag,
  startTransaction,
  getSentry
};

