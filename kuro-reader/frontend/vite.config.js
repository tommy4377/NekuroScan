import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      injectManifest: {
        injectionPoint: undefined
      },
      includeAssets: [
        'favicon.ico',
        'favicon.svg',
        'favicon-96x96.png',
        'web-app-manifest-192x192.png',
        'web-app-manifest-512x512.png',
        'apple-touch-icon.png',
        'site.webmanifest'
      ],
      manifest: false, // Use custom manifest.json
      injectRegister: false, // Usiamo registrazione custom in main.jsx
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  publicDir: 'public',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:10000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chakra-vendor': ['@chakra-ui/react', '@emotion/react', '@emotion/styled'],
          'utils': ['axios', 'zustand', 'lodash.debounce']
        }
      }
    }
  }
});
