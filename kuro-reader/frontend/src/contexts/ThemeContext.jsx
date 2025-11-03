import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorMode } from '@chakra-ui/react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const { setColorMode } = useColorMode();
  const [currentTheme, setCurrentTheme] = useState('default');
  
  // ✅ WRAP applyTheme in useCallback per evitare React error #300
  const applyTheme = useCallback((theme) => {
    setCurrentTheme(theme);
    localStorage.setItem('appTheme', theme);
    
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
  
  // ✅ AGGIUNGI applyTheme alle dipendenze
  useEffect(() => {
    // Load saved theme
    const savedTheme = localStorage.getItem('appTheme') || 'default';
    applyTheme(savedTheme);
  }, [applyTheme]);
  
  const value = {
    currentTheme,
    applyTheme
  };
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};