import React, { useState, useEffect } from 'react';
import {
  Container, VStack, HStack, Heading, Text, Box, Badge, Button,
  IconButton, useToast, Center, Spinner, Divider, Image, SimpleGrid,
  Tabs, TabList, TabPanels, Tab, TabPanel, Alert, AlertIcon, AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import { FaBell, FaTrash, FaBellSlash, FaBookOpen, FaCheckCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import axios from 'axios';
import { config } from '../config';

export default function Notifications() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mangaSubscriptions, setMangaSubscriptions] = useState([]);

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadSubscriptions();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Future: load real notifications from server
      setNotifications([]);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const response = await axios.get(`${config.API_URL}/api/user/data`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Get reading list and favorites as subscriptions
      const reading = response.data.reading || [];
      const favorites = response.data.favorites || [];
      
      // Combina e deduplicazione
      const all = [...reading, ...favorites];
      const uniqueMap = new Map(all.map(item => [item.mangaUrl, item]));
      setMangaSubscriptions(Array.from(uniqueMap.values()));
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    }
  };

  const enableBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Notifiche non supportate',
        description: 'Il tuo browser non supporta le notifiche',
        status: 'error',
        duration: 3000
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        new Notification('Notifiche attivate!', {
          body: 'Riceverai notifiche per i nuovi capitoli dei tuoi manga preferiti',
          icon: '/web-app-manifest-192x192.png',
          badge: '/web-app-manifest-192x192.png'
        });
        
        toast({
          title: 'Notifiche attivate',
          description: 'Riceverai aggiornamenti sui nuovi capitoli',
          status: 'success',
          duration: 3000
        });
      } else if (permission === 'denied') {
        toast({
          title: 'Permesso negato',
          description: 'Abilita le notifiche nelle impostazioni del browser',
          status: 'warning',
          duration: 4000
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} minuti fa`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)} ore fa`;
    } else {
      return `${Math.floor(diff / 86400000)} giorni fa`;
    }
  };

  if (!user) {
    return (
      <Container maxW="container.md" py={20}>
        <VStack spacing={6}>
          <FaBell size={60} color="gray" />
          <Heading size="lg">Accedi per vedere le notifiche</Heading>
          <Text color="gray.400">
            Crea un account per ricevere notifiche sui nuovi capitoli
          </Text>
          <Button colorScheme="purple" onClick={() => navigate('/login')}>
            Accedi
          </Button>
        </VStack>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxW="container.md" py={20}>
        <Center>
          <Spinner size="xl" color="purple.500" />
        </Center>
      </Container>
    );
  }

  const notificationPermission = typeof Notification !== 'undefined' ? Notification.permission : 'denied';

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <HStack>
            <Box p={3} bg="purple.500" borderRadius="xl" boxShadow="lg">
              <FaBell color="white" size="24" />
            </Box>
            <VStack align="start" spacing={0}>
              <Heading size="xl">🔔 Notifiche</Heading>
              <Text fontSize="sm" color="gray.400">
                Resta aggiornato sui tuoi manga preferiti
              </Text>
            </VStack>
          </HStack>
          
          {notificationPermission === 'granted' ? (
            <Badge colorScheme="green" fontSize="md" p={2} borderRadius="md">
              <HStack spacing={2}>
                <FaCheckCircle />
                <Text>Notifiche attive</Text>
              </HStack>
            </Badge>
          ) : (
            <Button
              size="md"
              colorScheme="purple"
              onClick={enableBrowserNotifications}
              leftIcon={<FaBell />}
            >
              Attiva notifiche browser
            </Button>
          )}
        </HStack>

        <Tabs colorScheme="purple" variant="enclosed">
          <TabList>
            <Tab>
              <HStack>
                <FaBell />
                <Text>Ultime notifiche</Text>
                {notifications.length > 0 && (
                  <Badge colorScheme="purple">{notifications.length}</Badge>
                )}
              </HStack>
            </Tab>
            <Tab>
              <HStack>
                <FaBookOpen />
                <Text>Manga seguiti</Text>
                <Badge colorScheme="blue">{mangaSubscriptions.length}</Badge>
              </HStack>
            </Tab>
          </TabList>

          <TabPanels>
            {/* Tab Notifiche */}
            <TabPanel>
              {notifications.length === 0 ? (
                <Center py={16} bg="gray.800" borderRadius="xl">
                  <VStack spacing={6}>
                    <Box p={6} bg="purple.900" borderRadius="full">
                      <FaBell size={60} color="var(--chakra-colors-purple-300)" />
                    </Box>
                    <VStack spacing={2}>
                      <Text fontSize="xl" fontWeight="bold" color="gray.300">
                        Nessuna notifica al momento
                      </Text>
                      <Text fontSize="md" color="gray.500" textAlign="center" maxW="400px">
                        Quando usciranno nuovi capitoli dei tuoi manga preferiti, 
                        riceverai una notifica qui
                      </Text>
                    </VStack>
                    <Button
                      colorScheme="purple"
                      variant="outline"
                      onClick={() => navigate('/library')}
                      leftIcon={<FaBookOpen />}
                    >
                      Vai alla libreria
                    </Button>
                  </VStack>
                </Center>
              ) : (
                <VStack align="stretch" spacing={3}>
                  {notifications.map((notif, i) => (
                    <Box
                      key={i}
                      p={4}
                      bg="gray.800"
                      borderRadius="lg"
                      borderLeft="4px solid"
                      borderColor="purple.500"
                    >
                      <HStack justify="space-between">
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="bold">{notif.title}</Text>
                          <Text fontSize="sm" color="gray.400">{notif.description}</Text>
                          <Text fontSize="xs" color="gray.500">{formatTime(notif.timestamp)}</Text>
                        </VStack>
                        <IconButton
                          icon={<FaTrash />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          aria-label="Elimina notifica"
                        />
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              )}
            </TabPanel>

            {/* Tab Manga Seguiti */}
            <TabPanel>
              {mangaSubscriptions.length > 0 ? (
                <>
                  <Alert status="info" borderRadius="lg" mb={6}>
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Notifiche automatiche</AlertTitle>
                      <AlertDescription>
                        Riceverai notifiche quando usciranno nuovi capitoli di questi {mangaSubscriptions.length} manga
                      </AlertDescription>
                    </Box>
                  </Alert>

                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                    {mangaSubscriptions.map((manga, i) => (
                      <Box
                        key={manga.mangaUrl || `manga-${i}`}
                        bg="gray.800"
                        borderRadius="lg"
                        overflow="hidden"
                        cursor="pointer"
                        transition="all 0.2s"
                        _hover={{ transform: 'translateY(-4px)', boxShadow: 'xl' }}
                        onClick={() => {
                          const source = manga.source || 'mangaworld';
                          const encodedUrl = btoa(manga.mangaUrl);
                          navigate(`/manga/${source}/${encodedUrl}`);
                        }}
                      >
                        <HStack spacing={0} align="stretch">
                          {manga.cover && (
                            <Image
                              src={manga.cover}
                              alt={manga.title}
                              w="80px"
                              h="120px"
                              objectFit="cover"
                              fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='120'%3E%3Crect fill='%23333' width='80' height='120'/%3E%3C/svg%3E"
                            />
                          )}
                          <VStack align="start" p={3} spacing={2} flex="1">
                            <Text fontWeight="bold" fontSize="sm" noOfLines={2}>
                              {manga.title}
                            </Text>
                            {manga.lastChapterIndex !== undefined && (
                              <Badge colorScheme="purple" fontSize="xs">
                                Cap. {manga.lastChapterIndex + 1}
                              </Badge>
                            )}
                            <Badge colorScheme="green" fontSize="xs">
                              <HStack spacing={1}>
                                <FaBell size={10} />
                                <Text>Notifiche ON</Text>
                              </HStack>
                            </Badge>
                          </VStack>
                        </HStack>
                      </Box>
                    ))}
                  </SimpleGrid>
                </>
              ) : (
                <Center py={16} bg="gray.800" borderRadius="xl">
                  <VStack spacing={6}>
                    <Box p={6} bg="blue.900" borderRadius="full">
                      <FaBookOpen size={60} color="var(--chakra-colors-blue-300)" />
                    </Box>
                    <VStack spacing={2}>
                      <Text fontSize="xl" fontWeight="bold" color="gray.300">
                        Nessun manga seguito
                      </Text>
                      <Text fontSize="md" color="gray.500" textAlign="center" maxW="400px">
                        Aggiungi manga ai preferiti o inizia a leggerli per ricevere notifiche
                      </Text>
                    </VStack>
                    <Button
                      colorScheme="purple"
                      onClick={() => navigate('/home')}
                      leftIcon={<FaBookOpen />}
                    >
                      Esplora manga
                    </Button>
                  </VStack>
                </Center>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  );
}