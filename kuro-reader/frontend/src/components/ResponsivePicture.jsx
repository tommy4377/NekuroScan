// ✅ ResponsivePicture - Multi-format AVIF/WebP/JPEG con fallback automatico
import React from 'react';
import { getCloudinaryUrl, shouldUseCloudinary } from '../utils/cloudinaryHelper';

const ResponsivePicture = ({
  src,
  alt,
  width,
  height,
  preset = 'mangaCover',
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  objectFit = 'cover',
  className,
  style,
  onLoad,
  onError
}) => {
  if (!src || !shouldUseCloudinary()) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        fetchpriority={priority ? 'high' : 'auto'}
        decoding="async"
        style={{ objectFit, ...style }}
        className={className}
        onLoad={onLoad}
        onError={onError}
      />
    );
  }

  const widthsMap = {
    mangaCover: [200, 400, 600],
    mangaCoverSmall: [100, 200, 300],
    mangaPage: [800, 1200, 1600],
    mangaPageMobile: [400, 800],
    avatar: [100, 200, 300],
    banner: [800, 1200, 1600],
    logo: [256, 512]
  };

  const selectedWidths = widthsMap[preset] || [400, 800, 1200];

  const generateSources = (format) => {
    return selectedWidths.map(w => ({
      width: w,
      url: getCloudinaryUrl(src, {
        width: w,
        format,
        quality: 'auto',
        crop: 'limit'
      })
    }));
  };

  const avifSources = generateSources('avif');
  const webpSources = generateSources('webp');
  const jpegSources = generateSources('auto');

  const createSrcSet = (sources) => 
    sources.map(s => `${s.url} ${s.width}w`).join(', ');

  const fallbackSrc = jpegSources[Math.floor(jpegSources.length / 2)]?.url || src;

  return (
    <picture>
      <source
        type="image/avif"
        srcSet={createSrcSet(avifSources)}
        sizes={sizes}
      />
      
      <source
        type="image/webp"
        srcSet={createSrcSet(webpSources)}
        sizes={sizes}
      />
      
      <source
        type="image/jpeg"
        srcSet={createSrcSet(jpegSources)}
        sizes={sizes}
      />
      
      <img
        src={fallbackSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        fetchpriority={priority ? 'high' : 'auto'}
        decoding="async"
        style={{ objectFit, ...style }}
        className={className}
        onLoad={onLoad}
        onError={onError}
      />
    </picture>
  );
};

export default ResponsivePicture;

export function useImageFormatSupport() {
  const [support, setSupport] = React.useState({
    avif: false,
    webp: false,
    loading: true
  });

  React.useEffect(() => {
    const checkFormat = async (testSrc) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = testSrc;
        setTimeout(() => resolve(false), 1000);
      });
    };

    const detectSupport = async () => {
      const [avif, webp] = await Promise.all([
        checkFormat('data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A='),
        checkFormat('data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==')
      ]);

      setSupport({ avif, webp, loading: false });
    };

    detectSupport();
  }, []);

  return support;
}

