import React, { useEffect, useState } from 'react';
import { Container, VStack, HStack, Heading, Text, Avatar, SimpleGrid, Box } from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import MangaCard from '../components/MangaCard';

export default function PublicProfile({ self = false }) {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (self) {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      const avatar = localStorage.getItem('userAvatar') || u?.avatar || '';
      const reading = JSON.parse(localStorage.getItem('reading') || '[]').slice(0, 12);
      const completed = JSON.parse(localStorage.getItem('completed') || '[]').slice(0, 12);
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]').slice(0, 12);
      setProfile({ username: u?.username || 'Utente', avatar, reading, completed, favorites });
    } else {
      const pub = JSON.parse(localStorage.getItem(`publicProfile_${username}`) || 'null');
      setProfile(pub || { username, avatar: '', reading: [], completed: [], favorites: [] });
    }
  }, [username, self]);

  if (!profile) return null;

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <HStack spacing={4}>
          <Avatar size="xl" name={profile.username} src={profile.avatar} />
          <VStack align="start" spacing={0}>
            <Heading size="lg">@{profile.username}</Heading>
            <Text color="gray.400">Profilo pubblico</Text>
          </VStack>
        </HStack>

        <VStack align="stretch" spacing={4}>
          <Heading size="md">In lettura</Heading>
          <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
            {profile.reading?.map((m, i) => <MangaCard key={`r-${i}`} manga={m} />)}
          </SimpleGrid>
        </VStack>

        <VStack align="stretch" spacing={4}>
          <Heading size="md">Completati</Heading>
          <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
            {profile.completed?.map((m, i) => <MangaCard key={`c-${i}`} manga={m} />)}
          </SimpleGrid>
        </VStack>

        <VStack align="stretch" spacing={4}>
          <Heading size="md">Preferiti</Heading>
          <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
            {profile.favorites?.map((m, i) => <MangaCard key={`f-${i}`} manga={m} />)}
          </SimpleGrid>
        </VStack>
      </VStack>
    </Container>
  );
}
