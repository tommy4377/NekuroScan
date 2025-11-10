// Componente per mostrare quando utente è bannato per troppe richieste
import React, { useEffect, useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Text, VStack, Icon, Badge, HStack, Code, Progress
} from '@chakra-ui/react';
import { FaBan, FaClock, FaExclamationTriangle } from 'react-icons/fa';

const BannedNotice = ({ isOpen, onClose, retryAfter, reason = 'rate-limit' }) => {
  const [countdown, setCountdown] = useState(retryAfter || 60);

  useEffect(() => {
    if (!isOpen || countdown <= 0) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          window.location.reload(); // Ricarica per testare
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, countdown, onClose]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const progressPercent = retryAfter > 0 ? ((retryAfter - countdown) / retryAfter) * 100 : 0;

  return (
    <Modal isOpen={isOpen} onClose={() => {}} isCentered closeOnOverlayClick={false} closeOnEsc={false}>
      <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(10px)" />
      <ModalContent 
        bg="gray.800" 
        borderRadius="xl" 
        boxShadow="2xl" 
        mx={4}
        my={4}
        sx={{
          '@media (max-width: 768px)': {
            marginTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
            marginBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
          }
        }}
      >
        <ModalHeader 
          pt="calc(1.5rem + env(safe-area-inset-top, 0px))"
        >
          <VStack spacing={3} align="center">
            <Icon 
              as={FaBan} 
              boxSize={16} 
              color="red.500"
              animation="pulse 2s ease-in-out infinite"
              style={{
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 }
                }
              }}
            />
            <Text fontSize="2xl" fontWeight="bold" color="white">
              Troppe Richieste
            </Text>
          </VStack>
        </ModalHeader>

        <ModalBody pb={6}>
          <VStack spacing={5} align="stretch">
            <Badge 
              colorScheme="red" 
              fontSize="md" 
              p={3} 
              borderRadius="lg"
              textAlign="center"
            >
              <HStack justify="center" spacing={2}>
                <Icon as={FaExclamationTriangle} />
                <Text>
                  {reason === 'burst' 
                    ? 'Rilevato burst di richieste troppo rapide' 
                    : 'Limite richieste raggiunto per questo minuto'
                  }
                </Text>
              </HStack>
            </Badge>

            <VStack spacing={2} bg="gray.700" p={4} borderRadius="lg">
              <HStack spacing={2}>
                <Icon as={FaClock} color="orange.400" />
                <Text color="white" fontWeight="bold">
                  Riprova tra:
                </Text>
              </HStack>
              <Text fontSize="3xl" fontWeight="bold" color="orange.400">
                {formatTime(countdown)}
              </Text>
              <Progress 
                value={progressPercent} 
                size="sm" 
                colorScheme="orange" 
                w="100%" 
                borderRadius="full"
                bg="gray.600"
              />
            </VStack>

            <VStack spacing={2} align="start" p={4} bg="blue.900" borderRadius="lg" borderLeft="4px solid" borderColor="blue.500">
              <Text fontSize="sm" color="blue.200" fontWeight="bold">
                💡 Perché è successo?
              </Text>
              <Text fontSize="xs" color="blue.100">
                Il sistema ha rilevato troppe richieste dal tuo IP in poco tempo.
                Questo è normale se hai aggiornato la pagina molte volte o aperto tanti manga contemporaneamente.
              </Text>
            </VStack>

            <VStack spacing={2} align="start" p={4} bg="green.900" borderRadius="lg" borderLeft="4px solid" borderColor="green.500">
              <Text fontSize="sm" color="green.200" fontWeight="bold">
                ✅ Come evitarlo in futuro
              </Text>
              <Text fontSize="xs" color="green.100">
                • Evita di aggiornare la pagina ripetutamente<br/>
                • Non aprire troppi manga in parallelo<br/>
                • Attendi qualche secondo tra un'azione e l'altra
              </Text>
            </VStack>

            {reason === 'blacklisted' && (
              <VStack spacing={2} align="start" p={4} bg="red.900" borderRadius="lg" borderLeft="4px solid" borderColor="red.500">
                <Text fontSize="sm" color="red.200" fontWeight="bold">
                  🚨 Ban Temporaneo
                </Text>
                <Text fontSize="xs" color="red.100">
                  Il tuo IP è stato temporaneamente bloccato per violazioni ripetute del limite.
                  Il ban scadrà automaticamente tra {formatTime(countdown)}.
                </Text>
              </VStack>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter
          pb="calc(1rem + env(safe-area-inset-bottom, 0px))"
        >
          <Button 
            colorScheme="orange" 
            variant="ghost" 
            size="sm"
            isDisabled
            rightIcon={<FaClock />}
          >
            Attendi {formatTime(countdown)}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default BannedNotice;

