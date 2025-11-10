// @ts-nocheck - Legacy component, needs gradual refactoring
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
// ✅ OptimizedReaderImage - Wrapper ottimizzato per immagini reader
import { useMemo } from 'react';
import { Box } from '@chakra-ui/react';
import LazyImage from '@/components/LazyImage';
import { getProxyImageUrl, needsProxy, isMobileDevice } from '@/utils/readerHelpers';

const OptimizedReaderImage = ({
  src,
  alt,
  priority = false,
  brightness = 100,
  imageScale = 100,
  width = '100%',
  height = 'auto',
  objectFit = 'contain',
  onLoad,
  onError,
  ...props
}) => {
  const mobile = useMemo(() => isMobileDevice(), []);
  
  const optimizedUrl = useMemo(() => {
    if (!src) return '';
    
    if (needsProxy(src)) {
      return getProxyImageUrl(src, {
        mobile,
        maxWidth: mobile ? 800 : 1200
      });
    }
    
    return src;
  }, [src, mobile]);

  return (
    <Box
      width={width}
      height={height}
      sx={{
        filter: `brightness(${brightness}%)`,
        transform: `scale(${imageScale / 100})`,
        transformOrigin: 'center',
        transition: 'filter 0.2s ease, transform 0.2s ease'
      }}
      {...props}
    >
      <LazyImage
        src={optimizedUrl}
        alt={alt}
        preset="mangaPage"
        priority={priority}
        width="100%"
        height="100%"
        objectFit={objectFit}
        onLoad={onLoad}
        onError={onError}
        {...props}
      />
    </Box>
  );
};

export default OptimizedReaderImage;

