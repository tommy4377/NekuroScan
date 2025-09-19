import React, { useState, useMemo } from 'react';
import {
  Box, Flex, HStack, IconButton, Button, Input, InputGroup, InputLeftElement,
  useDisclosure, Container, Avatar, Menu, MenuButton, MenuList, MenuItem,
  MenuDivider, Text, Image, Drawer, DrawerBody, DrawerHeader, DrawerOverlay,
  DrawerContent, DrawerCloseButton, VStack, Divider, useBreakpointValue
} from '@chakra-ui/react';
import { HamburgerIcon, SearchIcon } from '@chakra-ui/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaBook, FaHome, FaUser, FaBookmark, FaSignInAlt, FaSignOutAlt } from 'react-icons/fa';
import { BiCategoryAlt } from 'react-icons/bi';
import useAuth from '../hooks/useAuth';

function Navigation() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, syncToServer } = useAuth();

  // non mostrare nel reader
  if (location.pathname.includes('/read/')) return null;

  // avatar src
  const avatarSrc = useMemo(() => {
    const local = localStorage.getItem('userAvatar');
    return user?.avatar || local || undefined;
  }, [user]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setQuery('');
      onClose();
    }
  };

  const doLogout = async () => {
    if (user) await syncToServer();
    logout();
    navigate('/');
  };

  return (
    <>
      <Box h="64px" /> {/* spacer per nav fixed */}
      <Box
        bg="rgba(26,32,44,0.98)"
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex={999}
        borderBottom="1px solid"
        borderColor="gray.700"
        backdropFilter="blur(10px)"
      >
        <Container maxW="container.xl">
          <Flex h={16} align="center" justify="space-between">
            <HStack spacing={2}>
              <IconButton
                icon={<HamburgerIcon />}
                aria-label="Menu"
                display={{ base: 'flex', md: 'none' }}
                onClick={onOpen}
                variant="ghost"
              />
              <Link to="/home">
                <HStack spacing={2}>
                  <Image src="/web-app-manifest-512x512.png" alt="KuroReader" boxSize={{ base:'28px', md:'34px' }} />
                  <Text
                    fontSize={{ base: 'md', md: 'xl' }}
                    fontWeight="bold"
                    bgGradient="linear(to-r, purple.400, pink.400)"
                    bgClip="text"
                    display="block"
                  >
                    KuroReader
                  </Text>
                </HStack>
              </Link>
              <HStack spacing={2} display={{ base: 'none', md: 'flex' }}>
                <Link to="/home"><Button variant="ghost" size="sm" leftIcon={<FaHome />}>Home</Button></Link>
                <Link to="/library"><Button variant="ghost" size="sm" leftIcon={<FaBook />}>Libreria</Button></Link>
                <Link to="/categories"><Button variant="ghost" size="sm" leftIcon={<BiCategoryAlt />}>Categorie</Button></Link>
              </HStack>
            </HStack>

            <Box display={{ base: 'none', md: 'block' }} flex={1} maxW="420px" mx={4}>
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
                    border="none"
                  />
                </InputGroup>
              </form>
            </Box>

            <HStack spacing={2}>
              <IconButton
                icon={<SearchIcon />}
                aria-label="Cerca"
                display={{ base: 'flex', md: 'none' }}
                variant="ghost"
                onClick={() => navigate('/search')}
              />
              {user ? (
                <Menu>
                  <MenuButton>
                    <Avatar size="sm" name={user.username} src={avatarSrc} bg="purple.500" />
                  </MenuButton>
                  <MenuList bg="gray.800" borderColor="gray.700">
                    <MenuItem isDisabled bg="gray.800">
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="bold">{user.username}</Text>
                        <Text fontSize="xs" color="gray.400">{user.email}</Text>
                      </VStack>
                    </MenuItem>
                    <MenuDivider />
                    <MenuItem icon={<FaUser />} onClick={() => navigate('/profile')}>Il mio profilo</MenuItem>
                    <MenuItem icon={<FaBookmark />} onClick={() => navigate('/library')}>I miei manga</MenuItem>
                    <MenuDivider />
                    <MenuItem icon={<FaSignOutAlt />} onClick={doLogout} color="red.300">Logout</MenuItem>
                  </MenuList>
                </Menu>
              ) : (
                <Button size="sm" colorScheme="purple" onClick={() => navigate('/login')} leftIcon={<FaSignInAlt />}>
                  Accedi
                </Button>
              )}
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* Drawer mobile */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="xs">
        <DrawerOverlay />
        <DrawerContent bg="gray.900">
          <DrawerCloseButton />
          <DrawerHeader>
            <HStack spacing={2}>
              <Image src="/web-app-manifest-512x512.png" boxSize="24px" />
              <Text fontSize="lg" fontWeight="bold" bgGradient="linear(to-r, purple.400, pink.400)" bgClip="text">
                KuroReader
              </Text>
            </HStack>
          </DrawerHeader>
          <DrawerBody>
            <VStack spacing={4} align="stretch">
              <form onSubmit={handleSearch}>
                <InputGroup>
                  <InputLeftElement pointerEvents="none"><SearchIcon color="gray.400" /></InputLeftElement>
                  <Input bg="gray.800" placeholder="Cerca manga..." value={query} onChange={(e) => setQuery(e.target.value)} />
                </InputGroup>
              </form>
              <Divider />
              <VStack align="stretch" spacing={2}>
                <Link to="/home" onClick={onClose}><Button variant="ghost" leftIcon={<FaHome />} w="100%">Home</Button></Link>
                <Link to="/library" onClick={onClose}><Button variant="ghost" leftIcon={<FaBook />} w="100%">Libreria</Button></Link>
                <Link to="/categories" onClick={onClose}><Button variant="ghost" leftIcon={<BiCategoryAlt />} w="100%">Categorie</Button></Link>
                <Link to="/latest" onClick={onClose}><Button variant="ghost" w="100%">Ultimi aggiornamenti</Button></Link>
                <Link to="/popular" onClick={onClose}><Button variant="ghost" w="100%">Più letti</Button></Link>
              </VStack>
              <Divider />
              {user ? (
                <VStack align="stretch" spacing={2}>
                  <HStack><Avatar size="sm" name={user.username} src={avatarSrc} /><Text>{user.username}</Text></HStack>
                  <Link to="/profile" onClick={onClose}><Button variant="ghost" leftIcon={<FaUser />} w="100%">Il mio profilo</Button></Link>
                  <Button variant="ghost" leftIcon={<FaSignOutAlt />} color="red.300" onClick={() => { doLogout(); onClose(); }}>
                    Logout
                  </Button>
                </VStack>
              ) : (
                <Button colorScheme="purple" leftIcon={<FaSignInAlt />} onClick={() => { navigate('/login'); onClose(); }}>
                  Accedi
                </Button>
              )}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export default Navigation;
