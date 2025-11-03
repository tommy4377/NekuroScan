// 📱 LANDSCAPE MODE - Ottimizzazione modalità orizzontale

export const landscapeMode = {
  // Rileva orientamento
  isLandscape() {
    if (typeof window === 'undefined') return false;
    return window.innerWidth > window.innerHeight;
  },

  // Rileva se è mobile
  isMobile() {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  // Ottieni configurazione ottimale per orientamento
  getOptimalConfig() {
    const isLandscape = this.isLandscape();
    const isMobile = this.isMobile();
    
    if (isMobile && isLandscape) {
      return {
        mode: 'landscape',
        gridColumns: { base: 4, sm: 5, md: 6 },
        cardHeight: '200px',
        headerHeight: '50px',
        showSidebar: false,
        readerMode: 'double', // Doppia pagina in landscape
        uiCompact: true
      };
    } else if (isMobile) {
      return {
        mode: 'portrait',
        gridColumns: { base: 2, sm: 3 },
        cardHeight: '280px',
        headerHeight: '60px',
        showSidebar: false,
        readerMode: 'single',
        uiCompact: false
      };
    } else {
      return {
        mode: 'desktop',
        gridColumns: { base: 4, md: 5, lg: 6, xl: 8 },
        cardHeight: '280px',
        headerHeight: '60px',
        showSidebar: true,
        readerMode: 'single',
        uiCompact: false
      };
    }
  },

  // Listener per cambio orientamento
  onOrientationChange(callback) {
    if (typeof window === 'undefined') return () => {};
    
    const handleChange = () => {
      callback(this.getOptimalConfig());
    };
    
    window.addEventListener('orientationchange', handleChange);
    window.addEventListener('resize', handleChange);
    
    return () => {
      window.removeEventListener('orientationchange', handleChange);
      window.removeEventListener('resize', handleChange);
    };
  },

  // Lock orientamento (solo mobile con API supportata)
  async lockOrientation(orientation = 'portrait') {
    if (!this.isMobile()) return false;
    
    try {
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock(orientation);
        return true;
      }
    } catch (error) {
      console.log('Orientation lock not supported:', error);
    }
    
    return false;
  },

  // Unlock orientamento
  unlockOrientation() {
    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  }
};

export default landscapeMode;

