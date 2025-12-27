// @ts-nocheck - Legacy component, needs gradual refactoring
/* eslint-disable @typescript-eslint/no-explicit-any */
// ✅ SEZIONE 3.3: Empty States Personalizzati - Illustrazioni SVG migliorate
import React from 'react';
import { Box, VStack, Text, Button, Icon } from '@chakra-ui/react';
import {
  FaBook, FaSearch, FaBookmark, FaDownload, FaBell,
  FaInbox, FaExclamationTriangle, FaHeart, FaList, FaHistory
} from 'react-icons/fa';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

const icons = {
  book: FaBook,
  search: FaSearch,
  bookmark: FaBookmark,
  download: FaDownload,
  bell: FaBell,
  inbox: FaInbox,
  error: FaExclamationTriangle,
  heart: FaHeart,
  list: FaList,
  history: FaHistory
};

const colors = {
  book: 'blue',
  search: 'purple',
  bookmark: 'yellow',
  download: 'green',
  bell: 'orange',
  inbox: 'gray',
  error: 'red',
  heart: 'pink',
  list: 'cyan',
  history: 'teal'
};

// ✅ Illustrazioni SVG migliorate con animazioni
const EmptyStateIllustration = ({ icon, color }) => {
  const IconComponent = icons[icon] || icons.inbox;
  const colorScheme = colors[icon] || colors.inbox;
  
  return (
    <MotionBox
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      display="inline-flex"
    >
      <Box
        position="relative"
        p={8}
        bgGradient={`linear(to-br, ${colorScheme}.900, ${colorScheme}.700)`}
        borderRadius="full"
        boxShadow="0 0 60px rgba(128, 90, 213, 0.3)"
        sx={{
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-10px',
            left: '-10px',
            right: '-10px',
            bottom: '-10px',
            borderRadius: 'full',
            bgGradient: `radial(circle, ${colorScheme}.500, transparent)`,
            opacity: 0.2,
            filter: 'blur(20px)',
            zIndex: -1,
            animation: 'pulse-glow 3s ease-in-out infinite'
          }
        }}
      >
        <Icon as={IconComponent} boxSize={20} color="white" />
      </Box>
    </MotionBox>
  );
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
  
  // Default variant - ✅ SEZIONE 3.3: Migliorato con illustrazioni animate
  return (
    <Box 
      bg="gray.800" 
      borderRadius="xl" 
      py={20} 
      px={6}
      textAlign="center"
      border="1px solid"
      borderColor="gray.700"
      boxShadow="lg"
    >
      <VStack spacing={8}>
        {/* ✅ Illustrazione animata migliorata */}
        <EmptyStateIllustration icon={icon} color={color} />
        
        <VStack spacing={3}>
          <Text fontSize="2xl" fontWeight="bold" color="gray.200">
            {title}
          </Text>
          <Text fontSize="md" color="gray.400" maxW="450px" lineHeight="tall">
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
            px={8}
            py={6}
            fontSize="md"
            fontWeight="semibold"
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: '0 10px 25px -5px rgba(128, 90, 213, 0.4)'
            }}
            transition="all 0.2s"
          >
            {actionLabel}
          </Button>
        )}
      </VStack>

      {/* CSS Animations */}
      <style>
        {`
          @keyframes pulse-glow {
            0%, 100% {
              opacity: 0.2;
              transform: scale(1);
            }
            50% {
              opacity: 0.4;
              transform: scale(1.1);
            }
          }
        `}
      </style>
    </Box>
  );
};

export default EmptyState;

