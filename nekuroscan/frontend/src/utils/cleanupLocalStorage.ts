/**
 * ✅ FIX: Utility per pulire dati "zombie" desyncati dal localStorage
 * 
 * Questa funzione rimuove i dati di readingProgress e completedChapters
 * che non corrispondono più a manga nelle liste (reading, completed, dropped, favorites).
 * 
 * Viene eseguita:
 * - All'avvio dell'app (main.tsx)
 * - Dopo il login (useAuth)
 * - Quando si apre MangaDetails
 */

export function cleanupOrphanedLocalStorageData(): void {
  try {
    console.log('🧹 [cleanupLocalStorage] Starting cleanup...');
    
    // Ottieni tutte le liste
    const reading = JSON.parse(localStorage.getItem('reading') || '[]');
    const completed = JSON.parse(localStorage.getItem('completed') || '[]');
    const dropped = JSON.parse(localStorage.getItem('dropped') || '[]');
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    // Crea set di URL validi
    const validUrls = new Set<string>([
      ...reading.map((m: any) => m.url),
      ...completed.map((m: any) => m.url),
      ...dropped.map((m: any) => m.url),
      ...favorites.map((m: any) => m.url)
    ]);
    
    console.log(`🧹 [cleanupLocalStorage] Valid manga URLs: ${validUrls.size}`);
    
    // Pulisci readingProgress
    const readingProgress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
    const progressUrlsBefore = Object.keys(readingProgress).length;
    let progressCleaned = 0;
    
    for (const url of Object.keys(readingProgress)) {
      if (!validUrls.has(url)) {
        delete readingProgress[url];
        progressCleaned++;
      }
    }
    
    if (progressCleaned > 0) {
      localStorage.setItem('readingProgress', JSON.stringify(readingProgress));
      console.log(`🧹 [cleanupLocalStorage] Cleaned ${progressCleaned}/${progressUrlsBefore} orphaned readingProgress entries`);
    }
    
    // Pulisci completedChapters
    const completedChapters = JSON.parse(localStorage.getItem('completedChapters') || '{}');
    const chaptersUrlsBefore = Object.keys(completedChapters).length;
    let chaptersCleaned = 0;
    
    for (const url of Object.keys(completedChapters)) {
      if (!validUrls.has(url)) {
        delete completedChapters[url];
        chaptersCleaned++;
      }
    }
    
    if (chaptersCleaned > 0) {
      localStorage.setItem('completedChapters', JSON.stringify(completedChapters));
      console.log(`🧹 [cleanupLocalStorage] Cleaned ${chaptersCleaned}/${chaptersUrlsBefore} orphaned completedChapters entries`);
    }
    
    if (progressCleaned === 0 && chaptersCleaned === 0) {
      console.log('✅ [cleanupLocalStorage] No orphaned data found');
    } else {
      console.log(`✅ [cleanupLocalStorage] Cleanup complete! Removed ${progressCleaned + chaptersCleaned} orphaned entries`);
    }
  } catch (error) {
    console.error('❌ [cleanupLocalStorage] Error during cleanup:', error);
  }
}

/**
 * ✅ FIX: Rimuove TUTTI i dati di un manga specifico
 * Utile quando si vuole fare un "hard reset" di un manga
 */
export function removeMangaData(mangaUrl: string): void {
  try {
    console.log(`🗑️ [cleanupLocalStorage] Removing all data for manga: ${mangaUrl}`);
    
    // Rimuovi dalle liste
    const lists = ['reading', 'completed', 'dropped', 'favorites'];
    lists.forEach(list => {
      const items = JSON.parse(localStorage.getItem(list) || '[]');
      const filtered = items.filter((item: any) => item.url !== mangaUrl);
      localStorage.setItem(list, JSON.stringify(filtered));
    });
    
    // Rimuovi readingProgress
    const readingProgress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
    delete readingProgress[mangaUrl];
    localStorage.setItem('readingProgress', JSON.stringify(readingProgress));
    
    // Rimuovi completedChapters
    const completedChapters = JSON.parse(localStorage.getItem('completedChapters') || '{}');
    delete completedChapters[mangaUrl];
    localStorage.setItem('completedChapters', JSON.stringify(completedChapters));
    
    console.log(`✅ [cleanupLocalStorage] Successfully removed all data for manga: ${mangaUrl}`);
  } catch (error) {
    console.error('❌ [cleanupLocalStorage] Error removing manga data:', error);
  }
}

