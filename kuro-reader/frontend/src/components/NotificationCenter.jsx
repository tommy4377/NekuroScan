import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, IconButton, Badge, useToast,
  Drawer, DrawerOverlay, DrawerContent, DrawerHeader,
  DrawerBody, DrawerCloseButton, Button, Icon
} from '@chakra-ui/react';
import { FaBell, FaCheck, FaTrash, FaBookOpen } from 'react-icons/fa';
// import { motion, AnimatePresence } from 'framer-motion'; // Rimosso per evitare errori React #300
import { useNavigate } from 'react-router-dom';

// const Box = motion(Box); // Rimosso per evitare errori React #300

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = () => {
    const stored = JSON.parse(localStorage.getItem('notifications') || '[]');
    setNotifications(stored);
  };

  const markAsRead = (id) => {
    const updated = notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    localStorage.setItem('notifications', JSON.stringify(updated));
  };

  const deleteNotification = (id) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    localStorage.setItem('notifications', JSON.stringify(updated));
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem('notifications', JSON.stringify(updated));
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.setItem('notifications', JSON.stringify([]));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <Box position="relative">
        <IconButton
          icon={<FaBell />}
          variant="ghost"
          onClick={() => setIsOpen(true)}
          aria-label="Notifiche"
        />
        {unreadCount > 0 && (
          <Badge
            position="absolute"
            top={-1}
            right={-1}
            colorScheme="red"
            borderRadius="full"
            fontSize="xs"
          >
            {unreadCount}
          </Badge>
        )}
      </Box>

      <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} placement="right">
        <DrawerOverlay />
        <DrawerContent bg="gray.900">
          <DrawerCloseButton />
          <DrawerHeader>
            <HStack justify="space-between">
              <Text>Notifiche</Text>
              {notifications.length > 0 && (
                <HStack spacing={2}>
                  <Button size="xs" onClick={markAllAsRead}>
                    Segna tutte lette
                  </Button>
                  <Button size="xs" variant="ghost" onClick={clearAll}>
                    Cancella
                  </Button>
                </HStack>
              )}
            </HStack>
          </DrawerHeader>
          
          <DrawerBody>
            <AnimatePresence>
              {notifications.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <Text color="gray.500">Nessuna notifica</Text>
                </Box>
              ) : (
                <VStack spacing={2} align="stretch">
                  {notifications.map((notif, i) => (
                    <Box
                      key={notif.id}
                    >
                      <Box
                        p={3}
                        bg={notif.read ? 'gray.800' : 'purple.900'}
                        borderRadius="md"
                        borderLeft="4px solid"
                        borderColor={notif.read ? 'gray.700' : 'purple.500'}
                      >
                        <HStack justify="space-between" mb={2}>
                          <HStack>
                            <Icon as={FaBookOpen} color="purple.400" />
                            <Text fontSize="sm" fontWeight="bold">
                              {notif.title}
                            </Text>
                          </HStack>
                          <HStack spacing={1}>
                            {!notif.read && (
                              <IconButton
                                icon={<FaCheck />}
                                size="xs"
                                variant="ghost"
                                onClick={() => markAsRead(notif.id)}
                                aria-label="Segna come letto"
                              />
                            )}
                            <IconButton
                              icon={<FaTrash />}
                              size="xs"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => deleteNotification(notif.id)}
                              aria-label="Elimina"
                            />
                          </HStack>
                        </HStack>
                        <Text fontSize="xs" color="gray.400" mb={2}>
                          {notif.message}
                        </Text>
                        {notif.link && (
                          <Button
                            size="xs"
                            colorScheme="purple"
                            onClick={() => {
                              navigate(notif.link);
                              markAsRead(notif.id);
                              setIsOpen(false);
                            }}
                          >
                            Leggi ora
                          </Button>
                        )}
                        <Text fontSize="xs" color="gray.600" mt={2}>
                          {new Date(notif.timestamp).toLocaleString('it-IT')}
                        </Text>
                      </Box>
                    </Box>
                  ))}
                </VStack>
              )}
            </AnimatePresence>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export default NotificationCenter;