// frontend/src/pages/Profile.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Container, VStack, HStack, Heading, Text, Avatar, Box, Button, Input, FormControl,
  FormLabel, SimpleGrid, Divider, useToast, InputGroup, InputRightElement, IconButton
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { FaCamera, FaSave } from 'react-icons/fa';
import MangaCard from '../components/MangaCard';
import axios from 'axios';
import { config } from '../config';
import useAuth from '../hooks/useAuth';

export default function Profile() {
  const toast = useToast();
  const { user } = useAuth();
  const fileRef = useRef();

  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState(localStorage.getItem('userAvatar') || user?.avatar || '');
  const [showPass, setShowPass] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const reading = useMemo(() => JSON.parse(localStorage.getItem('reading') || '[]'), []);
  const completed = useMemo(() => JSON.parse(localStorage.getItem('completed') || '[]'), []);
  const favorites = useMemo(() => JSON.parse(localStorage.getItem('favorites') || '[]'), []);

  useEffect(() => {
    setUsername(user?.username || '');
    setEmail(user?.email || '');
  }, [user]);

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
      const b64 = reader.result;
      setAvatar(b64);
      localStorage.setItem('userAvatar', b64);
      toast({ title: 'Immagine profilo aggiornata', status: 'success' });
    };
    reader.readAsDataURL(f);
  };

  const saveProfile = () => {
    // In assenza di endpoint backend per update username/email, salviamo localmente
    const u = JSON.parse(localStorage.getItem('user') || 'null') || {};
    const updated = { ...u, username, email, avatar };
    localStorage.setItem('user', JSON.stringify(updated));
    toast({ title: 'Profilo aggiornato', status: 'success' });
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
      await axios.post(`${config.API_URL}/api/auth/change-password`, { oldPassword: oldPass, newPassword: newPass }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOldPass(''); setNewPass(''); setConfirmPass('');
      toast({ title: 'Password cambiata', status: 'success' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Cambio password fallito', description: e.response?.data?.message || '', status: 'error' });
    }
  };

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
            <HStack>
              <Button colorScheme="purple" leftIcon={<FaSave />} onClick={saveProfile}>Salva</Button>
            </HStack>
          </VStack>
        </HStack>

        <Box bg="gray.800" p={6} borderRadius="xl">
          <Heading size="md" mb={4}>Cambia password</Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            <FormControl>
              <FormLabel>Password attuale</FormLabel>
              <Input type={showPass ? 'text' : 'password'} value={oldPass} onChange={(e) => setOldPass(e.target.value)} />
            </FormControl>
            <FormControl>
              <FormLabel>Nuova password</FormLabel>
              <InputGroup>
                <Input type={showPass ? 'text' : 'password'} value={newPass} onChange={(e) => setNewPass(e.target.value)} />
                <InputRightElement>
                  <IconButton size="sm" variant="ghost" icon={showPass ? <ViewOffIcon /> : <ViewIcon />} onClick={() => setShowPass(!showPass)} aria-label="Toggle" />
                </InputRightElement>
              </InputGroup>
            </FormControl>
            <FormControl>
              <FormLabel>Conferma password</FormLabel>
              <Input type={showPass ? 'text' : 'password'} value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} />
            </FormControl>
          </SimpleGrid>
          <HStack mt={4}>
            <Button colorScheme="purple" onClick={changePassword}>Cambia password</Button>
          </HStack>
        </Box>

        <Box>
          <Heading size="md" mb={3}>Preferiti</Heading>
          {favorites.length ? (
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {favorites.map((m, i) => <MangaCard key={`f-${i}`} manga={m} />)}
            </SimpleGrid>
          ) : <Text color="gray.500">Nessun preferito</Text>}
        </Box>

        <Box>
          <Heading size="md" mb={3}>In lettura</Heading>
          {reading.length ? (
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {reading.map((m, i) => <MangaCard key={`r-${i}`} manga={m} />)}
            </SimpleGrid>
          ) : <Text color="gray.500">Nessun manga in lettura</Text>}
        </Box>

        <Box>
          <Heading size="md" mb={3}>Completati</Heading>
          {completed.length ? (
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {completed.map((m, i) => <MangaCard key={`c-${i}`} manga={m} />)}
            </SimpleGrid>
          ) : <Text color="gray.500">Nessun completato</Text>}
        </Box>
      </VStack>
    </Container>
  );
}
