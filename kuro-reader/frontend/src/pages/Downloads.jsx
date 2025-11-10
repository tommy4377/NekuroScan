// 📥 DOWNLOADS.JSX v2.0 - Raggruppamento per Manga
import React, { useState, useEffect } from 'react';
import {
  Container, VStack, HStack, Heading, Text, Box, Button,
  SimpleGrid, Badge, IconButton, useToast, Progress,
  Alert, AlertIcon, AlertTitle, AlertDescription, Center,
  Spinner, Stat, StatLabel, StatNumber, StatHelpText, Card,
  CardBody, Image, Divider, useDisclosure, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
  Wrap, WrapItem
} from '@chakra-ui/react';
import { FaDownload, FaTrash, FaBook, FaDatabase, FaCheckCircle, FaChevronDown } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import offlineManager from '../utils/offlineManager';

function Downloads() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const [downloads, setDownloads] = useState([]);
  const [groupedDownloads, setGroupedDownloads] = useState({});
  const [loading, setLoading] = useState(true);
  const [storageInfo, setStorageInfo] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedManga, setSelectedManga] = useState(null);

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
      
      // Raggruppa per manga e recupera cover blob
      const grouped = {};
      for (const chapter of chapters) {
        const mangaUrl = chapter.mangaUrl;
        if (!grouped[mangaUrl]) {
          // Recupera cover blob se disponibile
          let coverUrl = chapter.mangaCover;
          try {
            const coverBlob = await offlineManager.getImage(`cover_${mangaUrl}`);
            if (coverBlob) {
              coverUrl = coverBlob;
              console.log(`✅ Cover blob recuperata per ${chapter.mangaTitle}`);
            }
          } catch (err) {
            console.log('Cover blob non trovata, uso URL originale');
          }
          
          grouped[mangaUrl] = {
            mangaUrl,
            mangaTitle: chapter.mangaTitle,
            mangaCover: coverUrl,
            chapters: [],
            totalPages: 0,
            lastDownload: chapter.downloadDate
          };
        }
        grouped[mangaUrl].chapters.push(chapter);
        grouped[mangaUrl].totalPages += chapter.size || 0;
        
        // Aggiorna ultima data download
        if (new Date(chapter.downloadDate) > new Date(grouped[mangaUrl].lastDownload)) {
          grouped[mangaUrl].lastDownload = chapter.downloadDate;
        }
      }
      
      // Ordina capitoli all'interno di ogni manga per numero
      Object.values(grouped).forEach(manga => {
        manga.chapters.sort((a, b) => {
          const numA = parseFloat(a.chapterTitle.match(/\d+(\.\d+)?/)?.[0] || '0');
          const numB = parseFloat(b.chapterTitle.match(/\d+(\.\d+)?/)?.[0] || '0');
          return numA - numB;
        });
      });
      
      setDownloads(chapters);
      setGroupedDownloads(grouped);
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

  const deleteManga = async (mangaUrl) => {
    try {
      const manga = groupedDownloads[mangaUrl];
      if (!manga) return;
      
      for (const chapter of manga.chapters) {
        await offlineManager.deleteChapter(chapter.id);
      }
      
      toast({
        title: 'Manga eliminato',
        description: `${manga.chapters.length} capitoli rimossi`,
        status: 'success',
        duration: 2000
      });
      loadDownloads();
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

  const openChapter = (chapter) => {
    const encodedManga = btoa(chapter.mangaUrl)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    const encodedChapter = btoa(chapter.chapterUrl)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    navigate(`/read/${chapter.source}/${encodedManga}/${encodedChapter}?chapter=${chapter.chapterIndex}`);
  };

  const openDeleteModal = (chapter, manga = null) => {
    setSelectedChapter(chapter);
    setSelectedManga(manga);
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

  const mangaCount = Object.keys(groupedDownloads).length;

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        
        {/* Header */}
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <VStack align="start" spacing={1}>
            <Heading size="xl">📥 Download Offline</Heading>
            <Text color="gray.400">
              {mangaCount} manga • {downloads.length} capitoli
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
                setSelectedManga(null);
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
        <Alert status="info" borderRadius="lg" bg="blue.900" borderColor="blue.700" border="1px solid">
          <AlertIcon />
          <Box>
            <AlertTitle>Come funziona</AlertTitle>
            <AlertDescription>
              Vai alla pagina di un manga e scarica i capitoli che vuoi leggere offline. 
              Saranno disponibili anche senza connessione!
            </AlertDescription>
          </Box>
        </Alert>

        {/* Lista Download Raggruppata */}
        {mangaCount > 0 ? (
          <>
            <Heading size="md">
              Manga Scaricati ({mangaCount})
            </Heading>

            <Accordion allowMultiple defaultIndex={[0]}>
              {Object.entries(groupedDownloads)
                .sort(([, a], [, b]) => new Date(b.lastDownload) - new Date(a.lastDownload))
                .map(([mangaUrl, manga]) => (
                <AccordionItem key={mangaUrl} border="none" mb={4}>
                  <Card bg="gray.800" borderRadius="xl" overflow="hidden">
                    <AccordionButton
                      p={0}
                      _hover={{ bg: 'transparent' }}
                      _expanded={{ bg: 'transparent' }}
                    >
                      <HStack 
                        w="100%" 
                        p={4} 
                        spacing={4} 
                        align="start"
                        transition="all 0.2s"
                        _hover={{ bg: 'gray.750' }}
                      >
                        {/* Cover */}
                        <Image
                          src={manga.mangaCover}
                          alt={manga.mangaTitle}
                          w="80px"
                          h="120px"
                          objectFit="cover"
                          borderRadius="md"
                          fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='120'%3E%3Crect fill='%23333' width='80' height='120'/%3E%3C/svg%3E"
                        />

                        {/* Info */}
                        <VStack align="start" spacing={2} flex="1">
                          <Heading size="md" noOfLines={2}>
                            {manga.mangaTitle}
                          </Heading>
                          
                          <HStack spacing={2} flexWrap="wrap">
                            <Badge colorScheme="purple" fontSize="sm">
                              {manga.chapters.length} {manga.chapters.length === 1 ? 'capitolo' : 'capitoli'}
                            </Badge>
                            <Badge colorScheme="green" fontSize="sm">
                              {manga.totalPages} pagine
                            </Badge>
                          </HStack>
                          
                          <Text fontSize="xs" color="gray.400">
                            Ultimo download: {new Date(manga.lastDownload).toLocaleDateString('it-IT')}
                          </Text>
                        </VStack>

                        {/* Actions */}
                        <VStack spacing={2}>
                          <IconButton
                            icon={<FaTrash />}
                            colorScheme="red"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteModal(null, manga);
                            }}
                            aria-label="Elimina manga"
                          />
                          <AccordionIcon />
                        </VStack>
                      </HStack>
                    </AccordionButton>

                    <AccordionPanel pb={4} pt={0}>
                      <Divider mb={4} />
                      <Wrap spacing={3}>
                        {manga.chapters.map((chapter) => {
                          // Estrai numero capitolo dal titolo O usa l'indice
                          let chapterNum = chapter.chapterTitle.match(/\d+(\.\d+)?/)?.[0];
                          
                          // Se non c'è numero nel titolo, usa l'indice del capitolo
                          if (!chapterNum && chapter.chapterIndex !== undefined) {
                            chapterNum = chapter.chapterIndex + 1;
                          }
                          
                          // Fallback a '?'
                          chapterNum = chapterNum || '?';
                          
                          return (
                            <WrapItem key={chapter.id}>
                              <Button
                                size="sm"
                                colorScheme="purple"
                                variant="outline"
                                onClick={() => openChapter(chapter)}
                                rightIcon={<FaBook />}
                                _hover={{
                                  bg: 'purple.900',
                                  transform: 'translateY(-2px)',
                                  boxShadow: 'md'
                                }}
                                transition="all 0.2s"
                              >
                                Cap. {chapterNum}
                                <Badge ml={2} colorScheme="green" fontSize="xs">
                                  {chapter.size} pag
                                </Badge>
                              </Button>
                            </WrapItem>
                          );
                        })}
                      </Wrap>
                    </AccordionPanel>
                  </Card>
                </AccordionItem>
              ))}
            </Accordion>
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
        <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(10px)" />
        <ModalContent 
          bg="gray.800"
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
            pt="calc(1rem + env(safe-area-inset-top, 0px))"
          >
            {selectedChapter ? 'Elimina Capitolo' : selectedManga ? 'Elimina Manga' : 'Elimina Tutto'}
          </ModalHeader>
          <ModalCloseButton 
            sx={{
              top: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
              right: 'calc(0.75rem + env(safe-area-inset-right, 0px))',
            }}
          />
          <ModalBody>
            {selectedChapter ? (
              <Text>
                Vuoi eliminare "{selectedChapter.mangaTitle} - Cap. {selectedChapter.chapterTitle.match(/\d+(\.\d+)?/)?.[0]}"?
              </Text>
            ) : selectedManga ? (
              <Text>
                Vuoi eliminare tutti i {selectedManga.chapters.length} capitoli di "{selectedManga.mangaTitle}"?
              </Text>
            ) : (
              <Text>
                Vuoi eliminare tutti i {downloads.length} capitoli scaricati ({mangaCount} manga)?
              </Text>
            )}
          </ModalBody>
          <ModalFooter
            pb="calc(1rem + env(safe-area-inset-bottom, 0px))"
          >
            <Button variant="ghost" mr={3} onClick={onClose}>
              Annulla
            </Button>
            <Button
              colorScheme="red"
              onClick={() => {
                if (selectedChapter) {
                  deleteChapter(selectedChapter);
                } else if (selectedManga) {
                  deleteManga(selectedManga.mangaUrl);
                } else {
                  clearAll();
                }
              }}
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
