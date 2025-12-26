/**
 * LANDSCAPE MODE - Gestione orientamento e configurazione ottimale
 * Ottimizza UI e comportamento basato su device e orientamento
 */

import type { ReadingMode } from '@/types/manga';

// ========== TYPES ==========

type ViewMode = 'landscape' | 'portrait' | 'desktop';

type OrientationLockType = 
  | 'any'
  | 'natural'
  | 'landscape'
  | 'portrait'
  | 'portrait-primary'
  | 'portrait-secondary'
  | 'landscape-primary'
  | 'landscape-secondary';

interface GridColumns {
  base: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

export interface OptimalConfig {
  mode: ViewMode;
  gridColumns: GridColumns;
  cardHeight: string;
  headerHeight: string;
  showSidebar: boolean;
  readerMode: ReadingMode;
  uiCompact: boolean;
}

type OrientationChangeCallback = (config: OptimalConfig) => void;
type UnsubscribeFunction = () => void;

interface LandscapeMode {
  isLandscape(): boolean;
  isMobile(): boolean;
  getOptimalConfig(): OptimalConfig;
  onOrientationChange(callback: OrientationChangeCallback): UnsubscribeFunction;
  lockOrientation(orientation?: OrientationLockType): Promise<boolean>;
  unlockOrientation(): void;
}

// ========== IMPLEMENTATION ==========

export const landscapeMode: LandscapeMode = {
  isLandscape(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth > window.innerHeight;
  },

  isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  getOptimalConfig(): OptimalConfig {
    const isLandscape = this.isLandscape();
    const isMobile = this.isMobile();
    
    if (isMobile && isLandscape) {
      return {
        mode: 'landscape',
        gridColumns: { base: 4, sm: 5, md: 6 },
        cardHeight: '200px',
        headerHeight: '50px',
        showSidebar: false,
        readerMode: 'double',
        uiCompact: true
      };
    }
    
    if (isMobile) {
      return {
        mode: 'portrait',
        gridColumns: { base: 2, sm: 3 },
        cardHeight: '280px',
        headerHeight: '60px',
        showSidebar: false,
        readerMode: 'single',
        uiCompact: false
      };
    }
    
    return {
      mode: 'desktop',
      gridColumns: { base: 4, md: 5, lg: 6, xl: 8 },
      cardHeight: '280px',
      headerHeight: '60px',
      showSidebar: true,
      readerMode: 'single',
      uiCompact: false
    };
  },

  onOrientationChange(callback: OrientationChangeCallback): UnsubscribeFunction {
    if (typeof window === 'undefined') return () => {};
    
    const handleChange = (): void => {
      callback(this.getOptimalConfig());
    };
    
    window.addEventListener('orientationchange', handleChange);
    window.addEventListener('resize', handleChange);
    
    return () => {
      window.removeEventListener('orientationchange', handleChange);
      window.removeEventListener('resize', handleChange);
    };
  },

  async lockOrientation(orientation: OrientationLockType = 'portrait'): Promise<boolean> {
    if (!this.isMobile()) return false;
    
    try {
      if ('orientation' in screen && screen.orientation && 'lock' in screen.orientation) {
        await (screen.orientation.lock as (orientation: OrientationLockType) => Promise<void>)(orientation);
        return true;
      }
    } catch (error) {
      // Orientation lock not supported or denied
      return false;
    }
    
    return false;
  },

  unlockOrientation(): void {
    if ('orientation' in screen && 'unlock' in screen.orientation) {
      screen.orientation.unlock();
    }
  }
};

export default landscapeMode;

