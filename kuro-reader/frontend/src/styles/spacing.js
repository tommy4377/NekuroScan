// ✅ DESIGN SYSTEM CENTRALIZZATO - KuroReader v3.1
// Usa questo ovunque per avere UI consistente

export const spacing = {
  // ========= CONTAINER =========
  container: {
    py: { base: 4, md: 8 },
    px: { base: 4, md: 6 },
    maxW: 'container.xl'
  },

  // ========= CARDS =========
  card: {
    p: { base: 4, md: 6 },
    borderRadius: 'xl',
    spacing: { base: 3, md: 4 }
  },

  // ========= GRIDS =========
  grid: {
    columns: { base: 2, md: 3, lg: 5 },
    spacing: { base: 3, md: 4 }
  },

  // ========= BUTTONS =========
  button: {
    size: { base: 'sm', md: 'md' },
    sizeIcon: { base: 'sm', md: 'md' },
    spacing: { base: 2, md: 3 }
  },

  // ========= TYPOGRAPHY =========
  heading: {
    xl: { base: 'lg', md: 'xl' },
    lg: { base: 'md', md: 'lg' },
    md: { base: 'sm', md: 'md' }
  },

  // ========= SECTIONS =========
  section: {
    spacing: { base: 6, md: 8 },
    divider: { base: 4, md: 6 }
  },

  // ========= COLORS THEME =========
  colors: {
    primary: 'purple',
    secondary: 'pink',
    success: 'green',
    warning: 'orange',
    danger: 'red',
    info: 'blue'
  },

  // ========= BADGES =========
  badge: {
    size: { base: 'sm', md: 'md' },
    fontSize: { base: 'xs', md: 'sm' }
  }
};

// ✅ UTILITÀ PER COLORI DINAMICI
export const getColorScheme = (type) => {
  const colorMap = {
    trending: 'orange',
    latest: 'blue',
    popular: 'pink',
    reading: 'purple',
    completed: 'green',
    dropped: 'red',
    favorite: 'pink',
    default: 'purple'
  };
  return colorMap[type] || colorMap.default;
};

// ✅ TRANSITION UNIFORME
export const transition = {
  fast: 'all 0.2s ease',
  normal: 'all 0.3s ease',
  slow: 'all 0.5s ease'
};

// ✅ SHADOWS UNIFORMI
export const shadows = {
  card: '0 4px 12px rgba(0,0,0,0.2)',
  cardHover: '0 20px 40px rgba(0,0,0,0.4)',
  button: '0 2px 8px rgba(0,0,0,0.15)'
};