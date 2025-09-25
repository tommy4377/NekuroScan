import React, { useEffect, useRef, useState } from 'react';
import {
  Container, VStack, HStack, Heading, Text, Avatar, Box, Button, Input, FormControl,
  FormLabel, SimpleGrid, Divider, useToast, InputGroup, InputRightElement, IconButton,
  Switch, Badge, Textarea
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { FaCamera, FaSave, FaShare, FaBell } from 'react-icons/fa';
import MangaCard from '../components/MangaCard';
import axios from 'axios';
import { config } from '../config';
import useAuth from '../hooks/useAuth';

export default function Profile() {
  const toast = useToast();
  const { user, login } = useAuth();
  const fileRef = useRef();

  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [isPublic, setIsPublic] = useState(user?.isPublic !== false);
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [showPass, setShowPass] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  const reading = JSON.parse(localStorage.getItem('reading') || '[]');
  const completed = JSON.parse(localStorage.getItem('completed') || '[]');
  const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setBio(user.bio || '');
      setIsPublic(user.isPublic !== false);
      setAvatar(user.avatar || '');
    }
    checkNotificationStatus();
  }, [user]);

  const checkNotificationStatus = async () => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  };

  const enableNotifications = async () => {
    if (!('Notification' in window)) {
      toast({ title: 'Il browser non supporta le notifiche', status: 'error' });
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'BNOJyTgwrEwK9lJYX2c6lJZW0-4g4Tg8Qd3P5mQ8VsXGHlNxTzYzaFVjKpWsBh7k8K6vw5fXBQcrchdrJtCBwzI'
        });

        const token = localStorage.getItem('token');
        await axios.post(`${config.API_URL}/api/notifications/subscribe`, {
          subscription
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setNotificationsEnabled(true);
        toast({ title: 'Notifiche attivate', status: 'success' });

        // Test notification
        await axios.post(`${config.API_URL}/api/notifications/test`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Error enabling notifications:', error);
        toast({ title: 'Errore attivazione notifiche', status: 'error' });
      }
    }
  };

  const onPickAvatar = () => fileRef.current?.click();

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast({ title: 'File troppo grande (max 5MB)', status: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result);
    };
    reader.readAsDataURL(f);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${config.API_URL}/api/user/profile`, {
        username,
        email,
        avatar,
        bio,
        isPublic
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local user data
      const updatedUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      toast({ title: 'Profilo aggiornato', status: 'success' });
    } catch (error) {
      console.error('Save profile error:', error);
      toast({ 
        title: 'Errore salvataggio', 
        description: error.response?.data?.message || 'Errore nel salvataggio del profilo',
        status: 'error' 
      });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!newPass || newPass.length < 6) {
      toast({ title: 'Password troppo corta (min 6)', status: 'error' });
      return;
    }
    if (newPass !== confirmPass) {
      toast({ title: 'Le password non coincidono', status: 'error' });
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${config.API_URL}/api/auth/change-password`, { 
        oldPassword: oldPass, 
        newPassword: newPass 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setOldPass(''); 
      setNewPass(''); 
      setConfirmPass('');
      toast({ title: 'Password cambiata', status: 'success' });
    } catch (error) {
      console.error('Change password error:', error);
      toast({ 
        title: 'Cambio password fallito', 
        description: error.response?.data?.message || 'Errore nel cambio password', 
        status: 'error' 
      });
    }
  };

  const shareProfile = () => {
    const profileUrl = `${window.location.origin}/user/${user.username}`;
    navigator.clipboard.writeText(profileUrl);
    toast({ 
      title: 'Link copiato!', 
      description: 'Il link del tuo profilo pubblico è stato copiato',
      status: 'success' 
    });
  };

  if (!user) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8}>
          <Text>Devi effettuare il login per vedere questa pagina</Text>
          <Button colorScheme="purple" onClick={() => window.location.href = '/login'}>
            Vai al Login
          </Button>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <HStack spacing={6} align="start" flexWrap="wrap">
          <Box position="relative">
            <Avatar size="2xl" name={username} src={avatar} />
            <IconButton
              icon={<FaCamera />}
              size="sm"
              colorScheme="purple"
              borderRadius="full"
              position="absolute"
              bottom={0}
              right={0}
              onClick={onPickAvatar}
              aria-label="Cambia foto"
            />
            <input type="file" accept="image/*" ref={fileRef} onChange={onFile} style={{ display: 'none' }} />
          </Box>

          <VStack align="stretch" flex={1} spacing={4} minW="280px">
            <Heading size="lg">Impostazioni profilo</Heading>
            
            <FormControl>
              <FormLabel>Username</FormLabel>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            </FormControl>
            
            <FormControl>
              <FormLabel>Email</FormLabel>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </FormControl>
            
            <FormControl>
              <FormLabel>Bio</FormLabel>
              <Textarea 
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
                placeholder="Scrivi qualcosa su di te..."
                resize="vertical"
              />
            </FormControl>
            
            <HStack justify="space-between">
              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Profilo pubblico</FormLabel>
                <Switch 
                  isChecked={isPublic} 
                  onChange={(e) => setIsPublic(e.target.checked)}
                  colorScheme="purple"
                />
              </FormControl>
              
              {isPublic && (
                <Button size="sm" leftIcon={<FaShare />} onClick={shareProfile}>
                  Condividi profilo
                </Button>
              )}
            </HStack>
            
            <HStack>
              <Button 
                colorScheme="purple" 
                leftIcon={<FaSave />} 
                onClick={saveProfile}
                isLoading={saving}
              >
                Salva modifiche
              </Button>
              
              <Button
                leftIcon={<FaBell />}
                variant={notificationsEnabled ? 'solid' : 'outline'}
                colorScheme={notificationsEnabled ? 'green' : 'gray'}
                onClick={enableNotifications}
                isDisabled={notificationsEnabled}
              >
                {notificationsEnabled ? 'Notifiche attive' : 'Attiva notifiche'}
              </Button>
            </HStack>
          </VStack>
        </HStack>

        <Box bg="gray.800" p={6} borderRadius="xl">
          <Heading size="md" mb={4}>Cambia password</Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            <FormControl>
              <FormLabel>Password attuale</FormLabel>
              <Input 
                type={showPass ? 'text' : 'password'} 
                value={oldPass} 
                onChange={(e) => setOldPass(e.target.value)} 
              />
            </FormControl>
            <FormControl>
              <FormLabel>Nuova password</FormLabel>
              <InputGroup>
                <Input 
                  type={showPass ? 'text' : 'password'} 
                  value={newPass} 
                  onChange={(e) => setNewPass(e.target.value)} 
                />
                <InputRightElement>
                  <IconButton 
                    size="sm" 
                    variant="ghost" 
                    icon={showPass ? <ViewOffIcon /> : <ViewIcon />} 
                    onClick={() => setShowPass(!showPass)} 
                    aria-label="Toggle" 
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>
            <FormControl>
              <FormLabel>Conferma password</FormLabel>
              <Input 
                type={showPass ? 'text' : 'password'} 
                value={confirmPass} 
                onChange={(e) => setConfirmPass(e.target.value)} 
              />
            </FormControl>
          </SimpleGrid>
          <HStack mt={4}>
            <Button colorScheme="purple" onClick={changePassword}>
              Cambia password
            </Button>
          </HStack>
        </Box>

        <Divider />

        <Box>
          <HStack justify="space-between" mb={3}>
            <Heading size="md">Preferiti</Heading>
            <Badge colorScheme="purple">{favorites.length}</Badge>
          </HStack>
          {favorites.length ? (
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {favorites.slice(0, 10).map((m, i) => (
                <MangaCard key={`f-${i}`} manga={m} />
              ))}
            </SimpleGrid>
          ) : (
            <Text color="gray.500">Nessun preferito</Text>
          )}
        </Box>

        <Box>
          <HStack justify="space-between" mb={3}>
            <Heading size="md">In lettura</Heading>
            <Badge colorScheme="green">{reading.length}</Badge>
          </HStack>
          {reading.length ? (
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {reading.slice(0, 10).map((m, i) => (
                <MangaCard key={`r-${i}`} manga={m} />
              ))}
            </SimpleGrid>
          ) : (
            <Text color="gray.500">Nessun manga in lettura</Text>
          )}
        </Box>

        <Box>
          <HStack justify="space-between" mb={3}>
            <Heading size="md">Completati</Heading>
            <Badge colorScheme="blue">{completed.length}</Badge>
          </HStack>
          {completed.length ? (
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {completed.slice(0, 10).map((m, i) => (
                <MangaCard key={`c-${i}`} manga={m} />
              ))}
            </SimpleGrid>
          ) : (
            <Text color="gray.500">Nessun completato</Text>
          )}
        </Box>
      </VStack>
    </Container>
  );
}