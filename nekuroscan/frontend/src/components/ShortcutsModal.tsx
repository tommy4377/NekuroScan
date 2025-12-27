/**
 * SHORTCUTS MODAL - Modal con lista keyboard shortcuts
 * ✅ SEZIONE 2: Keyboard Shortcuts
 */

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Box,
  Divider,
  Kbd
} from '@chakra-ui/react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isReaderPage?: boolean;
}

const ShortcutsModal = ({ isOpen, onClose, isReaderPage = false }: ShortcutsModalProps) => {
  const globalShortcuts = [
    { keys: ['Ctrl', 'K'], description: 'Focus ricerca' },
    { keys: ['Ctrl', 'B'], description: 'Vai alla libreria' },
    { keys: ['?'], description: 'Mostra questa lista shortcuts' },
  ];

  const readerShortcuts = [
    { keys: ['Space'], description: 'Prossima pagina' },
    { keys: ['→'], description: 'Prossima pagina' },
    { keys: ['←'], description: 'Pagina precedente' },
    { keys: ['A', 'D'], description: 'Naviga pagine (A: prev, D: next)' },
    { keys: ['F'], description: 'Toggle fullscreen' },
    { keys: ['Esc'], description: 'Chiudi modal/ritorna al manga' },
  ];

  const ShortcutItem = ({ keys, description }: { keys: string[], description: string }) => (
    <HStack justify="space-between" w="100%" py={2}>
      <HStack spacing={2}>
        {keys.map((key, idx) => (
          <HStack key={idx} spacing={1}>
            <Kbd fontSize="sm">{key}</Kbd>
            {idx < keys.length - 1 && <Text fontSize="sm" color="gray.500">+</Text>}
          </HStack>
        ))}
      </HStack>
      <Text fontSize="sm" color="gray.300" flex={1} ml={4} textAlign="right">
        {description}
      </Text>
    </HStack>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent bg="gray.800" border="1px solid" borderColor="gray.700">
        <ModalHeader>
          <Text fontSize="xl" fontWeight="bold">Keyboard Shortcuts</Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            {/* Reader Shortcuts */}
            {isReaderPage && (
              <>
                <Box>
                  <Text fontSize="md" fontWeight="semibold" mb={3} color="purple.300">
                    📖 Nel Reader
                  </Text>
                  <VStack spacing={0} align="stretch">
                    {readerShortcuts.map((shortcut, idx) => (
                      <ShortcutItem key={idx} keys={shortcut.keys} description={shortcut.description} />
                    ))}
                  </VStack>
                </Box>
                <Divider />
              </>
            )}

            {/* Global Shortcuts */}
            <Box>
              <Text fontSize="md" fontWeight="semibold" mb={3} color="purple.300">
                🌐 Globali
              </Text>
              <VStack spacing={0} align="stretch">
                {globalShortcuts.map((shortcut, idx) => (
                  <ShortcutItem key={idx} keys={shortcut.keys} description={shortcut.description} />
                ))}
              </VStack>
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ShortcutsModal;

