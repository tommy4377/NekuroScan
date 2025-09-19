import React, { useState, useRef, useEffect } from 'react';
import {
  Container, VStack, HStack, Heading, Text, Avatar, Box, Button, Input,
  FormControl, FormLabel, SimpleGrid, Divider, useToast, InputGroup,
  InputRightElement, IconButton, Switch, Badge, Tabs, TabList, Tab,
  TabPanels, TabPanel, Progress, Stat, StatLabel, StatNumber, Modal,
  ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  useDisclosure, Textarea, Select
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon, EditIcon, CheckIcon, CopyIcon } from '@chakra-ui/icons';
import { FaCamera, FaSave, FaShare, FaLock, FaGlobe, FaTrash } from 'react-icons/fa';
import MangaCard from '../components/MangaCard';
import useAuth from '../hooks/useAuth';

export default function Profile() {
  const toast = useToast();
  const { user, updateProfile, changePassword, persistLocalData } = useAuth();
  const fileRef = useRef();
  const { isOpen, onOpen, onClose } = useDisclosure();

  // State
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(localStorage.getItem('userBio') || '');
  const [avatar, setAvatar] = useState(localStorage.getItem('userAvatar') || '');
  const [showPass, setShowPass] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [isPublic, setIsPublic] = useState(localStorage.getItem('profilePublic') === 'true');
  const [privacy, setPrivacy] = useState(localStorage.getItem('profilePrivacy') || 'friends');
  const [loading, setLoading] = useState(false);

  // Library data
  const [reading] = useState(() => JSON.parse(localStorage.getItem('reading') || '[]'));
  const [completed] = useState(() => JSON.parse(localStorage.getItem('completed') || '[]'));
  const [favorites] = useState(() => JSON.parse(localStorage.getItem('favorites') || '[]'));
  const [history] = useState(() => JSON.parse(localStorage.getItem('history') || '[]'));

  // Stats
  const stats = {
    totalRead: completed.length + reading.length,
    chaptersRead: Object.keys(JSON.parse(localStorage.getItem('readingProgress') || '{}')).length,
    favoriteGenre: getMostCommonGenre(),
    readingStreak: getReadingStreak()
  };

  useEffect(() => {
    setUsername(user?.username || '');
    setEmail(user?.email || '');
  }, [user]);

  function getMostCommonGenre() {
    // Implementazione semplificata
    return 'Shounen';
  }

  function getReadingStreak() {
    // Calcola giorni consecutivi di lettura
    const progress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
    const dates = Object.values(progress).map(p => new Date(p.timestamp).toDateString());
    const uniqueDates = [...new Set(dates)];
    return uniqueDates.length;
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File troppo grande (max 5MB)', status: 'error', duration: 3000 });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result);
      localStorage.setItem('userAvatar', reader.result);
      toast({ title: 'Avatar aggiornato', status: 'success', duration: 2000 });
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    setLoading(true);
    
    // Salva localmente
    localStorage.setItem('userBio', bio);
    const updatedUser = { ...user, username, email };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    // Prova a salvare sul server
    if (user) {
      const result = await updateProfile({ username, email, bio });
      if (!result.success) {
        toast({ 
          title: 'Salvato solo localmente', 
          description: result.error,
          status: 'warning',
          duration: 3000 
        });
      }
    }
    
    setIsEditing(false);
    setLoading(false);
    persistLocalData();
    toast({ title: 'Profilo aggiornato', status: 'success', duration: 2000 });
  };

  const handlePasswordChange = async () => {
    if (!newPass || newPass.length < 6) {
      toast({ title: 'Password troppo corta (min 6 caratteri)', status: 'error' });
      return;
    }
    
    if (newPass !== confirmPass) {
      toast({ title: 'Le password non coincidono', status: 'error' });
      return;
    }

    const result = await changePassword(oldPass, newPass);
    
    if (result.success) {
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
      toast({ title: 'Password cambiata con successo', status: 'success' });
    } else {
      toast({ title: result.error || 'Errore cambio password', status: 'error' });
    }
  };

  const togglePublicProfile = (value) => {
    setIsPublic(value);
    localStorage.setItem('profilePublic', value.toString());
    toast({ 
      title: `Profilo ${value ? 'pubblico' : 'privato'}`,
      description: value ? 'Il tuo profilo è ora visibile a tutti' : 'Solo tu puoi vedere il tuo profilo',
      status: 'info',
      duration: 3000
    });
  };

  const shareProfile = () => {
    const url = `${window.location.origin}/user/${username}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copiato!', status: 'success', duration: 2000 });
  };

  const clearData = (type) => {
    if (window.confirm(`Vuoi davvero cancellare ${type}?`)) {
      switch(type) {
        case 'history':
          localStorage.removeItem('history');
          break;
        case 'all':
          ['favorites', 'reading', 'completed', 'history', 'readingProgress'].forEach(key => {
            localStorage.removeItem(key);
          });
          break;
      }
      toast({ title: `${type} cancellato`, status: 'info' });
      window.location.reload();
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header Profile */}
        <Box bg="gray.800" p={6} borderRadius="xl" position="relative">
          <HStack spacing={6} align="start" flexWrap="wrap">
            <Box position="relative">
              <Avatar 
                size="2xl" 
                name={username} 
                src={avatar}
                border="4px solid"
                borderColor="purple.500"
              />
              <IconButton
                icon={<FaCamera />}
                size="sm"
                colorScheme="purple"
                borderRadius="full"
                position="absolute"
                bottom={0}
                right={0}
                onClick={() => fileRef.current?.click()}
                aria-label="Cambia avatar"
              />
              <input 
                ref={fileRef} 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                style={{ display: 'none' }} 
              />
            </Box>

            <VStack align="stretch" flex={1} spacing={4}>
              <HStack justify="space-between">
                <VStack align="start" spacing={1}>
                  {isEditing ? (
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      size="lg"
                      fontWeight="bold"
                      maxW="300px"
                    />
                  ) : (
                    <Heading size="lg">{username}</Heading>
                  )}
                  <HStack spacing={2}>
                    <Text color="gray.400">{email}</Text>
                    <Badge colorScheme={isPublic ? 'green' : 'gray'}>
                      {isPublic ? 'Pubblico' : 'Privato'}
                    </Badge>
                  </HStack>
                </VStack>
                
                <HStack>
                  {isEditing ? (
                    <>
                      <Button 
                        colorScheme="green" 
                        leftIcon={<CheckIcon />}
                        onClick={saveProfile}
                        isLoading={loading}
                      >
                        Salva
                      </Button>
                      <Button variant="ghost" onClick={() => setIsEditing(false)}>
                        Annulla
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button leftIcon={<EditIcon />} onClick={() => setIsEditing(true)}>
                        Modifica
                      </Button>
                      {isPublic && (
                        <Button leftIcon={<FaShare />} variant="outline" onClick={shareProfile}>
                          Condividi
                        </Button>
                      )}
                    </>
                  )}
                </HStack>
              </HStack>

              {isEditing ? (
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Scrivi qualcosa su di te..."
                  maxLength={200}
                />
              ) : (
                bio && <Text color="gray.300">{bio}</Text>
              )}

              {/* Stats */}
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                <Stat>
                  <StatLabel>Manga letti</StatLabel>
                  <StatNumber>{stats.totalRead}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Capitoli</StatLabel>
                  <StatNumber>{stats.chaptersRead}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Preferiti</StatLabel>
                  <StatNumber>{favorites.length}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Streak</StatLabel>
                  <StatNumber>{stats.readingStreak} giorni</StatNumber>
                </Stat>
              </SimpleGrid>
            </VStack>
          </HStack>
        </Box>

        {/* Tabs Content */}
        <Tabs colorScheme="purple" variant="enclosed">
          <TabList>
            <Tab>Libreria</Tab>
            <Tab>Impostazioni</Tab>
            <Tab>Privacy</Tab>
            <Tab>Statistiche</Tab>
          </TabList>

          <TabPanels>
            {/* Tab Libreria */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Box>
                  <Heading size="md" mb={3}>In lettura ({reading.length})</Heading>
                  {reading.length ? (
                    <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                      {reading.slice(0, 10).map((manga, i) => (
                        <Box key={i} position="relative">
                          <MangaCard manga={manga} />
                          {manga.progress && (
                            <Progress 
                              value={manga.progress} 
                              size="xs" 
                              colorScheme="green"
                              position="absolute"
                              bottom={0}
                              left={0}
                              right={0}
                            />
                          )}
                        </Box>
                      ))}
                    </SimpleGrid>
                  ) : (
                    <Text color="gray.500">Nessun manga in lettura</Text>
                  )}
                </Box>

                <Box>
                  <Heading size="md" mb={3}>Preferiti ({favorites.length})</Heading>
                  {favorites.length ? (
                    <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                      {favorites.slice(0, 10).map((manga, i) => (
                        <MangaCard key={i} manga={manga} />
                      ))}
                    </SimpleGrid>
                  ) : (
                    <Text color="gray.500">Nessun preferito</Text>
                  )}
                </Box>

                <Box>
                  <Heading size="md" mb={3}>Completati ({completed.length})</Heading>
                  {completed.length ? (
                    <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                      {completed.slice(0, 10).map((manga, i) => (
                        <MangaCard key={i} manga={manga} />
                      ))}
                    </SimpleGrid>
                  ) : (
                    <Text color="gray.500">Nessun manga completato</Text>
                  )}
                </Box>
              </VStack>
            </TabPanel>

            {/* Tab Impostazioni */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Box bg="gray.800" p={6} borderRadius="lg">
                  <Heading size="md" mb={4}>Cambia password</Heading>
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    <FormControl>
                      <FormLabel>Password attuale</FormLabel>
                      <Input 
                        type={showPass ? 'text' : 'password'} 
                        value={oldPass} 
                        onChange={(e) => setOldPass(e.target.value)} 
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Nuova password</FormLabel>
                      <InputGroup>
                        <Input 
                          type={showPass ? 'text' : 'password'} 
                          value={newPass} 
                          onChange={(e) => setNewPass(e.target.value)} 
                        />
                        <InputRightElement>
                          <IconButton 
                            size="sm" 
                            variant="ghost" 
                            icon={showPass ? <ViewOffIcon /> : <ViewIcon />} 
                            onClick={() => setShowPass(!showPass)} 
                            aria-label="Toggle password"
                          />
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Conferma password</FormLabel>
                      <Input 
                        type={showPass ? 'text' : 'password'} 
                        value={confirmPass} 
                        onChange={(e) => setConfirmPass(e.target.value)} 
                      />
                    </FormControl>
                  </SimpleGrid>
                  <Button colorScheme="purple" mt={4} onClick={handlePasswordChange}>
                    Cambia password
                  </Button>
                </Box>

                <Box bg="gray.800" p={6} borderRadius="lg">
                  <Heading size="md" mb={4}>Preferenze lettura</Heading>
                  <VStack align="stretch" spacing={3}>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Modalità lettura predefinita</FormLabel>
                      <Select 
                        maxW="200px"
                        defaultValue={localStorage.getItem('preferredReadingMode') || 'single'}
                        onChange={(e) => localStorage.setItem('preferredReadingMode', e.target.value)}
                      >
                        <option value="single">Pagina singola</option>
                        <option value="double">Pagina doppia</option>
                        <option value="webtoon">Webtoon</option>
                      </Select>
                    </FormControl>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Precarica immagini</FormLabel>
                      <Switch 
                        colorScheme="purple"
                        defaultChecked={localStorage.getItem('preloadImages') !== 'false'}
                        onChange={(e) => localStorage.setItem('preloadImages', e.target.checked)}
                      />
                    </FormControl>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0">Salvataggio automatico progressi</FormLabel>
                      <Switch 
                        colorScheme="purple"
                        defaultChecked={localStorage.getItem('autoSave') !== 'false'}
                        onChange={(e) => localStorage.setItem('autoSave', e.target.checked)}
                      />
                    </FormControl>
                  </VStack>
                </Box>

                <Box bg="gray.800" p={6} borderRadius="lg">
                  <Heading size="md" mb={4}>Gestione dati</Heading>
                  <VStack align="stretch" spacing={3}>
                    <Button 
                      leftIcon={<FaTrash />} 
                      variant="outline" 
                      colorScheme="red"
                      onClick={() => clearData('history')}
                    >
                      Cancella cronologia
                    </Button>
                    <Button 
                      leftIcon={<FaTrash />} 
                      variant="outline" 
                      colorScheme="red"
                      onClick={() => clearData('all')}
                    >
                      Cancella tutti i dati locali
                    </Button>
                  </VStack>
                </Box>
              </VStack>
            </TabPanel>

            {/* Tab Privacy */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Box bg="gray.800" p={6} borderRadius="lg">
                  <Heading size="md" mb={4}>Impostazioni Privacy</Heading>
                  
                  <VStack align="stretch" spacing={4}>
                    <FormControl display="flex" alignItems="center" justifyContent="space-between">
                      <HStack>
                        <FaGlobe />
                        <Box>
                          <FormLabel mb="0">Profilo pubblico</FormLabel>
                          <Text fontSize="sm" color="gray.400">
                            Permetti a chiunque di vedere il tuo profilo
                          </Text>
                        </Box>
                      </HStack>
                      <Switch 
                        colorScheme="green"
                        isChecked={isPublic}
                        onChange={(e) => togglePublicProfile(e.target.checked)}
                      />
                    </FormControl>

                    <Divider />

                    <FormControl>
                      <FormLabel>Chi può vedere la tua libreria</FormLabel>
                      <Select 
                        value={privacy}
                        onChange={(e) => {
                          setPrivacy(e.target.value);
                          localStorage.setItem('profilePrivacy', e.target.value);
                        }}
                        bg="gray.700"
                      >
                        <option value="public">Tutti</option>
                        <option value="friends">Solo amici</option>
                        <option value="private">Solo io</option>
                      </Select>
                    </FormControl>

                    {isPublic && (
                      <Box p={4} bg="gray.700" borderRadius="lg">
                        <Text fontSize="sm" mb={2}>Link pubblico del tuo profilo:</Text>
                        <HStack>
                          <Input 
                            value={`${window.location.origin}/user/${username}`}
                            isReadOnly
                            size="sm"
                          />
                          <IconButton 
                            icon={<CopyIcon />}
                            size="sm"
                            onClick={shareProfile}
                            aria-label="Copia link"
                          />
                        </HStack>
                      </Box>
                    )}

                    <FormControl display="flex" alignItems="center" justifyContent="space-between">
                      <HStack>
                        <FaLock />
                        <Box>
                          <FormLabel mb="0">Modalità privata</FormLabel>
                          <Text fontSize="sm" color="gray.400">
                            Non salvare cronologia di lettura
                          </Text>
                        </Box>
                      </HStack>
                      <Switch 
                        colorScheme="red"
                        onChange={(e) => {
                          localStorage.setItem('privateMode', e.target.checked);
                          toast({ 
                            title: `Modalità privata ${e.target.checked ? 'attiva' : 'disattiva'}`,
                            status: 'info'
                          });
                        }}
                      />
                    </FormControl>
                  </VStack>
                </Box>

                <Box bg="gray.800" p={6} borderRadius="lg">
                  <Heading size="md" mb={4}>Contenuti</Heading>
                  <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <FormLabel mb="0">Mostra contenuti adult</FormLabel>
                      <Text fontSize="sm" color="gray.400">
                        Richiede conferma dell'età
                      </Text>
                    </Box>
                    <Switch 
                      colorScheme="pink"
                      defaultChecked={localStorage.getItem('includeAdult') === 'true'}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onOpen();
                        } else {
                          localStorage.setItem('includeAdult', 'false');
                        }
                      }}
                    />
                  </FormControl>
                </Box>
              </VStack>
            </TabPanel>

            {/* Tab Statistiche */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <Box bg="gray.800" p={6} borderRadius="lg">
                  <Heading size="md" mb={4}>Statistiche di lettura</Heading>
                  <VStack align="stretch" spacing={3}>
                    <HStack justify="space-between">
                      <Text>Manga totali</Text>
                      <Text fontWeight="bold">{stats.totalRead}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text>Capitoli letti</Text>
                      <Text fontWeight="bold">{stats.chaptersRead}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text>Genere preferito</Text>
                      <Badge colorScheme="purple">{stats.favoriteGenre}</Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text>Giorni consecutivi</Text>
                      <Text fontWeight="bold">{stats.readingStreak}</Text>
                    </HStack>
                  </VStack>
                </Box>

                <Box bg="gray.800" p={6} borderRadius="lg">
                  <Heading size="md" mb={4}>Attività recente</Heading>
                  <VStack align="stretch" spacing={2}>
                    {history.slice(0, 5).map((item, i) => (
                      <HStack key={i} justify="space-between">
                        <Text fontSize="sm" noOfLines={1}>{item.title}</Text>
                        <Text fontSize="xs" color="gray.400">
                          {new Date(item.lastVisited).toLocaleDateString()}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              </SimpleGrid>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* Modal conferma età */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent bg="gray.800">
          <ModalHeader>Conferma età</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text>
              Confermi di avere almeno 18 anni per visualizzare contenuti adult?
            </Text>
            <HStack mt={4} justify="flex-end">
              <Button variant="ghost" onClick={onClose}>
                Annulla
              </Button>
              <Button 
                colorScheme="purple" 
                onClick={() => {
                  localStorage.setItem('includeAdult', 'true');
                  onClose();
                  toast({ title: 'Contenuti adult abilitati', status: 'success' });
                }}
              >
                Confermo
              </Button>
            </HStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Container>
  );
}
