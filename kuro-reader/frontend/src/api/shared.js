// ✅ VERSIONE DEFINITIVA - FIX COMPLETO PER NUMERI CAPITOLI
export function normalizeChapterLabel(text, url) {
  if (!text) return null;
  
  // Rimuovi spazi extra
  let t = text.replace(/\s+/g, ' ').trim();
  
  // Rimuovi date
  t = t.replace(/\s+\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}.*$/, '');
  t = t.replace(/\s+\d{4}[\/-]\d{1,2}[\/-]\d{1,2}.*$/, '');
  
  // Rimuovi prefissi comuni
  t = t.replace(/^(vol\.\s*\d+\s*-\s*)?/i, '');
  t = t.replace(/^(capitolo|cap\.|ch\.|chapter)\s*/i, '');
  
  // ✅ Pattern migliorati per evitare concatenazioni
  const patterns = [
    /^(\d+(?:\.\d+)?)\s*$/,           // Solo numero: "123" o "123.5"
    /^(\d+(?:\.\d+)?)\s*[:-]/,        // Numero seguito da : o -
    /capitolo[:\s]+(\d+(?:\.\d+)?)/i, // Chapter: 123
    /cap[:\s]+(\d+(?:\.\d+)?)/i,      // Cap: 123
    /#(\d+(?:\.\d+)?)/,               // #123
  ];
  
  for (const pattern of patterns) {
    const match = t.match(pattern);
    if (match && match[1]) {
      let num = match[1];
      
      // ✅ FIX: Gestisci zeri iniziali con logica corretta
      // "0176" diventa "176", "03" diventa "3", "001" diventa "1"
      if (num.startsWith('0') && num.length > 1) {
        const withoutZeros = num.replace(/^0+/, '');
        if (withoutZeros && parseFloat(withoutZeros) < 10000) {
          num = withoutZeros;
        } else if (!withoutZeros) {
          num = '0'; // Se tutti zeri, resta 0
        }
      }
      
      const parsedNum = parseFloat(num);
      
      // Validazione: numero valido tra 0 e 9999
      if (!isNaN(parsedNum) && parsedNum >= 0 && parsedNum < 10000) {
        return parsedNum;
      }
    }
  }
  
  // ✅ Prova dall'URL come fallback
  if (url) {
    const urlPatterns = [
      /\/capitolo-(\d+(?:\.\d+)?)/i,
      /\/chapter-(\d+(?:\.\d+)?)/i,
      /\/cap-(\d+(?:\.\d+)?)/i,
      /\/read\/[^\/]+\/[^\/]+\/(\d+)/i,
    ];
    
    for (const pattern of urlPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        let num = match[1];
        
        if (num.startsWith('0') && num.length > 1) {
          const withoutZeros = num.replace(/^0+/, '');
          if (withoutZeros) num = withoutZeros;
        }
        
        const parsedNum = parseFloat(num);
        if (!isNaN(parsedNum) && parsedNum >= 0 && parsedNum < 10000) {
          return parsedNum;
        }
      }
    }
  }
  
  return null;
}