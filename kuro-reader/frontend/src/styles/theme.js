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
    },
  },
  colors: {
    brand: {
      50: '#e6e6ff',
      100: '#b3b3ff',
      200: '#8080ff',
      300: '#4d4dff',
      400: '#1a1aff',
      500: '#0000e6',
      600: '#0000b3',
      700: '#000080',
      800: '#00004d',
      900: '#00001a',
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'purple',
      },
    },
  },
});