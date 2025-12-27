/**
 * INFINITE SCROLL LOADER - Elegant loading indicator for infinite scroll
 * ✅ SEZIONE 3.4: Infinite Scroll Migliorato
 */

import { Box, VStack, Text } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

interface InfiniteScrollLoaderProps {
  message?: string;
}

const InfiniteScrollLoader = ({ message = 'Caricamento...' }: InfiniteScrollLoaderProps) => {
  return (
    <Box py={8} w="100%">
      <VStack spacing={4}>
        {/* Animated spinner with gradient */}
        <Box position="relative" w="48px" h="48px">
          <Box
            position="absolute"
            inset={0}
            border="4px solid"
            borderColor="purple.900"
            borderRadius="full"
          />
          <Box
            position="absolute"
            inset={0}
            border="4px solid"
            borderTopColor="purple.500"
            borderRightColor="purple.500"
            borderRadius="full"
            sx={{
              animation: `${spin} 1s linear infinite`,
            }}
          />
          <Box
            position="absolute"
            inset="30%"
            border="3px solid"
            borderColor="pink.900"
            borderRadius="full"
          />
          <Box
            position="absolute"
            inset="30%"
            border="3px solid"
            borderTopColor="pink.500"
            borderRightColor="pink.500"
            borderRadius="full"
            sx={{
              animation: `${spin} 0.7s linear infinite reverse`,
            }}
          />
        </Box>

        <Text
          fontSize="sm"
          color="gray.400"
          fontWeight="medium"
          sx={{
            animation: `${pulse} 2s ease-in-out infinite`,
          }}
        >
          {message}
        </Text>
      </VStack>
    </Box>
  );
};

export default InfiniteScrollLoader;

