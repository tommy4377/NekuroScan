import React, { useState } from 'react';
import {
  Box, Container, VStack, Input, Button, Text, Heading,
  FormControl, FormLabel, useToast, Tabs, TabList,
  TabPanels, Tab, TabPanel, InputGroup, InputRightElement
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
      toast({ title: 'Accesso effettuato!', status: 'success' });
      navigate('/');
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
      toast({ title: 'Registrazione completata!', status: 'success' });
      navigate('/');
    } else {
      toast({ title: result.error || 'Errore registrazione', status: 'error' });
    }
  };

  return (
    <Container maxW="container.sm" py={20}>
      <VStack spacing={8}>
        <Heading size="xl">Benvenuto su KuroReader</Heading>
        
        <Box w="100%" bg="gray.800" p={8} borderRadius="xl">
          <Tabs colorScheme="purple">
            <TabList>
              <Tab>Accedi</Tab>
              <Tab>Registrati</Tab>
            </TabList>
            
            <TabPanels>
              <TabPanel>
                <form onSubmit={handleLogin}>
                  <VStack spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>Email</FormLabel>
                      <Input
                        type="email"
                        value={loginData.email}
                        onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                      />
                    </FormControl>
                    
                    <FormControl isRequired>
                      <FormLabel>Password</FormLabel>
                      <InputGroup>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={loginData.password}
                          onChange={(e) => setLoginData({...loginData, password: e.target.value})}
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
                      isLoading={isLoading}
                    >
                      Accedi
                    </Button>
                  </VStack>
                </form>
              </TabPanel>
              
              <TabPanel>
                <form onSubmit={handleRegister}>
                  <VStack spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>Username</FormLabel>
                      <Input
                        value={registerData.username}
                        onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                      />
                    </FormControl>
                    
                    <FormControl isRequired>
                      <FormLabel>Email</FormLabel>
                      <Input
                        type="email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                      />
                    </FormControl>
                    
                    <FormControl isRequired>
                      <FormLabel>Password</FormLabel>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={registerData.password}
                        onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                      />
                    </FormControl>
                    
                    <FormControl isRequired>
                      <FormLabel>Conferma Password</FormLabel>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                      />
                    </FormControl>
                    
                    <Button
                      type="submit"
                      colorScheme="purple"
                      width="100%"
                      isLoading={isLoading}
                    >
                      Registrati
                    </Button>
                  </VStack>
                </form>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </VStack>
    </Container>
  );
}

export default Login;