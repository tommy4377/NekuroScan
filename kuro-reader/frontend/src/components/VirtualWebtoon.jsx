// ✅ VirtualWebtoon - Virtual scrolling per modalità webtoon
import React, { useCallback, useRef } from 'react';
import { Box } from '@chakra-ui/react';
import { Virtuoso } from 'react-virtuoso';
import LazyImage from './LazyImage';
import { getProxyImageUrl, isMobileDevice } from '../utils/readerHelpers';

const VirtualWebtoon = ({ 
  pages, 
  currentPage, 
  onPageChange,
  brightness = 100,
  imageScale = 100,
  fitMode = 'fit-width',
  onImageLoad,
  onImageError,
  ...props
}) => {
  const virtuosoRef = useRef(null);
  const mobile = isMobileDevice();

  const itemContent = useCallback((index) => {
    const imageUrl = getProxyImageUrl(pages[index], { 
      mobile,
      maxWidth: mobile ? 800 : 1200 
    });

    return (
      <Box
        key={index}
        width="100%"
        position="relative"
        sx={{
          filter: `brightness(${brightness}%)`,
          transform: `scale(${imageScale / 100})`,
          transformOrigin: 'center top',
          transition: 'filter 0.2s, transform 0.2s',
          maxWidth: fitMode === 'fit-width' ? '100%' : 'none',
          maxHeight: fitMode === 'fit-height' ? '100vh' : 'none'
        }}
      >
        <LazyImage
          src={imageUrl}
          alt={`Pagina ${index + 1}`}
          preset="mangaPage"
          priority={index === currentPage}
          width="100%"
          height="auto"
          objectFit="contain"
          onLoad={() => onImageLoad?.(index)}
          onError={() => onImageError?.(index)}
        />
      </Box>
    );
  }, [pages, currentPage, brightness, imageScale, mobile, fitMode, onImageLoad, onImageError]);

  const rangeChanged = useCallback((range) => {
    if (range.startIndex !== currentPage) {
      onPageChange?.(range.startIndex);
    }
  }, [currentPage, onPageChange]);

  return (
    <Virtuoso
      ref={virtuosoRef}
      style={{ 
        height: '100vh',
        width: '100%'
      }}
      totalCount={pages.length}
      overscan={{ 
        main: 500,
        reverse: 500
      }}
      initialTopMostItemIndex={currentPage}
      itemContent={itemContent}
      rangeChanged={rangeChanged}
      increaseViewportBy={{ 
        top: 800, 
        bottom: 800 
      }}
    />
  );
};

export default VirtualWebtoon;

