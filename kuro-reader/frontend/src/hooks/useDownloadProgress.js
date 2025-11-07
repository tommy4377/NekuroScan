import { create } from 'zustand';

const useDownloadProgress = create((set, get) => ({
  downloads: [],
  
  // Aggiungi un download
  addDownload: (downloadId, mangaTitle, totalChapters = 1) => {
    set((state) => ({
      downloads: [
        ...state.downloads,
        {
          id: downloadId,
          mangaTitle,
          totalChapters,
          completedChapters: 0,
          currentChapter: {
            title: '',
            current: 0,
            total: 0,
            percentage: 0
          },
          status: 'downloading', // downloading, completed, error
          startTime: Date.now()
        }
      ]
    }));
  },
  
  // Aggiorna progresso del capitolo corrente
  updateChapterProgress: (downloadId, chapterTitle, current, total) => {
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === downloadId
          ? {
              ...d,
              currentChapter: {
                title: chapterTitle,
                current,
                total,
                percentage: Math.round((current / total) * 100)
              }
            }
          : d
      )
    }));
  },
  
  // Completa un capitolo
  completeChapter: (downloadId) => {
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === downloadId
          ? {
              ...d,
              completedChapters: d.completedChapters + 1,
              currentChapter: { title: '', current: 0, total: 0, percentage: 0 }
            }
          : d
      )
    }));
  },
  
  // Completa o fallisci download
  finishDownload: (downloadId, status = 'completed') => {
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === downloadId
          ? { ...d, status, endTime: Date.now() }
          : d
      )
    }));
    
    // Rimuovi dopo 5 secondi se completato
    if (status === 'completed') {
      setTimeout(() => {
        set((state) => ({
          downloads: state.downloads.filter((d) => d.id !== downloadId)
        }));
      }, 5000);
    }
  },
  
  // Rimuovi download
  removeDownload: (downloadId) => {
    set((state) => ({
      downloads: state.downloads.filter((d) => d.id !== downloadId)
    }));
  },
  
  // Pulisci tutti i download completati
  clearCompleted: () => {
    set((state) => ({
      downloads: state.downloads.filter((d) => d.status === 'downloading')
    }));
  }
}));

export default useDownloadProgress;

