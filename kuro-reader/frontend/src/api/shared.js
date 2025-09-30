// frontend/src/api/shared.js
// COMPLETAMENTE RISCRITTO PER FIX CAPITOLI
export function normalizeChapterLabel(text, url) {
  if (!text) return null;
  
  // Pulisci il testo
  let cleanText = text
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  
  // Rimuovi date (es: "2024-01-15")
  cleanText = cleanText.replace(/\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/g, '');
  cleanText = cleanText.replace(/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/g, '');
  
  // Pattern per estrarre il numero del capitolo
  const patterns = [
    /capitolo\s+(\d+(?:\.\d+)?)/i,
    /cap\.\s*(\d+(?:\.\d+)?)/i,
    /chapter\s+(\d+(?:\.\d+)?)/i,
    /ch\.\s*(\d+(?:\.\d+)?)/i,
    /c\.?\s*(\d+(?:\.\d+)?)/i,
    /episodio\s+(\d+(?:\.\d+)?)/i,
    /ep\.\s*(\d+(?:\.\d+)?)/i,
    /#\s*(\d+(?:\.\d+)?)/i,
    /n[°º]\s*(\d+(?:\.\d+)?)/i,
    /^(\d+(?:\.\d+)?)\s*[-–—:]/,  // "01 - titolo"
    /[-–—:]\s*(\d+(?:\.\d+)?)\s*$/,  // "titolo - 01"
    /^(\d+(?:\.\d+)?)$/  // Solo numero
  ];
  
  for (const pattern of patterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      const num = parseFloat(match[1]);
      // Verifica che sia un numero valido e ragionevole
      if (!isNaN(num) && num >= 0 && num < 10000) {
        return num;
      }
    }
  }
  
  // Prova dall'URL come fallback
  if (url) {
    // Cerca pattern comuni negli URL
    const urlPatterns = [
      /\/capitolo[-_]?(\d+(?:\.\d+)?)/i,
      /\/chapter[-_]?(\d+(?:\.\d+)?)/i,
      /\/c[-_]?(\d+(?:\.\d+)?)/i,
      /\/(\d+(?:\.\d+)?)\/?$/,  // numero alla fine dell'URL
      /[-_](\d+(?:\.\d+)?)\/?$/  // numero dopo trattino/underscore
    ];
    
    for (const pattern of urlPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        const num = parseFloat(match[1]);
        if (!isNaN(num) && num >= 0 && num < 10000) {
          return num;
        }
      }
    }
  }
  
  return null;
}

// Funzione helper per rimuovere duplicati dai capitoli
export function removeDuplicateChapters(chapters) {
  const seen = new Map();
  const unique = [];
  
  for (const chapter of chapters) {
    const key = `${chapter.chapterNumber}`;
    if (!seen.has(key)) {
      seen.set(key, true);
      unique.push(chapter);
    }
  }
  
  return unique;
}

// Funzione per validare e pulire i capitoli
export function validateChapters(chapters) {
  if (!chapters || !Array.isArray(chapters)) return [];
  
  // Rimuovi capitoli senza URL o numero
  const valid = chapters.filter(ch => 
    ch.url && ch.chapterNumber !== null && ch.chapterNumber !== undefined
  );
  
  // Rimuovi duplicati
  const unique = removeDuplicateChapters(valid);
  
  // Ordina per numero capitolo
  unique.sort((a, b) => a.chapterNumber - b.chapterNumber);
  
  return unique;
}