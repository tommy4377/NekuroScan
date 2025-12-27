// @ts-nocheck - Legacy component, needs gradual refactoring
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
// ✅ LazyImage - Advanced Lazy Loading con LQIP Blur + Intersection Observer
import { useState, useEffect, useRef } from 'react';
import { Box, Image, Skeleton } from '@chakra-ui/react';
import { CloudinaryPresets, shouldUseCloudinary } from '@/utils/cloudinaryHelper';

const LazyImage = ({ 
  src, 
  alt, 
  preset = 'mangaCover',
  priority = false,
  width,
  height,
  objectFit = 'cover',
  borderRadius,
  onLoad,
  onError,
  ...props 
}) => {
  const [isInView, setIsInView] = useState(priority);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  const optimizedSrc = shouldUseCloudinary() && CloudinaryPresets[preset]
    ? CloudinaryPresets[preset](src)
    : src;

  const lqipSrc = shouldUseCloudinary() && !priority
    ? CloudinaryPresets.placeholder(src)
    : null;

  // ✅ SEZIONE 4.1: Image Lazy Loading Avanzato - Intersection Observer ottimizzato
  useEffect(() => {
    if (priority || !imgRef.current) return;

    // ✅ Threshold ottimizzato basato su viewport size
    const isMobile = window.innerWidth < 768;
    const rootMargin = isMobile ? '150px' : '200px'; // Preload più aggressivo su mobile
    const threshold = 0.01;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            if (observerRef.current && imgRef.current) {
              observerRef.current.unobserve(imgRef.current);
            }
          }
        });
      },
      {
        rootMargin, // ✅ Ottimizzato per preload "above the fold"
        threshold
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [priority]);

  const handleLoad = (e) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e) => {
    setHasError(true);
    setIsLoaded(true);
    onError?.(e);
  };

  const fallbackSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width || 200}' height='${height || 280}' viewBox='0 0 200 280'%3E%3Crect width='200' height='280' fill='%234A5568'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23A0AEC0' font-family='sans-serif' font-size='12'%3E${encodeURIComponent((alt?.substring(0, 15) || 'Error') + '...')}%3C/text%3E%3C/svg%3E`;

  return (
    <Box 
      ref={imgRef}
      position="relative" 
      width={width || "100%"}
      height={height || "100%"}
      borderRadius={borderRadius}
      overflow="hidden"
      {...props}
    >
      {/* ✅ SEZIONE 4.1: Progressive image loading - Blur placeholder migliorato */}
      {lqipSrc && !isLoaded && (
        <Box
          position="absolute"
          top={0}
          left={0}
          width="100%"
          height="100%"
          backgroundImage={`url(${lqipSrc})`}
          backgroundSize="cover"
          backgroundPosition="center"
          filter="blur(20px)"
          transform="scale(1.1)"
          zIndex={1}
          sx={{
            transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: isLoaded ? 0 : 1
          }}
        />
      )}

      {!isLoaded && !lqipSrc && (
        <Skeleton 
          position="absolute"
          top={0}
          left={0}
          width="100%"
          height="100%"
          startColor="gray.700"
          endColor="gray.600"
          speed={1.2}
          zIndex={1}
        />
      )}

      {/* ✅ SEZIONE 4.1: Progressive image loading - Transizione smooth blur → sharp */}
      {(isInView || priority) && (
        <Image
          src={hasError ? fallbackSvg : optimizedSrc}
          alt={alt}
          width="100%"
          height="100%"
          objectFit={objectFit}
          loading={priority ? "eager" : "lazy"}
          fetchpriority={priority ? "high" : "auto"} // ✅ Ottimizzato: "auto" invece di "low" per migliorare priorità
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          fallbackSrc={fallbackSvg}
          position="relative"
          zIndex={2}
          sx={{
            transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: isLoaded ? 1 : (lqipSrc ? 0.3 : 0), // ✅ Mostra placeholder blur con opacità durante caricamento
            willChange: isLoaded ? 'auto' : 'opacity',
            transform: isLoaded ? 'scale(1)' : 'scale(1.02)', // ✅ Slight scale per effetto più fluido
            filter: isLoaded ? 'none' : 'blur(2px)' // ✅ Blur leggero durante caricamento
          }}
        />
      )}
    </Box>
  );
};

export default LazyImage;

