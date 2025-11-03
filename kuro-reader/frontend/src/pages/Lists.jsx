// 📚 LISTS.JSX - Gestione liste personalizzate e smart collections
import React, { useState, useEffect } from 'react';
import {
  Container, VStack, HStack, Heading, Text, Box, Button,
  SimpleGrid, IconButton, useToast, Input, Textarea,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, Select, Badge, Card, CardBody,
  Tabs, TabList, Tab, TabPanels, TabPanel, Divider, useDisclosure
} from '@chakra-ui/react';
import {
  FaPlus, FaEdit, FaTrash, FaStar, FaList, FaMagic
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import customListsManager from '../utils/customLists';
import smartCollections from '../utils/smartCollections';
import MangaCard from '../components/MangaCard';
import EmptyState from '../components/EmptyState';

function Lists() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const [customLists, setCustomLists] = useState([]);
  const [smartLists, setSmartLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form states
  const [listName, setListName] = useState('');
  const [listDescription, setListDescription] = useState('');
  const [listColor, setListColor] = useState('purple');

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = () => {
    setCustomLists(customListsManager.getAll());
    setSmartLists(smartCollections.getAll());
  };

  const openCreateModal = () => {
    setSelectedList(null);
    setIsEditing(false);
    setListName('');
    setListDescription('');
    setListColor('purple');
    onOpen();
  };

  const openEditModal = (list) => {
    setSelectedList(list);
    setIsEditing(true);
    setListName(list.name);
    setListDescription(list.description);
    setListColor(list.color);
    onOpen();
  };

  const handleSave = () => {
    try {
      if (!listName.trim()) {
        toast({
          title: 'Nome richiesto',
          status: 'warning',
          duration: 2000
        });
        return;
      }

      if (isEditing && selectedList) {
        customListsManager.update(selectedList.id, {
          name: listName,
          description: listDescription,
          color: listColor
        });
        toast({
          title: 'Lista aggiornata',
          status: 'success',
          duration: 2000
        });
      } else {
        customListsManager.create(listName, listDescription, listColor);
        toast({
          title: 'Lista creata',
          status: 'success',
          duration: 2000
        });
      }

      loadLists();
      onClose();
      
    } catch (error) {
      toast({
        title: 'Errore',
        description: error.message,
        status: 'error',
        duration: 3000
      });
    }
  };

  const handleDelete = (listId) => {
    if (window.confirm('Vuoi davvero eliminare questa lista?')) {
      customListsManager.delete(listId);
      toast({
        title: 'Lista eliminata',
        status: 'info',
        duration: 2000
      });
      loadLists();
    }
  };

  const colors = [
    { value: 'purple', label: '💜 Viola' },
    { value: 'blue', label: '💙 Blu' },
    { value: 'green', label: '💚 Verde' },
    { value: 'red', label: '❤️ Rosso' },
    { value: 'orange', label: '🧡 Arancione' },
    { value: 'pink', label: '💗 Rosa' },
    { value: 'teal', label: '💎 Teal' },
    { value: 'cyan', label: '🩵 Cyan' },
    { value: 'yellow', label: '💛 Giallo' }
  ];

  const ListCard = ({ list, isCustom }) => (
    <Card
      bg="gray.800"
      borderRadius="xl"
      overflow="hidden"
      border="2px solid"
      borderColor={`${list.color}.500`}
      transition="all 0.3s"
      _hover={{ transform: 'translateY(-4px)', boxShadow: 'xl' }}
      cursor="pointer"
      onClick={() => navigate(`/list/${list.id}`)}
    >
      <CardBody>
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between">
            <HStack>
              {list.auto ? <FaMagic color={`var(--chakra-colors-${list.color}-400)`} /> : <FaList />}
              <Heading size="md">{list.name}</Heading>
            </HStack>
            
            {isCustom && (
              <HStack spacing={1}>
                <IconButton
                  icon={<FaEdit />}
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(list);
                  }}
                  aria-label="Modifica"
                />
                <IconButton
                  icon={<FaTrash />}
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(list.id);
                  }}
                  aria-label="Elimina"
                />
              </HStack>
            )}
          </HStack>

          {list.description && (
            <Text fontSize="sm" color="gray.400" noOfLines={2}>
              {list.description}
            </Text>
          )}

          <HStack>
            <Badge colorScheme={list.color}>
              {list.manga.length} manga
            </Badge>
            {list.auto && (
              <Badge colorScheme="cyan" fontSize="xs">
                Auto
              </Badge>
            )}
          </HStack>
        </VStack>
      </CardBody>
    </Card>
  );

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        
        {/* Header */}
        <HStack justify="space-between">
          <VStack align="start" spacing={1}>
            <Heading size="xl">📚 Le Mie Liste</Heading>
            <Text color="gray.400">
              Organizza i tuoi manga come preferisci
            </Text>
          </VStack>

          <Button
            leftIcon={<FaPlus />}
            colorScheme="purple"
            onClick={openCreateModal}
          >
            Nuova Lista
          </Button>
        </HStack>

        <Tabs colorScheme="purple" variant="enclosed">
          <TabList>
            <Tab>
              <HStack>
                <FaMagic />
                <Text>Smart Collections</Text>
                <Badge>{smartLists.length}</Badge>
              </HStack>
            </Tab>
            <Tab>
              <HStack>
                <FaList />
                <Text>Le Mie Liste</Text>
                <Badge>{customLists.length}</Badge>
              </HStack>
            </Tab>
          </TabList>

          <TabPanels>
            {/* Tab Smart Collections */}
            <TabPanel>
              {smartLists.length > 0 ? (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  {smartLists.map(list => (
                    <ListCard key={list.id} list={list} isCustom={false} />
                  ))}
                </SimpleGrid>
              ) : (
                <EmptyState
                  icon="book"
                  title="Nessuna collezione smart"
                  description="Inizia a leggere manga per generare collezioni automatiche"
                  variant="compact"
                />
              )}
            </TabPanel>

            {/* Tab Liste Custom */}
            <TabPanel>
              {customLists.length > 0 ? (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  {customLists.map(list => (
                    <ListCard key={list.id} list={list} isCustom={true} />
                  ))}
                </SimpleGrid>
              ) : (
                <EmptyState
                  icon="bookmark"
                  title="Nessuna lista personalizzata"
                  description="Crea liste custom per organizzare i tuoi manga"
                  actionLabel="Crea prima lista"
                  onAction={openCreateModal}
                  variant="default"
                />
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>

      </VStack>

      {/* Modal Crea/Modifica */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent bg="gray.800" color="white">
          <ModalHeader>
            {isEditing ? 'Modifica Lista' : 'Nuova Lista'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Box>
                <Text fontSize="sm" mb={2} fontWeight="bold">Nome Lista</Text>
                <Input
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder="Es: Da leggere in vacanza"
                  bg="gray.700"
                  maxLength={50}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {listName.length}/50
                </Text>
              </Box>

              <Box>
                <Text fontSize="sm" mb={2} fontWeight="bold">Descrizione (opzionale)</Text>
                <Textarea
                  value={listDescription}
                  onChange={(e) => setListDescription(e.target.value)}
                  placeholder="Breve descrizione..."
                  bg="gray.700"
                  rows={3}
                  maxLength={200}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {listDescription.length}/200
                </Text>
              </Box>

              <Box>
                <Text fontSize="sm" mb={2} fontWeight="bold">Colore</Text>
                <Select
                  value={listColor}
                  onChange={(e) => setListColor(e.target.value)}
                  bg="gray.700"
                >
                  {colors.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </Select>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Annulla
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleSave}
              isDisabled={!listName.trim()}
            >
              {isEditing ? 'Salva' : 'Crea'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}

export default Lists;

