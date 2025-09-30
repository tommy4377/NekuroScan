// ✅ VERSIONE DEFINITIVA - SEMPLIFICATA E PIÙ ROBUSTA
export function normalizeChapterLabel(text, url) {
  if (!text && !url) return null;
  
  // Pulisci testo base
  let t = (text || '').replace(/\s+/g, ' ').trim();
  
  // Rimuovi date comuni
  t = t.replace(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/g, '');
  
  // Rimuovi prefissi
  t = t.replace(/^(vol\.\s*\d+\s*[:-]\s*)?/i, '');
  t = t.replace(/^(capitolo|cap\.|ch\.|chapter|volume|vol\.)\s*/i, '');
  
  // ✅ Pattern SEMPLIFICATI (in ordine di priorità)
  const patterns = [
    /^\s*(\d+(?:\.\d+)?)\s*$/,              // Solo numero: "123" o "123.5"
    /^\s*(\d+(?:\.\d+)?)\s*[:\-–—]/,       // Numero + separatore
    /capitolo\s*[:\s]*(\d+(?:\.\d+)?)/i,   // "Capitolo 123"
    /cap\s*[:\s]*(\d+(?:\.\d+)?)/i,        // "Cap 123"
    /ch\s*[:\s]*(\d+(?:\.\d+)?)/i,         // "Ch 123"
    /#\s*(\d+(?:\.\d+)?)/,                 // "#123"
    /(\d+(?:\.\d+)?)/                      // Fallback: primo numero trovato
  ];
  
  for (const pattern of patterns) {
    const match = t.match(pattern);
    if (match && match[1]) {
      let numStr = match[1];
      
      // ✅ FIX ZERI INIZIALI (es. "0176" → "176", ma "1.5" resta "1.5")
      if (numStr.startsWith('0') && !numStr.includes('.') && numStr.length > 1) {
        numStr = numStr.replace(/^0+/, '') || '0';
      }
      
      const num = parseFloat(numStr);
      
      // ✅ Validazione range
      if (!isNaN(num) && num >= 0 && num < 10000) {
        return num;
      }
    }
  }
  
  // ✅ Fallback: estrai dall'URL
  if (url) {
    const urlPatterns = [
      /\/capitolo-(\d+(?:\.\d+)?)/i,
      /\/chapter-(\d+(?:\.\d+)?)/i,
      /\/cap-(\d+(?:\.\d+)?)/i,
      /\/(\d+)(?:\/|$)/  // Ultimo numero nell'URL
    ];
    
    for (const pattern of urlPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        const num = parseFloat(match[1].replace(/^0+/, '') || '0');
        if (!isNaN(num) && num >= 0 && num < 10000) {
          return num;
        }
      }
    }
  }
  
  console.warn('⚠️ Could not extract chapter number from:', text, url);
  return null;
}