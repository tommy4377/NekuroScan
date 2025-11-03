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
  SimpleGrid,
  Stack
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaSearch, FaBookmark, FaMobileAlt } from 'react-icons/fa';
import Logo from '../components/Logo';
// import { motion } from 'framer-motion'; // Rimosso per evitare errori React #300

// const Box = motion(Box); // Rimosso per evitare errori React #300

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
      <Container maxW="container.xl" py={{ base: 6, md: 20 }}>
        <VStack spacing={{ base: 8, md: 12 }} align="center">
          {/* Hero Section - FIX MOBILE */}
          <Box
            width="100%"
          >
            <VStack spacing={{ base: 4, md: 6 }} textAlign="center">
              <Box boxSize={{ base: "80px", md: "120px" }}>
                <Logo boxSize={{ base: "80px", md: "120px" }} showText={false} />
              </Box>
              
              <Heading
                size={{ base: "lg", md: "2xl" }}
                bgGradient={bgGradient}
                bgClip="text"
              >
                NeKuro Scan
              </Heading>
              
              <Text 
                fontSize={{ base: "md", md: "xl" }} 
                color="gray.400" 
                maxW={{ base: "90%", md: "600px" }}
                px={{ base: 2, md: 4 }}
              >
                Il miglior lettore di manga online. 
                Scopri migliaia di titoli e immergiti nelle tue storie preferite.
              </Text>
              
              <Stack 
                direction={{ base: "column", sm: "row" }}
                spacing={4} 
                pt={4}
                width={{ base: "100%", sm: "auto" }}
                px={{ base: 4, sm: 0 }}
              >
                <Button
                  size={{ base: "md", md: "lg" }}
                  colorScheme="purple"
                  onClick={() => navigate('/home')}
                  leftIcon={<FaBook />}
                  width={{ base: "100%", sm: "auto" }}
                >
                  Inizia a leggere
                </Button>
                <Button
                  size={{ base: "md", md: "lg" }}
                  variant="outline"
                  colorScheme="purple"
                  onClick={() => navigate('/search')}
                  leftIcon={<FaSearch />}
                  width={{ base: "100%", sm: "auto" }}
                >
                  Esplora catalogo
                </Button>
              </Stack>
            </VStack>
          </Box>

          {/* Features Grid - FIX MOBILE */}
          <Box
            width="100%"
            px={{ base: 2, md: 0 }}
          >
            <SimpleGrid 
              columns={{ base: 1, sm: 2, lg: 4 }} 
              spacing={{ base: 4, md: 6 }}
            >
              {features.map((feature, index) => (
                <Box
                  key={index}
                >
                  <VStack
                    p={{ base: 4, md: 6 }}
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
                    <Icon 
                      as={feature.icon} 
                      boxSize={{ base: 8, md: 10 }} 
                      color="purple.400" 
                    />
                    <Text 
                      fontWeight="bold" 
                      fontSize={{ base: "md", md: "lg" }}
                    >
                      {feature.title}
                    </Text>
                    <Text 
                      color="gray.400" 
                      fontSize={{ base: "xs", md: "sm" }}
                      textAlign="center"
                    >
                      {feature.description}
                    </Text>
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
          </Box>

          {/* CTA Section - FIX MOBILE */}
          <Box
            width="100%"
            px={{ base: 2, md: 0 }}
          >
            <VStack
              spacing={4}
              p={{ base: 6, md: 8 }}
              bg="gray.800"
              borderRadius="xl"
              width="100%"
              maxW={{ base: "100%", md: "600px" }}
              mx="auto"
            >
              <Heading size={{ base: "md", md: "lg" }}>
                Pronto per iniziare?
              </Heading>
              <Text 
                color="gray.400" 
                textAlign="center"
                fontSize={{ base: "sm", md: "md" }}
              >
                Accedi per salvare i tuoi progressi o continua come ospite
              </Text>
              <Stack 
                direction={{ base: "column", sm: "row" }}
                spacing={3}
                width={{ base: "100%", sm: "auto" }}
              >
                <Button
                  size={{ base: "md", md: "lg" }}
                  colorScheme="purple"
                  onClick={() => navigate('/home')}
                  rightIcon={<FaBook />}
                  width={{ base: "100%", sm: "auto" }}
                >
                  Continua come ospite
                </Button>
                <Button
                  size={{ base: "md", md: "lg" }}
                  variant="outline"
                  colorScheme="purple"
                  onClick={() => navigate('/login')}
                  width={{ base: "100%", sm: "auto" }}
                >
                  Accedi
                </Button>
              </Stack>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}

export default Welcome;
