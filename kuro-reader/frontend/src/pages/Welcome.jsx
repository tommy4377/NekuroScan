import React from 'react';
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Button,
  Image,
  useColorModeValue,
  HStack,
  Icon,
  SimpleGrid
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaSearch, FaBookmark, FaMobileAlt, FaSignInAlt } from 'react-icons/fa';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

function Welcome() {
  const navigate = useNavigate();
  const bgGradient = useColorModeValue(
    'linear(to-br, purple.400, pink.400)',
    'linear(to-br, purple.600, pink.600)'
  );

  const features = [
    {
      icon: FaBook,
      title: 'Vasta Libreria',
      description: 'Migliaia di manga disponibili'
    },
    {
      icon: FaSearch,
      title: 'Ricerca Avanzata',
      description: 'Trova facilmente i tuoi manga preferiti'
    },
    {
      icon: FaBookmark,
      title: 'Salva Progressi',
      description: 'Riprendi da dove hai lasciato'
    },
    {
      icon: FaMobileAlt,
      title: 'Mobile Friendly',
      description: 'Leggi ovunque tu sia'
    }
  ];

  return (
    <Box minH="100vh" bg="gray.900">
      <Container maxW="container.xl" py={{ base: 10, md: 20 }}>
        <VStack spacing={12} align="center">
          {/* Hero Section */}
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            width="100%"
          >
            <VStack spacing={6} textAlign="center">
              <Image
                src="/web-app-manifest-512x512.png"
                boxSize={{ base: "100px", md: "120px" }}
                fallbackSrc="https://via.placeholder.com/120"
              />
              
              <Heading
                size={{ base: "xl", md: "2xl" }}
                bgGradient={bgGradient}
                bgClip="text"
              >
                KuroReader
              </Heading>
              
              <Text fontSize={{ base: "lg", md: "xl" }} color="gray.400" maxW="600px" px={4}>
                Il miglior lettore di manga online. 
                Scopri migliaia di titoli e immergiti nelle tue storie preferite.
              </Text>
              
              <HStack spacing={4} pt={4} flexWrap="wrap" justify="center">
                <Button
                  size={{ base: "md", md: "lg" }}
                  colorScheme="purple"
                  onClick={() => navigate('/home')}
                  leftIcon={<FaBook />}
                >
                  Inizia a leggere
                </Button>
                <Button
                  size={{ base: "md", md: "lg" }}
                  variant="outline"
                  colorScheme="purple"
                  onClick={() => navigate('/search')}
                  leftIcon={<FaSearch />}
                >
                  Esplora catalogo
                </Button>
                <Button
                  size={{ base: "md", md: "lg" }}
                  variant="ghost"
                  colorScheme="purple"
                  onClick={() => navigate('/login')}
                  leftIcon={<FaSignInAlt />}
                >
                  Accedi
                </Button>
              </HStack>
            </VStack>
          </MotionBox>

          {/* Features Grid */}
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            width="100%"
          >
            <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={6}>
              {features.map((feature, index) => (
                <MotionBox
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.5 }}
                >
                  <VStack
                    p={6}
                    bg="gray.800"
                    borderRadius="lg"
                    spacing={4}
                    _hover={{
                      transform: 'translateY(-5px)',
                      boxShadow: 'xl'
                    }}
                    transition="all 0.3s"
                    height="100%"
                  >
                    <Icon as={feature.icon} boxSize={10} color="purple.400" />
                    <Text fontWeight="bold" fontSize="lg">
                      {feature.title}
                    </Text>
                    <Text color="gray.400" fontSize="sm" textAlign="center">
                      {feature.description}
                    </Text>
                  </VStack>
                </MotionBox>
              ))}
            </SimpleGrid>
          </MotionBox>

          {/* CTA Section */}
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            width="100%"
          >
            <VStack
              spacing={4}
              p={8}
              bg="gray.800"
              borderRadius="xl"
              width="100%"
              maxW="600px"
              mx="auto"
            >
              <Heading size="lg">Pronto per iniziare?</Heading>
              <Text color="gray.400" textAlign="center">
                Nessuna registrazione richiesta. Inizia subito a leggere i tuoi manga preferiti!
              </Text>
              <HStack spacing={3}>
                <Button
                  size="lg"
                  colorScheme="purple"
                  onClick={() => navigate('/home')}
                  rightIcon={<FaBook />}
                >
                  Vai alla libreria
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  colorScheme="purple"
                  onClick={() => navigate('/login')}
                  rightIcon={<FaSignInAlt />}
                >
                  Accedi
                </Button>
              </HStack>
            </VStack>
          </MotionBox>
        </VStack>
      </Container>
    </Box>
  );
}

export default Welcome;
