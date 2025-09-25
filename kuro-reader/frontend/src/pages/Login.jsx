import React, { useState } from 'react';
import {
  Box, Container, VStack, Input, Button, Text, Heading,
  FormControl, FormLabel, useToast, Tabs, TabList,
  TabPanels, Tab, TabPanel, InputGroup, InputRightElement,
  Checkbox, Link, Image, HStack, Divider, Alert, AlertIcon,
  IconButton, useBreakpointValue, Center
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon, ArrowBackIcon } from '@chakra-ui/icons';
import { FaGoogle, FaGithub, FaDiscord } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { keyframes } from '@emotion/react';
import useAuth from '../hooks/useAuth';

const MotionBox = motion(Box);

// Animation keyframes
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
`;

const glow = keyframes`
  0% { box-shadow: 0 0 20px rgba(128, 90, 213, 0.4); }
  50% { box-shadow: 0 0 40px rgba(128, 90, 213, 0.6); }
  100% { box-shadow: 0 0 20px rgba(128, 90, 213, 0.4); }
`;

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const isMobile = useBreakpointValue({ base: true, md: false });
  
  const from = location.state?.from?.pathname || '/home';
  
  const [loginData, setLoginData] = useState({ 
    emailOrUsername: '', 
    password: '' 
  });
  
  const [registerData, setRegisterData] = useState({ 
    username: '', 
    email: '', 
    password: '', 
    confirmPassword: '',
    acceptTerms: false
  });

  const [tabIndex, setTabIndex] = useState(0);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!loginData.emailOrUsername || !loginData.password) {
      toast({ 
        title: 'Compila tutti i campi', 
        status: 'warning',
        duration: 2000 
      });
      return;
    }
    
    setIsLoading(true);
    const result = await login(loginData.emailOrUsername, loginData.password);
    setIsLoading(false);
    
    if (result.success) {
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }
      
      toast({ 
        title: 'Benvenuto!',
        description: `Accesso effettuato come ${result.user.username}`,
        status: 'success',
        duration: 2000
      });
      
      navigate(from, { replace: true });
    } else {
      toast({ 
        title: 'Errore di accesso',
        description: result.error || 'Credenziali non valide',
        status: 'error',
        duration: 3000
      });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Validations
    if (!registerData.username || !registerData.email || 
        !registerData.password || !registerData.confirmPassword) {
      toast({ 
        title: 'Compila tutti i campi', 
        status: 'warning',
        duration: 2000
      });
      return;
    }
    
    if (registerData.password !== registerData.confirmPassword) {
      toast({ 
        title: 'Le password non coincidono', 
        status: 'error',
        duration: 2000
      });
      return;
    }
    
    if (registerData.password.length < 6) {
      toast({ 
        title: 'Password troppo corta',
        description: 'Minimo 6 caratteri richiesti',
        status: 'error',
        duration: 2000
      });
      return;
    }
    
    if (!registerData.acceptTerms) {
      toast({ 
        title: 'Accetta i termini di servizio', 
        status: 'warning',
        duration: 2000
      });
      return;
    }
    
    setIsLoading(true);
    const result = await register(
      registerData.username, 
      registerData.email, 
      registerData.password
    );
    setIsLoading(false);
    
    if (result.success) {
      toast({ 
        title: 'Account creato!',
        description: 'Registrazione completata con successo',
        status: 'success',
        duration: 3000
      });
      navigate('/home');
    } else {
      toast({ 
        title: 'Errore registrazione',
        description: result.error || 'Errore durante la registrazione',
        status: 'error',
        duration: 3000
      });
    }
  };

  return (
    <Box minH="100vh" bg="gray.900" position="relative" overflow="hidden">
      {/* Animated background */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        opacity={0.3}
        bgGradient="radial(purple.600, gray.900)"
        filter="blur(100px)"
      />
      
      {/* Floating shapes */}
      {!isMobile && (
        <>
          <Box
            position="absolute"
            top="10%"
            left="10%"
            w="200px"
            h="200px"
            bg="purple.500"
            borderRadius="full"
            opacity={0.1}
            animation={`${float} 6s ease-in-out infinite`}
          />
          <Box
            position="absolute"
            bottom="10%"
            right="10%"
            w="150px"
            h="150px"
            bg="pink.500"
            borderRadius="full"
            opacity={0.1}
            animation={`${float} 8s ease-in-out infinite`}
          />
        </>
      )}

      <Container maxW="container.sm" py={{ base: 10, md: 20 }} position="relative">
        {/* Back button */}
        <IconButton
          icon={<ArrowBackIcon />}
          position="absolute"
          top={4}
          left={4}
          variant="ghost"
          onClick={() => navigate('/')}
          aria-label="Torna indietro"
        />
        
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <VStack spacing={8}>
            {/* Logo and title */}
            <VStack spacing={4}>
              <Box
                p={4}
                bg="gray.800"
                borderRadius="2xl"
                animation={`${glow} 3s ease-in-out infinite`}
              >
                <Image 
                  src="/web-app-manifest-512x512.png" 
                  boxSize="80px"
                  fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23805AD5'/%3E%3C/svg%3E"
                />
              </Box>
              <VStack spacing={1}>
                <Heading 
                  size="xl"
                  bgGradient="linear(to-r, purple.400, pink.400)"
                  bgClip="text"
                >
                  KuroReader
                </Heading>
                <Text color="gray.400" fontSize="sm">
                  Il tuo mondo di manga ti aspetta
                </Text>
              </VStack>
            </VStack>
            
            {/* Main card */}
            <Box 
              w="100%" 
              bg="gray.800" 
              p={{ base: 6, md: 8 }} 
              borderRadius="2xl"
              boxShadow="2xl"
              borderWidth="1px"
              borderColor="gray.700"
            >
              <Tabs 
                colorScheme="purple" 
                index={tabIndex} 
                onChange={setTabIndex}
                variant="soft-rounded"
              >
                <TabList mb={6}>
                  <Tab flex={1}>Accedi</Tab>
                  <Tab flex={1}>Registrati</Tab>
                </TabList>
                
                <TabPanels>
                  {/* Login Panel */}
                  <TabPanel px={0}>
                    <form onSubmit={handleLogin}>
                      <VStack spacing={5}>
                        <FormControl isRequired>
                          <FormLabel fontSize="sm">Email o Username</FormLabel>
                          <Input
                            placeholder="Inserisci email o username"
                            value={loginData.emailOrUsername}
                            onChange={(e) => setLoginData({
                              ...loginData, 
                              emailOrUsername: e.target.value
                            })}
                            size="lg"
                            bg="gray.700"
                            border="none"
                            _hover={{ bg: 'gray.600' }}
                            _focus={{ bg: 'gray.600', borderColor: 'purple.500' }}
                          />
                        </FormControl>
                        
                        <FormControl isRequired>
                          <FormLabel fontSize="sm">Password</FormLabel>
                          <InputGroup size="lg">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Inserisci password"
                              value={loginData.password}
                              onChange={(e) => setLoginData({
                                ...loginData, 
                                password: e.target.value
                              })}
                              bg="gray.700"
                              border="none"
                              _hover={{ bg: 'gray.600' }}
                              _focus={{ bg: 'gray.600', borderColor: 'purple.500' }}
                            />
                            <InputRightElement>
                              <IconButton
                                variant="ghost"
                                onClick={() => setShowPassword(!showPassword)}
                                icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                                aria-label="Mostra password"
                              />
                            </InputRightElement>
                          </InputGroup>
                        </FormControl>
                        
                        <HStack justify="space-between" w="100%">
                          <Checkbox
                            isChecked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            colorScheme="purple"
                          >
                            <Text fontSize="sm">Ricordami</Text>
                          </Checkbox>
                          <Link color="purple.400" fontSize="sm">
                            Password dimenticata?
                          </Link>
                        </HStack>
                        
                        <Button
                          type="submit"
                          colorScheme="purple"
                          size="lg"
                          width="100%"
                          isLoading={isLoading}
                          loadingText="Accesso in corso..."
                          bgGradient="linear(to-r, purple.500, pink.500)"
                          _hover={{
                            bgGradient: "linear(to-r, purple.600, pink.600)",
                            transform: 'translateY(-2px)',
                            boxShadow: 'lg'
                          }}
                        >
                          Accedi
                        </Button>
                        
                        <HStack spacing={2}>
                          <Divider />
                          <Text fontSize="sm" color="gray.500" whiteSpace="nowrap">
                            oppure
                          </Text>
                          <Divider />
                        </HStack>
                        
                        <Button
                          variant="outline"
                          size="lg"
                          width="100%"
                          onClick={() => navigate('/home')}
                        >
                          Continua come ospite
                        </Button>
                      </VStack>
                    </form>
                  </TabPanel>
                  
                  {/* Register Panel */}
                  <TabPanel px={0}>
                    <form onSubmit={handleRegister}>
                      <VStack spacing={4}>
                        <FormControl isRequired>
                          <FormLabel fontSize="sm">Username</FormLabel>
                          <Input
                            placeholder="Scegli un username"
                            value={registerData.username}
                            onChange={(e) => setRegisterData({
                              ...registerData, 
                              username: e.target.value
                            })}
                            size="lg"
                            bg="gray.700"
                            border="none"
                            _hover={{ bg: 'gray.600' }}
                            _focus={{ bg: 'gray.600', borderColor: 'purple.500' }}
                          />
                        </FormControl>
                        
                        <FormControl isRequired>
                          <FormLabel fontSize="sm">Email</FormLabel>
                          <Input
                            type="email"
                            placeholder="La tua email"
                            value={registerData.email}
                            onChange={(e) => setRegisterData({
                              ...registerData, 
                              email: e.target.value
                            })}
                            size="lg"
                            bg="gray.700"
                            border="none"
                            _hover={{ bg: 'gray.600' }}
                            _focus={{ bg: 'gray.600', borderColor: 'purple.500' }}
                          />
                        </FormControl>
                        
                        <FormControl isRequired>
                          <FormLabel fontSize="sm">Password</FormLabel>
                          <InputGroup size="lg">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Minimo 6 caratteri"
                              value={registerData.password}
                              onChange={(e) => setRegisterData({
                                ...registerData, 
                                password: e.target.value
                              })}
                              bg="gray.700"
                              border="none"
                              _hover={{ bg: 'gray.600' }}
                              _focus={{ bg: 'gray.600', borderColor: 'purple.500' }}
                            />
                            <InputRightElement>
                              <IconButton
                                variant="ghost"
                                onClick={() => setShowPassword(!showPassword)}
                                icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                                aria-label="Mostra password"
                              />
                            </InputRightElement>
                          </InputGroup>
                        </FormControl>
                        
                        <FormControl isRequired>
                          <FormLabel fontSize="sm">Conferma Password</FormLabel>
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Ripeti password"
                            value={registerData.confirmPassword}
                            onChange={(e) => setRegisterData({
                              ...registerData, 
                              confirmPassword: e.target.value
                            })}
                            size="lg"
                            bg="gray.700"
                            border="none"
                            _hover={{ bg: 'gray.600' }}
                            _focus={{ bg: 'gray.600', borderColor: 'purple.500' }}
                          />
                        </FormControl>
                        
                        <Checkbox
                          isChecked={registerData.acceptTerms}
                          onChange={(e) => setRegisterData({
                            ...registerData,
                            acceptTerms: e.target.checked
                          })}
                          colorScheme="purple"
                        >
                          <Text fontSize="sm">
                            Accetto i{' '}
                            <Link color="purple.400">termini di servizio</Link>
                            {' '}e la{' '}
                            <Link color="purple.400">privacy policy</Link>
                          </Text>
                        </Checkbox>
                        
                        {registerData.password && registerData.password.length < 6 && (
                          <Alert status="warning" borderRadius="lg">
                            <AlertIcon />
                            <Text fontSize="sm">
                              La password deve essere di almeno 6 caratteri
                            </Text>
                          </Alert>
                        )}
                        
                        <Button
                          type="submit"
                          colorScheme="purple"
                          size="lg"
                          width="100%"
                          isLoading={isLoading}
                          loadingText="Registrazione..."
                          bgGradient="linear(to-r, purple.500, pink.500)"
                          _hover={{
                            bgGradient: "linear(to-r, purple.600, pink.600)",
                            transform: 'translateY(-2px)',
                            boxShadow: 'lg'
                          }}
                        >
                          Crea account
                        </Button>
                      </VStack>
                    </form>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Box>

            {/* Benefits */}
            <VStack spacing={3} w="100%">
              <Text fontSize="sm" color="gray.500">
                Creando un account potrai:
              </Text>
              <HStack spacing={4} wrap="wrap" justify="center">
                <Badge colorScheme="purple" px={3} py={1}>
                  ✓ Salvare i progressi
                </Badge>
                <Badge colorScheme="purple" px={3} py={1}>
                  ✓ Sincronizzare tra dispositivi
                </Badge>
                <Badge colorScheme="purple" px={3} py={1}>
                  ✓ Creare liste personali
                </Badge>
              </HStack>
            </VStack>
          </VStack>
        </MotionBox>
      </Container>
    </Box>
  );
}

export default Login;