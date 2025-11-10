/**
 * NAVIGATION - Main navigation bar with responsive drawer
 * Handles user menu, search, and mobile navigation
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import {
  Box, Flex, HStack, IconButton, Button, Input, InputGroup, InputLeftElement,
  useDisclosure, Container, Avatar, Menu, MenuButton, MenuList, MenuItem,
  MenuDivider, Text, Drawer, DrawerBody, DrawerHeader, DrawerOverlay,
  DrawerContent, DrawerCloseButton, VStack, Divider, useBreakpointValue,
  useToast, Tooltip
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaBook, FaUser, FaBookmark, FaSignInAlt, FaSignOutAlt, FaCog, FaShare, FaBell, FaChartLine, FaDownload, FaList, FaFire, FaStar, FaClock } from 'react-icons/fa';
import { BiCategoryAlt } from 'react-icons/bi';
import { MdPublic } from 'react-icons/md';
import useAuth from '@/hooks/useAuth';
import Logo from '@/components/Logo';

// ========== COMPONENT ==========

function Navigation(): JSX.Element | null {
  // ALL hooks MUST be called before any conditional return
  const location = useLocation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [query, setQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  
  // ✅ FIX: Zustand requires selector syntax for reactivity
  const user = useAuth(state => state.user);
  const logout = useAuth(state => state.logout);
  const persistLocalData = useAuth(state => state.persistLocalData);
  
  const logoSize = useBreakpointValue({ base: '32px', md: '40px' }) || '32px';
  
  // CRITICAL: ALL HOOKS MUST BE BEFORE THE RETURN!
  useEffect(() => {
    const handleScroll = (): void => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const avatarSrc = useMemo(() => {
    // ✅ FIX: Check user.profile.avatarUrl FIRST (come JS)
    if (user?.profile?.avatarUrl) return user.profile.avatarUrl;
    if (user) {
      const localAvatar = localStorage.getItem('userAvatar');
      if (localAvatar) return localAvatar;
    }
    return undefined;
  }, [user]);

  const handleSearch = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/categories?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
      onClose();
    }
  }, [query, navigate, onClose]);

  const doLogout = useCallback(async () => {
    if (user && persistLocalData) {
      await persistLocalData();
    }
    logout();
    navigate('/');
  }, [user, persistLocalData, logout, navigate]);

  const shareProfile = useCallback(() => {
    const profileUrl = `${window.location.origin}/user/${user?.username}`;
    navigator.clipboard.writeText(profileUrl).then(() => {
      toast({ title: 'Link copiato!', status: 'success', duration: 2000 });
    }).catch(() => {
      toast({ title: 'Errore nella copia', status: 'error', duration: 2000 });
    });
  }, [user, toast]);
  
  // Conditional return AFTER all hooks
  if (location.pathname.includes('/read/')) return null;

  return (
    <>
      {/* Spacer with safe-area */}
      <Box 
        h={{ base: '64px', md: '60px' }}
        sx={{
          '@supports (padding-top: env(safe-area-inset-top))': {
            paddingTop: 'env(safe-area-inset-top)',
            height: 'calc(64px + env(safe-area-inset-top))',
          }
        }}
      />
      <Box
        bg="rgba(26, 32, 44, 0.95)"
        px={2}
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex={1000}
        borderBottom="1px"
        borderColor="gray.700"
        backdropFilter="blur(12px)"
        boxShadow={scrolled ? 'lg' : 'none'}
        transition="all 0.3s"
        sx={{
          '@supports (padding-top: env(safe-area-inset-top))': {
            paddingTop: 'env(safe-area-inset-top)',
          }
        }}
      >
        <Container maxW="container.xl">
          <Flex 
            h={{ base: '64px', md: '60px' }}
            alignItems="center" 
            justifyContent="space-between"
          >
            <HStack spacing={{ base: 2, md: 4 }}>
            <IconButton
              size="md"
              aria-label="Menu"
              onClick={onOpen}
              variant="ghost"
              colorScheme="purple"
              display={{ base: 'flex', md: 'flex' }}
              icon={
                <Box>
                  <Box w="20px" h="2px" bg="currentColor" mb="4px" />
                  <Box w="20px" h="2px" bg="currentColor" mb="4px" />
                  <Box w="20px" h="2px" bg="currentColor" />
                </Box>
              }
            />
              
              <Link to="/home">
                <HStack spacing={2} _hover={{ opacity: 0.8 }} transition="all 0.2s">
                  <Logo boxSize={logoSize} fontSize="2xl" showImage={true} />
                </HStack>
              </Link>
            </HStack>

            <Box display={{ base: 'none', md: 'block' }} flex={1} maxW="400px" mx={4}>
              <form onSubmit={handleSearch}>
                <InputGroup size="sm">
                  <InputLeftElement pointerEvents="none">
                    <SearchIcon color="gray.400" />
                  </InputLeftElement>
                  <Input
                    type="text"
                    inputMode="search"
                    placeholder="Cerca manga..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    bg="gray.800"
                    border="1px solid"
                    borderColor="gray.700"
                    _hover={{ borderColor: 'purple.500' }}
                    _focus={{ borderColor: 'purple.400', bg: 'gray.700', outline: 'none' }}
                    borderRadius="full"
                    fontSize="16px"
                  />
                </InputGroup>
              </form>
            </Box>

            <HStack spacing={2}>
              <Tooltip label="Cerca manga" placement="bottom">
                <IconButton
                  icon={<SearchIcon />}
                  variant="ghost"
                  display={{ base: 'flex', md: 'none' }}
                  onClick={() => navigate('/search')}
                  aria-label="Cerca"
                  size="sm"
                  colorScheme="purple"
                />
              </Tooltip>
              
              {user && (
                <>
                  <Tooltip label="La mia libreria" placement="bottom">
                    <IconButton
                      icon={<FaBook />}
                      variant="ghost"
                      onClick={() => navigate('/library')}
                      aria-label="Libreria"
                      size="sm"
                      colorScheme="purple"
                      display={{ base: 'none', md: 'flex' }}
                    />
                  </Tooltip>
                  <Tooltip label="Notifiche" placement="bottom">
                    <IconButton
                      icon={<FaBell />}
                      variant="ghost"
                      onClick={() => navigate('/notifications')}
                      aria-label="Notifiche"
                      size="sm"
                      colorScheme="purple"
                      display={{ base: 'none', md: 'flex' }}
                    />
                  </Tooltip>
                </>
              )}
              
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
                    <MenuItem icon={<FaList />} onClick={() => navigate('/lists')}>
                      Le mie liste
                    </MenuItem>
                    <MenuItem icon={<FaChartLine />} onClick={() => navigate('/dashboard')}>
                      Dashboard
                    </MenuItem>
                    <MenuItem icon={<FaBell />} onClick={() => navigate('/notifications')}>
                      Notifiche
                    </MenuItem>
                    <MenuItem icon={<FaDownload />} onClick={() => navigate('/downloads')}>
                      Download Offline
                    </MenuItem>
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
        <DrawerContent 
          bg="gray.900"
          sx={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            paddingLeft: 'env(safe-area-inset-left, 0px)',
          }}
        >
          <DrawerCloseButton 
            sx={{
              top: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
              left: 'calc(0.75rem + env(safe-area-inset-left, 0px))',
            }}
          />
          <DrawerHeader 
            borderBottomWidth="1px" 
            borderColor="gray.700"
            pt="calc(1rem + env(safe-area-inset-top, 0px))"
          >
            <HStack spacing={2}>
              <Logo boxSize="32px" fontSize="lg" />
            </HStack>
          </DrawerHeader>

          <DrawerBody pt={4} pb="calc(1rem + env(safe-area-inset-bottom, 0px))">
            <VStack spacing={4} align="stretch">
              <form onSubmit={handleSearch}>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <SearchIcon color="gray.400" />
                  </InputLeftElement>
                  <Input
                    type="text"
                    inputMode="search"
                    placeholder="Cerca manga..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    bg="gray.800"
                    border="1px solid"
                    borderColor="gray.700"
                    _focus={{ bg: 'gray.700', borderColor: 'purple.500', outline: 'none' }}
                    fontSize="16px"
                  />
                </InputGroup>
              </form>
              
              <Divider borderColor="gray.700" />
              
              <VStack align="stretch" spacing={2}>
                <Link to="/home" onClick={onClose}>
                  <Button variant="ghost" justifyContent="flex-start" leftIcon={<FaBook />} w="100%">
                    Home
                  </Button>
                </Link>
                <Link to="/search" onClick={onClose}>
                  <Button variant="ghost" justifyContent="flex-start" leftIcon={<SearchIcon />} w="100%">
                    Cerca
                  </Button>
                </Link>
                <Link to="/trending" onClick={onClose}>
                  <Button variant="ghost" justifyContent="flex-start" leftIcon={<FaFire />} w="100%">
                    Trending
                  </Button>
                </Link>
                <Link to="/popular" onClick={onClose}>
                  <Button variant="ghost" justifyContent="flex-start" leftIcon={<FaStar />} w="100%">
                    Popolari
                  </Button>
                </Link>
                <Link to="/latest" onClick={onClose}>
                  <Button variant="ghost" justifyContent="flex-start" leftIcon={<FaClock />} w="100%">
                    Ultimi
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
                    Categorie
                  </Button>
                </Link>
              </VStack>
              
              <Divider borderColor="gray.700" />
              
              {user ? (
                <VStack align="stretch" spacing={2}>
                  <Link to="/library" onClick={onClose}>
                    <Button variant="ghost" justifyContent="flex-start" leftIcon={<FaBookmark />} w="100%">
                      La mia libreria
                    </Button>
                  </Link>
                  <Link to="/notifications" onClick={onClose}>
                    <Button variant="ghost" justifyContent="flex-start" leftIcon={<FaBell />} w="100%">
                      Notifiche
                    </Button>
                  </Link>
                  <Link to="/downloads" onClick={onClose}>
                    <Button variant="ghost" justifyContent="flex-start" leftIcon={<FaDownload />} w="100%">
                      Download Offline
                    </Button>
                  </Link>
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

