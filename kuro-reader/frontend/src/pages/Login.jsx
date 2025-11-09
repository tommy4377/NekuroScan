import React, { useState, useMemo } from 'react';
import {
  Box, Container, VStack, Input, Button, Text, Heading,
  FormControl, FormLabel, useToast, Tabs, TabList,
  TabPanels, Tab, TabPanel, InputGroup, InputRightElement,
  Checkbox, HStack, Divider, Alert, AlertIcon,
  IconButton, Badge, Icon
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon, ArrowBackIcon } from '@chakra-ui/icons';
import { FiCheck, FiX } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

// ✅ VALIDAZIONE PASSWORD ROBUSTA (sincronizzata con backend)
const validatePassword = (password) => {
  if (!password) {
    return { 
      isValid: false, 
      checks: {
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false
      }
    };
  }
  
  const checks = {
    length: password.length >= 10 && password.length <= 128,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };
  
  const isValid = Object.values(checks).every(check => check);
  
  return { isValid, checks };
};

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  
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
  
  // ✅ Calcola validazione password solo quando cambia (performance)
  const passwordValidation = useMemo(() => {
    return validatePassword(registerData.password);
  }, [registerData.password]);

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
    
    // ✅ VALIDAZIONE PASSWORD ROBUSTA (usa valore memoizzato)
    if (!passwordValidation.isValid) {
      toast({ 
        title: 'Password non valida',
        description: 'Verifica che la password rispetti tutti i requisiti di sicurezza',
        status: 'error',
        duration: 4000
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
    <Box minH="100vh" bg="gray.900">
      <Container maxW="container.sm" py={{ base: 10, md: 20 }}>
        <VStack spacing={8}>
          {/* Header with back button */}
          <HStack w="100%" justify="space-between">
            <IconButton
              icon={<ArrowBackIcon />}
              variant="ghost"
              onClick={() => navigate('/')}
              aria-label="Torna indietro"
            />
            <Heading 
              size="xl"
              bgGradient="linear(to-r, purple.400, pink.400)"
              bgClip="text"
            >
              NeKuro Scan
            </Heading>
            <Box w="40px" /> {/* Spacer for balance */}
          </HStack>
          
          <Text color="gray.400" fontSize="sm" mt={-4}>
            Il tuo mondo di manga ti aspetta
          </Text>
          
          {/* Main card */}
          <Box 
            w="100%" 
            bg="gray.800" 
            p={{ base: 6, md: 8 }} 
            borderRadius="xl"
            boxShadow="xl"
          >
            <Tabs 
              colorScheme="purple" 
              index={tabIndex} 
              onChange={setTabIndex}
              variant="soft-rounded"
            >
              <TabList mb={6}>
                <Tab flex={1} aria-label="Accedi con account esistente">Accedi</Tab>
                <Tab flex={1} aria-label="Registrati per creare un nuovo account">Registrati</Tab>
              </TabList>
              
              <TabPanels>
                {/* Login Panel */}
                <TabPanel px={0}>
                  <form onSubmit={handleLogin}>
                    <VStack spacing={5}>
                      <FormControl isRequired>
                        <FormLabel fontSize="sm">Email o Username</FormLabel>
                        <Input
                          type="text"
                          autoComplete="username"
                          inputMode="text"
                          placeholder="Inserisci email o username"
                          value={loginData.emailOrUsername}
                          onChange={(e) => setLoginData({
                            ...loginData, 
                            emailOrUsername: e.target.value
                          })}
                          size="lg"
                          bg="gray.700"
                          border="1px solid"
                          borderColor="gray.600"
                          _hover={{ bg: 'gray.600' }}
                          _focus={{ bg: 'gray.600', borderColor: 'purple.500', outline: 'none' }}
                          fontSize="16px"
                        />
                      </FormControl>
                      
                      <FormControl isRequired>
                        <FormLabel fontSize="sm">Password</FormLabel>
                        <InputGroup size="lg">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            placeholder="Inserisci password"
                            value={loginData.password}
                            onChange={(e) => setLoginData({
                              ...loginData, 
                              password: e.target.value
                            })}
                            bg="gray.700"
                            border="1px solid"
                            borderColor="gray.600"
                            _hover={{ bg: 'gray.600' }}
                            _focus={{ bg: 'gray.600', borderColor: 'purple.500', outline: 'none' }}
                            fontSize="16px"
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
                        <Text color="purple.400" fontSize="sm" cursor="pointer">
                          Password dimenticata?
                        </Text>
                      </HStack>
                      
                      <Button
                        type="submit"
                        colorScheme="purple"
                        size="lg"
                        width="100%"
                        isLoading={isLoading}
                        loadingText="Accesso in corso..."
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
                          type="text"
                          autoComplete="username"
                          inputMode="text"
                          placeholder="Scegli un username"
                          value={registerData.username}
                          onChange={(e) => setRegisterData({
                            ...registerData, 
                            username: e.target.value
                          })}
                          size="lg"
                          bg="gray.700"
                          border="1px solid"
                          borderColor="gray.600"
                          _hover={{ bg: 'gray.600' }}
                          _focus={{ bg: 'gray.600', borderColor: 'purple.500', outline: 'none' }}
                          fontSize="16px"
                        />
                      </FormControl>
                      
                      <FormControl isRequired>
                        <FormLabel fontSize="sm">Email</FormLabel>
                        <Input
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          placeholder="La tua email"
                          value={registerData.email}
                          onChange={(e) => setRegisterData({
                            ...registerData, 
                            email: e.target.value
                          })}
                          size="lg"
                          bg="gray.700"
                          border="1px solid"
                          borderColor="gray.600"
                          _hover={{ bg: 'gray.600' }}
                          _focus={{ bg: 'gray.600', borderColor: 'purple.500', outline: 'none' }}
                          fontSize="16px"
                        />
                      </FormControl>
                      
                      <FormControl isRequired>
                        <FormLabel fontSize="sm">Password</FormLabel>
                        <InputGroup size="lg">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="Almeno 10 caratteri, maiuscola, numero e carattere speciale"
                            value={registerData.password}
                            onChange={(e) => setRegisterData({
                              ...registerData, 
                              password: e.target.value
                            })}
                            bg="gray.700"
                            border="1px solid"
                            borderColor="gray.600"
                            _hover={{ bg: 'gray.600' }}
                            _focus={{ bg: 'gray.600', borderColor: 'purple.500', outline: 'none' }}
                            fontSize="16px"
                          />
                          <InputRightElement>
                            <IconButton
                              variant="ghost"
                              onClick={() => setShowPassword(!showPassword)}
                              icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                              aria-label="Mostra password"
                              size="sm"
                            />
                          </InputRightElement>
                        </InputGroup>
                      </FormControl>
                      
                      <FormControl isRequired>
                        <FormLabel fontSize="sm">Conferma Password</FormLabel>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="Ripeti password"
                          value={registerData.confirmPassword}
                          onChange={(e) => setRegisterData({
                            ...registerData, 
                            confirmPassword: e.target.value
                          })}
                          size="lg"
                          bg="gray.700"
                          border="1px solid"
                          borderColor="gray.600"
                          _hover={{ bg: 'gray.600' }}
                          _focus={{ bg: 'gray.600', borderColor: 'purple.500', outline: 'none' }}
                          fontSize="16px"
                        />
                      </FormControl>
                      
                      {/* ✅ INDICATORE REQUISITI PASSWORD IN TEMPO REALE */}
                      {registerData.password && (
                        <Box 
                          w="100%" 
                          bg="gray.700" 
                          p={3} 
                          borderRadius="md"
                          border="1px solid"
                          borderColor="gray.600"
                        >
                          <Text fontSize="xs" fontWeight="bold" mb={2} color="gray.400">
                            Requisiti password:
                          </Text>
                          <VStack align="stretch" spacing={1}>
                            <HStack spacing={2}>
                              <Icon 
                                as={passwordValidation.checks.length ? FiCheck : FiX} 
                                color={passwordValidation.checks.length ? 'green.400' : 'red.400'}
                                boxSize={3}
                              />
                              <Text fontSize="xs" color="gray.300">
                                10-128 caratteri
                              </Text>
                            </HStack>
                            <HStack spacing={2}>
                              <Icon 
                                as={passwordValidation.checks.uppercase ? FiCheck : FiX} 
                                color={passwordValidation.checks.uppercase ? 'green.400' : 'red.400'}
                                boxSize={3}
                              />
                              <Text fontSize="xs" color="gray.300">
                                Almeno una maiuscola
                              </Text>
                            </HStack>
                            <HStack spacing={2}>
                              <Icon 
                                as={passwordValidation.checks.lowercase ? FiCheck : FiX} 
                                color={passwordValidation.checks.lowercase ? 'green.400' : 'red.400'}
                                boxSize={3}
                              />
                              <Text fontSize="xs" color="gray.300">
                                Almeno una minuscola
                              </Text>
                            </HStack>
                            <HStack spacing={2}>
                              <Icon 
                                as={passwordValidation.checks.number ? FiCheck : FiX} 
                                color={passwordValidation.checks.number ? 'green.400' : 'red.400'}
                                boxSize={3}
                              />
                              <Text fontSize="xs" color="gray.300">
                                Almeno un numero
                              </Text>
                            </HStack>
                            <HStack spacing={2}>
                              <Icon 
                                as={passwordValidation.checks.special ? FiCheck : FiX} 
                                color={passwordValidation.checks.special ? 'green.400' : 'red.400'}
                                boxSize={3}
                              />
                              <Text fontSize="xs" color="gray.300">
                                Carattere speciale (!@#$%...)
                              </Text>
                            </HStack>
                          </VStack>
                        </Box>
                      )}
                      
                      <Checkbox
                        isChecked={registerData.acceptTerms}
                        onChange={(e) => setRegisterData({
                          ...registerData,
                          acceptTerms: e.target.checked
                        })}
                        colorScheme="purple"
                      >
                        <Text fontSize="sm">
                          Accetto i termini di servizio e la privacy policy
                        </Text>
                      </Checkbox>
                      
                      <Button
                        type="submit"
                        colorScheme="purple"
                        size="lg"
                        width="100%"
                        isLoading={isLoading}
                        loadingText="Registrazione..."
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
      </Container>
    </Box>
  );
}

export default Login;