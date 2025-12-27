// @ts-nocheck - Legacy component, needs gradual refactoring
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Heading, Tabs, TabList, TabPanels, Tab, TabPanel,
  SimpleGrid, Text, VStack, Button, Badge, useToast, HStack,
  Menu, MenuButton, MenuList, MenuItem, IconButton, AlertDialog,
  AlertDialogBody, AlertDialogFooter, AlertDialogHeader,
  AlertDialogContent, AlertDialogOverlay, useDisclosure
} from '@chakra-ui/react';
import MangaCard from '@/components/MangaCard';
import { FaBookOpen, FaBookmark, FaHistory, FaCheck, FaTrash, FaEllipsisV, FaBan, FaList } from 'react-icons/fa';
import useAuth from '@/hooks/useAuth';

function Library() {
  const [reading, setReading] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [dropped, setDropped] = useState([]);
  const [selectedManga, setSelectedManga] = useState(null);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef();
  const toast = useToast();
  
  // ✅ FIX: Zustand requires selector syntax for reactivity
  const user = useAuth(state => state.user);
  const syncToServer = useAuth(state => state.syncToServer);

  // ✅ WRAP loadLibrary in useCallback per evitare React error #300
  // ✅ MOBILE FIX: Try-catch per localStorage access
  const loadLibrary = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
        setReading(JSON.parse(localStorage.getItem('reading') || '[]'));
        setFavorites(JSON.parse(localStorage.getItem('favorites') || '[]'));
        setHistory(JSON.parse(localStorage.getItem('history') || '[]'));
        setCompleted(JSON.parse(localStorage.getItem('completed') || '[]'));
        setDropped(JSON.parse(localStorage.getItem('dropped') || '[]'));
      } else {
        // Fallback: array vuoti se localStorage non disponibile
        setReading([]);
        setFavorites([]);
        setHistory([]);
        setCompleted([]);
        setDropped([]);
      }
    } catch (e) {
      // Silent fail - usa array vuoti come fallback
      setReading([]);
      setFavorites([]);
      setHistory([]);
      setCompleted([]);
      setDropped([]);
    }
  }, []);

  useEffect(() => {
    loadLibrary();
    
    // Ascolta aggiornamenti della libreria
    const handleLibraryUpdate = () => {
      loadLibrary();
    };
    
    window.addEventListener('library-updated', handleLibraryUpdate);
    
    return () => {
      window.removeEventListener('library-updated', handleLibraryUpdate);
    };
  }, [loadLibrary]);

  // ✅ WRAP removeFromList in useCallback per evitare React error #300
  const removeFromList = useCallback((listName, item) => {
    const lists = { reading, favorites, history, completed, dropped };
    const updatedList = lists[listName].filter(i => i.url !== item.url);
    
    switch(listName) {
      case 'reading': setReading(updatedList); break;
      case 'favorites': setFavorites(updatedList); break;
      case 'history': setHistory(updatedList); break;
      case 'completed': setCompleted(updatedList); break;
      case 'dropped': setDropped(updatedList); break;
    }
    
    // ✅ MOBILE FIX: Try-catch per localStorage.setItem
    try {
      if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
        localStorage.setItem(listName, JSON.stringify(updatedList));
      }
    } catch (e) {
      console.warn('[Library] Failed to save list:', e);
    }
    
    // Sync if logged in
    if (user && syncToServer) {
      syncToServer();
    }
    
    toast({
      title: 'Rimosso',
      description: `${item.title} è stato rimosso`,
      status: 'info',
      duration: 2000,
    });
  }, [reading, favorites, history, completed, dropped, user, syncToServer, toast]);

  // ✅ WRAP moveToList in useCallback per evitare React error #300
  const moveToList = useCallback((fromList, toList, item) => {
    // ✅ MOBILE FIX: Try-catch per localStorage operations
    try {
      if (typeof window !== 'undefined' && typeof Storage !== 'undefined') {
        // Remove from source
        const sourceUpdated = JSON.parse(localStorage.getItem(fromList) || '[]')
          .filter(i => i.url !== item.url);
        localStorage.setItem(fromList, JSON.stringify(sourceUpdated));
        
        // Add to destination
        const destUpdated = JSON.parse(localStorage.getItem(toList) || '[]');
        const exists = destUpdated.find(i => i.url === item.url);
    
    if (!exists) {
      const newItem = {
        ...item,
        movedAt: new Date().toISOString()
      };
      
      if (toList === 'completed') {
        newItem.completedAt = new Date().toISOString();
        newItem.progress = 100;
      } else if (toList === 'dropped') {
        newItem.droppedAt = new Date().toISOString();
      }
      
      destUpdated.unshift(newItem);
      localStorage.setItem(toList, JSON.stringify(destUpdated));
    }
    
    // Reload
    loadLibrary();
    
    // Sync if logged in
    if (user && syncToServer) {
      syncToServer();
    }
    
    const listNames = {
      reading: 'In lettura',
      completed: 'Completati',
      dropped: 'Droppati',
      favorites: 'Preferiti'
    };
    
    toast({
      title: 'Spostato',
      description: `${item.title} → ${listNames[toList]}`,
      status: 'success',
      duration: 2000,
    });
  }, [loadLibrary, user, syncToServer, toast]);

  // ✅ WRAP confirmDelete in useCallback per evitare React error #300
  const confirmDelete = useCallback((list, item) => {
    setSelectedManga({ list, item });
    onOpen();
  }, [onOpen]);

  // ✅ WRAP handleDelete in useCallback per evitare React error #300
  const handleDelete = useCallback(() => {
    if (selectedManga) {
      removeFromList(selectedManga.list, selectedManga.item);
      setSelectedManga(null);
    }
    onClose();
  }, [selectedManga, removeFromList, onClose]);

  const MangaActions = ({ manga, currentList }) => (
    <Menu>
      <MenuButton
        as={IconButton}
        icon={<FaEllipsisV />}
        variant="ghost"
        size="sm"
        bg="blackAlpha.700"
        _hover={{ bg: 'blackAlpha.800' }}
        _active={{ bg: 'blackAlpha.900' }}
        onClick={(e) => {
          e.stopPropagation();
        }}
        aria-label="Azioni manga"
        className="manga-actions-button"
        sx={{
          transition: 'transform 0.2s ease-in-out, background-color 0.2s',
        }}
      />
      <MenuList 
        bg="gray.800" 
        borderColor="gray.700"
        zIndex={1002}
        minW="200px"
      >
        {currentList !== 'completed' && (
          <MenuItem
            icon={<FaCheck />}
            onClick={(e) => {
              e.stopPropagation();
              moveToList(currentList, 'completed', manga);
            }}
          >
            Segna come completato
          </MenuItem>
        )}
        
        {currentList !== 'dropped' && (
          <MenuItem
            icon={<FaBan />}
            onClick={(e) => {
              e.stopPropagation();
              moveToList(currentList, 'dropped', manga);
            }}
          >
            Sposta in droppati
          </MenuItem>
        )}
        
        {currentList !== 'reading' && currentList !== 'completed' && currentList !== 'dropped' && (
          <MenuItem
            icon={<FaBookOpen />}
            onClick={(e) => {
              e.stopPropagation();
              moveToList(currentList, 'reading', manga);
            }}
          >
            Aggiungi a lettura
          </MenuItem>
        )}
        
        <MenuItem
          icon={<FaTrash />}
          color="red.400"
          onClick={(e) => {
            e.stopPropagation();
            confirmDelete(currentList, manga);
          }}
        >
          Rimuovi
        </MenuItem>
      </MenuList>
    </Menu>
  );

  const LibrarySection = ({ items, emptyMessage, listName }) => (
    items.length > 0 ? (
      <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
        {items.map((item, i) => (
          <Box 
            key={item.url || `${listName}-${i}`} 
            position="relative"
            className="library-manga-card"
            sx={{
              '&:hover .manga-actions-button': {
                transform: 'scale(1.15)',
              },
            }}
          >
            <MangaCard manga={item} />
            <Box
              position="absolute"
              top={2}
              right={2}
              zIndex={1001}
              className="manga-actions-wrapper"
              sx={{
                transition: 'transform 0.2s ease-in-out',
              }}
            >
              <MangaActions manga={item} currentList={listName} />
            </Box>
          </Box>
        ))}
      </SimpleGrid>
    ) : (
      <Box textAlign="center" py={12} bg="gray.800" borderRadius="lg">
        <Text color="gray.500">{emptyMessage}</Text>
      </Box>
    )
  );

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <HStack justify="space-between">
          <Heading size="xl">La mia Libreria</Heading>
          <Button
            leftIcon={<FaList />}
            colorScheme="purple"
            variant="outline"
            onClick={() => window.location.href = '/lists'}
            size="sm"
          >
            Le mie liste
          </Button>
        </HStack>
        
        <Tabs colorScheme="purple" variant="enclosed">
          <TabList>
            <Tab>
              <FaBookOpen style={{ marginRight: 8 }} />
              In lettura
              {reading.length > 0 && (
                <Badge ml={2} colorScheme="purple">{reading.length}</Badge>
              )}
            </Tab>
            <Tab>
              <FaBookmark style={{ marginRight: 8 }} />
              Preferiti
              {favorites.length > 0 && (
                <Badge ml={2} colorScheme="pink">{favorites.length}</Badge>
              )}
            </Tab>
            <Tab>
              <FaCheck style={{ marginRight: 8 }} />
              Completati
              {completed.length > 0 && (
                <Badge ml={2} colorScheme="green">{completed.length}</Badge>
              )}
            </Tab>
            <Tab>
              <FaBan style={{ marginRight: 8 }} />
              Droppati
              {dropped.length > 0 && (
                <Badge ml={2} colorScheme="red">{dropped.length}</Badge>
              )}
            </Tab>
            <Tab>
              <FaHistory style={{ marginRight: 8 }} />
              Cronologia
              {history.length > 0 && (
                <Badge ml={2} colorScheme="blue">{history.length}</Badge>
              )}
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <LibrarySection items={reading} emptyMessage="Nessun manga in lettura" listName="reading" />
            </TabPanel>
            
            <TabPanel>
              <LibrarySection items={favorites} emptyMessage="Nessun preferito" listName="favorites" />
            </TabPanel>
            
            <TabPanel>
              <LibrarySection items={completed} emptyMessage="Nessun manga completato" listName="completed" />
            </TabPanel>
            
            <TabPanel>
              <LibrarySection items={dropped} emptyMessage="Nessun manga droppato" listName="dropped" />
            </TabPanel>
            
            <TabPanel>
              <LibrarySection items={history} emptyMessage="Nessuna cronologia" listName="history" />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg="gray.800">
            <AlertDialogHeader>
              Conferma rimozione
            </AlertDialogHeader>

            <AlertDialogBody>
              Sei sicuro di voler rimuovere "{selectedManga?.item?.title}"?
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Annulla
              </Button>
              <Button colorScheme="red" onClick={handleDelete} ml={3}>
                Rimuovi
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Container>
  );
}

export default Library;