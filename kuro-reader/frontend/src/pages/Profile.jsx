import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Container, VStack, HStack, Avatar, Button, Input,
  FormControl, FormLabel, Heading, Text, useToast,
  Tabs, TabList, TabPanels, Tab, TabPanel, SimpleGrid,
  Stat, StatLabel, StatNumber, Badge, IconButton,
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton, useDisclosure,
  Divider, InputGroup, InputRightElement, Textarea,
  Switch, FormHelperText
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { FaEdit, FaShare, FaLock, FaUnlock, FaCamera, FaSave, FaTimes } from 'react-icons/fa';
import { useParams } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import MangaCard from '../components/MangaCard';

function Profile({ isPublic = false }) {
  const { username } = useParams();
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(user || {});
  const [profilePublic, setProfilePublic] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const fileInputRef = useRef();
  const toast = useToast();
  
  // Stati per le liste
  const [reading, setReading] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [stats, setStats] = useState({ reading: 0, completed: 0, favorites: 0 });
  
  // Avatar persistente
  const [avatarUrl, setAvatarUrl] = useState(() => {
    return localStorage.getItem('userAvatar') || '';
  });

  useEffect(() => {
    loadUserData();
  }, [username, isPublic]);

  const loadUserData = async () => {
    if (isPublic && username) {
      // Carica profilo pubblico
      try {
        const publicProfile = await fetchPublicProfile(username);
        setProfileData(publicProfile);
        setReading(publicProfile.reading || []);
        setCompleted(publicProfile.completed || []);
        setFavorites(publicProfile.favorites || []);
      } catch (error) {
        toast({
          title: 'Profilo non trovato',
          status: 'error',
          duration: 3000,
        });
      }
    } else {
      // Carica dati locali
      const readingList = JSON.parse(localStorage.getItem('reading') || '[]');
      const completedList = JSON.parse(localStorage.getItem('completed') || '[]');
      const favoritesList = JSON.parse(localStorage.getItem('favorites') || '[]');
      
      setReading(readingList);
      setCompleted(completedList);
      setFavorites(favoritesList);
      
      setStats({
        reading: readingList.length,
        completed: completedList.length,
        favorites: favoritesList.length
      });
      
      // Carica stato pubblico del profilo
      const isPublic = localStorage.getItem('profilePublic') === 'true';
      setProfilePublic(isPublic);
    }
  };

  const fetchPublicProfile = async (username) => {
    // Simula fetch da server
    const publicData = localStorage.getItem(`publicProfile_${username}`);
    if (publicData) {
      return JSON.parse(publicData);
    }
    throw new Error('Profile not found');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5000000) { // 5MB limit
        toast({
          title: 'File troppo grande',
          description: 'L\'immagine deve essere inferiore a 5MB',
          status: 'error',
          duration: 3000,
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        setAvatarUrl(base64);
        localStorage.setItem('userAvatar', base64); // Salva persistente
        setProfileData({ ...profileData, avatar: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async () => {
    // Salva username e email
    const updatedProfile = {
      ...user,
      username: profileData.username,
      email: profileData.email,
      avatar: avatarUrl
    };
    
    // Salva localmente
    localStorage.setItem('user', JSON.stringify(updatedProfile));
    
    // Se profilo pubblico, salva anche per condivisione
    if (profilePublic) {
      const publicData = {
        username: profileData.username,
        avatar: avatarUrl,
        reading: reading.slice(0, 10), // Limita a 10 per privacy
        completed: completed.slice(0, 10),
        favorites: favorites.slice(0, 10),
        stats
      };
      localStorage.setItem(`publicProfile_${profileData.username}`, JSON.stringify(publicData));
    }
    
    // Aggiorna stato auth se esiste
    if (updateProfile) {
      await updateProfile(updatedProfile);
    }
    
    setIsEditing(false);
    toast({
      title: 'Profilo aggiornato',
      status: 'success',
      duration: 2000,
    });
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Le password non coincidono',
        status: 'error',
        duration: 3000,
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: 'Password troppo corta',
        description: 'Minimo 6 caratteri',
        status: 'error',
        duration: 3000,
      });
      return;
    }
    
    // Simula cambio password
    localStorage.setItem('userPassword', btoa(newPassword));
    
    toast({
      title: 'Password cambiata',
      status: 'success',
      duration: 2000,
    });
    
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  const togglePublicProfile = () => {
    const newPublicState = !profilePublic;
    setProfilePublic(newPublicState);
    localStorage.setItem('profilePublic', newPublicState.toString());
    
    if (newPublicState) {
      // Salva profilo pubblico
      const publicData = {
        username: profileData.username,
        avatar: avatarUrl,
        reading: reading.slice(0, 10),
        completed: completed.slice(0, 10),
        favorites: favorites.slice(0, 10),
        stats
      };
      localStorage.setItem(`publicProfile_${profileData.username}`, JSON.stringify(publicData));
      
      toast({
        title: 'Profilo reso pubblico',
        description: 'Altri utenti possono ora vedere il tuo profilo',
        status: 'info',
        duration: 3000,
      });
    } else {
      // Rimuovi profilo pubblico
      localStorage.removeItem(`publicProfile_${profileData.username}`);
      
      toast({
        title: 'Profilo reso privato',
        status: 'info',
        duration: 2000,
      });
    }
  };

  const shareProfile = () => {
    const profileUrl = `${window.location.origin}/user/${profileData.username}`;
    navigator.clipboard.writeText(profileUrl);
    toast({
      title: 'Link copiato!',
      description: profileUrl,
      status: 'success',
      duration: 3000,
    });
  };

  // Se profilo pubblico di altri
  if (isPublic && username !== user?.username) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">
          <Box bg="gray.800" p={8} borderRadius="xl">
            <HStack spacing={8} align="start">
              <Avatar size="2xl" name={profileData.username} src={profileData.avatar} />
              <VStack flex={1} align="start" spacing={4}>
                <Heading size="lg">@{profileData.username}</Heading>
                <SimpleGrid columns={3} spacing={4}>
                  <Stat>
                    <StatLabel>In lettura</StatLabel>
                    <StatNumber>{stats.reading}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Completati</StatLabel>
                    <StatNumber>{stats.completed}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Preferiti</StatLabel>
                    <StatNumber>{stats.favorites}</StatNumber>
                  </Stat>
                </SimpleGrid>
              </VStack>
            </HStack>
          </Box>

          <Tabs colorScheme="purple">
            <TabList>
              <Tab>In lettura</Tab>
              <Tab>Completati</Tab>
              <Tab>Preferiti</Tab>
            </TabList>
            
            <TabPanels>
              <TabPanel>
                <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                  {reading.map((manga, i) => (
                    <MangaCard key={i} manga={manga} />
                  ))}
                </SimpleGrid>
              </TabPanel>
              <TabPanel>
                <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                  {completed.map((manga, i) => (
                    <MangaCard key={i} manga={manga} />
                  ))}
                </SimpleGrid>
              </TabPanel>
              <TabPanel>
                <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                  {favorites.map((manga, i) => (
                    <MangaCard key={i} manga={manga} />
                  ))}
                </SimpleGrid>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>
    );
  }

  // Profilo personale
  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header Profilo */}
        <Box bg="gray.800" p={{ base: 4, md: 8 }} borderRadius="xl">
          <HStack spacing={{ base: 4, md: 8 }} align="start" flexWrap={{ base: 'wrap', md: 'nowrap' }}>
            <VStack position="relative">
              <Avatar
                size={{ base: 'xl', md: '2xl' }}
                name={profileData.username}
                src={avatarUrl}
                cursor={isEditing ? 'pointer' : 'default'}
                onClick={() => isEditing && fileInputRef.current?.click()}
              />
              {isEditing && (
                <>
                  <IconButton
                    icon={<FaCamera />}
                    position="absolute"
                    bottom={0}
                    right={0}
                    size="sm"
                    colorScheme="purple"
                    borderRadius="full"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Cambia foto"
                  />
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    display="none"
                  />
                </>
              )}
            </VStack>
            
            <VStack flex={1} align="start" spacing={4} w="100%">
              {isEditing ? (
                <VStack align="start" spacing={3} width="100%">
                  <FormControl>
                    <FormLabel>Username</FormLabel>
                    <Input
                      value={profileData.username}
                      onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    />
                  </FormControl>
                  <HStack>
                    <Button colorScheme="green" leftIcon={<FaSave />} onClick={saveProfile}>
                      Salva
                    </Button>
                    <Button variant="outline" leftIcon={<FaTimes />} onClick={() => setIsEditing(false)}>
                      Annulla
                    </Button>
                  </HStack>
                </VStack>
              ) : (
                <>
                  <Heading size="lg">{profileData.username}</Heading>
                  <Text color="gray.400">{profileData.email}</Text>
                  
                  <HStack flexWrap="wrap" spacing={2}>
                    <Button leftIcon={<FaEdit />} onClick={() => setIsEditing(true)} size="sm">
                      Modifica
                    </Button>
                    <Button leftIcon={<FaShare />} onClick={shareProfile} size="sm" isDisabled={!profilePublic}>
                      Condividi
                    </Button>
                    <IconButton
                      icon={profilePublic ? <FaUnlock /> : <FaLock />}
                      onClick={togglePublicProfile}
                      aria-label="Privacy"
                      colorScheme={profilePublic ? 'green' : 'gray'}
                      size="sm"
                    />
                    <Button onClick={onOpen} size="sm" variant="outline">
                      Cambia password
                    </Button>
                  </HStack>
                  
                  {profilePublic && (
                    <Badge colorScheme="green">Profilo pubblico</Badge>
                  )}
                </>
              )}
            </VStack>
          </HStack>
        </Box>

        {/* Statistiche */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <Stat bg="gray.800" p={4} borderRadius="lg">
            <StatLabel>In lettura</StatLabel>
            <StatNumber>{stats.reading}</StatNumber>
          </Stat>
          <Stat bg="gray.800" p={4} borderRadius="lg">
            <StatLabel>Completati</StatLabel>
            <StatNumber>{stats.completed}</StatNumber>
          </Stat>
          <Stat bg="gray.800" p={4} borderRadius="lg">
            <StatLabel>Preferiti</StatLabel>
            <StatNumber>{stats.favorites}</StatNumber>
          </Stat>
        </SimpleGrid>

        {/* Lista manga */}
        <Tabs colorScheme="purple">
          <TabList>
            <Tab>In lettura ({reading.length})</Tab>
            <Tab>Completati ({completed.length})</Tab>
            <Tab>Preferiti ({favorites.length})</Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel>
              {reading.length > 0 ? (
                <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                  {reading.map((manga, i) => (
                    <MangaCard key={i} manga={manga} />
                  ))}
                </SimpleGrid>
              ) : (
                <Text color="gray.500" textAlign="center" py={8}>
                  Nessun manga in lettura
                </Text>
              )}
            </TabPanel>
            
            <TabPanel>
              {completed.length > 0 ? (
                <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                  {completed.map((manga, i) => (
                    <MangaCard key={i} manga={manga} />
                  ))}
                </SimpleGrid>
              ) : (
                <Text color="gray.500" textAlign="center" py={8}>
                  Nessun manga completato
                </Text>
              )}
            </TabPanel>
            
            <TabPanel>
              {favorites.length > 0 ? (
                <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                  {favorites.map((manga, i) => (
                    <MangaCard key={i} manga={manga} />
                  ))}
                </SimpleGrid>
              ) : (
                <Text color="gray.500" textAlign="center" py={8}>
                  Nessun preferito
                </Text>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* Modal cambio password */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent bg="gray.800">
          <ModalHeader>Cambia Password</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Nuova password</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimo 6 caratteri"
                  />
                  <InputRightElement>
                    <IconButton
                      icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                      onClick={() => setShowPassword(!showPassword)}
                      variant="ghost"
                      size="sm"
                      aria-label="Mostra password"
                    />
                  </InputRightElement>
                </InputGroup>
              </FormControl>
              
              <FormControl>
                <FormLabel>Conferma password</FormLabel>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Annulla
            </Button>
            <Button colorScheme="purple" onClick={changePassword}>
              Cambia password
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
}

export default Profile;
