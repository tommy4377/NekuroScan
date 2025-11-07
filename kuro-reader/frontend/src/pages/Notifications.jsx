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
        <Box 
          bg="gray.800" 
          p={6} 
          borderRadius="xl"
          border="1px solid"
          borderColor="gray.700"
        >
          <HStack justify="space-between" flexWrap="wrap" gap={4}>
            <VStack align="start" spacing={1}>
              <Heading size={{ base: 'lg', md: 'xl' }}>Notifiche</Heading>
              <Text fontSize="sm" color="gray.400">
                Resta aggiornato sui tuoi manga preferiti
              </Text>
            </VStack>
          
            {notificationPermission === 'granted' ? (
              <Badge colorScheme="green" fontSize="sm" px={3} py={2} borderRadius="md">
                <HStack spacing={2}>
                  <FaCheckCircle size={14} />
                  <Text>Attive</Text>
                </HStack>
              </Badge>
            ) : (
              <Button
                size="sm"
                colorScheme="purple"
                onClick={enableBrowserNotifications}
                leftIcon={<FaBell />}
              >
                Attiva notifiche
              </Button>
            )}
          </HStack>
        </Box>

        <Box bg="gray.800" borderRadius="xl" border="1px solid" borderColor="gray.700">
          <Tabs colorScheme="purple" variant="soft-rounded" isLazy>
            <TabList p={4} bg="gray.900" borderTopRadius="xl">
              <Tab
                _selected={{ 
                  bg: 'purple.500', 
                  color: 'white'
                }}
              >
                <HStack spacing={2}>
                  <FaBell size={14} />
                  <Text fontSize="sm">Recenti</Text>
                  {notifications.length > 0 && (
                    <Badge colorScheme="purple" fontSize="xs">{notifications.length}</Badge>
                  )}
                </HStack>
              </Tab>
              <Tab
                _selected={{ 
                  bg: 'blue.500', 
                  color: 'white'
                }}
              >
                <HStack spacing={2}>
                  <FaBookOpen size={14} />
                  <Text fontSize="sm">Seguiti</Text>
                  <Badge colorScheme="blue" fontSize="xs">{mangaSubscriptions.length}</Badge>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              {/* Tab Notifiche */}
              <TabPanel px={6} py={8}>
                {notifications.length === 0 ? (
                  <Center py={12}>
                    <VStack spacing={4}>
                      <Box p={4} bg="purple.900" borderRadius="full">
                        <FaBell size={40} color="var(--chakra-colors-purple-300)" />
                      </Box>
                      <VStack spacing={2}>
                        <Text fontSize="lg" fontWeight="bold" color="gray.300">
                          Nessuna notifica
                        </Text>
                        <Text fontSize="sm" color="gray.500" textAlign="center" maxW="400px">
                          Riceverai notifiche sui nuovi capitoli dei tuoi manga preferiti
                        </Text>
                      </VStack>
                      <Button
                        size="sm"
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
                        bg="gray.900"
                        borderRadius="lg"
                        borderLeft="4px solid"
                        borderColor="purple.500"
                        transition="all 0.2s"
                        _hover={{ bg: 'gray.800' }}
                      >
                        <HStack justify="space-between">
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="bold" fontSize="sm">{notif.title}</Text>
                            <Text fontSize="xs" color="gray.400">{notif.description}</Text>
                            <Text fontSize="xs" color="gray.500">{formatTime(notif.timestamp)}</Text>
                          </VStack>
                          <IconButton
                            icon={<FaTrash />}
                            size="xs"
                            variant="ghost"
                            colorScheme="red"
                            aria-label="Elimina"
                          />
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                )}
              </TabPanel>

              {/* Tab Manga Seguiti */}
              <TabPanel px={6} py={8}>
                {mangaSubscriptions.length > 0 ? (
                  <>
                    <Alert status="info" borderRadius="lg" mb={6} bg="blue.900" border="1px solid" borderColor="blue.700">
                      <AlertIcon />
                      <Box>
                        <AlertTitle fontSize="sm">Notifiche automatiche</AlertTitle>
                        <AlertDescription fontSize="xs">
                          Riceverai notifiche per {mangaSubscriptions.length} manga seguiti
                        </AlertDescription>
                      </Box>
                    </Alert>

                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                      {mangaSubscriptions.map((manga, i) => (
                        <Box
                          key={manga.mangaUrl || `manga-${i}`}
                          bg="gray.900"
                          borderRadius="lg"
                          overflow="hidden"
                          cursor="pointer"
                          transition="all 0.3s"
                          border="1px solid"
                          borderColor="gray.700"
                          _hover={{ 
                            transform: 'translateY(-4px)', 
                            boxShadow: 'xl',
                            borderColor: 'purple.500'
                          }}
                          onClick={() => {
                            const source = manga.source || 'mangaWorld';
                            const encodedUrl = btoa(manga.mangaUrl)
                              .replace(/\+/g, '-')
                              .replace(/\//g, '_')
                              .replace(/=/g, '');
                            navigate(`/manga/${source}/${encodedUrl}`);
                          }}
                        >
                          <HStack spacing={0} align="stretch">
                            {manga.cover && (
                              <Image
                                src={manga.cover}
                                alt={manga.title}
                                w="70px"
                                h="100px"
                                objectFit="cover"
                                fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='100'%3E%3Crect fill='%23333' width='70' height='100'/%3E%3C/svg%3E"
                              />
                            )}
                            <VStack align="start" p={3} spacing={2} flex="1">
                              <Text fontWeight="bold" fontSize="xs" noOfLines={2}>
                                {manga.title}
                              </Text>
                              {manga.lastChapterIndex !== undefined && (
                                <Badge colorScheme="purple" fontSize="xs">
                                  Cap. {manga.lastChapterIndex + 1}
                                </Badge>
                              )}
                              <Badge colorScheme="green" fontSize="xs">
                                <HStack spacing={1}>
                                  <FaCheckCircle size={10} />
                                  <Text>Attivo</Text>
                                </HStack>
                              </Badge>
                            </VStack>
                          </HStack>
                        </Box>
                      ))}
                    </SimpleGrid>
                  </>
                ) : (
                  <Center py={12}>
                    <VStack spacing={4}>
                      <Box p={4} bg="blue.900" borderRadius="full">
                        <FaBookOpen size={40} color="var(--chakra-colors-blue-300)" />
                      </Box>
                      <VStack spacing={2}>
                        <Text fontSize="lg" fontWeight="bold" color="gray.300">
                          Nessun manga seguito
                        </Text>
                        <Text fontSize="sm" color="gray.500" textAlign="center" maxW="400px">
                          Aggiungi manga ai preferiti per ricevere notifiche
                        </Text>
                      </VStack>
                      <Button
                        size="sm"
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
        </Box>
      </VStack>
    </Container>
  );
}