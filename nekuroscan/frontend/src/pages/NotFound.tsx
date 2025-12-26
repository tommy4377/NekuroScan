/**
 * NOT FOUND - 404 Error page
 * Displayed when user navigates to non-existent route
 */

import { Container, VStack, Heading, Text, Button, HStack, Icon, Box } from '@chakra-ui/react';
import { FaHome, FaBook } from 'react-icons/fa';
import Logo from '@/components/Logo';

// ========== COMPONENT ==========

export default function NotFound() {
  
  const handleNavigation = (path: string): void => {
    // Force page reload to avoid routing issues
    window.location.href = path;
  };
  
  return (
    <Box minH="100vh" bg="gray.900" display="flex" alignItems="center" justifyContent="center">
      <Container maxW="container.sm" py={20}>
        <VStack spacing={8}>
          {/* Logo */}
          <Box opacity={0.5}>
            <Logo boxSize="80px" showText={false} />
          </Box>

          {/* Error */}
          <Heading 
            size="4xl" 
            bgGradient="linear(to-r, purple.400, pink.400)"
            bgClip="text"
            fontWeight="black"
          >
            404
          </Heading>
          
          <VStack spacing={3}>
            <Heading size="lg" color="white">
              Pagina non trovata
            </Heading>
            <Text fontSize="md" color="gray.400" textAlign="center" maxW="400px">
              La pagina che stai cercando non esiste o è stata spostata.
            </Text>
          </VStack>
          
          {/* Actions */}
          <HStack spacing={4} pt={4}>
            <Button 
              colorScheme="purple" 
              onClick={() => handleNavigation('/home')}
              leftIcon={<Icon as={FaHome} />}
              size="lg"
              _hover={{ transform: 'translateY(-2px)' }}
              transition="all 0.2s"
            >
              Torna alla Home
            </Button>
            <Button 
              variant="outline" 
              colorScheme="purple"
              onClick={() => handleNavigation('/')}
              leftIcon={<Icon as={FaBook} />}
              size="lg"
              _hover={{ transform: 'translateY(-2px)' }}
              transition="all 0.2s"
            >
              Pagina Principale
            </Button>
          </HStack>
        </VStack>
      </Container>
    </Box>
  );
}

