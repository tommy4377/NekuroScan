import React, { useEffect, useState } from 'react';
import {
  Container, VStack, HStack, Heading, Text, Avatar, SimpleGrid, Box,
  Badge, Tabs, TabList, Tab, TabPanels, TabPanel, Center, Spinner,
  Button, useToast, Stat, StatLabel, StatNumber, Image, Flex,
  IconButton, Tooltip, Skeleton, SkeletonCircle, SkeletonText
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaLock, FaUserPlus, FaUserMinus, FaHeart, FaBookOpen, 
  FaTrophy, FaEye, FaClock, FaShare, FaTwitter, FaDiscord,
  FaInstagram, FaGithub, FaTiktok, FaGlobe, FaUserFriends
} from 'react-icons/fa';
// import { motion } from 'framer-motion'; // Rimosso per evitare errori React #300
import MangaCard from '../components/MangaCard';
import useAuth from '../hooks/useAuth';
import axios from '../api';
import { config } from '../config';
import { useSEO, SEOTemplates } from '../hooks/useSEO';

// const Box = motion(Box); // Rimosso per evitare errori React #300

export default function PublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [checkingFollow, setCheckingFollow] = useState(false);

  useEffect(() => {
    loadProfile();
    if (user && username !== user.username) {
      checkFollowStatus();
    }
  }, [username, user]);

  const loadProfile = async () => {
    setLoading(true);
    
    try {
      const response = await axios.get(`${config.API_URL}/api/profile/${username}`);
      setProfile(response.data);
    } catch (error) {
      if (error.response?.status === 403) {
        // Private profile
        setProfile({ isPrivate: true });
      } else {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
  if (!user) return;

  setCheckingFollow(true);
  try {
    const response = await axios.get(
      `${config.API_URL}/api/user/${user.username}/following`,
      { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
    );
    const list = response.data.following || [];
    const isFollowing = list.some((u) => u.username?.toLowerCase() === username.toLowerCase());
    setFollowing(isFollowing);
  } catch (error) {
    console.error('Error checking follow status:', error);
  } finally {
    setCheckingFollow(false);
  }
};


  const toggleFollow = async () => {
    if (!user) {
      toast({
        title: 'Accedi per seguire',
        status: 'warning',
        duration: 2000
      });
      navigate('/login');
      return;
    }

    try {
      const response = await axios.post(
        `${config.API_URL}/api/user/follow/${username}`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      setFollowing(response.data.following);
      toast({
        title: response.data.following ? 'Stai seguendo' : 'Non stai più seguendo',
        status: 'success',
        duration: 2000
      });
    } catch (error) {
      toast({
        title: 'Errore',
        description: error.response?.data?.message || 'Impossibile completare l\'azione',
        status: 'error',
        duration: 3000
      });
    }
  };

  const shareProfile = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `Profilo di ${profile.displayName}`,
        text: `Guarda il profilo di ${profile.displayName} su NeKuro Scan!`,
        url
      }).catch(() => {
        navigator.clipboard.writeText(url);
        toast({ title: 'Link copiato!', status: 'success' });
      });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: 'Link copiato!', status: 'success' });
    }
  };

  const formatReadingTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={6} align="stretch">
          <Skeleton height="250px" borderRadius="xl" />
          <HStack spacing={4}>
            <SkeletonCircle size="120" />
            <VStack align="start" flex={1} spacing={3}>
              <Skeleton height="30px" width="200px" />
              <Skeleton height="20px" width="150px" />
              <SkeletonText noOfLines={3} />
            </VStack>
          </HStack>
          <SimpleGrid columns={4} spacing={4}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} height="100px" borderRadius="lg" />
            ))}
          </SimpleGrid>
        </VStack>
      </Container>
    );
  }

  if (profile?.isPrivate) {
    return (
      <Container maxW="container.md" py={20}>
        <VStack spacing={6}>
          <Box p={6} bg="gray.800" borderRadius="full">
            <FaLock size={60} color="gray" />
          </Box>
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

  const isOwnProfile = user?.username?.toLowerCase() === username.toLowerCase();

  // Get theme color
  const getThemeColor = () => {
    const themes = {
      default: 'purple',
      dark: 'gray',
      ocean: 'blue',
      sunset: 'orange',
      forest: 'green',
      sakura: 'pink'
    };
    return themes[profile.theme] || 'purple';
  };

  const themeColor = getThemeColor();

  // ✅ SEO Dinamico basato su profilo utente
  const SEOHelmet = useSEO(SEOTemplates.profile(profile.username, !profile.isPrivate));

  return (
    <>
      {SEOHelmet}
      <Container maxW="container.xl" py={8}>
        <VStack spacing={6} align="stretch">
          {/* Banner & Profile */}
          <Box position="relative" borderRadius="xl" overflow="hidden">
          {/* Banner */}
          <Box
            h={{ base: '150px', md: '250px' }}
            bg={profile.bannerUrl ? `url(${profile.bannerUrl})` : `linear-gradient(135deg, ${themeColor}.600 0%, ${themeColor}.800 100%)`}
            bgSize="cover"
            bgPosition="center"
          />
          
          {/* Profile Content */}
          <Box bg="gray.800" px={{ base: 4, md: 8 }} pb={6}>
            <Flex
              direction={{ base: 'column', md: 'row' }}
              align={{ base: 'center', md: 'end' }}
              position="relative"
              mt="-50px"
            >
              {/* Avatar */}
              <Avatar
                size="2xl"
                name={profile.displayName || profile.username}
                src={profile.avatarUrl}
                border="4px solid"
                borderColor="gray.800"
                bg={`${themeColor}.500`}
              />
              
              {/* Info */}
              <VStack
                align={{ base: 'center', md: 'start' }}
                flex={1}
                ml={{ base: 0, md: 6 }}
                mt={{ base: 4, md: 0 }}
                spacing={3}
                width="100%"
              >
                <HStack justify="space-between" width="100%" flexWrap="wrap">
                  <VStack align={{ base: 'center', md: 'start' }} spacing={1}>
                    <Heading size="lg">{profile.displayName}</Heading>
                    <HStack>
                      <Text color="gray.400">@{profile.username}</Text>
                      <Badge colorScheme="green">
                        <HStack spacing={1}>
                          <FaGlobe size="10" />
                          <Text>Pubblico</Text>
                        </HStack>
                      </Badge>
                    </HStack>
                  </VStack>
                  
                  <HStack>
                    {!isOwnProfile && user && (
                      <Button
                        leftIcon={following ? <FaUserMinus /> : <FaUserPlus />}
                        colorScheme={following ? 'gray' : themeColor}
                        size="sm"
                        onClick={toggleFollow}
                        isLoading={checkingFollow}
                      >
                        {following ? 'Non seguire' : 'Segui'}
                      </Button>
                    )}
                    {isOwnProfile && (
                      <Button
                        size="sm"
                        onClick={() => navigate('/profile')}
                        colorScheme={themeColor}
                      >
                        Modifica profilo
                      </Button>
                    )}
                    <IconButton
                      icon={<FaShare />}
                      size="sm"
                      variant="outline"
                      onClick={shareProfile}
                      aria-label="Condividi"
                    />
                  </HStack>
                </HStack>
                
                {profile.bio && (
                  <Text color="gray.300" width="100%">
                    {profile.bio}
                  </Text>
                )}
                
                {/* Badges */}
                {profile.badges?.length > 0 && (
                  <HStack spacing={2}>
                    {profile.badges.map((badge, i) => (
                      <Tooltip key={badge || i} label={badge}>
                        <Badge colorScheme={themeColor}>{badge}</Badge>
                      </Tooltip>
                    ))}
                  </HStack>
                )}
                
                {/* Social Links */}
                {profile.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
                  <HStack spacing={2}>
                    {profile.socialLinks.twitter && (
                      <IconButton
                        icon={<FaTwitter />}
                        size="sm"
                        variant="ghost"
                        as="a"
                        href={`https://twitter.com/${profile.socialLinks.twitter}`}
                        target="_blank"
                        aria-label="Twitter"
                      />
                    )}
                    {profile.socialLinks.discord && (
                      <Tooltip label={profile.socialLinks.discord}>
                        <IconButton
                          icon={<FaDiscord />}
                          size="sm"
                          variant="ghost"
                          aria-label="Discord"
                        />
                      </Tooltip>
                    )}
                    {profile.socialLinks.instagram && (
                      <IconButton
                        icon={<FaInstagram />}
                        size="sm"
                        variant="ghost"
                        as="a"
                        href={`https://instagram.com/${profile.socialLinks.instagram}`}
                        target="_blank"
                        aria-label="Instagram"
                      />
                    )}
                    {profile.socialLinks.github && (
                      <IconButton
                        icon={<FaGithub />}
                        size="sm"
                        variant="ghost"
                        as="a"
                        href={`https://github.com/${profile.socialLinks.github}`}
                        target="_blank"
                        aria-label="GitHub"
                      />
                    )}
                    {profile.socialLinks.tiktok && (
                      <IconButton
                        icon={<FaTiktok />}
                        size="sm"
                        variant="ghost"
                        as="a"
                        href={`https://tiktok.com/@${profile.socialLinks.tiktok}`}
                        target="_blank"
                        aria-label="TikTok"
                      />
                    )}
                  </HStack>
                )}
                
                {/* Member since */}
                {profile.joinedAt && (
                  <Text fontSize="sm" color="gray.500">
                    Membro dal {new Date(profile.joinedAt).toLocaleDateString('it-IT', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Text>
                )}
              </VStack>
            </Flex>
          </Box>
        </Box>

        {/* Stats Grid */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Stat
            p={4}
            bg="gray.800"
            borderRadius="lg"
            borderLeft="4px solid"
            borderLeftColor={`${themeColor}.500`}
          >
            <HStack spacing={3}>
              <Box p={2} bg={`${themeColor}.500`} borderRadius="lg">
                <FaBookOpen color="white" size="16" />
              </Box>
              <Box>
                <StatLabel fontSize="xs">Manga totali</StatLabel>
                <StatNumber fontSize="xl">{profile.stats?.totalRead || 0}</StatNumber>
              </Box>
            </HStack>
          </Stat>
          
          <Stat
            p={4}
            bg="gray.800"
            borderRadius="lg"
            borderLeft="4px solid"
            borderLeftColor="pink.500"
          >
            <HStack spacing={3}>
              <Box p={2} bg="pink.500" borderRadius="lg">
                <FaHeart color="white" size="16" />
              </Box>
              <Box>
                <StatLabel fontSize="xs">Preferiti</StatLabel>
                <StatNumber fontSize="xl">{profile.stats?.favorites || 0}</StatNumber>
              </Box>
            </HStack>
          </Stat>
          
          <Stat
            p={4}
            bg="gray.800"
            borderRadius="lg"
            borderLeft="4px solid"
            borderLeftColor="green.500"
          >
            <HStack spacing={3}>
              <Box p={2} bg="green.500" borderRadius="lg">
                <FaTrophy color="white" size="16" />
              </Box>
              <Box>
                <StatLabel fontSize="xs">Completati</StatLabel>
                <StatNumber fontSize="xl">{profile.stats?.completed || 0}</StatNumber>
              </Box>
            </HStack>
          </Stat>
          
          <Stat
            p={4}
            bg="gray.800"
            borderRadius="lg"
            borderLeft="4px solid"
            borderLeftColor="blue.500"
          >
            <HStack spacing={3}>
              <Box p={2} bg="blue.500" borderRadius="lg">
                <FaUserFriends color="white" size="16" />
              </Box>
              <Box>
                <StatLabel fontSize="xs">Followers</StatLabel>
                <StatNumber fontSize="xl">{profile.stats?.followers || 0}</StatNumber>
              </Box>
            </HStack>
          </Stat>
        </SimpleGrid>

        {/* Library Tabs */}
        <Tabs colorScheme={themeColor} variant="enclosed">
          <TabList>
            <Tab>
              In lettura ({profile.reading?.length || 0})
            </Tab>
            <Tab>
              Preferiti ({profile.favorites?.length || 0})
            </Tab>
            <Tab>
              Completati ({profile.completed?.length || 0})
            </Tab>
          </TabList>
          
          <TabPanels >
            <TabPanel px={{ base: 0, md: 4 }} >
              {profile.reading?.length > 0 ? (
                <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4} >
                  {profile.reading.map((manga, i) => (
                    <Box
                      key={manga.url || `reading-${i}`}
                    >
                      <MangaCard manga={manga} />
                    </Box>
                  ))}
                </SimpleGrid>
              ) : (
                <Center py={12} bg="gray.800" borderRadius="lg">
                  <VStack spacing={3}>
                    <FaBookOpen size={40} color="gray" />
                    <Text color="gray.500">Nessun manga in lettura</Text>
                  </VStack>
                </Center>
              )}
            </TabPanel>
            
            <TabPanel px={{ base: 0, md: 4 }}>
              {profile.favorites?.length > 0 ? (
                <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4} >
                  {profile.favorites.map((manga, i) => (
                    <Box
                      key={manga.url || `favorites-${i}`}
                    >
                      <MangaCard manga={manga} />
                    </Box>
                  ))}
                </SimpleGrid>
              ) : (
                <Center py={12} bg="gray.800" borderRadius="lg">
                  <VStack spacing={3}>
                    <FaHeart size={40} color="gray" />
                    <Text color="gray.500">Nessun preferito</Text>
                  </VStack>
                </Center>
              )}
            </TabPanel>
            
            <TabPanel px={{ base: 0, md: 4 }}>
              {profile.completed?.length > 0 ? (
                <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4} >
                  {profile.completed.map((manga, i) => (
                    <Box
                      key={manga.url || `completed-${i}`}
                    >
                      <MangaCard manga={manga} />
                    </Box>
                  ))}
                </SimpleGrid>
              ) : (
                <Center py={12} bg="gray.800" borderRadius="lg">
                  <VStack spacing={3}>
                    <FaTrophy size={40} color="gray" />
                    <Text color="gray.500">Nessun manga completato</Text>
                  </VStack>
                </Center>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
    </>
  );
}
