/**
 * USE DOWNLOAD PROGRESS - Zustand store for download progress tracking
 * Manages chapter download progress with real-time updates
 */

import { create } from 'zustand';

// ========== TYPES ==========

interface CurrentChapter {
  title: string;
  current: number;
  total: number;
  percentage: number;
}

interface Download {
  id: string;
  mangaTitle: string;
  totalChapters: number;
  completedChapters: number;
  currentChapter: CurrentChapter;
  status: 'downloading' | 'completed' | 'error';
  startTime: number;
  endTime?: number;
}

interface DownloadProgressState {
  downloads: Download[];
  addDownload: (downloadId: string, mangaTitle: string, totalChapters?: number) => void;
  updateChapterProgress: (downloadId: string, chapterTitle: string, current: number, total: number) => void;
  completeChapter: (downloadId: string) => void;
  finishDownload: (downloadId: string, status?: 'completed' | 'error') => void;
  removeDownload: (downloadId: string) => void;
  clearCompleted: () => void;
}

// ========== STORE ==========

const useDownloadProgress = create<DownloadProgressState>((set) => ({
  downloads: [],
  
  addDownload: (downloadId: string, mangaTitle: string, totalChapters = 1): void => {
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
          status: 'downloading',
          startTime: Date.now()
        }
      ]
    }));
  },
  
  updateChapterProgress: (downloadId: string, chapterTitle: string, current: number, total: number): void => {
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
  
  completeChapter: (downloadId: string): void => {
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
  
  finishDownload: (downloadId: string, status: 'completed' | 'error' = 'completed'): void => {
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === downloadId
          ? { ...d, status, endTime: Date.now() }
          : d
      )
    }));
    
    // Remove after 5 seconds if completed
    if (status === 'completed') {
      setTimeout(() => {
        set((state) => ({
          downloads: state.downloads.filter((d) => d.id !== downloadId)
        }));
      }, 5000);
    }
  },
  
  removeDownload: (downloadId: string): void => {
    set((state) => ({
      downloads: state.downloads.filter((d) => d.id !== downloadId)
    }));
  },
  
  clearCompleted: (): void => {
    set((state) => ({
      downloads: state.downloads.filter((d) => d.status === 'downloading')
    }));
  }
}));

export default useDownloadProgress;

