import React, { useState } from 'react';
import {
  Box,
  Flex,
  HStack,
  IconButton,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  useDisclosure,
  Container,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Text,
  Image,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  VStack,
  Divider,
  useBreakpointValue,
  Badge
} from '@chakra-ui/react';
import {
  HamburgerIcon,
  CloseIcon,
  SearchIcon
} from '@chakra-ui/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FaBook, FaHome, FaSearch, FaUser, FaBookmark, 
  FaSignInAlt, FaSignOutAlt, FaCog
} from 'react-icons/fa';
import { BiCategoryAlt } from 'react-icons/bi';
import useAuth from '../hooks/useAuth';

function Navigation() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, syncToServer } = useAuth();
  
  const isMobile = useBreakpointValue({ base: true, md: false });
  const logoSize = useBreakpointValue({ base: '30px', md: '35px' });

  // Controlla se siamo nel reader
  const isReaderPage = location.pathname.includes('/read/');
  if (isReaderPage) return null; // Non mostrare navigation nel reader

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      onClose();
    }
  };

  const handleLogout = async () => {
    if (user) {
      await syncToServer();
    }
    logout();
    navigate('/');
  };

  const isActivePage = (path) => {
    return location.pathname === path;
  };

  return (
    <Box
      bg="rgba(26, 32, 44, 0.98)"
      px={2}
      position="sticky"
      top={0}
      left={0}
      right={0}
      zIndex={999}
      borderBottom="1px"
      borderColor="gray.700"
      backdropFilter="blur(10px)"
      boxShadow="md"
    >
      <Container maxW="container.xl">
        <Flex h={16} alignItems="center" justifyContent="space-between">
          {/* Left - Menu and Logo */}
          <HStack spacing={{ base: 2, md: 4 }}>
            {/* Mobile Menu Button */}
            <IconButton
              size="md"
              icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
              aria-label="Menu"
              display={{ md: 'none' }}
              onClick={onOpen}
              variant="ghost"
            />
            
            {/* Logo - Always visible */}
            <Link to="/home">
              <HStack 
                spacing={2}
                _hover={{ opacity: 0.8 }}
                cursor="pointer"
                transition="opacity 0.2s"
              >
                <Image 
                  src="/web-app-manifest-512x512.png" 
                  boxSize={logoSize}
                  alt="KuroReader Logo"
                  fallbackSrc="https://via.placeholder.com/35" 
                />
                <Text
                  fontSize={{ base: 'lg', md: 'xl' }}
                  fontWeight="bold"
                  bgGradient="linear(to-r, purple.400, pink.400)"
                  bgClip="text"
                  display={{ base: isMobile ? 'none' : 'block', sm: 'block' }}
                >
                  KuroReader
                </Text>
              </HStack>
            </Link>

            {/* Desktop Navigation */}
            <HStack spacing={2} display={{ base: 'none', md: 'flex' }}>
              <Link to="/home">
                <Button 
                  variant={isActivePage('/home') ? 'solid' : 'ghost'}
                  leftIcon={<FaHome />} 
                  size="sm"
                  colorScheme={isActivePage('/home') ? 'purple' : 'gray'}
                >
                  Home
                </Button>
              </Link>
              <Link to="/library">
                <Button 
                  variant={isActivePage('/library') ? 'solid' : 'ghost'}
                  leftIcon={<FaBook />} 
                  size="sm"
                  colorScheme={isActivePage('/library') ? 'purple' : 'gray'}
                >
                  Libreria
                </Button>
              </Link>
              <Link to="/categories">
                <Button 
                  variant={isActivePage('/categories') ? 'solid' : 'ghost'}
                  leftIcon={<BiCategoryAlt />} 
                  size="sm"
                  colorScheme={isActivePage('/categories') ? 'purple' : 'gray'}
                >
                  Categorie
                </Button>
              </Link>
            </HStack>
          </HStack>

          {/* Center - Search Bar (Desktop) */}
          <Box 
            display={{ base: 'none', md: 'block' }} 
            flex={1} 
            maxW="400px" 
            mx={4}
          >
            <form onSubmit={handleSearch}>
              <InputGroup size="sm">
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Cerca manga..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  bg="gray.800"
                  border="none"
                  _hover={{ bg: 'gray.700' }}
                  _focus={{ bg: 'gray.700', boxShadow: 'outline' }}
                  borderRadius="full"
                />
              </InputGroup>
            </form>
          </Box>

          {/* Right - User Actions */}
          <HStack spacing={{ base: 1, md: 2 }}>
            {/* Mobile Search Button */}
            <IconButton
              icon={<SearchIcon />}
              variant="ghost"
              display={{ base: 'flex', md: 'none' }}
              onClick={() => navigate('/search')}
              aria-label="Cerca"
              size="sm"
            />
            
            {/* User Menu */}
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
                    bg="purple.500"
                    color="white"
                  />
                </MenuButton>
                <MenuList bg="gray.800" borderColor="gray.700">
                  <MenuItem isDisabled bg="gray.800">
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" fontWeight="bold">{user.username}</Text>
                      <Text fontSize="xs" color="gray.400">{user.email}</Text>
                    </VStack>
                  </MenuItem>
                  <MenuDivider borderColor="gray.600" />
                  <MenuItem 
                    icon={<FaUser />} 
                    onClick={() => navigate('/profile')}
                    _hover={{ bg: 'gray.700' }}
                  >
                    Il mio profilo
                  </MenuItem>
                  <MenuItem 
                    icon={<FaBookmark />} 
                    onClick={() => navigate('/library')}
                    _hover={{ bg: 'gray.700' }}
                  >
                    I miei manga
                  </MenuItem>
                  <MenuItem 
                    icon={<FaCog />} 
                    onClick={() => navigate('/settings')}
                    _hover={{ bg: 'gray.700' }}
                  >
                    Impostazioni
                  </MenuItem>
                  <MenuDivider borderColor="gray.600" />
                  <MenuItem 
                    onClick={handleLogout} 
                    color="red.400" 
                    icon={<FaSignOutAlt />}
                    _hover={{ bg: 'red.900' }}
                  >
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

      {/* Mobile Drawer */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="xs">
        <DrawerOverlay />
        <DrawerContent bg="gray.900">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" borderColor="gray.700">
            <HStack spacing={2}>
              <Image 
                src="/web-app-manifest-512x512.png" 
                boxSize="25px"
                alt="KuroReader" 
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
              {/* Mobile Search */}
              <form onSubmit={handleSearch}>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <SearchIcon color="gray.400" />
                  </InputLeftElement>
                  <Input
                    placeholder="Cerca manga..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    bg="gray.800"
                    border="none"
                    _focus={{ bg: 'gray.700' }}
                  />
                </InputGroup>
              </form>
              
              <Divider borderColor="gray.700" />
              
              {/* Navigation Links */}
              <VStack align="stretch" spacing={2}>
                <Link to="/home" onClick={onClose}>
                  <Button 
                    variant={isActivePage('/home') ? 'solid' : 'ghost'}
                    justifyContent="flex-start" 
                    leftIcon={<FaHome />} 
                    w="100%"
                    colorScheme={isActivePage('/home') ? 'purple' : 'gray'}
                  >
                    Home
                    {isActivePage('/home') && (
                      <Badge ml="auto" colorScheme="purple">Attuale</Badge>
                    )}
                  </Button>
                </Link>
                <Link to="/library" onClick={onClose}>
                  <Button 
                    variant={isActivePage('/library') ? 'solid' : 'ghost'}
                    justifyContent="flex-start" 
                    leftIcon={<FaBook />} 
                    w="100%"
                    colorScheme={isActivePage('/library') ? 'purple' : 'gray'}
                  >
                    Libreria
                  </Button>
                </Link>
                <Link to="/categories" onClick={onClose}>
                  <Button 
                    variant={isActivePage('/categories') ? 'solid' : 'ghost'}
                    justifyContent="flex-start" 
                    leftIcon={<BiCategoryAlt />} 
                    w="100%"
                    colorScheme={isActivePage('/categories') ? 'purple' : 'gray'}
                  >
                    Categorie
                  </Button>
                </Link>
              </VStack>
              
              <Divider borderColor="gray.700" />
              
              {/* User Section */}
              {user ? (
                <VStack align="stretch" spacing={2}>
                  <Box px={3} py={2} bg="gray.800" borderRadius="md">
                    <Text fontSize="sm" fontWeight="bold">{user.username}</Text>
                    <Text fontSize="xs" color="gray.400">{user.email}</Text>
                  </Box>
                  
                  <Link to="/profile" onClick={onClose}>
                    <Button
                      variant="ghost"
                      justifyContent="flex-start"
                      leftIcon={<FaUser />}
                      w="100%"
                    >
                      Il mio profilo
                    </Button>
                  </Link>
                  
                  <Button
                    variant="ghost"
                    justifyContent="flex-start"
                    color="red.400"
                    leftIcon={<FaSignOutAlt />}
                    onClick={() => {
                      handleLogout();
                      onClose();
                    }}
                  >
                    Logout
                  </Button>
                </VStack>
              ) : (
                <Button
                  colorScheme="purple"
                  leftIcon={<FaSignInAlt />}
                  onClick={() => {
                    navigate('/login');
                    onClose();
                  }}
                  w="100%"
                >
                  Accedi
                </Button>
              )}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}

export default Navigation;
