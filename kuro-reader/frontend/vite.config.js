import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import viteCompression from 'vite-plugin-compression';
import viteImagemin from 'vite-plugin-imagemin';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  // ✅ PERFORMANCE: Ottimizzazioni build
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@chakra-ui/react'],
    exclude: ['@chakra-ui/icons']
  },
  plugins: [
    react({
      // ✅ PERFORMANCE: Fast Refresh ottimizzato
      fastRefresh: true
    }),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'favicon.ico',
        'favicon.svg', 
        'favicon-96x96.png',
        'web-app-manifest-192x192.png',
        'web-app-manifest-512x512.png',
        'apple-touch-icon.png',
        'site.webmanifest'
      ],
      manifest: {
        name: 'NeKuro Scan - Manga Reader',
        short_name: 'NeKuro Scan',
        description: 'Leggi manga e light novel gratuitamente',
        theme_color: '#805AD5',
        background_color: '#1A202C',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          {
            urlPattern: /^https:\/\/cdn\.mangaworld\.cx\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'manga-images-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    }),
    // ✅ PERFORMANCE: Compressione Brotli e Gzip
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240, // 10kb
      algorithm: 'brotliCompress',
      ext: '.br',
      deleteOriginFile: false
    }),
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'gzip',
      ext: '.gz',
      deleteOriginFile: false
    }),
    // ✅ PERFORMANCE: Ottimizzazione immagini automatica
    viteImagemin({
      gifsicle: {
        optimizationLevel: 7,
        interlaced: false
      },
      optipng: {
        optimizationLevel: 7
      },
      mozjpeg: {
        quality: 80
      },
      pngquant: {
        quality: [0.7, 0.8],
        speed: 4
      },
      svgo: {
        plugins: [
          { name: 'removeViewBox', active: false },
          { name: 'removeEmptyAttrs', active: true }
        ]
      },
      webp: {
        quality: 75
      }
    }),
    // ✅ DEVELOPMENT: Visualizza bundle size
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true
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
    // ✅ PERFORMANCE: Target moderni per bundle più piccoli
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Rimuovi console.log in produzione
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },
    // ✅ PERFORMANCE: Chunking ottimizzato
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'react-router': ['react-router-dom'],
          'chakra-ui': ['@chakra-ui/react', '@chakra-ui/icons'],
          'emotion': ['@emotion/react', '@emotion/styled'],
          'utils': ['axios', 'zustand', 'lodash.debounce']
        },
        // ✅ PERFORMANCE: Nomi file con hash per cache busting
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // ✅ PERFORMANCE: Dimensioni chunk ottimali
    chunkSizeWarningLimit: 500,
    cssCodeSplit: true,
    assetsInlineLimit: 4096, // 4kb - inline assets più piccoli
    // ✅ PERFORMANCE: Rimuovi commenti e whitespace
    minify: 'terser'
  },
  // ✅ PERFORMANCE: Ottimizzazioni resolve
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  // ✅ PERFORMANCE: Ottimizzazioni esbuild
  esbuild: {
    legalComments: 'none',
    treeShaking: true
  }
});
