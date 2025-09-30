// NUOVA VERSIONE MIGLIORATA
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
  
  // Pattern per estrarre numeri
  const patterns = [
    /^(\d+(?:\.\d+)?)/,           // 123 o 123.5
    /chapter[:\s]+(\d+(?:\.\d+)?)/i,  // Chapter: 123
    /cap[:\s]+(\d+(?:\.\d+)?)/i,      // Cap: 123
    /(\d+(?:\.\d+)?)\s*$/,            // 123 alla fine
    /#(\d+(?:\.\d+)?)/,               // #123
  ];
  
  for (const pattern of patterns) {
    const match = t.match(pattern);
    if (match && match[1]) {
      let num = match[1];
      
      // FIX: Gestisci numeri come 0176, 0177, ecc
      if (num.startsWith('0') && num.length >= 3) {
        // Se inizia con 0 e ha 3+ cifre, rimuovi lo zero iniziale
        num = num.replace(/^0+/, '');
        // Se diventa vuoto, usa 0
        if (!num) num = '0';
      }
      
      const parsedNum = parseFloat(num);
      
      // Validazione: se il numero è troppo grande, probabilmente è un errore
      if (parsedNum > 0 && parsedNum < 10000) {
        return parsedNum;
      }
    }
  }
  
  // Prova dall'URL come fallback
  if (url) {
    const urlPatterns = [
      /\/capitolo-(\d+(?:\.\d+)?)/i,
      /\/chapter-(\d+(?:\.\d+)?)/i,
      /\/(\d+(?:\.\d+)?)\/?$/,
      /cap(?:itolo)?[_-](\d+(?:\.\d+)?)/i,
    ];
    
    for (const pattern of urlPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        let num = match[1];
        if (num.startsWith('0') && num.length >= 3) {
          num = num.replace(/^0+/, '');
          if (!num) num = '0';
        }
        const parsedNum = parseFloat(num);
        if (parsedNum >= 0 && parsedNum < 10000) {
          return parsedNum;
        }
      }
    }
  }
  
  return null;
}