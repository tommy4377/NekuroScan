/**
 * SHARED API UTILITIES
 * Common functions used across API implementations
 */

// ========== CHAPTER NORMALIZATION ==========

/**
 * Extract chapter number from text/URL
 * Handles various formats: "123", "Cap 123", "Capitolo 123.5", etc.
 */
export function normalizeChapterLabel(text?: string, url?: string): number | null {
  if (!text && !url) return null;
  
  // Clean base text
  let t = (text || '').replace(/\s+/g, ' ').trim();
  
  // Remove common dates
  t = t.replace(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/g, '');
  
  // Remove prefixes
  t = t.replace(/^(vol\.\s*\d+\s*[:-]\s*)?/i, '');
  t = t.replace(/^(capitolo|cap\.|ch\.|chapter|volume|vol\.)\s*/i, '');
  
  // Simplified patterns (in priority order)
  const patterns = [
    /^\s*(\d+(?:\.\d+)?)\s*$/,              // Just number: "123" or "123.5"
    /^\s*(\d+(?:\.\d+)?)\s*[:\-–—]/,       // Number + separator
    /capitolo\s*[:\s]*(\d+(?:\.\d+)?)/i,   // "Capitolo 123"
    /cap\s*[:\s]*(\d+(?:\.\d+)?)/i,        // "Cap 123"
    /ch\s*[:\s]*(\d+(?:\.\d+)?)/i,         // "Ch 123"
    /#\s*(\d+(?:\.\d+)?)/,                 // "#123"
    /(\d+(?:\.\d+)?)/                      // Fallback: first number found
  ];
  
  for (const pattern of patterns) {
    const match = t.match(pattern);
    if (match?.[1]) {
      let numStr = match[1];
      
      // Fix leading zeros ("0176" → "176", but "1.5" stays "1.5")
      if (numStr.startsWith('0') && !numStr.includes('.') && numStr.length > 1) {
        numStr = numStr.replace(/^0+/, '') || '0';
      }
      
      const num = parseFloat(numStr);
      
      // Validate range
      if (!isNaN(num) && num >= 0 && num < 10000) {
        return num;
      }
    }
  }
  
  // Fallback: extract from URL
  if (url) {
    const urlPatterns = [
      /\/capitolo-(\d+(?:\.\d+)?)/i,
      /\/chapter-(\d+(?:\.\d+)?)/i,
      /\/cap-(\d+(?:\.\d+)?)/i,
      /\/(\d+)(?:\/|$)/  // Last number in URL
    ];
    
    for (const pattern of urlPatterns) {
      const match = url.match(pattern);
      if (match?.[1]) {
        const numStr = match[1].replace(/^0+/, '') || '0';
        const num = parseFloat(numStr);
        if (!isNaN(num) && num >= 0 && num < 10000) {
          return num;
        }
      }
    }
  }
  
  return null;
}

export default { normalizeChapterLabel };

