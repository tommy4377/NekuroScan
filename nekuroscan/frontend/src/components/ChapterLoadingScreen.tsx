/**
 * CHAPTER LOADING SCREEN - Smooth loading with countdown
 * Shows animated loading screen while preloading chapter images
 */

import { useEffect, useState } from 'react';
import { Box, VStack, Text, Progress, Icon } from '@chakra-ui/react';
import { FaBook } from 'react-icons/fa';

// ========== TYPES ==========

interface ChapterLoadingScreenProps {
  chapterTitle?: string;
  chapterPages?: string[];
  currentPage?: number;
  totalPages?: number;
  onLoadComplete?: () => void;
  minDelay?: number;
}

// ========== COMPONENT ==========

const ChapterLoadingScreen = ({ 
  chapterTitle,
  chapterPages = [],
  onLoadComplete,
  minDelay = 3000
}: ChapterLoadingScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState(Math.ceil(minDelay / 1000));

  useEffect(() => {
    let mounted = true;
    const startTime = Date.now();
    let animationFrame: number;

    // Preload images in background (non-blocking)
    if (chapterPages && chapterPages.length > 0) {
      const preloadCount = Math.min(5, chapterPages.length);
      
      chapterPages.slice(0, preloadCount).forEach((url, i) => {
        setTimeout(() => {
          if (!mounted) return;
          const img = new Image();
          const cdnPattern = atob('Y2RuLm1hbmdhd29ybGQ=');
          const needsProxy = url.includes(cdnPattern);
          // Use relative URL in production (Vercel rewrites)
          const proxyBase = import.meta.env.VITE_PROXY_URL || (import.meta.env.PROD ? '' : 'http://localhost:10000');
          img.src = needsProxy 
            ? `${proxyBase}/api/image-proxy?url=${encodeURIComponent(url)}`
            : url;
        }, i * 200); // Stagger to avoid overload
      });
    }

    // SMOOTH progress bar with requestAnimationFrame (60fps)
    const updateProgress = (): void => {
      if (!mounted) return;
      
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min((elapsed / minDelay) * 100, 100);
      
      setProgress(currentProgress);
      
      // Update countdown
      const remaining = Math.max(0, Math.ceil((minDelay - elapsed) / 1000));
      setCountdown(remaining);

      if (currentProgress < 100) {
        animationFrame = requestAnimationFrame(updateProgress);
      } else {
        // Complete when time has passed
        setTimeout(() => {
          if (mounted && onLoadComplete) {
            onLoadComplete();
          }
        }, 100);
      }
    };

    // Start animation
    animationFrame = requestAnimationFrame(updateProgress);

    return () => {
      mounted = false;
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [minDelay, onLoadComplete, chapterPages]);

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="gray.900"
      zIndex={9999}
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{
        animation: 'fadeIn 0.3s ease-in-out'
      }}
    >
      <VStack spacing={8} maxW="400px" px={6}>
        {/* Animated icon */}
        <Box
          position="relative"
          sx={{
            animation: 'float 2s ease-in-out infinite'
          }}
        >
          <Box
            bg="purple.500"
            borderRadius="full"
            p={6}
            boxShadow="0 0 40px rgba(128, 90, 213, 0.4)"
            sx={{
              animation: 'pulse 2s ease-in-out infinite'
            }}
          >
            <Icon as={FaBook} boxSize={12} color="white" />
          </Box>
        </Box>

        {/* Chapter title */}
        <VStack spacing={6} textAlign="center">
          <Text fontSize="2xl" fontWeight="bold" color="white">
            {chapterTitle || 'Caricamento Capitolo'}
          </Text>
          
          <Text fontSize="3xl" color="purple.400" fontWeight="bold">
            {countdown > 0 ? `${countdown}s` : 'Pronto!'}
          </Text>
        </VStack>

        {/* SMOOTH progress bar */}
        <Box width="100%" maxW="400px">
          <Progress
            value={progress}
            size="lg"
            colorScheme="purple"
            borderRadius="full"
            hasStripe
            isAnimated
            sx={{
              '& > div': {
                transition: 'none' // Smooth with requestAnimationFrame
              }
            }}
          />
        </Box>
      </VStack>

      {/* CSS Animations */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 40px rgba(128, 90, 213, 0.4); }
            50% { box-shadow: 0 0 60px rgba(128, 90, 213, 0.6); }
          }
        `}
      </style>
    </Box>
  );
};

export default ChapterLoadingScreen;

