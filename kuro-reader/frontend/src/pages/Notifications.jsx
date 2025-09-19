import React, { useState, useEffect } from 'react';
import {
  Container, VStack, HStack, Heading, Text, Box, Badge, Button,
  IconButton, useToast, Avatar, Divider, Center, Spinner
} from '@chakra-ui/react';
import { FaBell, FaTrash, FaCheck } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function Notifications() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = () => {
    setLoading(true);
    
    // Simula notifiche
    setTimeout(() => {
      const mockNotifications = [
        {
          id: 1,
          type: 'chapter',
          title: 'Nuovo capitolo disponibile',
          message: 'One Piece - Capitolo 1100 è ora disponibile',
          manga: { title: 'One Piece', url: '/manga/one-piece' },
          timestamp: new Date().toISOString(),
          read: false
        },
        {
          id: 2,
          type: 'follow',
          title: 'Nuovo follower',
          message: '@user123 ha iniziato a seguirti',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          read: false
        },
        {
          id: 3,
          type: 'update',
          title: 'Aggiornamento sistema',
          message: 'Nuove funzionalità disponibili in KuroReader',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          read: true
        }
      ];
      
      setNotifications(mockNotifications);
      setLoading(false);
    }, 1000);
  };

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
    toast({
      title: 'Tutte le notifiche sono state lette',
      status: 'success',
      duration: 2000
    });
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast({
      title: 'Notifica eliminata',
      status: 'info',
      duration: 2000
    });
  };

  const clearAll = () => {
    setNotifications([]);
    toast({
      title: 'Tutte le notifiche sono state cancellate',
      status: 'info',
      duration: 2000
    });
  };

  const getIcon = (type) => {
    switch(type) {
      case 'chapter':
        return '📖';
      case 'follow':
        return '👤';
      case 'update':
        return '🔔';
      default:
        return '📬';
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

  const unreadCount = notifications.filter(n => !n.read).length;

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
              {unreadCount > 0 && (
                <Badge colorScheme="red">{unreadCount} non lette</Badge>
              )}
            </VStack>
          </HStack>
          
          {notifications.length > 0 && (
            <HStack>
              <Button size="sm" onClick={markAllAsRead} leftIcon={<FaCheck />}>
                Segna tutto come letto
              </Button>
              <Button size="sm" variant="ghost" onClick={clearAll} leftIcon={<FaTrash />}>
                Cancella tutto
              </Button>
            </HStack>
          )}
        </HStack>

        {/* Notifications List */}
        {notifications.length > 0 ? (
          <VStack spacing={3} align="stretch">
            {notifications.map(notif => (
              <Box
                key={notif.id}
                bg={notif.read ? 'gray.800' : 'gray.700'}
                p={4}
                borderRadius="lg"
                cursor="pointer"
                onClick={() => markAsRead(notif.id)}
                position="relative"
                borderLeft="4px solid"
                borderLeftColor={notif.read ? 'transparent' : 'purple.500'}
                _hover={{ bg: 'gray.700' }}
                transition="all 0.2s"
              >
                <HStack justify="space-between" align="start">
                  <HStack align="start" spacing={3}>
                    <Text fontSize="2xl">{getIcon(notif.type)}</Text>
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="bold">{notif.title}</Text>
                      <Text fontSize="sm" color="gray.300">
                        {notif.message}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {formatTime(notif.timestamp)}
                      </Text>
                    </VStack>
                  </HStack>
                  
                  <IconButton
                    icon={<FaTrash />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notif.id);
                    }}
                    aria-label="Elimina"
                  />
                </HStack>
              </Box>
            ))}
          </VStack>
        ) : (
          <Center py={12}>
            <VStack spacing={4}>
              <FaBell size={60} color="gray" />
              <Text fontSize="lg" color="gray.500">
                Nessuna notifica
              </Text>
            </VStack>
          </Center>
        )}
      </VStack>
    </Container>
  );
}
