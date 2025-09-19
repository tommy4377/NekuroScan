import React, { useEffect, useState } from 'react';
import {
  Container, VStack, HStack, Heading, Text, Avatar, SimpleGrid, Box,
  Badge, Tabs, TabList, Tab, TabPanels, TabPanel, Center, Spinner,
  Button, useToast, Stat, StatLabel, StatNumber, Image, Stack
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
      // FIX: Cerca nel database pubblico simulato (che è condiviso)
      const publicProfiles = JSON.parse(localStorage.getItem('PUBLIC_PROFILES_DB') || '{}');
      
      // Cerca il profilo con username case-insensitive
      const profileData = publicProfiles[username.toLowerCase()];
      
      if (profileData) {
        // Profilo pubblico trovato nel database
        setProfile(profileData);
        setIsPrivate(false);
        setLoading(false);
        return;
      }
      
      // Se non trovato nel database pubblico, controlla se è il proprio profilo
      if (user && user.username.toLowerCase() === username.toLowerCase()) {
        // È il proprio profilo, mostralo anche se privato
        const avatar = localStorage.getItem('userAvatar');
        const bio = localStorage.getItem('userBio');
        const isPublic = localStorage.getItem('profilePublic') === 'true';
        
        const reading = JSON.parse(localStorage.getItem('reading') || '[]');
        const completed = JSON.parse(localStorage.getItem('completed') || '[]');
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        
        setProfile({
          username: user.username,
          displayName: user.username,
          avatar,
          bio,
          stats: {
            totalRead: reading.length + completed.length,
            favorites: favorites.length,
            completed: completed.length
          },
          reading: reading.slice(0, 12),
          completed: completed.slice(0, 12),
          favorites: favorites.slice(0, 12),
          privacy: isPublic ? 'public' : 'private'
        });
        setIsPrivate(!isPublic);
        setLoading(false);
        return;
      }
      
      // Profilo non trovato
      setProfile(null);
      setLoading(false);
      
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
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
            Il profilo "@{username}" non esiste o non è pubblico
          </Text>
          <Button colorScheme="purple" onClick={() => navigate('/home')}>
            Torna alla Home
          </Button>
        </VStack>
      </Container>
    );
  }

  const isOwnProfile = user?.username?.toLowerCase() === username.toLowerCase();

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Profile Header - FIX MOBILE */}
        <Box bg="gray.800" p={{ base: 4, md: 6 }} borderRadius="xl">
          <Stack 
            direction={{ base: 'column', md: 'row' }} 
            spacing={{ base: 4, md: 6 }} 
            align={{ base: 'center', md: 'start' }}
          >
            <Avatar 
              size={{ base: 'xl', md: '2xl' }}
              name={profile.displayName || profile.username} 
              src={profile.avatar}
              border="4px solid"
              borderColor="purple.500"
            />
            <VStack align={{ base: 'center', md: 'start' }} spacing={3} flex={1}>
              <HStack>
                <Heading size={{ base: 'md', md: 'lg' }}>
                  @{profile.displayName || profile.username}
                </Heading>
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
                <Text color="gray.300" textAlign={{ base: 'center', md: 'left' }}>
                  {profile.bio}
                </Text>
              )}
              
              <HStack spacing={6}>
                <Stat>
                  <StatLabel fontSize={{ base: 'xs', md: 'sm' }}>Letti</StatLabel>
                  <StatNumber fontSize={{ base: 'md', md: 'lg' }}>
                    {profile.stats?.totalRead || 0}
                  </StatNumber>
                </Stat>
                <Stat>
                  <StatLabel fontSize={{ base: 'xs', md: 'sm' }}>Preferiti</StatLabel>
                  <StatNumber fontSize={{ base: 'md', md: 'lg' }}>
                    {profile.stats?.favorites || 0}
                  </StatNumber>
                </Stat>
                <Stat>
                  <StatLabel fontSize={{ base: 'xs', md: 'sm' }}>Completati</StatLabel>
                  <StatNumber fontSize={{ base: 'md', md: 'lg' }}>
                    {profile.stats?.completed || 0}
                  </StatNumber>
                </Stat>
              </HStack>
            </VStack>
          </Stack>
        </Box>

        {/* Library Tabs */}
        <Tabs colorScheme="purple" variant="enclosed">
          <TabList>
            <Tab fontSize={{ base: 'sm', md: 'md' }}>
              In lettura ({profile.reading?.length || 0})
            </Tab>
            <Tab fontSize={{ base: 'sm', md: 'md' }}>
              Preferiti ({profile.favorites?.length || 0})
            </Tab>
            <Tab fontSize={{ base: 'sm', md: 'md' }}>
              Completati ({profile.completed?.length || 0})
            </Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel px={{ base: 2, md: 4 }}>
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
            
            <TabPanel px={{ base: 2, md: 4 }}>
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
            
            <TabPanel px={{ base: 2, md: 4 }}>
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
