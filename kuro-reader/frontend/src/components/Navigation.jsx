import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Flex, HStack, IconButton, Button, Input, InputGroup, InputLeftElement,
  useDisclosure, Container, Avatar, Menu, MenuButton, MenuList, MenuItem,
  MenuDivider, Text, Drawer, DrawerBody, DrawerHeader, DrawerOverlay,
  DrawerContent, DrawerCloseButton, VStack, Divider, useBreakpointValue,
  Badge, useToast
} from '@chakra-ui/react';
import { HamburgerIcon, CloseIcon, SearchIcon } from '@chakra-ui/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaBook, FaUser, FaBookmark, FaSignInAlt, FaSignOutAlt, FaCog, FaShare, FaUsers } from 'react-icons/fa';
import { BiCategoryAlt } from 'react-icons/bi';
import { MdPublic } from 'react-icons/md';
import useAuth from '../hooks/useAuth';
import Logo from './Logo';

function Navigation() {
  const location = useLocation();
  
  // ✅ FIX React #300: return PRIMA di tutti gli altri hook
  if (location.pathname.includes('/read/')) return null;
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [query, setQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { user, logout, persistLocalData } = useAuth();
  
  const isMobile = useBreakpointValue({ base: true, md: false });
  const logoSize = useBreakpointValue({ base: '32px', md: '40px' });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const avatarSrc = useMemo(() => {
    if (user?.profile?.avatarUrl) return user.profile.avatarUrl;
    if (user) {
      const localAvatar = localStorage.getItem('userAvatar');
      if (localAvatar) return localAvatar;
    }
    return undefined;
  }, [user]);

  // ✅ WRAP handleSearch in useCallback per evitare React error #300
  const handleSearch = React.useCallback((e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setQuery('');
      onClose();
    }
  }, [query, navigate, onClose]);

  // ✅ WRAP doLogout in useCallback per evitare React error #300
  const doLogout = React.useCallback(async () => {
    if (user && persistLocalData) {
      await persistLocalData();
    }
    logout();
    navigate('/');
  }, [user, persistLocalData, logout, navigate]);

  // ✅ WRAP shareProfile in useCallback per evitare React error #300
  const shareProfile = React.useCallback(() => {
    const profileUrl = `${window.location.origin}/user/${user?.username}`;
    navigator.clipboard.writeText(profileUrl).then(() => {
      toast({ title: 'Link copiato!', status: 'success', duration: 2000 });
    }).catch(() => {
      toast({ title: 'Errore nella copia', status: 'error', duration: 2000 });
    });
  }, [user, toast]);

  return (
    <>
      <Box h={{ base: '64px', md: '60px' }} />
      <Box
        bg="rgba(26, 32, 44, 0.95)"
        px={2}
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex={999}
        borderBottom="1px"
        borderColor="gray.700"
        backdropFilter="blur(12px)"
        boxShadow={scrolled ? 'lg' : 'none'}
        transition="all 0.3s"
      >
        <Container maxW="container.xl">
          <Flex h="60px" alignItems="center" justifyContent="space-between">
            <HStack spacing={{ base: 2, md: 4 }}>
              <IconButton
                size="md"
                icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
                aria-label="Menu"
                display={{ md: 'none' }}
                onClick={onOpen}
                variant="ghost"
                colorScheme="purple"
              />
              
              <Link to="/home">
                <HStack spacing={2} _hover={{ opacity: 0.8 }} transition="all 0.2s">
                  <Logo boxSize={logoSize} fontSize={{ base: 'lg', md: '2xl' }} />
                </HStack>
              </Link>

              <HStack spacing={2} display={{ base: 'none', md: 'flex' }}>
                <Link to="/library">
                  <Button variant="ghost" leftIcon={<FaBook />} size="sm">
                    Libreria
                  </Button>
                </Link>
                <Link to="/categories">
                  <Button variant="ghost" leftIcon={<BiCategoryAlt />} size="sm" colorScheme="purple">
                    Categorie
                  </Button>
                </Link>
              </HStack>
            </HStack>

            <Box display={{ base: 'none', md: 'block' }} flex={1} maxW="400px" mx={4}>
              <form onSubmit={handleSearch}>
                <InputGroup size="sm">
                  <InputLeftElement pointerEvents="none">
                    <SearchIcon color="gray.400" />
                  </InputLeftElement>
                  <Input
                    placeholder="Cerca manga..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    bg="gray.800"
                    border="1px solid"
                    borderColor="gray.700"
                    _hover={{ borderColor: 'purple.500' }}
                    _focus={{ borderColor: 'purple.400', bg: 'gray.700' }}
                    borderRadius="full"
                  />
                </InputGroup>
              </form>
            </Box>

            <HStack spacing={2}>
              <IconButton
                icon={<SearchIcon />}
                variant="ghost"
                display={{ base: 'flex', md: 'none' }}
                onClick={() => navigate('/search')}
                aria-label="Cerca"
                size="sm"
                colorScheme="purple"
              />
              
              {user ? (
                <Menu>
                  <MenuButton as={Button} rounded="full" variant="link" cursor="pointer" minW={0}>
                    <Avatar
                      size="sm"
                      name={user.username}
                      src={avatarSrc}
                      bg="purple.500"
                      border="2px solid"
                      borderColor="purple.400"
                    />
                  </MenuButton>
                <MenuList bg="gray.800" borderColor="gray.700">
                    <MenuItem isDisabled bg="gray.900">
                      <VStack align="start" spacing={0}>
                        <HStack>
                          <Text fontSize="sm" fontWeight="bold">{user.username}</Text>
                          {localStorage.getItem('profilePublic') === 'true' && (
                            <MdPublic size="14" color="green" />
                          )}
                        </HStack>
                        <Text fontSize="xs" color="gray.400">{user.email}</Text>
                      </VStack>
                    </MenuItem>
                    <MenuDivider />
                    <MenuItem icon={<FaUser />} onClick={() => navigate('/profile')}>
                      Il mio profilo
                    </MenuItem>
                    <MenuItem icon={<FaBookmark />} onClick={() => navigate('/library')}>
                      I miei manga
                    </MenuItem>
                    {/* Follower/Seguiti gestiti dentro Profilo, voce dedicata rimossa */}
                    <MenuItem icon={<FaCog />} onClick={() => navigate('/settings')}>
                      Impostazioni
                    </MenuItem>
                    {localStorage.getItem('profilePublic') === 'true' && (
                      <MenuItem icon={<FaShare />} onClick={shareProfile}>
                        Condividi profilo
                      </MenuItem>
                    )}
                    <MenuDivider />
                    <MenuItem onClick={doLogout} color="red.400" icon={<FaSignOutAlt />}>
                      Logout
                    </MenuItem>
                  </MenuList>
                </Menu>
              ) : (
                <Button
                  colorScheme="purple"
                  size="sm"
                  onClick={() => navigate('/login')}
                  display={{ base: 'none', sm: 'flex' }}
                  leftIcon={<FaSignInAlt />}
                >
                  Accedi
                </Button>
              )}
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="xs">
        <DrawerOverlay />
        <DrawerContent bg="gray.900">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" borderColor="gray.700">
            <HStack spacing={2}>
              <Logo boxSize="28px" fontSize="xl" />
            </HStack>
          </DrawerHeader>

          <DrawerBody pt={4}>
            <VStack spacing={4} align="stretch">
              <form onSubmit={handleSearch}>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <SearchIcon color="gray.400" />
                  </InputLeftElement>
                  <Input
                    placeholder="Cerca manga..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    bg="gray.800"
                    border="none"
                    _focus={{ bg: 'gray.700', borderColor: 'purple.500' }}
                  />
                </InputGroup>
              </form>
              
              <Divider borderColor="gray.700" />
              
              <VStack align="stretch" spacing={2}>
                <Link to="/library" onClick={onClose}>
                  <Button variant="ghost" justifyContent="flex-start" leftIcon={<FaBook />} w="100%">
                    La mia Libreria
                  </Button>
                </Link>
                <Link to="/categories" onClick={onClose}>
                  <Button 
                    variant="ghost" 
                    justifyContent="flex-start" 
                    leftIcon={<BiCategoryAlt />} 
                    w="100%"
                    colorScheme="purple"
                  >
                    Esplora Categorie
                  </Button>
                </Link>
              </VStack>
              
              <Divider borderColor="gray.700" />
              
              {user ? (
                <VStack align="stretch" spacing={3}>
                  <HStack p={3} bg="gray.800" borderRadius="lg">
                    <Avatar size="md" name={user.username} src={avatarSrc} />
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="bold">{user.username}</Text>
                      <Text fontSize="xs" color="gray.400">{user.email}</Text>
                    </VStack>
                  </HStack>
                  
                  <Link to="/profile" onClick={onClose}>
                    <Button variant="ghost" justifyContent="flex-start" leftIcon={<FaUser />} w="100%">
                      Il mio profilo
                    </Button>
                  </Link>
                  <Link to="/profile" onClick={onClose}>
              <Button variant="ghost" justifyContent="flex-start" leftIcon={<FaUsers />} w="100%">
                Follower e Seguiti
               </Button>
                </Link>

                  <Link to="/settings" onClick={onClose}>
                    <Button variant="ghost" justifyContent="flex-start" leftIcon={<FaCog />} w="100%">
                      Impostazioni
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    justifyContent="flex-start"
                    color="red.400"
                    leftIcon={<FaSignOutAlt />}
                    onClick={async () => { 
                      await doLogout(); 
                      onClose(); 
                    }}
                  >
                    Logout
                  </Button>
                </VStack>
              ) : (
                <VStack spacing={2}>
                  <Button
                    colorScheme="purple"
                    leftIcon={<FaSignInAlt />}
                    onClick={() => { navigate('/login'); onClose(); }}
                    w="100%"
                  >
                    Accedi
                  </Button>
                  <Text fontSize="xs" color="gray.400" textAlign="center">
                    Accedi per salvare i tuoi progressi
                  </Text>
                </VStack>
              )}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export default Navigation;