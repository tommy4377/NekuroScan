// 📚 LISTS.JSX - Gestione liste personalizzate
import React, { useState, useEffect } from 'react';
import {
  Container, VStack, HStack, Heading, Text, Box, Button,
  SimpleGrid, IconButton, useToast, Input, Textarea,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, Select, Badge, Card, CardBody,
  Divider, useDisclosure
} from '@chakra-ui/react';
import {
  FaPlus, FaEdit, FaTrash, FaStar, FaList
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import customListsManager from '../utils/customLists';
import MangaCard from '../components/MangaCard';
import EmptyState from '../components/EmptyState';

function Lists() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const [customLists, setCustomLists] = useState([]);
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
        customListsManager.updateList(selectedList.id, {
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
        customListsManager.createList({
          name: listName,
          description: listDescription,
          color: listColor
        });
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
    if (window.confirm('Sei sicuro di voler eliminare questa lista?')) {
      customListsManager.deleteList(listId);
      loadLists();
      toast({
        title: 'Lista eliminata',
        status: 'info',
        duration: 2000
      });
    }
  };

  const ListCard = ({ list, isCustom }) => (
    <Card
      bg="gray.800"
      borderColor="gray.700"
      borderWidth="1px"
      _hover={{ borderColor: `${list.color}.500`, transform: 'translateY(-2px)' }}
      transition="all 0.2s"
      cursor="pointer"
      onClick={() => navigate(`/lists/${list.id}`)}
    >
      <CardBody>
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between">
            <HStack>
              <Badge colorScheme={list.color || 'purple'}>
                {list.manga?.length || 0} manga
              </Badge>
              {!isCustom && <Badge colorScheme="cyan">Smart</Badge>}
            </HStack>
            {isCustom && (
              <HStack>
                <IconButton
                  icon={<FaEdit />}
                  size="sm"
                  variant="ghost"
                  colorScheme={list.color}
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

          <VStack align="start" spacing={1}>
            <Heading size="md">{list.name}</Heading>
            {list.description && (
              <Text fontSize="sm" color="gray.400" noOfLines={2}>
                {list.description}
              </Text>
            )}
          </VStack>

          {list.manga && list.manga.length > 0 && (
            <HStack spacing={2} overflow="hidden">
              {list.manga.slice(0, 4).map((manga, idx) => (
                <Box
                  key={idx}
                  w="50px"
                  h="70px"
                  borderRadius="md"
                  overflow="hidden"
                  bg="gray.700"
                >
                  {manga.cover && (
                    <img
                      src={manga.cover}
                      alt={manga.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </Box>
              ))}
              {list.manga.length > 4 && (
                <Text fontSize="xs" color="gray.500">
                  +{list.manga.length - 4}
                </Text>
              )}
            </HStack>
          )}
        </VStack>
      </CardBody>
    </Card>
  );

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between">
          <VStack align="start" spacing={1}>
            <Heading size="xl">Le Mie Liste</Heading>
            <Text color="gray.400">
              Organizza i tuoi manga in liste personalizzate
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

        {/* Liste Personalizzate */}
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

      </VStack>

      {/* Modal Crea/Modifica */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent 
          bg="gray.800" 
          color="white"
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
            {isEditing ? 'Modifica Lista' : 'Nuova Lista'}
          </ModalHeader>
          <ModalCloseButton 
            sx={{
              top: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
              right: 'calc(0.75rem + env(safe-area-inset-right, 0px))',
            }}
          />
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
                  placeholder="Aggiungi una descrizione..."
                  bg="gray.700"
                  maxLength={200}
                  rows={3}
                  _focus={{ outline: 'none' }}
                  fontSize="16px"
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
                  aria-label="Seleziona colore lista"
                >
                  <option value="purple">Viola</option>
                  <option value="blue">Blu</option>
                  <option value="green">Verde</option>
                  <option value="red">Rosso</option>
                  <option value="pink">Rosa</option>
                  <option value="orange">Arancione</option>
                  <option value="teal">Teal</option>
                  <option value="cyan">Ciano</option>
                </Select>
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter
            pb="calc(1rem + env(safe-area-inset-bottom, 0px))"
          >
            <Button variant="ghost" mr={3} onClick={onClose}>
              Annulla
            </Button>
            <Button colorScheme={listColor} onClick={handleSave}>
              {isEditing ? 'Salva Modifiche' : 'Crea Lista'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}

export default Lists;
