import { extendTheme } from '@chakra-ui/react';

export const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  styles: {
    global: {
      body: {
        bg: 'gray.900',
        color: 'white',
      },
      // ✅ SCROLL BAR PERSONALIZZATA
      '*::-webkit-scrollbar': {
        width: '8px',
        height: '8px',
      },
      '*::-webkit-scrollbar-track': {
        background: 'gray.900',
      },
      '*::-webkit-scrollbar-thumb': {
        background: 'purple.600',
        borderRadius: '4px',
      },
      '*::-webkit-scrollbar-thumb:hover': {
        background: 'purple.500',
      },
    },
  },
  colors: {
    // ✅ COLORI PIÙ VIVACI
    purple: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6',  // più brillante
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
    },
    pink: {
      50: '#fdf2f8',
      100: '#fce7f3',
      200: '#fbcfe8',
      300: '#f9a8d4',
      400: '#f472b6',
      500: '#ec4899',  // più brillante
      600: '#db2777',
      700: '#be185d',
      800: '#9f1239',
      900: '#831843',
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'purple',
      },
      baseStyle: {
        fontWeight: 'semibold',
        borderRadius: 'lg',  // ✅ più arrotondato
      },
      variants: {
        solid: {
          // ✅ GRADIENT SUI BUTTON
          bgGradient: 'linear(to-r, purple.500, pink.500)',
          _hover: {
            bgGradient: 'linear(to-r, purple.600, pink.600)',
            transform: 'translateY(-2px)',
            boxShadow: 'lg',
          },
          transition: 'all 0.2s',
        },
      },
    },
    Badge: {
      baseStyle: {
        borderRadius: 'full',  // ✅ badge arrotondati
        px: 3,
        py: 1,
      },
    },
  },
});