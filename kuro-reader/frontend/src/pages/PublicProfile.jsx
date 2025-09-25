import React, { useEffect, useState } from 'react';
import { 
  Container, VStack, HStack, Heading, Text, Avatar, SimpleGrid, Box,
  Spinner, Badge
} from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import MangaCard from '../components/MangaCard';
import axios from 'axios';
import { config } from '../config';

export default function PublicProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    try {
      const response = await axios.get(`${config.API_URL}/api/user/public/${username}`);
      setProfile(response.data);
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8}>
          <Spinner size="xl" color="purple.500" />
          <Text>Caricamento profilo...</Text>
        </VStack>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8}>
          <Heading size="lg">Profilo non trovato</Heading>
          <Text color="gray.400">
            L'utente @{username} non esiste o il profilo non è pubblico
          </Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <HStack spacing={6} align="start">
          <Avatar size="2xl" name={profile.username} src={profile.avatar} />
          <VStack align="start" spacing={2} flex={1}>
            <Heading size="lg">@{profile.username}</Heading>
            {profile.bio && (
              <Text color="gray.400">{profile.bio}</Text>
            )}
            <Text fontSize="sm" color="gray.500">
              Membro dal {new Date(profile.createdAt).toLocaleDateString('it-IT')}
            </Text>
          </VStack>
        </HStack>

        {profile.reading.length > 0 && (
          <Box>
            <HStack justify="space-between" mb={4}>
              <Heading size="md">In lettura</Heading>
              <Badge colorScheme="green">{profile.reading.length}</Badge>
            </HStack>
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {profile.reading.map((manga, i) => (
                <MangaCard key={`r-${i}`} manga={manga} />
              ))}
            </SimpleGrid>
          </Box>
        )}

        {profile.completed.length > 0 && (
          <Box>
            <HStack justify="space-between" mb={4}>
              <Heading size="md">Completati</Heading>
              <Badge colorScheme="blue">{profile.completed.length}</Badge>
            </HStack>
            <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
              {profile.completed.map((manga, i) => (
                <MangaCard key={`c-${i}`} manga={manga} />
              ))}
            </SimpleGrid>
          </Box>
        )}

        {profile.reading.length === 0 && profile.completed.length === 0 && (
          <Box textAlign="center" py={12}>
            <Text color="gray.500">
              Questo utente non ha ancora condiviso manga nella sua libreria
            </Text>
          </Box>
        )}
      </VStack>
    </Container>
  );
}