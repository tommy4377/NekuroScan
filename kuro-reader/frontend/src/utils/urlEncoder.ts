/**
 * URL ENCODER - URL-safe Base64 Encoding/Decoding
 * Risolve il problema dei caratteri '/', '+', '=' negli URL paths
 */

/**
 * Encode una stringa in URL-safe base64
 * Sostituisce: + → -, / → _, rimuove =
 */
export function encodeUrlSafe(str: string): string {
  if (!str) return '';
  
  try {
    return btoa(encodeURIComponent(str))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } catch (error) {
    console.error('Error encoding URL-safe base64:', error);
    return '';
  }
}

/**
 * Decode un URL-safe base64
 * Ripristina: - → +, _ → /, aggiunge padding =
 */
export function decodeUrlSafe(str: string): string {
  if (!str) return '';
  
  try {
    // Ripristina caratteri base64 standard
    let base64 = str
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Aggiungi padding
    const padding = (4 - (base64.length % 4)) % 4;
    base64 += '='.repeat(padding);
    
    return decodeURIComponent(atob(base64));
  } catch (error) {
    console.error('Error decoding URL-safe base64:', error);
    return '';
  }
}

/**
 * Encode componente URL
 */
export function encodeComponent(str: string): string {
  if (!str) return '';
  
  try {
    return encodeURIComponent(str);
  } catch (error) {
    console.error('Error encoding URL component:', error);
    return '';
  }
}

/**
 * Decode componente URL
 */
export function decodeComponent(str: string): string {
  if (!str) return '';
  
  try {
    return decodeURIComponent(str);
  } catch (error) {
    console.error('Error decoding URL component:', error);
    return '';
  }
}

/**
 * Sanitize URL per uso sicuro
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  try {
    const parsed = new URL(url);
    return parsed.href;
  } catch {
    // Se non è un URL valido, ritorna stringa vuota
    return '';
  }
}

// ========== EXPORT ==========

export default {
  encode: encodeUrlSafe,
  decode: decodeUrlSafe,
  encodeComponent,
  decodeComponent,
  sanitizeUrl
};

