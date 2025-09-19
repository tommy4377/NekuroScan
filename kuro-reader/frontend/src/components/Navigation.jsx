import React, { useState, useMemo } from 'react';
import {
  Box, Flex, HStack, IconButton, Button, Input, InputGroup, InputLeftElement,
  useDisclosure, Container, Avatar, Menu, MenuButton, MenuList, MenuItem,
  MenuDivider, Text, Image, Drawer, DrawerBody, DrawerHeader, DrawerOverlay,
  DrawerContent, DrawerCloseButton, VStack, Divider, useBreakpointValue
} from '@chakra-ui/react';
import { HamburgerIcon, CloseIcon, SearchIcon } from '@chakra-ui/icons';
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
  
  const showFullTitle = useBreakpointValue({ base: false, sm: true });
  const logoSize = useBreakpointValue({ base: '30px', md: '35px' });

  // Non mostrare nel reader
  if (location.pathname.includes('/read/')) return null;

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
      <Box h="64px" /> {/* Spacer per nav fixed */}
      <Box
        bg="rgba(26, 32, 44, 0.98)"
        px={2}
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex={999}
        borderBottom="1px"
        borderColor="gray.700"
        backdropFilter="blur(10px)"
      >
        <Container maxW="container.xl">
          <Flex h={16} alignItems="center" justifyContent="space-between">
            <HStack spacing={{ base: 1, md: 4 }}>
              <IconButton
                size="md"
                icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
                aria-label="Menu"
                display={{ md: 'none' }}
                onClick={onOpen}
                variant="ghost"
              />
              
              <Link to="/home">
                <HStack 
                  _hover={{ opacity: 0.8 }}
                  cursor="pointer"
                >
                  <Image 
                    src="/web-app-manifest-512x512.png" 
                    boxSize={logoSize}
                    fallbackSrc="https://via.placeholder.com/30" 
                  />
                  {showFullTitle && (
                    <Text
                      fontSize={{ base: 'lg', md: '2xl' }}
                      fontWeight="bold"
                      bgGradient="linear(to-r, purple.400, pink.400)"
                      bgClip="text"
                    >
                      KuroReader
                    </Text>
                  )}
                </HStack>
              </Link>

              <HStack spacing={2} display={{ base: 'none', md: 'flex' }}>
                <Link to="/home"><Button variant="ghost" leftIcon={<FaHome />} size="sm">Home</Button></Link>
                <Link to="/library"><Button variant="ghost" leftIcon={<FaBook />} size="sm">Libreria</Button></Link>
                <Link to="/categories"><Button variant="ghost" leftIcon={<BiCategoryAlt />} size="sm" colorScheme="purple">Categorie</Button></Link>
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
                    border="none"
                    _focus={{ bg: 'gray.700' }}
                  />
                </InputGroup>
              </form>
            </Box>

            <HStack spacing={1}>
              <IconButton
                icon={<SearchIcon />}
                variant="ghost"
                display={{ base: 'flex', md: 'none' }}
                onClick={() => navigate('/search')}
                aria-label="Cerca"
                size="sm"
              />
              
              {user ? (
                <Menu>
                  <MenuButton
                    as={Button}
                    rounded="full"
                    variant="link"
                    cursor="pointer"
                    minW={0}
                  >
                    <Avatar
                      size="sm"
                      name={user.username}
                      src={avatarSrc}
                      bg="purple.500"
                    />
                  </MenuButton>
                  <MenuList bg="gray.800" borderColor="gray.700">
                    <MenuItem isDisabled>
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="bold">{user.username}</Text>
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
                >
                  Accedi
                </Button>
              )}
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* Mobile Drawer */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="xs">
        <DrawerOverlay />
        <DrawerContent bg="gray.900">
          <DrawerCloseButton />
          <DrawerHeader>
            <HStack spacing={2}>
              <Image 
                src="/web-app-manifest-512x512.png" 
                boxSize="25px" 
              />
              <Text
                fontSize="xl"
                fontWeight="bold"
                bgGradient="linear(to-r, purple.400, pink.400)"
                bgClip="text"
              >
                KuroReader
              </Text>
            </HStack>
          </DrawerHeader>

          <DrawerBody>
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
                  />
                </InputGroup>
              </form>
              
              <Divider />
              
              <VStack align="stretch" spacing={2}>
                <Link to="/home" onClick={onClose}>
                  <Button variant="ghost" justifyContent="flex-start" leftIcon={<FaHome />} w="100%">
                    Home
                  </Button>
                </Link>
                <Link to="/library" onClick={onClose}>
                  <Button variant="ghost" justifyContent="flex-start" leftIcon={<FaBook />} w="100%">
                    Libreria
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
              
              <Divider />
              
              {user ? (
                <VStack align="stretch" spacing={2}>
                  <HStack align="center">
                    <Avatar size="sm" name={user.username} src={avatarSrc} />
                    <Text>{user.username}</Text>
                  </HStack>
                  <Link to="/profile" onClick={onClose}>
                    <Button variant="ghost" justifyContent="flex-start" leftIcon={<FaUser />} w="100%">
                      Il mio profilo
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    justifyContent="flex-start"
                    color="red.400"
                    leftIcon={<FaSignOutAlt />}
                    onClick={() => { doLogout(); onClose(); }}
                  >
                    Logout
                  </Button>
                </VStack>
              ) : (
                <Button
                  colorScheme="purple"
                  leftIcon={<FaSignInAlt />}
                  onClick={() => { navigate('/login'); onClose(); }}
                >
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
