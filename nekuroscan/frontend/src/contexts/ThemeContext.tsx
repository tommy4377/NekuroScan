/**
 * THEME CONTEXT - Custom theme management
 * Provides theme switching functionality across the app
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

// ========== TYPES ==========

type ThemeType = 'default' | 'ocean' | 'sunset' | 'forest' | 'sakura';

interface ThemeContextValue {
  currentTheme: ThemeType;
  applyTheme: (theme: ThemeType) => void;
}

interface ThemeProviderProps {
  children: ReactNode;
}

// ========== CONTEXT ==========

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ========== HOOK ==========

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// ========== PROVIDER ==========

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('default');
  
  const applyTheme = useCallback((theme: ThemeType) => {
    setCurrentTheme(theme);
    // ✅ MOBILE FIX: Try-catch per localStorage
    try {
      if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
        localStorage.setItem('appTheme', theme);
      }
    } catch (e) {
      // Silent fail - localStorage non disponibile
    }
    
    // Apply theme colors
    const root = document.documentElement;
    
    switch(theme) {
      case 'ocean':
        root.style.setProperty('--chakra-colors-purple-500', '#0066cc');
        root.style.setProperty('--chakra-colors-purple-400', '#0080ff');
        break;
      case 'sunset':
        root.style.setProperty('--chakra-colors-purple-500', '#ff6b35');
        root.style.setProperty('--chakra-colors-purple-400', '#ff8c42');
        break;
      case 'forest':
        root.style.setProperty('--chakra-colors-purple-500', '#2d6a2d');
        root.style.setProperty('--chakra-colors-purple-400', '#4a8c4a');
        break;
      case 'sakura':
        root.style.setProperty('--chakra-colors-purple-500', '#ff69b4');
        root.style.setProperty('--chakra-colors-purple-400', '#ffb6c1');
        break;
      default:
        root.style.setProperty('--chakra-colors-purple-500', '#805ad5');
        root.style.setProperty('--chakra-colors-purple-400', '#9f7aea');
    }
  }, []);
  
  useEffect(() => {
    // ✅ MOBILE FIX: Load saved theme con gestione errori
    try {
      if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
        const savedTheme = (localStorage.getItem('appTheme') || 'default') as ThemeType;
        applyTheme(savedTheme);
      } else {
        applyTheme('default');
      }
    } catch (e) {
      // Silent fail - usa default theme
      applyTheme('default');
    }
  }, [applyTheme]);
  
  const value: ThemeContextValue = {
    currentTheme,
    applyTheme
  };
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
