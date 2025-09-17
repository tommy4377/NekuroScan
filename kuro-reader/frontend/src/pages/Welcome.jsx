import React, { useState } from 'react';
import {
  Box, Container, VStack, Input, Button, Text, Heading,
  FormControl, FormLabel, useToast, InputGroup, InputRightElement,
  Flex, Icon, Image, Divider
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import { FaBook, FaHeart } from 'react-icons/fa';
import useAuth from '../hooks/useAuth';

function Welcome() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ 
    username: '', email: '', password: '', confirmPassword: '' 
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await login(loginData.email, loginData.password);
    setIsLoading(false);
    
    if (result.success) {
      navigate('/home');
    } else {
      toast({ title: result.error || 'Errore login', status: 'error' });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (registerData.password !== registerData.confirmPassword) {
      toast({ title: 'Le password non coincidono', status: 'error' });
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
      navigate('/home');
    } else {
      toast({ title: result.error || 'Errore registrazione', status: 'error' });
    }
  };

  const handleSkip = () => {
    navigate('/home');
  };

  return (
    <Box
      minH="100vh"
      bgGradient="linear(to-br, purple.900, gray.900)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      position="relative"
      overflow="hidden"
    >
      {/* Background decoration */}
      <Box
        position="absolute"
        top="-20%"
        left="-10%"
        width="400px"
        height="400px"
        bg="purple.500"
        borderRadius="full"
        filter="blur(100px)"
        opacity={0.3}
      />
      <Box
        position="absolute"
        bottom="-20%"
        right="-10%"
        width="400px"
        height="400px"
        bg="pink.500"
        borderRadius="full"
        filter="blur(100px)"
        opacity={0.3}
      />

      <Container maxW="container.sm" position="relative">
        <VStack spacing={8}>
          {/* Logo e titolo */}
          <VStack spacing={4}>
            <Image
              src="/kuro-icon.png" // Metti qui la tua icona di Kuro
              alt="Kuro"
              boxSize="100px"
              borderRadius="full"
              fallbackSrc="https://via.placeholder.com/100"
            />
            <Heading size="2xl" bgGradient="linear(to-r, purple.400, pink.400)" bgClip="text">
              KuroReader
            </Heading>
            <Text color="gray.400">Il tuo manga reader definitivo</Text>
          </VStack>

          <Box w="100%" bg="gray.800" p={8} borderRadius="2xl" boxShadow="2xl">
            {isLogin ? (
              <form onSubmit={handleLogin}>
                <VStack spacing={6}>
                  <Heading size="lg">Bentornato!</Heading>
                  
                  <FormControl isRequired>
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                      placeholder="tua@email.com"
                      size="lg"
                    />
                  </FormControl>
                  
                  <FormControl isRequired>
                    <FormLabel>Password</FormLabel>
                    <InputGroup size="lg">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={loginData.password}
                        onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                        placeholder="••••••••"
                      />
                      <InputRightElement>
                        <Button
                          variant="ghost"
                          onClick={() => setShowPassword(!showPassword)}
                          size="sm"
                        >
                          {showPassword ? <ViewOffIcon /> : <ViewIcon />}
                        </Button>
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>
                  
                  <Button
                    type="submit"
                    colorScheme="purple"
                    width="100%"
                    size="lg"
                    isLoading={isLoading}
                  >
                    Accedi
                  </Button>

                  <Text>
                    Non hai un account?{' '}
                    <Button variant="link" colorScheme="purple" onClick={() => setIsLogin(false)}>
                      Registrati
                    </Button>
                  </Text>
                </VStack>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <VStack spacing={6}>
                  <Heading size="lg">Crea Account</Heading>
                  
                  <FormControl isRequired>
                    <FormLabel>Username</FormLabel>
                    <Input
                      value={registerData.username}
                      onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                      placeholder="Il tuo username"
                      size="lg"
                    />
                  </FormControl>
                  
                  <FormControl isRequired>
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                      placeholder="tua@email.com"
                      size="lg"
                    />
                  </FormControl>
                  
                  <FormControl isRequired>
                    <FormLabel>Password</FormLabel>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={registerData.password}
                      onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                      placeholder="••••••••"
                      size="lg"
                    />
                  </FormControl>
                  
                  <FormControl isRequired>
                    <FormLabel>Conferma Password</FormLabel>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                      placeholder="••••••••"
                      size="lg"
                    />
                  </FormControl>
                  
                  <Button
                    type="submit"
                    colorScheme="purple"
                    width="100%"
                    size="lg"
                    isLoading={isLoading}
                  >
                    Registrati
                  </Button>

                  <Text>
                    Hai già un account?{' '}
                    <Button variant="link" colorScheme="purple" onClick={() => setIsLogin(true)}>
                      Accedi
                    </Button>
                  </Text>
                </VStack>
              </form>
            )}

            <Divider my={6} />

            <Button
              variant="outline"
              width="100%"
              size="lg"
              onClick={handleSkip}
              colorScheme="gray"
            >
              Continua senza account
            </Button>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}

export default Welcome;
