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
  useBreakpointValue
} from '@chakra-ui/react';
import {
  HamburgerIcon,
  CloseIcon,
  SearchIcon
} from '@chakra-ui/icons';
import { Link, useNavigate } from 'react-router-dom';
import { FaBook, FaHome, FaSearch, FaUser, FaBookmark, FaCog, FaSignInAlt } from 'react-icons/fa';
import useAuth from '../hooks/useAuth';

function Navigation() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Responsive values
  const showDesktopNav = useBreakpointValue({ base: false, md: true });
  const logoSize = useBreakpointValue({ base: '25px', md: '30px' });
  const titleSize = useBreakpointValue({ base: 'lg', md: '2xl' });

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      onClose();
    }
  };

  return (
    <>
      <Box
        bg="rgba(26, 32, 44, 0.95)"
        px={4}
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
            {/* Left side - Menu and Logo */}
            <HStack spacing={{ base: 2, md: 8 }} alignItems="center" flex={{ base: 1, md: 'none' }}>
              {/* Mobile menu button */}
              <IconButton
                size="md"
                icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
                aria-label="Open Menu"
                display={{ md: 'none' }}
                onClick={onOpen}
              />
              
              {/* Logo - cliccabile per tornare alla home */}
              <Box 
                as={Link} 
                to="/home"
                display="flex"
                alignItems="center"
                cursor="pointer"
                _hover={{ opacity: 0.8 }}
                transition="opacity 0.2s"
              >
                <Image 
                  src="/web-app-manifest-512x512.png" 
                  boxSize={logoSize}
                  mr={2} 
                  fallbackSrc="https://via.placeholder.com/30" 
                />
                <Text
                  fontSize={titleSize}
                  fontWeight="bold"
                  bgGradient="linear(to-r, purple.400, pink.400)"
                  bgClip="text"
                  display={{ base: 'none', sm: 'block' }}
                >
                  KuroReader
                </Text>
              </Box>

              {/* Desktop Navigation */}
              {showDesktopNav && (
                <HStack as="nav" spacing={4}>
                  <Link to="/home">
                    <Button variant="ghost" leftIcon={<FaHome />}>
                      Home
                    </Button>
                  </Link>
                  <Link to="/library">
                    <Button variant="ghost" leftIcon={<FaBook />}>
                      Libreria
                    </Button>
                  </Link>
                </HStack>
              )}
            </HStack>

            {/* Center - Search Bar (Desktop only) */}
            <Box 
              display={{ base: 'none', md: 'block' }} 
              flex={1} 
              maxW="400px" 
              mx={8}
            >
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
                    _focus={{ bg: 'gray.700', boxShadow: 'outline' }}
                  />
                </InputGroup>
              </form>
            </Box>

            {/* Right side - User menu */}
            <HStack spacing={2}>
              {/* Mobile search button */}
              <IconButton
                icon={<SearchIcon />}
                variant="ghost"
                display={{ base: 'flex', md: 'none' }}
                onClick={() => navigate('/search')}
                aria-label="Cerca"
              />
              
              {/* User menu / Login button */}
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
                    />
                  </MenuButton>
                  <MenuList bg="gray.800" borderColor="gray.700">
                    <MenuItem icon={<FaUser />} onClick={() => navigate('/profile')}>
                      Profilo
                    </MenuItem>
                    <MenuItem icon={<FaBookmark />} onClick={() => navigate('/library')}>
                      Preferiti
                    </MenuItem>
                    <MenuItem icon={<FaCog />} onClick={() => navigate('/settings')}>
                      Impostazioni
                    </MenuItem>
                    <MenuDivider />
                    <MenuItem onClick={logout} color="red.400">
                      Logout
                    </MenuItem>
                  </MenuList>
                </Menu>
              ) : (
                <Button
                  colorScheme="purple"
                  size="sm"
                  onClick={() => navigate('/login')}
                  leftIcon={<FaSignInAlt />}
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
            <HStack>
              <Image 
                src="/web-app-manifest-512x512.png" 
                boxSize="25px" 
                fallbackSrc="https://via.placeholder.com/25" 
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
              
              <Divider />
              
              {/* Mobile Navigation */}
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
                <Link to="/search" onClick={onClose}>
                  <Button variant="ghost" justifyContent="flex-start" leftIcon={<FaSearch />} w="100%">
                    Cerca
                  </Button>
                </Link>
              </VStack>
              
              <Divider />
              
              {user ? (
                <VStack align="stretch" spacing={2}>
                  <Button variant="ghost" justifyContent="flex-start" leftIcon={<FaUser />}>
                    Profilo
                  </Button>
                  <Button variant="ghost" justifyContent="flex-start" leftIcon={<FaBookmark />}>
                    Preferiti
                  </Button>
                  <Button variant="ghost" justifyContent="flex-start" leftIcon={<FaCog />}>
                    Impostazioni
                  </Button>
                  <Button
                    variant="ghost"
                    justifyContent="flex-start"
                    color="red.400"
                    onClick={() => {
                      logout();
                      onClose();
                      navigate('/');
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
