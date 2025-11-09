// ✅ ChapterLoadingScreen - Loading elegante con VERO preload immagini
import React, { useEffect, useState } from 'react';
import { Box, VStack, Text, Progress, Spinner, HStack, Icon } from '@chakra-ui/react';
import { FaBook, FaCheck } from 'react-icons/fa';

const ChapterLoadingScreen = ({ 
  chapterTitle,
  chapterPages = [],
  currentPage = 1,
  totalPages = 0,
  onLoadComplete,
  minDelay = 3000,
  preloadFirstPages = 5
}) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('preparing');
  const [loadedPages, setLoadedPages] = useState(0);

  useEffect(() => {
    let mounted = true;
    const startTime = Date.now();

    const startLoading = async () => {
      // Stage 1: Preparing (0-20%)
      setStage('preparing');
      setProgress(10);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!mounted) return;
      
      setProgress(20);
      
      // Stage 2: Loading (20-80%) - VERO PRELOAD
      setStage('loading');
      
      if (chapterPages && chapterPages.length > 0) {
        // Import dinamici per evitare circular dependencies
        const { preloadImage } = await import('../utils/imageQueue');
        const { getProxyImageUrl } = await import('../utils/readerHelpers');
        
        const pagesToPreload = Math.min(preloadFirstPages, chapterPages.length);
        const progressStep = 60 / pagesToPreload;
        
        for (let i = 0; i < pagesToPreload; i++) {
          if (!mounted) return;
          
          const pageUrl = chapterPages[i];
          if (pageUrl) {
            try {
              const proxiedUrl = getProxyImageUrl(pageUrl);
              const priority = i === 0 ? 10 : (i < 3 ? 5 : 1);
              
              await preloadImage(proxiedUrl, priority);
              
              if (mounted) {
                setLoadedPages(i + 1);
                setProgress(prev => Math.min(prev + progressStep, 80));
              }
            } catch (error) {
              // Continua anche se preload fallisce
              if (mounted) {
                setLoadedPages(i + 1);
                setProgress(prev => Math.min(prev + progressStep, 80));
              }
            }
          }
        }
      } else {
        // Fallback: simula loading se no pages
        const progressStep = 60 / preloadFirstPages;
        for (let i = 0; i < preloadFirstPages; i++) {
          if (!mounted) return;
          await new Promise(resolve => setTimeout(resolve, 400));
          setLoadedPages(i + 1);
          setProgress(prev => Math.min(prev + progressStep, 80));
        }
      }
      
      // Stage 3: Ready (80-100%)
      setStage('ready');
      setProgress(85);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      if (!mounted) return;
      
      setProgress(95);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      if (!mounted) return;
      
      setProgress(100);
      
      // Aspetta minimo delay
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDelay - elapsed);
      
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }
      
      if (!mounted) return;
      
      // Completa
      setTimeout(() => {
        if (mounted && onLoadComplete) {
          onLoadComplete();
        }
      }, 300);
    };

    startLoading();

    return () => {
      mounted = false;
    };
  }, [chapterPages, minDelay, preloadFirstPages, onLoadComplete]);

  const getStageText = () => {
    switch (stage) {
      case 'preparing':
        return 'Preparazione capitolo...';
      case 'loading':
        return `Caricamento pagine... (${loadedPages}/${preloadFirstPages})`;
      case 'ready':
        return 'Quasi pronto...';
      default:
        return 'Caricamento...';
    }
  };

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
        {/* Icon animato */}
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

        {/* Titolo capitolo */}
        <VStack spacing={2} textAlign="center">
          <Text fontSize="xl" fontWeight="bold" color="white">
            {chapterTitle || 'Caricamento Capitolo'}
          </Text>
          
          <Text fontSize="sm" color="gray.400">
            {getStageText()}
          </Text>
        </VStack>

        {/* Progress bar */}
        <Box width="100%" maxW="300px">
          <Progress
            value={progress}
            size="sm"
            colorScheme="purple"
            borderRadius="full"
            hasStripe
            isAnimated
            sx={{
              '& > div': {
                transition: 'width 0.3s ease-out'
              }
            }}
          />
          
          <HStack justify="space-between" mt={2}>
            <Text fontSize="xs" color="gray.500">
              {progress.toFixed(0)}%
            </Text>
            <Text fontSize="xs" color="gray.500">
              {totalPages ? `${totalPages} pagine` : ''}
            </Text>
          </HStack>
        </Box>

        {/* Checklist visual */}
        <VStack spacing={2} align="start" fontSize="sm" color="gray.400" w="full">
          <HStack>
            <Icon 
              as={stage !== 'preparing' ? FaCheck : Spinner} 
              color={stage !== 'preparing' ? 'green.400' : 'gray.400'} 
              boxSize={4}
            />
            <Text>Preparazione interfaccia</Text>
          </HStack>
          
          <HStack>
            <Icon 
              as={stage === 'ready' ? FaCheck : stage === 'loading' ? Spinner : Box} 
              color={stage === 'ready' ? 'green.400' : 'gray.400'} 
              boxSize={4}
            />
            <Text>Precaricamento immagini</Text>
          </HStack>
          
          <HStack>
            <Icon 
              as={progress === 100 ? FaCheck : Box} 
              color={progress === 100 ? 'green.400' : 'gray.400'} 
              boxSize={4}
            />
            <Text>Ottimizzazione rendering</Text>
          </HStack>
        </VStack>
      </VStack>

      {/* Animazioni CSS */}
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

