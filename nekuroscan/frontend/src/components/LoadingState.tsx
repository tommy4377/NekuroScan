// @ts-nocheck - Legacy component, needs gradual refactoring
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
// 🎨 LOADING STATE - Stati caricamento personalizzati
import React from 'react';
import { Box, VStack, Spinner, Text, Progress } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const LoadingSpinner = ({ message = 'Caricamento...', size = 'xl', showProgress = false, progress = 0 }) => {
  return (
    <VStack spacing={6}>
      <Box
        position="relative"
        w={size === 'xl' ? '80px' : '40px'}
        h={size === 'xl' ? '80px' : '40px'}
      >
        <Box
          position="absolute"
          inset={0}
          border="4px solid"
          borderColor="purple.200"
          borderRadius="full"
          animation={`${rotate} 1s linear infinite`}
          borderTopColor="purple.500"
        />
        <Box
          position="absolute"
          inset="10%"
          border="4px solid"
          borderColor="pink.200"
          borderRadius="full"
          animation={`${rotate} 0.7s linear infinite reverse`}
          borderTopColor="pink.500"
        />
      </Box>
      
      <VStack spacing={2}>
        <Text
          color="white"
          fontSize={size === 'xl' ? 'lg' : 'md'}
          fontWeight="bold"
          animation={`${pulse} 2s ease-in-out infinite`}
        >
          {message}
        </Text>
        
        {showProgress && (
          <Box w="200px">
            <Progress
              value={progress}
              size="sm"
              colorScheme="purple"
              borderRadius="full"
              hasStripe
              isAnimated
            />
            <Text fontSize="xs" color="gray.400" textAlign="center" mt={1}>
              {progress}%
            </Text>
          </Box>
        )}
      </VStack>
    </VStack>
  );
};

export const LoadingGrid = ({ count = 20, columns = { base: 2, md: 3, lg: 5 } }) => {
  const { SimpleGrid, Skeleton } = require('@chakra-ui/react');
  
  return (
    <SimpleGrid columns={columns} spacing={4}>
      {[...Array(count)].map((_, i) => (
        <Skeleton
          key={i}
          height="280px"
          borderRadius="lg"
          startColor="gray.800"
          endColor="gray.700"
          // ✅ SEZIONE 1: Shimmer animation già applicata via theme
        />
      ))}
    </SimpleGrid>
  );
};

export default LoadingSpinner;

