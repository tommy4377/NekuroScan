// 🎨 EMPTY STATE - Stati vuoti migliorati
import React from 'react';
import { Box, VStack, Text, Button, Icon } from '@chakra-ui/react';
import {
  FaBook, FaSearch, FaBookmark, FaDownload, FaBell,
  FaInbox, FaExclamationTriangle
} from 'react-icons/fa';

const icons = {
  book: FaBook,
  search: FaSearch,
  bookmark: FaBookmark,
  download: FaDownload,
  bell: FaBell,
  inbox: FaInbox,
  error: FaExclamationTriangle
};

const colors = {
  book: 'blue',
  search: 'purple',
  bookmark: 'yellow',
  download: 'green',
  bell: 'orange',
  inbox: 'gray',
  error: 'red'
};

export const EmptyState = ({
  icon = 'inbox',
  title = 'Nessun contenuto',
  description = 'Non ci sono elementi da mostrare',
  actionLabel = null,
  onAction = null,
  variant = 'default' // default, compact, minimal
}) => {
  const IconComponent = icons[icon] || icons.inbox;
  const color = colors[icon] || colors.inbox;
  
  if (variant === 'minimal') {
    return (
      <Box textAlign="center" py={8}>
        <Text color="gray.500" fontSize="md">{title}</Text>
      </Box>
    );
  }
  
  if (variant === 'compact') {
    return (
      <VStack spacing={4} py={12}>
        <Icon as={IconComponent} boxSize={12} color={`${color}.400`} />
        <Text fontSize="lg" fontWeight="bold" color="gray.300">{title}</Text>
        {actionLabel && onAction && (
          <Button colorScheme={color} size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </VStack>
    );
  }
  
  // Default variant
  return (
    <Box bg="gray.800" borderRadius="xl" py={20} textAlign="center">
      <VStack spacing={6}>
        <Box
          p={6}
          bg={`${color}.900`}
          borderRadius="full"
          display="inline-flex"
        >
          <Icon as={IconComponent} boxSize={16} color={`${color}.300`} />
        </Box>
        
        <VStack spacing={2}>
          <Text fontSize="2xl" fontWeight="bold" color="gray.300">
            {title}
          </Text>
          <Text fontSize="md" color="gray.500" maxW="400px">
            {description}
          </Text>
        </VStack>
        
        {actionLabel && onAction && (
          <Button
            colorScheme={color}
            size="lg"
            onClick={onAction}
            leftIcon={<IconComponent />}
            mt={4}
          >
            {actionLabel}
          </Button>
        )}
      </VStack>
    </Box>
  );
};

export default EmptyState;

