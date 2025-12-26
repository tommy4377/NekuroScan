import { extendTheme } from '@chakra-ui/react';

export const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  fonts: {
    heading: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  },
  styles: {
    global: {
      'html': {
        scrollBehavior: 'smooth',
      },
      body: {
        bg: 'gray.900',
        color: 'white',
        fontFamily: 'body',
        fontFeatureSettings: '"liga", "kern"',
        textRendering: 'optimizeLegibility',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      },
      // ✅ TRANSIZIONI SMOOTH GLOBALI
      '*': {
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
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
      // ✅ BETTER CONTRAST per accessibilità
      'a': {
        color: 'purple.300',
        transition: 'all 0.2s ease',
        _hover: {
          color: 'purple.200',
          textDecoration: 'underline',
          transform: 'translateX(2px)',
        },
      },
      '.chakra-text': {
        color: 'gray.100', // Testo più chiaro
      },
      // ✅ SMOOTH CARDS - Solo per chakra-card generici, non manga-card
      '.chakra-card': {
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        _hover: {
          transform: 'scale(1.02)',
          boxShadow: '0 20px 25px -5px rgba(139, 92, 246, 0.2), 0 10px 10px -5px rgba(139, 92, 246, 0.08)',
          zIndex: 10,
        },
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
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      variants: {
        solid: {
          // ✅ GRADIENT SUI BUTTON
          bgGradient: 'linear(to-r, purple.500, pink.500)',
          _hover: {
            bgGradient: 'linear(to-r, purple.600, pink.600)',
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 15px -3px rgba(139, 92, 246, 0.4), 0 4px 6px -2px rgba(139, 92, 246, 0.2)',
          },
          _active: {
            transform: 'translateY(0)',
          },
        },
        ghost: {
          _hover: {
            bg: 'whiteAlpha.200',
            transform: 'translateX(2px)',
          },
        },
        outline: {
          _hover: {
            borderColor: 'purple.400',
            bg: 'whiteAlpha.100',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    Badge: {
      baseStyle: {
        borderRadius: 'full',  // ✅ badge arrotondati
        px: 3,
        py: 1,
        fontWeight: 'semibold',
        transition: 'all 0.2s ease',
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'gray.800',
          borderRadius: 'xl',
          border: '1px solid',
          borderColor: 'gray.700',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          _hover: {
            borderColor: 'purple.500',
            transform: 'translateY(-4px)',
            boxShadow: '0 20px 25px -5px rgba(139, 92, 246, 0.1)',
          },
        },
      },
    },
    Input: {
      baseStyle: {
        field: {
          transition: 'all 0.2s ease',
        },
      },
      variants: {
        filled: {
          field: {
            _focus: {
              borderColor: 'purple.400',
              boxShadow: '0 0 0 1px var(--chakra-colors-purple-400)',
            },
          },
        },
        outline: {
          field: {
            _focus: {
              borderColor: 'purple.400',
              boxShadow: '0 0 0 1px var(--chakra-colors-purple-400)',
            },
          },
        },
      },
    },
    Tabs: {
      variants: {
        'soft-rounded': {
          tab: {
            borderRadius: 'lg',
            fontWeight: 'semibold',
            color: 'gray.200',
            bg: 'transparent',
            transition: 'all 0.2s',
            _selected: {
              bg: 'whiteAlpha.200',
              color: 'white',
              fontWeight: 'bold',
            },
            _hover: {
              bg: 'whiteAlpha.100',
              color: 'white',
            },
          },
        },
        enclosed: {
          tab: {
            borderRadius: 'lg lg 0 0',
            fontWeight: 'semibold',
            color: 'gray.200',
            bg: 'transparent',
            _selected: {
              bg: 'gray.800',
              borderColor: 'purple.400',
              borderBottom: '3px solid',
              borderBottomColor: 'purple.400',
              color: 'white',
            },
            _hover: {
              bg: 'gray.800',
              color: 'white',
            },
          },
          tablist: {
            borderBottom: '2px solid',
            borderColor: 'gray.700',
          },
        },
      },
    },
    Modal: {
      baseStyle: {
        dialog: {
          bg: 'gray.800',
          borderRadius: '2xl',
          border: '1px solid',
          borderColor: 'gray.700',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        },
        header: {
          borderBottom: '1px solid',
          borderColor: 'gray.700',
          fontWeight: 'bold',
          fontSize: 'xl',
        },
        footer: {
          borderTop: '1px solid',
          borderColor: 'gray.700',
        },
        closeButton: {
          borderRadius: 'full',
          _hover: {
            bg: 'gray.700',
          },
        },
      },
    },
    Drawer: {
      baseStyle: {
        dialog: {
          bg: 'gray.900',
        },
        header: {
          borderBottom: '1px solid',
          borderColor: 'gray.700',
        },
      },
    },
  },
});