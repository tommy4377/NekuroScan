/**
 * STATUS BAR - Gestione colori status bar per PWA
 * Supporta Android (theme-color) e iOS (apple-mobile-web-app-status-bar-style)
 */

// ========== TYPES ==========

type AppleStatusBarStyle = 'default' | 'black' | 'black-translucent';

interface StatusBarColors {
  readonly default: string;
  readonly home: string;
  readonly reader: string;
  readonly search: string;
  readonly library: string;
  readonly profile: string;
  readonly settings: string;
  readonly error: string;
  readonly success: string;
}

interface StatusBar {
  colors: StatusBarColors;
  setColor(color: string): void;
  getAppleStyle(color: string): AppleStatusBarStyle;
  isColorDark(color: string): boolean;
  setForRoute(pathname: string): void;
  reset(): void;
}

// ========== IMPLEMENTATION ==========

export const statusBar: StatusBar = {
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

  setColor(color: string): void {
    if (typeof document === 'undefined') return;
    
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', color);
    }
    
    // iOS Safari
    const metaApple = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (metaApple) {
      metaApple.setAttribute('content', this.getAppleStyle(color));
    }
  },

  getAppleStyle(color: string): AppleStatusBarStyle {
    const isDark = this.isColorDark(color);
    return isDark ? 'black-translucent' : 'default';
  },

  isColorDark(color: string): boolean {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Formula luminosità (ITU-R BT.709)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  },

  setForRoute(pathname: string): void {
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

  reset(): void {
    this.setColor(this.colors.default);
  }
};

export default statusBar;

