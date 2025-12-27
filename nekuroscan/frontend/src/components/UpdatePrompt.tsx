/**
 * UPDATE PROMPT - Elegant service worker update notification
 * ✅ SEZIONE 4.2: Service Worker Migliorato - Update prompt elegante
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  HStack,
  Text,
  VStack,
  IconButton,
  useToast
} from '@chakra-ui/react';
import { FaSync, FaTimes } from 'react-icons/fa';

interface UpdatePromptProps {
  onUpdate: () => void;
  onDismiss?: () => void;
}

const UpdatePrompt = ({ onUpdate, onDismiss }: UpdatePromptProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // Check for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // New service worker activated
        setIsVisible(true);
      });

      // Check for updates periodically
      const checkForUpdates = async () => {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await registration.update();
          }
        } catch (error) {
          // Silent fail
        }
      };

      // Check every 30 minutes
      const interval = setInterval(checkForUpdates, 30 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, []);

  const handleUpdate = () => {
    onUpdate();
    setIsVisible(false);
    toast({
      title: 'Aggiornamento in corso...',
      description: 'La pagina verrà ricaricata',
      status: 'info',
      duration: 2000
    });
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <Box
      position="fixed"
      bottom={4}
      left="50%"
      transform="translateX(-50%)"
      bg="gray.800"
      border="1px solid"
      borderColor="purple.500"
      borderRadius="xl"
      p={4}
      boxShadow="2xl"
      zIndex={9999}
      maxW="400px"
      w="90%"
      backdropFilter="blur(10px)"
      sx={{
        animation: 'slideUp 0.3s ease-out',
        '@keyframes slideUp': {
          from: {
            transform: 'translateX(-50%) translateY(100px)',
            opacity: 0
          },
          to: {
            transform: 'translateX(-50%) translateY(0)',
            opacity: 1
          }
        }
      }}
    >
      <VStack spacing={3} align="stretch">
        <HStack justify="space-between">
          <HStack spacing={2}>
            <FaSync color="var(--chakra-colors-purple-400)" />
            <Text fontWeight="bold" fontSize="sm">
              Nuova versione disponibile
            </Text>
          </HStack>
          <IconButton
            icon={<FaTimes />}
            aria-label="Chiudi"
            size="xs"
            variant="ghost"
            onClick={handleDismiss}
          />
        </HStack>
        <Text fontSize="xs" color="gray.400">
          Aggiorna per ottenere le ultime funzionalità e miglioramenti
        </Text>
        <HStack spacing={2}>
          <Button
            size="sm"
            colorScheme="purple"
            leftIcon={<FaSync />}
            onClick={handleUpdate}
            flex={1}
          >
            Aggiorna ora
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
          >
            Più tardi
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default UpdatePrompt;

