// 📥 DOWNLOADS.JSX - Gestione Capitoli Offline
import React, { useState, useEffect } from 'react';
import {
  Container, VStack, HStack, Heading, Text, Box, Button,
  SimpleGrid, Badge, IconButton, useToast, Progress,
  Alert, AlertIcon, AlertTitle, AlertDescription, Center,
  Spinner, Stat, StatLabel, StatNumber, StatHelpText, Card,
  CardBody, Image, Divider, useDisclosure, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton
} from '@chakra-ui/react';
import { FaDownload, FaTrash, FaBook, FaDatabase, FaCheckCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import offlineManager from '../utils/offlineManager';

function Downloads() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storageInfo, setStorageInfo] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);

  useEffect(() => {
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    try {
      setLoading(true);
      const [chapters, storage] = await Promise.all([
        offlineManager.getAllDownloaded(),
        offlineManager.getStorageInfo()
      ]);
      
      setDownloads(chapters.sort((a, b) => 
        new Date(b.downloadDate) - new Date(a.downloadDate)
      ));
      setStorageInfo(storage);
    } catch (error) {
      console.error('Error loading downloads:', error);
      toast({
        title: 'Errore caricamento',
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteChapter = async (chapter) => {
    try {
      const result = await offlineManager.deleteChapter(chapter.id);
      
      if (result.success) {
        toast({
          title: 'Capitolo eliminato',
          description: `${result.deletedImages} immagini rimosse`,
          status: 'success',
          duration: 2000
        });
        loadDownloads();
      }
    } catch (error) {
      toast({
        title: 'Errore eliminazione',
        status: 'error',
        duration: 3000
      });
    }
    onClose();
  };

  const clearAll = async () => {
    try {
      await offlineManager.clearAll();
      toast({
        title: 'Tutto eliminato',
        description: 'Tutti i capitoli offline sono stati rimossi',
        status: 'success',
        duration: 3000
      });
      loadDownloads();
    } catch (error) {
      toast({
        title: 'Errore',
        status: 'error',
        duration: 3000
      });
    }
    onClose();
  };

  const openDeleteModal = (chapter) => {
    setSelectedChapter(chapter);
    onOpen();
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={20}>
        <Center>
          <Spinner size="xl" color="purple.500" />
        </Center>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        
        {/* Header */}
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <VStack align="start" spacing={1}>
            <Heading size="xl">📥 Download Offline</Heading>
            <Text color="gray.400">
              Leggi i tuoi manga anche senza connessione
            </Text>
          </VStack>

          {downloads.length > 0 && (
            <Button
              colorScheme="red"
              variant="outline"
              size="sm"
              leftIcon={<FaTrash />}
              onClick={() => {
                setSelectedChapter(null);
                onOpen();
              }}
            >
              Elimina tutto
            </Button>
          )}
        </HStack>

        {/* Storage Info */}
        {storageInfo && (
          <Card bg="gray.800">
            <CardBody>
              <HStack justify="space-between" flexWrap="wrap" gap={4}>
                <Stat>
                  <StatLabel>
                    <HStack>
                      <FaDatabase />
                      <Text>Spazio Utilizzato</Text>
                    </HStack>
                  </StatLabel>
                  <StatNumber>{storageInfo.usedMB} MB</StatNumber>
                  <StatHelpText>di {storageInfo.quotaMB} MB disponibili</StatHelpText>
                </Stat>

                <Box w={{ base: '100%', md: '300px' }}>
                  <Text fontSize="sm" color="gray.400" mb={2}>
                    {storageInfo.percentage}% utilizzato
                  </Text>
                  <Progress
                    value={parseFloat(storageInfo.percentage)}
                    colorScheme={parseFloat(storageInfo.percentage) > 80 ? 'red' : 'purple'}
                    size="lg"
                    borderRadius="full"
                  />
                </Box>
              </HStack>
            </CardBody>
          </Card>
        )}

        {/* Alert Info */}
        <Alert status="info" borderRadius="lg">
          <AlertIcon />
          <Box>
            <AlertTitle>Come funziona</AlertTitle>
            <AlertDescription>
              Vai alla pagina di un manga e scarica i capitoli che vuoi leggere offline. 
              I capitoli saranno disponibili anche senza connessione!
            </AlertDescription>
          </Box>
        </Alert>

        {/* Lista Download */}
        {downloads.length > 0 ? (
          <>
            <HStack justify="space-between">
              <Heading size="md">
                Capitoli Scaricati ({downloads.length})
              </Heading>
              <Badge colorScheme="green" fontSize="md" p={2}>
                {downloads.reduce((sum, d) => sum + d.size, 0)} pagine totali
              </Badge>
            </HStack>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {downloads.map((chapter) => (
                <Card
                  key={chapter.id}
                  bg="gray.800"
                  borderRadius="lg"
                  overflow="hidden"
                  transition="all 0.2s"
                  _hover={{ transform: 'translateY(-4px)', boxShadow: 'xl' }}
                >
                  <CardBody p={0}>
                    <HStack spacing={0} align="stretch">
                      {/* Cover */}
                      {chapter.mangaCover && (
                        <Image
                          src={chapter.mangaCover}
                          alt={chapter.mangaTitle}
                          w="80px"
                          h="120px"
                          objectFit="cover"
                          fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='120'%3E%3Crect fill='%23333' width='80' height='120'/%3E%3C/svg%3E"
                        />
                      )}

                      {/* Info */}
                      <VStack align="start" p={3} spacing={2} flex="1">
                        <Text fontWeight="bold" fontSize="sm" noOfLines={1}>
                          {chapter.mangaTitle}
                        </Text>
                        <Badge colorScheme="purple" fontSize="xs">
                          {chapter.chapterTitle}
                        </Badge>
                        <HStack spacing={2}>
                          <Badge colorScheme="green" fontSize="xs">
                            <HStack spacing={1}>
                              <FaCheckCircle size={10} />
                              <Text>{chapter.size} pagine</Text>
                            </HStack>
                          </Badge>
                        </HStack>
                        <Text fontSize="xs" color="gray.400">
                          {new Date(chapter.downloadDate).toLocaleDateString()}
                        </Text>

                        {/* Actions */}
                        <HStack spacing={2} w="100%">
                          <Button
                            size="xs"
                            colorScheme="purple"
                            leftIcon={<FaBook />}
                            onClick={() => {
                              const encodedManga = btoa(chapter.mangaUrl);
                              const encodedChapter = btoa(chapter.chapterUrl);
                              navigate(`/read/${chapter.source}/${encodedManga}/${encodedChapter}?chapter=${chapter.chapterIndex}`);
                            }}
                            flex="1"
                          >
                            Leggi
                          </Button>
                          <IconButton
                            size="xs"
                            colorScheme="red"
                            variant="ghost"
                            icon={<FaTrash />}
                            onClick={() => openDeleteModal(chapter)}
                            aria-label="Elimina"
                          />
                        </HStack>
                      </VStack>
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </>
        ) : (
          <Center py={20} bg="gray.800" borderRadius="xl">
            <VStack spacing={6}>
              <Box p={6} bg="purple.900" borderRadius="full">
                <FaDownload size={60} color="var(--chakra-colors-purple-300)" />
              </Box>
              <VStack spacing={2}>
                <Text fontSize="xl" fontWeight="bold" color="gray.300">
                  Nessun capitolo scaricato
                </Text>
                <Text fontSize="md" color="gray.500" textAlign="center" maxW="400px">
                  Scarica capitoli dalla pagina del manga per leggerli offline
                </Text>
              </VStack>
              <Button
                colorScheme="purple"
                onClick={() => navigate('/home')}
                leftIcon={<FaBook />}
              >
                Esplora manga
              </Button>
            </VStack>
          </Center>
        )}

      </VStack>

      {/* Modal Conferma */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent bg="gray.800">
          <ModalHeader>
            {selectedChapter ? 'Elimina Capitolo' : 'Elimina Tutto'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedChapter ? (
              <Text>
                Vuoi eliminare "{selectedChapter.mangaTitle} - {selectedChapter.chapterTitle}"?
              </Text>
            ) : (
              <Text>
                Vuoi eliminare tutti i {downloads.length} capitoli scaricati?
              </Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Annulla
            </Button>
            <Button
              colorScheme="red"
              onClick={() => selectedChapter ? deleteChapter(selectedChapter) : clearAll()}
            >
              Elimina
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}

export default Downloads;

