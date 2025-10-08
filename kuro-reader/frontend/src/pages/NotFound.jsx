// frontend/src/pages/NotFound.jsx
import React from 'react';
import { Container, VStack, Heading, Text, Button, HStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  
  const handleNavigation = (path) => {
    // Forza il reload della pagina per evitare problemi di routing
    window.location.href = path;
  };
  
  return (
    <Container maxW="container.sm" py={20}>
      <VStack spacing={6}>
        <Heading size="2xl" color="purple.400">404</Heading>
        <Text fontSize="lg" color="gray.400">Pagina non trovata</Text>
        <Text fontSize="sm" color="gray.500" textAlign="center">
          La pagina che stai cercando non esiste o è stata spostata.
        </Text>
        <HStack spacing={4}>
          <Button 
            colorScheme="purple" 
            onClick={() => handleNavigation('/home')}
            _hover={{ transform: 'translateY(-2px)' }}
            transition="all 0.2s"
          >
            Torna alla Home
          </Button>
          <Button 
            variant="outline" 
            colorScheme="purple"
            onClick={() => handleNavigation('/')}
            _hover={{ transform: 'translateY(-2px)' }}
            transition="all 0.2s"
          >
            Pagina Principale
          </Button>
        </HStack>
      </VStack>
    </Container>
  );
}
