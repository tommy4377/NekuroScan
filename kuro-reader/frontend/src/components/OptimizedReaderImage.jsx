// ✅ OptimizedReaderImage - Wrapper ottimizzato per immagini reader
import React, { useMemo } from 'react';
import { Box } from '@chakra-ui/react';
import LazyImage from './LazyImage';
import { getProxyImageUrl, needsProxy, isMobileDevice } from '../utils/readerHelpers';

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
      />
    </Box>
  );
};

export default OptimizedReaderImage;

