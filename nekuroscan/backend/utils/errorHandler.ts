// @ts-nocheck - Server file, gradual TypeScript migration
/* eslint-disable @typescript-eslint/no-explicit-any */
// ✅ STANDARDIZED ERROR HANDLING
// Gestione errori uniforme per tutto il backend

/**
 * Classe per errori personalizzati con status code
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Errori gestiti vs bug
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Errori comuni pre-definiti
 */
export const ErrorTypes = {
  // 400 - Bad Request
  VALIDATION_ERROR: (message) => new AppError(message, 400, 'VALIDATION_ERROR'),
  INVALID_INPUT: (field) => new AppError(`Campo non valido: ${field}`, 400, 'INVALID_INPUT'),
  MISSING_FIELD: (field) => new AppError(`Campo obbligatorio: ${field}`, 400, 'MISSING_FIELD'),
  
  // 401 - Unauthorized
  UNAUTHORIZED: (message = 'Non autorizzato') => new AppError(message, 401, 'UNAUTHORIZED'),
  TOKEN_MISSING: () => new AppError('Token mancante', 401, 'TOKEN_MISSING'),
  TOKEN_INVALID: () => new AppError('Token non valido', 401, 'TOKEN_INVALID'),
  INVALID_CREDENTIALS: () => new AppError('Credenziali non valide', 401, 'INVALID_CREDENTIALS'),
  
  // 403 - Forbidden
  FORBIDDEN: (message = 'Accesso negato') => new AppError(message, 403, 'FORBIDDEN'),
  PROFILE_PRIVATE: () => new AppError('Profilo privato', 403, 'PROFILE_PRIVATE'),
  
  // 404 - Not Found
  NOT_FOUND: (resource) => new AppError(`${resource} non trovato`, 404, 'NOT_FOUND'),
  USER_NOT_FOUND: () => new AppError('Utente non trovato', 404, 'USER_NOT_FOUND'),
  
  // 409 - Conflict
  ALREADY_EXISTS: (resource) => new AppError(`${resource} già esistente`, 409, 'ALREADY_EXISTS'),
  EMAIL_EXISTS: () => new AppError('Email già registrata', 409, 'EMAIL_EXISTS'),
  USERNAME_EXISTS: () => new AppError('Username già in uso', 409, 'USERNAME_EXISTS'),
  
  // 429 - Rate Limit
  RATE_LIMIT: (retryAfter) => new AppError('Troppe richieste, riprova tra poco', 429, 'RATE_LIMIT'),
  
  // 500 - Internal Server Error
  DATABASE_ERROR: (message = 'Errore database') => new AppError(message, 500, 'DATABASE_ERROR'),
  SERVER_ERROR: (message = 'Errore interno del server') => new AppError(message, 500, 'SERVER_ERROR'),
};

/**
 * Middleware Express per gestione errori centralizzata
 */
export const errorHandler = (err, req, res, next) => {
  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Errore interno del server';
  let code = err.code || 'INTERNAL_ERROR';
  
  // Log errori non operazionali (bug veri)
  if (!err.isOperational) {
    console.error('❌ UNHANDLED ERROR:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip
    });
  }
  
  // Gestione errori Prisma specifici
  if (err.code?.startsWith('P')) {
    statusCode = 500;
    
    switch (err.code) {
      case 'P2002': // Unique constraint
        statusCode = 409;
        message = 'Dato già esistente';
        code = 'DUPLICATE_ENTRY';
        break;
      case 'P2025': // Record not found
        statusCode = 404;
        message = 'Record non trovato';
        code = 'NOT_FOUND';
        break;
      case 'P2003': // Foreign key constraint
        statusCode = 400;
        message = 'Riferimento non valido';
        code = 'INVALID_REFERENCE';
        break;
      default:
        message = 'Errore database';
        code = 'DATABASE_ERROR';
    }
  }
  
  // Gestione errori JWT
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token non valido';
    code = 'INVALID_TOKEN';
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token scaduto';
    code = 'TOKEN_EXPIRED';
  }
  
  // ✅ RISPOSTA STANDARDIZZATA (compatibile con codice esistente)
  const response = {
    message,  // ✅ Formato compatibile con frontend esistente
    code,
    ...(process.env.NODE_ENV === 'development' && {
      error: err.message,
      stack: err.stack
    })
  };
  
  // Rate limit headers se applicabile
  if (statusCode === 429 && err.retryAfter) {
    res.setHeader('Retry-After', err.retryAfter);
  }
  
  res.status(statusCode).json(response);
};

/**
 * Wrapper async per route handlers
 * Cattura errori async automaticamente
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Helper per validazione input
 */
export const validateRequired = (fields, data) => {
  const missing = fields.filter(field => !data[field]);
  if (missing.length > 0) {
    throw ErrorTypes.MISSING_FIELD(missing.join(', '));
  }
};

/**
 * Helper per risposta success standardizzata
 */
export const sendSuccess = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    data
  });
};

export default {
  AppError,
  ErrorTypes,
  errorHandler,
  asyncHandler,
  validateRequired,
  sendSuccess
};

