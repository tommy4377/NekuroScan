// Funzione condivisa per normalizzare i numeri dei capitoli
export function normalizeChapterLabel(text, url) {
  if (!text) return null;
  
  // Rimuovi spazi extra e trim
  let t = text.replace(/\s+/g, ' ').trim();
  
  // Rimuovi date
  t = t.replace(/\s+\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}.*$/, '');
  t = t.replace(/\s+\d{4}[\/-]\d{1,2}[\/-]\d{1,2}.*$/, '');
  
  // Rimuovi prefissi comuni
  t = t.replace(/^(vol\.\s*\d+\s*-\s*)?/i, '');
  t = t.replace(/^(capitolo|cap\.|ch\.|chapter)\s*/i, '');
  
  // Estrai numero
  const patterns = [
    /^(\d+(?:\.\d+)?)/,
    /\s+(\d+(?:\.\d+)?)\s*$/,
    /(\d+(?:\.\d+)?)/
  ];
  
  for (const pattern of patterns) {
    const match = t.match(pattern);
    if (match) {
      let num = match[1];
      
      // FIX: Se il numero è >= 10 e ha più di 2 cifre, tronca le ultime 2
      const numInt = parseInt(num);
      if (numInt >= 10 && num.length > 2) {
        num = num.slice(0, -2);
      }
      // Se inizia con 0 e ha 4+ cifre (es. 0176)
      else if (num.startsWith('0') && num.length >= 4) {
        num = num.substring(0, 2);
        // Se diventa > 09, rimuovi lo 0
        if (parseInt(num) > 9) {
          num = num.replace(/^0/, '');
        }
      }
      
      return parseFloat(num);
    }
  }
  
  // Prova dall'URL
  if (url) {
    const urlMatch = url.match(/\/(\d+(?:\.\d+)?)\/?$/);
    if (urlMatch) {
      let num = urlMatch[1];
      
      const numInt = parseInt(num);
      if (numInt >= 10 && num.length > 2) {
        num = num.slice(0, -2);
      } else if (num.startsWith('0') && num.length >= 4) {
        num = num.substring(0, 2);
        if (parseInt(num) > 9) {
          num = num.replace(/^0/, '');
        }
      }
      
      return parseFloat(num);
    }
  }
  
  return null;
}
