/**
 * LOGIN - User authentication page
 * Combined login and registration with enhanced UI and logo
 * 
 * UPDATED: 2025-11-10 - Added debug logging for auth flow
 * Fixed: Login/register validation and error handling
 */

import { useState, useMemo } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import {
  Box, Container, VStack, Input, Button, Text, Heading,
  FormControl, FormLabel, useToast, Tabs, TabList,
  TabPanels, Tab, TabPanel, InputGroup, InputRightElement,
  Checkbox, HStack, Divider, IconButton, Badge, Icon
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon, ArrowBackIcon } from '@chakra-ui/icons';
import { FiCheck, FiX } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import Logo from '@/components/Logo';

// ========== TYPES ==========

interface LoginData {
  emailOrUsername: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

interface PasswordChecks {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

interface PasswordValidation {
  isValid: boolean;
  checks: PasswordChecks;
}

// ========== VALIDATION ==========

/**
 * Robust password validation (synchronized with backend)
 */
const validatePassword = (password: string): PasswordValidation => {
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
  
  const checks: PasswordChecks = {
    length: password.length >= 10 && password.length <= 128,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };
  
  const isValid = Object.values(checks).every(check => check);
  
  return { isValid, checks };
};

// ========== COMPONENT ==========

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  // ✅ FIX: Zustand requires selector syntax for reactivity
  const login = useAuth(state => state.login);
  const register = useAuth(state => state.register);
  
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  
  const from = location.state?.from?.pathname || '/home';
  
  const [loginData, setLoginData] = useState<LoginData>({ 
    emailOrUsername: '', 
    password: '' 
  });
  
  const [registerData, setRegisterData] = useState<RegisterData>({ 
    username: '', 
    email: '', 
    password: '', 
    confirmPassword: '',
    acceptTerms: false
  });

  const [tabIndex, setTabIndex] = useState(0);
  
  // Calculate password validation only when it changes (performance)
  const passwordValidation = useMemo(() => {
    return validatePassword(registerData.password);
  }, [registerData.password]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    console.log('[Login] 🔐 Login attempt started');
    
    if (!loginData.emailOrUsername || !loginData.password) {
      console.warn('[Login] ⚠️ Missing fields');
      toast({ 
        title: 'Compila tutti i campi', 
        status: 'warning',
        duration: 2000 
      });
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('[Login] 📤 Calling login API...');
      const result = await login(loginData.emailOrUsername, loginData.password);
      
      // ✅ Check result format from old JS version
      if (result?.success) {
        console.log('[Login] ✅ Login successful');
        
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }
        
        toast({ 
          title: 'Benvenuto!',
          status: 'success',
          duration: 2000
        });
        
        navigate(from, { replace: true });
      } else {
        // Login failed
        console.error('[Login] ❌ Login failed:', result?.error);
        toast({ 
          title: 'Errore di accesso',
          description: result?.error || 'Credenziali non valide',
          status: 'error',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('[Login] ❌ Exception:', error);
      toast({ 
        title: 'Errore di accesso',
        description: error instanceof Error ? error.message : 'Errore di rete',
        status: 'error',
        duration: 3000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    console.log('[Register] 📝 Registration attempt started');
    
    if (!registerData.username || !registerData.email || 
        !registerData.password || !registerData.confirmPassword) {
      console.warn('[Register] ⚠️ Missing fields');
      toast({ 
        title: 'Compila tutti i campi', 
        status: 'warning',
        duration: 2000
      });
      return;
    }
    
    if (registerData.password !== registerData.confirmPassword) {
      console.warn('[Register] ⚠️ Passwords do not match');
      toast({ 
        title: 'Le password non coincidono', 
        status: 'error',
        duration: 2000
      });
      return;
    }
    
    // Robust password validation (uses memoized value)
    if (!passwordValidation.isValid) {
      console.warn('[Register] ⚠️ Invalid password');
      toast({ 
        title: 'Password non valida',
        description: 'Verifica che la password rispetti tutti i requisiti di sicurezza',
        status: 'error',
        duration: 4000
      });
      return;
    }
    
    if (!registerData.acceptTerms) {
      console.warn('[Register] ⚠️ Terms not accepted');
      toast({ 
        title: 'Accetta i termini di servizio', 
        status: 'warning',
        duration: 2000
      });
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('[Register] 📤 Calling register API...');
      const result = await register(
        registerData.username, 
        registerData.email, 
        registerData.password
      );
      
      // ✅ Check result format from old JS version
      if (result?.success) {
        console.log('[Register] ✅ Registration successful');
        toast({ 
          title: 'Account creato!',
          description: 'Registrazione completata con successo',
          status: 'success',
          duration: 3000
        });
        navigate('/home');
      } else {
        // Registration failed
        console.error('[Register] ❌ Registration failed:', result?.error);
        toast({ 
          title: 'Errore registrazione',
          description: result?.error || 'Errore durante la registrazione',
          status: 'error',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('[Register] ❌ Exception:', error);
      toast({ 
        title: 'Errore registrazione',
        description: error instanceof Error ? error.message : 'Errore di rete',
        status: 'error',
        duration: 3000
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg="gray.900" display="flex" alignItems="center" py={{ base: 8, md: 0 }}>
      <Container maxW="container.sm" py={{ base: 6, md: 8 }}>
        <VStack spacing={8}>
          {/* Header with logo and back button */}
          <HStack w="100%" justify="space-between" mb={4}>
            <IconButton
              icon={<ArrowBackIcon />}
              variant="ghost"
              onClick={() => navigate('/')}
              aria-label="Torna indietro"
            />
            <Box flex={1} /> {/* Spacer */}
          </HStack>

          {/* Logo and title */}
          <VStack spacing={4}>
            <Logo boxSize="80px" showImage={true} showText={false} />
            <Heading 
              size="xl"
              bgGradient="linear(to-r, purple.400, pink.400)"
              bgClip="text"
              textAlign="center"
            >
              NeKuro Scan
            </Heading>
            <Text color="gray.400" fontSize="sm" textAlign="center">
              Il tuo mondo di manga ti aspetta
            </Text>
          </VStack>
          
          {/* Main card */}
          <Box 
            w="100%" 
            bg="gray.800" 
            p={{ base: 6, md: 8 }} 
            borderRadius="xl"
            boxShadow="2xl"
            border="1px solid"
            borderColor="gray.700"
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
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setLoginData({
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
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setLoginData({
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
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setRememberMe(e.target.checked)}
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
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setRegisterData({
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
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setRegisterData({
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
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setRegisterData({
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
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setRegisterData({
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
                      
                      {/* Real-time password requirements indicator */}
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
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setRegisterData({
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

