import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import viteCompression from 'vite-plugin-compression';
import viteImagemin from 'vite-plugin-imagemin';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  base: '/',
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      '@chakra-ui/react',
      '@emotion/react',
      '@emotion/styled'
    ],
    exclude: []
  },
  plugins: [
    react({
      // ✅ PERFORMANCE: Fast Refresh ottimizzato
      fastRefresh: true
    }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: [
        'favicon.ico',
        'favicon.svg', 
        'favicon-96x96.png',
        'favicon-96x96.webp',
        'web-app-manifest-192x192.webp',
        'web-app-manifest-512x512.webp',
        'web-app-manifest-192x192.png',
        'web-app-manifest-512x512.png',
        'apple-touch-icon.png',
        'apple-touch-icon.webp',
        'site.webmanifest',
        'robots.txt',
        'sitemap.xml',
        'offline.html'
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
            src: '/web-app-manifest-192x192.webp',
            sizes: '192x192',
            type: 'image/webp',
            purpose: 'any maskable'
          },
          {
            src: '/web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/web-app-manifest-512x512.webp',
            sizes: '512x512',
            type: 'image/webp',
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
    viteCompression({
      verbose: false,
      disable: false,
      threshold: 10240,
      algorithm: 'brotliCompress',
      ext: '.br',
      deleteOriginFile: false,
      filter: /\.(js|css|json|html)$/i
    }),
    viteCompression({
      verbose: false,
      disable: false,
      threshold: 10240,
      algorithm: 'gzip',
      ext: '.gz',
      deleteOriginFile: false,
      filter: /\.(js|css|json|html)$/i
    }),
    // ✅ PERFORMANCE: Ottimizzazione immagini automatica (opzionale per evitare errori build)
    ...(process.env.SKIP_IMAGE_OPTIMIZATION !== 'true' ? [viteImagemin({
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
    })] : []),
    // ✅ DEVELOPMENT: Visualizza bundle size (solo in dev)
    process.env.ANALYZE && visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true
    })
  ].filter(Boolean),
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
    target: 'es2020',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    },
    // ✅ PERFORMANCE: Dimensioni chunk ottimali
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    assetsInlineLimit: 8192,
    reportCompressedSize: false,
    modulePreload: {
      polyfill: true
    }
  },
  // ✅ PERFORMANCE: Ottimizzazioni resolve
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  // ✅ PERFORMANCE: Ottimizzazioni esbuild
  esbuild: {
    drop: ['debugger'],
    legalComments: 'none'
  }
});
