/**
 * WELCOME - Landing page with features showcase
 * First page users see when visiting the site
 */

import { memo } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Box, Container, VStack, Heading, Text, Button, Icon, SimpleGrid, Stack
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaSearch, FaBookmark, FaMobileAlt } from 'react-icons/fa';
import Logo from '@/components/Logo';

// ========== TYPES ==========

interface Feature {
  icon: typeof FaBook;
  title: string;
  description: string;
}

// ========== CONSTANTS ==========

const FEATURES: Feature[] = [
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

// ========== COMPONENT ==========

const Welcome = memo(() => {
  const navigate = useNavigate();
  const bgGradient = 'linear(to-br, purple.600, pink.600)';

  return (
    <>
      <Helmet>
        <title>Benvenuto - NeKuro Scan | Lettore Manga Online Gratuito</title>
        <meta name="description" content="Benvenuto su NeKuro Scan - Il miglior lettore di manga online gratuito. Esplora migliaia di titoli, salva i tuoi preferiti e leggi offline." />
        <link rel="canonical" href="https://nekuro-scan.vercel.app/" />
        <meta property="og:title" content="NeKuro Scan - Lettore Manga Online Gratuito" />
        <meta property="og:description" content="Leggi manga gratuitamente con il miglior lettore online" />
        <meta property="og:url" content="https://nekuro-scan.vercel.app/" />
      </Helmet>
      
      <Box 
        minH="100vh"
        bg="gray.900" 
        display="flex"
        alignItems="center"
        justifyContent="center"
        py={{ base: 8, md: 0 }}
      >
        <Container 
          maxW="container.xl" 
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <VStack spacing={{ base: 6, md: 10 }} align="center" w="100%">
            {/* Hero Section */}
            <Box width="100%">
              <VStack spacing={{ base: 4, md: 6 }} textAlign="center">
                <Box boxSize={{ base: "80px", md: "120px" }}>
                  <Logo boxSize="120px" showText={false} />
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
                    onClick={() => navigate('/categories')}
                    leftIcon={<FaSearch />}
                    width={{ base: "100%", sm: "auto" }}
                  >
                    Esplora catalogo
                  </Button>
                </Stack>
              </VStack>
            </Box>

            {/* Features Grid */}
            <Box width="100%" px={{ base: 2, md: 0 }}>
              <SimpleGrid 
                columns={{ base: 1, sm: 2, lg: 4 }} 
                spacing={{ base: 4, md: 6 }}
              >
                {FEATURES.map((feature, index) => (
                  <Box key={index}>
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

            {/* CTA Section */}
            <Box width="100%" px={{ base: 2, md: 0 }}>
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
    </>
  );
});

Welcome.displayName = 'Welcome';

export default Welcome;

