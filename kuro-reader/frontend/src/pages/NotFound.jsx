// frontend/src/pages/NotFound.jsx
import React from 'react';
import { Container, VStack, Heading, Text, Button } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <Container maxW="container.sm" py={20}>
      <VStack spacing={6}>
        <Heading size="2xl">404</Heading>
        <Text>Pagina non trovata</Text>
        <Button colorScheme="purple" onClick={() => navigate('/home')}>
          Torna alla Home
        </Button>
      </VStack>
    </Container>
  );
}
