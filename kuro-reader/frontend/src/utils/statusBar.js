// 📱 STATUS BAR - Colori status bar dinamici per PWA

export const statusBar = {
  // Imposta colore status bar
  setColor(color) {
    if (typeof document === 'undefined') return;
    
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', color);
    }
    
    // Per iOS Safari
    const metaApple = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (metaApple) {
      metaApple.setAttribute('content', this.getAppleStyle(color));
    }
  },

  // Converti colore hex in stile Apple
  getAppleStyle(color) {
    // Se è scuro, usa black-translucent
    const isDark = this.isColorDark(color);
    return isDark ? 'black-translucent' : 'default';
  },

  // Check se colore è scuro
  isColorDark(color) {
    // Converti hex a RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calcola luminosità
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  },

  // Preset colori per diverse sezioni
  colors: {
    default: '#805AD5',  // purple.500
    home: '#805AD5',
    reader: '#000000',   // nero per reader
    search: '#4299E1',   // blue.500
    library: '#9333ea',  // purple.600
    profile: '#EC4899',  // pink.500
    settings: '#718096', // gray.500
    error: '#E53E3E',    // red.500
    success: '#38A169'   // green.500
  },

  // Imposta colore basato su route
  setForRoute(pathname) {
    if (pathname.includes('/read/')) {
      this.setColor(this.colors.reader);
    } else if (pathname.includes('/search')) {
      this.setColor(this.colors.search);
    } else if (pathname.includes('/library')) {
      this.setColor(this.colors.library);
    } else if (pathname.includes('/profile')) {
      this.setColor(this.colors.profile);
    } else if (pathname.includes('/settings')) {
      this.setColor(this.colors.settings);
    } else {
      this.setColor(this.colors.default);
    }
  },

  // Reset al colore default
  reset() {
    this.setColor(this.colors.default);
  }
};

export default statusBar;

