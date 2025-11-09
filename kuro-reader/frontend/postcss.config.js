// postcss.config.js - Configurazione PostCSS per ottimizzazione CSS

export default {
  plugins: {
    // Autoprefixer: aggiunge vendor prefixes automaticamente
    'autoprefixer': {
      flexbox: 'no-2009',
      grid: 'autoplace'
    },
    
    // CSS Nano: minificazione avanzata CSS
    'cssnano': {
      preset: ['advanced', {
        // Ottimizzazioni aggressive
        discardComments: { removeAll: true },
        reduceIdents: false, // Mantieni animation names
        zindex: false, // Non modificare z-index
        mergeRules: true,
        mergeLonghand: true,
        colormin: true,
        normalizeWhitespace: true,
        minifyFontValues: true,
        minifyGradients: true,
        minifyParams: true,
        minifySelectors: true,
        calc: {
          precision: 5
        }
      }]
    },
    
    // PurgeCSS inline (opzionale, usa solo in prod)
    ...(process.env.NODE_ENV === 'production' ? {
      '@fullhuman/postcss-purgecss': {
        content: [
          './index.html',
          './src/**/*.{js,jsx,ts,tsx}',
        ],
        // Whitelist per classi dinamiche
        safelist: {
          standard: [
            /^chakra-/,
            /^css-/,
            /^hover:/,
            /^focus:/,
            /^active:/,
            /^data-/,
            /^aria-/
          ],
          deep: [/^chakra-/, /^css-/],
          greedy: [/^chakra-/, /^css-/]
        },
        // Preserva keyframes e font-face
        fontFace: true,
        keyframes: true,
        variables: true
      }
    } : {})
  }
};

