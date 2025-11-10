// ✅ ChapterLoadingScreen - Loading con VERO preload
import React, { useEffect, useState } from 'react';
import { Box, VStack, Text, Progress, Spinner, HStack, Icon } from '@chakra-ui/react';
import { FaBook, FaCheck } from 'react-icons/fa';
import useChapterPreload from '../hooks/useChapterPreload';

const ChapterLoadingScreen = ({ 
  chapterTitle,
  chapterPages = [],
  currentPage = 1,
  totalPages = 0,
  onLoadComplete,
  minDelay = 3000
}) => {
  const [stage, setStage] = useState('preparing');
  const [canComplete, setCanComplete] = useState(false);
  
  // Hook per preload REALE
  const { progress: preloadProgress, loadedCount, isComplete: preloadComplete, totalToLoad } = useChapterPreload(chapterPages, true);

  useEffect(() => {
    let mounted = true;
    const startTime = Date.now();

    const checkCompletion = async () => {
      // Stage 1: Preparing (attende 500ms minimo)
      setStage('preparing');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!mounted) return;
      setStage('loading');
      
      // Aspetta che il preload sia completo E che il minDelay sia trascorso
      const checkInterval = setInterval(() => {
        if (!mounted) {
          clearInterval(checkInterval);
          return;
        }

        const elapsed = Date.now() - startTime;
        const minDelayPassed = elapsed >= minDelay;
        
        if (preloadComplete && minDelayPassed) {
          clearInterval(checkInterval);
          setStage('ready');
          setCanComplete(true);
          
          // Attendi 300ms prima di completare per transizione smooth
          setTimeout(() => {
            if (mounted && onLoadComplete) {
              onLoadComplete();
            }
          }, 300);
        }
      }, 100);

      return () => {
        clearInterval(checkInterval);
      };
    };

    checkCompletion();

    return () => {
      mounted = false;
    };
  }, [preloadComplete, minDelay, onLoadComplete]);

  const getStageText = () => {
    switch (stage) {
      case 'preparing':
        return 'Preparazione interfaccia...';
      case 'loading':
        return `Precaricamento immagini... (${loadedCount}/${totalToLoad})`;
      case 'ready':
        return 'Ottimizzazione completata!';
      default:
        return 'Caricamento...';
    }
  };
  
  // Calcola progress totale (20% preparing, 70% loading, 10% ready)
  const totalProgress = stage === 'preparing' ? 20 : 
                       stage === 'loading' ? 20 + (preloadProgress * 0.7) :
                       stage === 'ready' ? 100 : 0;

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
            value={totalProgress}
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
              {Math.round(totalProgress)}%
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
              color={stage !== 'preparing' ? 'green.400' : 'purple.400'} 
              boxSize={4}
            />
            <Text color={stage !== 'preparing' ? 'gray.300' : 'white'}>
              Preparazione interfaccia
            </Text>
          </HStack>
          
          <HStack>
            <Icon 
              as={stage === 'ready' ? FaCheck : stage === 'loading' ? Spinner : Box} 
              color={stage === 'ready' ? 'green.400' : stage === 'loading' ? 'purple.400' : 'gray.500'} 
              boxSize={4}
            />
            <Text color={stage === 'loading' || stage === 'ready' ? 'white' : 'gray.500'}>
              Precaricamento immagini ({loadedCount}/{totalToLoad})
            </Text>
          </HStack>
          
          <HStack>
            <Icon 
              as={canComplete ? FaCheck : Box} 
              color={canComplete ? 'green.400' : 'gray.500'} 
              boxSize={4}
            />
            <Text color={canComplete ? 'gray.300' : 'gray.500'}>
              Ottimizzazione rendering
            </Text>
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

