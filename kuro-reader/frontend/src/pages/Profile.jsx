// frontend/src/pages/Profile.jsx
import React, { useState, useRef } from 'react';
import {
  Box, Container, VStack, HStack, Avatar, Button, Input,
  FormControl, FormLabel, Heading, Text, useToast,
  Tabs, TabList, TabPanels, Tab, TabPanel, SimpleGrid,
  Stat, StatLabel, StatNumber, Badge, IconButton, 
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton, useDisclosure
} from '@chakra-ui/react';
import { FaEdit, FaShare, FaLock, FaUnlock } from 'react-icons/fa';
import useAuth from '../hooks/useAuth';
import MangaCard from '../components/MangaCard';

function Profile() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(user || {});
  const [isPublic, setIsPublic] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const fileInputRef = useRef();
  const toast = useToast();
  
  const [stats, setStats] = useState(() => {
    const reading = JSON.parse(localStorage.getItem('reading') || '[]');
    const completed = JSON.parse(localStorage.getItem('completed') || '[]');
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    return {
      reading: reading.length,
      completed: completed.length,
      favorites: favorites.length
    };
  });

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData({ ...profileData, avatar: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async () => {
    // Salva profilo
    await updateProfile(profileData);
    setIsEditing(false);
    toast({
      title: 'Profilo aggiornato',
      status: 'success',
      duration: 2000,
    });
  };

  const shareProfile = () => {
    const profileUrl = `${window.location.origin}/user/${user?.username}`;
    navigator.clipboard.writeText(profileUrl);
    toast({
      title: 'Link profilo copiato!',
      description: profileUrl,
      status: 'success',
      duration: 3000,
    });
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header Profilo */}
        <Box bg="gray.800" p={8} borderRadius="xl">
          <HStack spacing={8} align="start">
            <VStack>
              <Avatar
                size="2xl"
                name={profileData.username}
                src={profileData.avatar}
                cursor={isEditing ? 'pointer' : 'default'}
                onClick={() => isEditing && fileInputRef.current?.click()}
              />
              {isEditing && (
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  display="none"
                />
              )}
            </VStack>
            
            <VStack flex={1} align="start" spacing={4}>
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
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    />
                  </FormControl>
                </VStack>
              ) : (
                <>
                  <Heading size="lg">{profileData.username}</Heading>
                  <Text color="gray.400">{profileData.email}</Text>
                </>
              )}
              
              <HStack>
                {isEditing ? (
                  <>
                    <Button colorScheme="green" onClick={saveProfile}>
                      Salva
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Annulla
                    </Button>
                  </>
                ) : (
                  <>
                    <Button leftIcon={<FaEdit />} onClick={() => setIsEditing(true)}>
                      Modifica
                    </Button>
                    <Button leftIcon={<FaShare />} onClick={shareProfile}>
                      Condividi
                    </Button>
                    <IconButton
                      icon={isPublic ? <FaUnlock /> : <FaLock />}
                      onClick={() => setIsPublic(!isPublic)}
                      aria-label="Privacy"
                    />
                  </>
                )}
              </HStack>
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

        {/* Tabs con liste manga */}
        <Tabs colorScheme="purple">
          <TabList>
            <Tab>In lettura</Tab>
            <Tab>Completati</Tab>
            <Tab>Preferiti</Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel>
              {/* Lista manga in lettura */}
            </TabPanel>
            <TabPanel>
              {/* Lista manga completati */}
            </TabPanel>
            <TabPanel>
              {/* Lista preferiti */}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  );
}

export default Profile;
