import React, { useState, useEffect } from 'react';
import {
  Container, VStack, HStack, Heading, Text, Box, Badge, Button,
  IconButton, useToast, Center, Spinner, Divider
} from '@chakra-ui/react';
import { FaBell, FaTrash, FaBellSlash } from 'react-icons/fa';
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
      
      // Get reading list as subscriptions
      const reading = response.data.reading || [];
      setMangaSubscriptions(reading.slice(0, 10));
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

  return (
    <Container maxW="container.md" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <HStack>
            <Box p={2} bg="purple.500" borderRadius="lg">
              <FaBell color="white" size="20" />
            </Box>
            <VStack align="start" spacing={0}>
              <Heading size="lg">Notifiche</Heading>
              <Text fontSize="sm" color="gray.400">
                Gestisci le tue notifiche
              </Text>
            </VStack>
          </HStack>
          
          <Button
            size="sm"
            colorScheme="purple"
            onClick={enableBrowserNotifications}
            leftIcon={<FaBell />}
          >
            Attiva notifiche browser
          </Button>
        </HStack>

        {/* Manga Subscriptions */}
        {mangaSubscriptions.length > 0 && (
          <Box bg="gray.800" p={6} borderRadius="lg">
            <Heading size="md" mb={4}>I tuoi manga seguiti</Heading>
            <Text fontSize="sm" color="gray.400" mb={4}>
              Riceverai notifiche quando usciranno nuovi capitoli
            </Text>
            <VStack align="stretch" spacing={3}>
              {mangaSubscriptions.map((manga, i) => (
                <HStack
                  key={manga.mangaUrl || `manga-${i}`}
                  p={3}
                  bg="gray.700"
                  borderRadius="md"
                  justify="space-between"
                >
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="bold" fontSize="sm" noOfLines={1}>
                      {manga.title}
                    </Text>
                    <Text fontSize="xs" color="gray.400">
                      Ultimo cap. letto: {manga.lastChapterIndex + 1}
                    </Text>
                  </VStack>
                  <IconButton
                    icon={<FaBellSlash />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    aria-label="Disattiva notifiche"
                    onClick={() => {
                      toast({
                        title: 'Sistema in sviluppo',
                        description: 'Presto potrai gestire le notifiche per singolo manga',
                        status: 'info',
                        duration: 2000
                      });
                    }}
                  />
                </HStack>
              ))}
            </VStack>
          </Box>
        )}

        {/* Empty State for notifications */}
        {notifications.length === 0 && (
          <Center py={12} bg="gray.800" borderRadius="lg">
            <VStack spacing={4}>
              <FaBell size={60} color="gray" />
              <Text fontSize="lg" color="gray.500">
                Nessuna notifica al momento
              </Text>
              <Text fontSize="sm" color="gray.600" textAlign="center" maxW="300px">
                Quando ci saranno nuovi capitoli dei tuoi manga preferiti, 
                riceverai una notifica qui
              </Text>
            </VStack>
          </Center>
        )}
      </VStack>
    </Container>
  );
}