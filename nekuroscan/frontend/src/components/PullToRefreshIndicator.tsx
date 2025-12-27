/**
 * PULL TO REFRESH INDICATOR - Visual indicator per pull to refresh
 * ✅ SEZIONE 4.3: Touch Gestures - Pull to refresh
 */

import { Box, Spinner, Text, VStack } from '@chakra-ui/react';
import { FaArrowDown } from 'react-icons/fa';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

const PullToRefreshIndicator = ({ 
  pullDistance, 
  isRefreshing, 
  threshold = 80 
}: PullToRefreshIndicatorProps) => {
  const progress = Math.min(pullDistance / threshold, 1);
  const shouldShow = pullDistance > 0 || isRefreshing;

  if (!shouldShow) return null;

  return (
    <Box
      position="fixed"
      top={0}
      left="50%"
      transform="translateX(-50%)"
      zIndex={10000}
      mt={4}
      opacity={Math.min(progress * 1.5, 1)}
      transition="opacity 0.2s"
      pointerEvents="none"
    >
      <VStack spacing={2}>
        {isRefreshing ? (
          <>
            <Spinner size="lg" color="purple.500" thickness="3px" speed="0.8s" />
            <Text fontSize="xs" color="purple.300" fontWeight="medium">
              Aggiornamento...
            </Text>
          </>
        ) : (
          <>
            <Box
              transform={`rotate(${progress * 180}deg) scale(${0.8 + progress * 0.2})`}
              transition="transform 0.2s"
            >
              <FaArrowDown color="var(--chakra-colors-purple-400)" size={24} />
            </Box>
            {progress >= 1 && (
              <Text fontSize="xs" color="purple.300" fontWeight="medium">
                Rilascia per aggiornare
              </Text>
            )}
          </>
        )}
      </VStack>
    </Box>
  );
};

export default PullToRefreshIndicator;

