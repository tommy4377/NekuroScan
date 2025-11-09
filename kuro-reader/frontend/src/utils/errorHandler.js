// ✅ STANDARDIZED ERROR HANDLING - Frontend
// Gestione errori uniforme per chiamate API

/**
 * Classe per errori API con info dettagliate
 */
export class APIError extends Error {
  constructor(message, statusCode = 500, code = null, retryAfter = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.retryAfter = retryAfter;
    this.isAPIError = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Parser risposta API standardizzato
 * Gestisce sia { success, data } che { success, error }
 */
export const parseAPIResponse = async (response) => {
  // Gestione rate limiting
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After') || 60;
    throw new APIError(
      'Troppe richieste, riprova tra poco',
      429,
      'RATE_LIMIT',
      parseInt(retryAfter)
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
      // Response non è JSON
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
};

/**
 * Wrapper fetch con error handling automatico
 */
export const apiFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    return await parseAPIResponse(response);
  } catch (error) {
    // Se è già APIError, rilancia
    if (error.isAPIError) {
      throw error;
    }
    
    // Errori di rete
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new APIError(
        'Errore di connessione. Verifica la tua connessione internet.',
        0,
        'NETWORK_ERROR'
      );
    }
    
    // Altri errori
    throw new APIError(error.message, 500, 'UNKNOWN_ERROR');
  }
};

/**
 * Error handler per componenti React
 * Converte errori in messaggi user-friendly
 */
export const getErrorMessage = (error) => {
  if (error.isAPIError) {
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
};

/**
 * Titoli errori basati su status code
 */
const getErrorTitle = (statusCode) => {
  const titles = {
    400: 'Richiesta non valida',
    401: 'Non autorizzato',
    403: 'Accesso negato',
    404: 'Non trovato',
    409: 'Conflitto',
    429: 'Troppe richieste',
    500: 'Errore del server',
    503: 'Servizio non disponibile'
  };
  
  return titles[statusCode] || 'Errore';
};

/**
 * Hook React per gestione errori con toast
 */
export const useErrorHandler = (toast) => {
  return (error, customMessage = null) => {
    const errorInfo = getErrorMessage(error);
    
    toast({
      title: errorInfo.title,
      description: customMessage || errorInfo.message,
      status: 'error',
      duration: errorInfo.code === 'RATE_LIMIT' ? 8000 : 5000,
      isClosable: true
    });
    
    // Log per debugging (solo in dev)
    if (process.env.NODE_ENV === 'development') {
      console.error('Error:', error);
    }
  };
};

export default {
  APIError,
  parseAPIResponse,
  apiFetch,
  getErrorMessage,
  useErrorHandler
};

