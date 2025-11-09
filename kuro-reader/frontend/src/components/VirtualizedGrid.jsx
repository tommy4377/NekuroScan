// VirtualizedGrid.jsx - Grid virtuale per performance con liste lunghe
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, SimpleGrid } from '@chakra-ui/react';
import { useThrottle } from '../hooks/usePerformance';

/**
 * Grid virtualizz ato per rendering efficiente di grandi liste
 * Render solo gli elementi visibili + buffer zone
 * 
 * @param {Array} items - Lista completa elementi
 * @param {Function} renderItem - Funzione per renderizzare singolo elemento (item, index) => JSX
 * @param {Object} gridProps - Props per SimpleGrid (columns, spacing, etc)
 * @param {number} itemHeight - Altezza stimata elemento (default 350px)
 * @param {number} overscan - Numero elementi extra da renderizzare fuori viewport (default 3)
 */
const VirtualizedGrid = ({
  items = [],
  renderItem,
  gridProps = {},
  itemHeight = 350,
  overscan = 3,
  ...rest
}) => {
  const containerRef = useRef(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const [containerHeight, setContainerHeight] = useState(0);
  
  // Calcola numero colonne basato sul gridProps
  const getColumnsCount = useCallback(() => {
    const { columns } = gridProps;
    
    if (typeof columns === 'number') return columns;
    if (typeof columns === 'object') {
      // Responsive: usa largest breakpoint disponibile
      const width = window.innerWidth;
      if (width >= 1536 && columns['2xl']) return columns['2xl'];
      if (width >= 1280 && columns.xl) return columns.xl;
      if (width >= 1024 && columns.lg) return columns.lg;
      if (width >= 768 && columns.md) return columns.md;
      if (width >= 480 && columns.sm) return columns.sm;
      return columns.base || 2;
    }
    return 2;
  }, [gridProps]);
  
  // Update visible range on scroll (throttled)
  const updateVisibleRange = useThrottle(() => {
    if (!containerRef.current) return;
    
    const scrollTop = window.scrollY;
    const viewportHeight = window.innerHeight;
    const containerTop = containerRef.current.offsetTop;
    
    const columnsCount = getColumnsCount();
    const rowHeight = itemHeight;
    
    // Calcola indice prima riga visibile
    const firstVisibleRow = Math.max(
      0,
      Math.floor((scrollTop - containerTop) / rowHeight) - overscan
    );
    
    // Calcola indice ultima riga visibile
    const lastVisibleRow = Math.ceil(
      (scrollTop - containerTop + viewportHeight) / rowHeight
    ) + overscan;
    
    // Converti a indici items
    const start = firstVisibleRow * columnsCount;
    const end = Math.min(items.length, lastVisibleRow * columnsCount);
    
    setVisibleRange({ start, end });
  }, 100);
  
  // Listen scroll events
  useEffect(() => {
    updateVisibleRange();
    
    window.addEventListener('scroll', updateVisibleRange, { passive: true });
    window.addEventListener('resize', updateVisibleRange, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', updateVisibleRange);
      window.removeEventListener('resize', updateVisibleRange);
    };
  }, [updateVisibleRange, items.length]);
  
  // Calcola altezza totale container
  useEffect(() => {
    const columnsCount = getColumnsCount();
    const rowsCount = Math.ceil(items.length / columnsCount);
    const totalHeight = rowsCount * itemHeight;
    setContainerHeight(totalHeight);
  }, [items.length, itemHeight, getColumnsCount]);
  
  // Calcola offset top per posizionamento
  const { start, end } = visibleRange;
  const columnsCount = getColumnsCount();
  const startRow = Math.floor(start / columnsCount);
  const offsetY = startRow * itemHeight;
  
  // Slice visible items
  const visibleItems = items.slice(start, end);
  
  return (
    <Box 
      ref={containerRef}
      position="relative"
      minHeight={`${containerHeight}px`}
      {...rest}
    >
      <SimpleGrid
        position="relative"
        top={`${offsetY}px`}
        {...gridProps}
      >
        {visibleItems.map((item, index) => (
          <Box key={start + index}>
            {renderItem(item, start + index)}
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
};

/**
 * Versione semplificata per liste verticali (non grid)
 */
export const VirtualizedList = ({
  items = [],
  renderItem,
  itemHeight = 80,
  overscan = 5,
  ...rest
}) => {
  const containerRef = useRef(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  
  const updateVisibleRange = useThrottle(() => {
    if (!containerRef.current) return;
    
    const scrollTop = window.scrollY;
    const viewportHeight = window.innerHeight;
    const containerTop = containerRef.current.offsetTop;
    
    const firstVisible = Math.max(
      0,
      Math.floor((scrollTop - containerTop) / itemHeight) - overscan
    );
    
    const lastVisible = Math.min(
      items.length,
      Math.ceil((scrollTop - containerTop + viewportHeight) / itemHeight) + overscan
    );
    
    setVisibleRange({ start: firstVisible, end: lastVisible });
  }, 100);
  
  useEffect(() => {
    updateVisibleRange();
    
    window.addEventListener('scroll', updateVisibleRange, { passive: true });
    window.addEventListener('resize', updateVisibleRange, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', updateVisibleRange);
      window.removeEventListener('resize', updateVisibleRange);
    };
  }, [updateVisibleRange, items.length]);
  
  const { start, end } = visibleRange;
  const offsetY = start * itemHeight;
  const totalHeight = items.length * itemHeight;
  const visibleItems = items.slice(start, end);
  
  return (
    <Box
      ref={containerRef}
      position="relative"
      minHeight={`${totalHeight}px`}
      {...rest}
    >
      <Box
        position="relative"
        top={`${offsetY}px`}
      >
        {visibleItems.map((item, index) => (
          <Box key={start + index} height={`${itemHeight}px`}>
            {renderItem(item, start + index)}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default React.memo(VirtualizedGrid);

