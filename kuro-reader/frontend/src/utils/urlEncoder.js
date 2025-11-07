// URL-safe Base64 encoding/decoding
// Risolve il problema dei caratteri '/', '+', '=' negli URL paths

/**
 * Encode una stringa in URL-safe base64
 * Sostituisce: + → -, / → _, rimuove =
 */
export function encodeUrlSafe(str) {
  if (!str) return '';
  
  try {
    return btoa(str)
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
export function decodeUrlSafe(str) {
  if (!str) return '';
  
  try {
    // Ripristina caratteri base64 standard
    let base64 = str
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Aggiungi padding
    const padding = (4 - (base64.length % 4)) % 4;
    base64 += '='.repeat(padding);
    
    return atob(base64);
  } catch (error) {
    console.error('Error decoding URL-safe base64:', error);
    return '';
  }
}

export default {
  encode: encodeUrlSafe,
  decode: decodeUrlSafe
};

