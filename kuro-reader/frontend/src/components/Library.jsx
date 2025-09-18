import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  SimpleGrid,
  Text,
  VStack,
  Button,
  Badge,
  useToast
} from '@chakra-ui/react';
import MangaCard from './MangaCard';
import { FaBookOpen, FaBookmark, FaHistory, FaCheck } from 'react-icons/fa';

function Library() {
  const [reading, setReading] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState([]);
  const [completed, setCompleted] = useState([]);
  const toast = useToast();

  useEffect(() => {
    loadLibrary();
  }, []);

  const getProgressForManga = (mangaUrl) => {
  const progress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
  return progress[mangaUrl];
};  

  const loadLibrary = () => {
    // Load from localStorage
    const savedReading = JSON.parse(localStorage.getItem('reading') || '[]');
    const savedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const savedHistory = JSON.parse(localStorage.getItem('history') || '[]');
    const savedCompleted = JSON.parse(localStorage.getItem('completed') || '[]');
    
    setReading(savedReading);
    setFavorites(savedFavorites);
    setHistory(savedHistory);
    setCompleted(savedCompleted);
  };

  const removeFromList = (listName, item) => {
    const lists = {
      reading: [...reading],
      favorites: [...favorites],
      history: [...history],
      completed: [...completed]
    };
    
    const updatedList = lists[listName].filter(i => i.url !== item.url);
    
    switch(listName) {
      case 'reading':
        setReading(updatedList);
        break;
      case 'favorites':
        setFavorites(updatedList);
        break;
      case 'history':
        setHistory(updatedList);
        break;
      case 'completed':
        setCompleted(updatedList);
        break;
    }
    
    localStorage.setItem(listName, JSON.stringify(updatedList));
    
    toast({
      title: 'Rimosso',
      description: `${item.title} è stato rimosso dalla lista`,
      status: 'info',
      duration: 2000,
    });
  };

  const LibrarySection = ({ items, emptyMessage, listName }) => (
    items.length > 0 ? (
      <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
        {items.map((item, i) => (
          <Box key={i} position="relative">
            <MangaCard manga={item} />
            <Button
              position="absolute"
              top={2}
              right={2}
              size="xs"
              colorScheme="red"
              onClick={(e) => {
                e.stopPropagation();
                removeFromList(listName, item);
              }}
            >
              ×
            </Button>
          </Box>
        ))}
      </SimpleGrid>
    ) : (
      <Box textAlign="center" py={12}>
        <Text color="gray.500">{emptyMessage}</Text>
      </Box>
    )
  );

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Heading size="xl">La mia Libreria</Heading>
        
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
              <FaHistory style={{ marginRight: 8 }} />
              Cronologia
              {history.length > 0 && (
                <Badge ml={2} colorScheme="blue">{history.length}</Badge>
              )}
            </Tab>
            <Tab>
              <FaCheck style={{ marginRight: 8 }} />
              Completati
              {completed.length > 0 && (
                <Badge ml={2} colorScheme="green">{completed.length}</Badge>
              )}
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <LibrarySection
                items={reading}
                emptyMessage="Nessun manga in lettura"
                listName="reading"
              />
            </TabPanel>
            
            <TabPanel>
              <LibrarySection
                items={favorites}
                emptyMessage="Nessun preferito"
                listName="favorites"
              />
            </TabPanel>
            
            <TabPanel>
              <LibrarySection
                items={history}
                emptyMessage="Nessuna cronologia"
                listName="history"
              />
            </TabPanel>
            
            <TabPanel>
              <LibrarySection
                items={completed}
                emptyMessage="Nessun manga completato"
                listName="completed"
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  );
}


export default Library;
