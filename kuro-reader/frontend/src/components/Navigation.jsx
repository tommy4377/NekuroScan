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
  Stack,
  Container,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Text,
  Badge,
  useColorMode,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  VStack,
  Divider
} from '@chakra-ui/react';
import {
  HamburgerIcon,
  CloseIcon,
  SearchIcon,
  MoonIcon,
  SunIcon
} from '@chakra-ui/icons';
import { Link, useNavigate } from 'react-router-dom';
import { FaBook, FaHome, FaSearch, FaUser, FaBookmark, FaCog } from 'react-icons/fa';
import useAuth from '../hooks/useAuth';

function Navigation() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { colorMode, toggleColorMode } = useColorMode();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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
            {/* Logo */}
            <HStack spacing={8} alignItems="center">
              <IconButton
                size="md"
                icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
                aria-label="Open Menu"
                display={{ md: 'none' }}
                onClick={onOpen}
              />
              
              <Link to="/">
                <HStack>
                  <Text
                    fontSize="2xl"
                    fontWeight="bold"
                    bgGradient="linear(to-r, purple.400, pink.400)"
                    bgClip="text"
                  >
                    KuroReader
                  </Text>
                  <Badge colorScheme="purple" variant="subtle">BETA</Badge>
                </HStack>
              </Link>

              {/* Desktop Navigation */}
              <HStack as="nav" spacing={4} display={{ base: 'none', md: 'flex' }}>
                <Link to="/">
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
            </HStack>

            {/* Search Bar - Desktop */}
            <Box display={{ base: 'none', md: 'block' }} flex={1} maxW="400px" mx={8}>
              <form onSubmit={handleSearch}>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <SearchIcon color="gray.400" />
                  </InputLeftElement>
                  <Input
                    placeholder="Cerca manga o novel..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    bg="gray.800"
                    border="none"
                    _focus={{ bg: 'gray.700', boxShadow: 'outline' }}
                  />
                </InputGroup>
              </form>
            </Box>

            {/* Right Menu */}
            <HStack spacing={3}>
              <IconButton
                icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
                onClick={toggleColorMode}
                variant="ghost"
                aria-label="Toggle color mode"
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
                      bg="purple.500"
                    />
                  </MenuButton>
                  <MenuList bg="gray.800" borderColor="gray.700">
                    <MenuItem icon={<FaUser />}>Profilo</MenuItem>
                    <MenuItem icon={<FaBookmark />}>Preferiti</MenuItem>
                    <MenuItem icon={<FaCog />}>Impostazioni</MenuItem>
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
                >
                  Accedi
                </Button>
              )}
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* Mobile Drawer */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent bg="gray.900">
          <DrawerCloseButton />
          <DrawerHeader>
            <Text
              fontSize="xl"
              fontWeight="bold"
              bgGradient="linear(to-r, purple.400, pink.400)"
              bgClip="text"
            >
              KuroReader
            </Text>
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
                    placeholder="Cerca..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    bg="gray.800"
                    border="none"
                  />
                </InputGroup>
              </form>
              
              <Divider />
              
              {/* Mobile Navigation */}
              <VStack align="stretch" spacing={2}>
                <Link to="/" onClick={onClose}>
                  <Button variant="ghost" justifyContent="flex-start" leftIcon={<FaHome />} w="100%">
                    Home
                  </Button>
                </Link>
                <Link to="/library" onClick={onClose}>
                  <Button variant="ghost" justifyContent="flex-start" leftIcon={<FaBook />} w="100%">
                    Libreria
                  </Button>
                </Link>
              </VStack>
              
              {user && (
                <>
                  <Divider />
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
                      onClick={logout}
                    >
                      Logout
                    </Button>
                  </VStack>
                </>
              )}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export default Navigation;