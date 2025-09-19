import React, { useEffect, useState } from 'react';
import {
  Container, VStack, HStack, Heading, Text, Avatar, SimpleGrid, Box,
  Badge, Tabs, TabList, Tab, TabPanels, TabPanel, Center, Spinner,
  Button, useToast, Stat, StatLabel, StatNumber
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaLock, FaUserPlus } from 'react-icons/fa';
import MangaCard from '../components/MangaCard';
import useAuth from '../hooks/useAuth';

export default function PublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    setLoading(true);
    
    try {
      // Simula il caricamento del profilo
      // In produzione, faresti una chiamata API
      
      // Per ora usiamo localStorage per demo
      const savedProfiles = JSON.parse(localStorage.getItem('publicProfiles') || '{}');
      const profileData = savedProfiles[username];
      
      if (profileData) {
        setProfile(profileData);
        setIsPrivate(profileData.privacy === 'private');
      } else {
        // Se è il proprio profilo
        if (user?.username === username) {
          const avatar = localStorage.getItem('userAvatar');
          const bio = localStorage.getItem('userBio');
          const isPublic = localStorage.getItem('profilePublic') === 'true';
          const privacy = localStorage.getItem('profilePrivacy') || 'public';
          
          if (!isPublic || privacy === 'private') {
            setIsPrivate(true);
          } else {
            const reading = JSON.parse(localStorage.getItem('reading') || '[]');
            const completed = JSON.parse(localStorage.getItem('completed') || '[]');
            const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
            
            setProfile({
              username,
              avatar,
              bio,
              stats: {
                totalRead: reading.length + completed.length,
                favorites: favorites.length,
                completed: completed.length
              },
              reading: reading.slice(0, 12),
              completed: completed.slice(0, 12),
              favorites: favorites.slice(0, 12)
            });
          }
        } else {
          // Profilo non trovato
          setProfile(null);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const followUser = () => {
    toast({
      title: 'Funzione in arrivo',
      description: 'La funzione follow sarà disponibile presto',
      status: 'info',
      duration: 3000
    });
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

  if (isPrivate) {
    return (
      <Container maxW="container.md" py={20}>
        <VStack spacing={6}>
          <FaLock size={60} color="gray" />
          <Heading size="lg">Profilo Privato</Heading>
          <Text color="gray.400">
            Questo profilo non è pubblico
          </Text>
          <Button colorScheme="purple" onClick={() => navigate('/home')}>
            Torna alla Home
          </Button>
        </VStack>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container maxW="container.md" py={20}>
        <VStack spacing={6}>
          <Heading size="lg">Utente non trovato</Heading>
          <Text color="gray.400">
            Il profilo "@{username}" non esiste
          </Text>
          <Button colorScheme="purple" onClick={() => navigate('/home')}>
            Torna alla Home
          </Button>
        </VStack>
      </Container>
    );
  }

  const isOwnProfile = user?.username === username;

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Profile Header */}
        <Box bg="gray.800" p={6} borderRadius="xl">
          <HStack spacing={6} align="start" flexWrap="wrap">
            <Avatar 
              size="2xl" 
              name={profile.username} 
              src={profile.avatar}
              border="4px solid"
              borderColor="purple.500"
            />
            <VStack align="start" spacing={3} flex={1}>
              <HStack>
                <Heading size="lg">@{profile.username}</Heading>
                {!isOwnProfile && (
                  <Button 
                    leftIcon={<FaUserPlus />} 
                    colorScheme="purple" 
                    size="sm"
                    onClick={followUser}
                  >
                    Segui
                  </Button>
                )}
              </HStack>
              
              {profile.bio && (
                <Text color="gray.300">{profile.bio}</Text>
              )}
              
              <HStack spacing={6}>
                <Stat>
                  <StatLabel>Letti</StatLabel>
                  <StatNumber>{profile.stats?.totalRead || 0}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Preferiti</StatLabel>
                  <StatNumber>{profile.stats?.favorites || 0}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Completati</StatLabel>
                  <StatNumber>{profile.stats?.completed || 0}</StatNumber>
                </Stat>
              </HStack>
            </VStack>
          </HStack>
        </Box>

        {/* Library Tabs */}
        <Tabs colorScheme="purple" variant="enclosed">
          <TabList>
            <Tab>In lettura ({profile.reading?.length || 0})</Tab>
            <Tab>Preferiti ({profile.favorites?.length || 0})</Tab>
            <Tab>Completati ({profile.completed?.length || 0})</Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel>
              {profile.reading?.length > 0 ? (
                <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                  {profile.reading.map((manga, i) => (
                    <MangaCard key={i} manga={manga} />
                  ))}
                </SimpleGrid>
              ) : (
                <Center py={8}>
                  <Text color="gray.500">Nessun manga in lettura</Text>
                </Center>
              )}
            </TabPanel>
            
            <TabPanel>
              {profile.favorites?.length > 0 ? (
                <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                  {profile.favorites.map((manga, i) => (
                    <MangaCard key={i} manga={manga} />
                  ))}
                </SimpleGrid>
              ) : (
                <Center py={8}>
                  <Text color="gray.500">Nessun preferito</Text>
                </Center>
              )}
            </TabPanel>
            
            <TabPanel>
              {profile.completed?.length > 0 ? (
                <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                  {profile.completed.map((manga, i) => (
                    <MangaCard key={i} manga={manga} />
                  ))}
                </SimpleGrid>
              ) : (
                <Center py={8}>
                  <Text color="gray.500">Nessun manga completato</Text>
                </Center>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  );
}
