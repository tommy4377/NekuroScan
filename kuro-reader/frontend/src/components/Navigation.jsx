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
import { 
  FaBook, FaHome, FaSearch, FaUser, FaBookmark, 
  FaSignInAlt, FaSignOutAlt
} from 'react-icons/fa';
import { BiCategoryAlt } from 'react-icons/bi';
import useAuth from '../hooks/useAuth';

function Navigation() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { user, logout, syncToServer } = useAuth();
  
  const showFullTitle = useBreakpointValue({ base: false, sm: true });
  const logoSize = useBreakpointValue({ base: '30px', md: '35px' });

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      onClose();
    }
  };

  const handleLogout = async () => {
    // Sync before logout
    if (user) {
      await syncToServer();
    }
    logout();
    navigate('/');
  };

  return (
    <>
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
        backdropFilter="blur(10px)"
      >
        <Container maxW="container.xl">
          <Flex h={16} alignItems="center" justifyContent="space-between">
            {/* Left - Menu and Logo */}
            <HStack spacing={{ base: 1, md: 4 }}>
              <IconButton
                size="md"
                icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
                aria-label="Menu"
                display={{ md: 'none' }}
                onClick={onOpen}
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

              {/* Desktop Nav */}
              <HStack spacing={3} display={{ base: 'none', md: 'flex' }}>
                <Link to="/library">
                  <Button variant="ghost" leftIcon={<FaBook />} size="sm">
                    Libreria
                  </Button>
                </Link>
                <Link to="/categories">
                  <Button 
                    variant="ghost" 
                    leftIcon={<BiCategoryAlt />} 
                    size="sm"
                    colorScheme="purple"
                  >
                    Categorie
                  </Button>
                </Link>
              </HStack>
            </HStack>

            {/* Center - Search (Desktop) */}
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
                    _focus={{ bg: 'gray.700' }}
                  />
                </InputGroup>
              </form>
            </Box>

            {/* Right - Actions */}
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
                      bg="purple.500"
                    />
                  </MenuButton>
                  <MenuList bg="gray.800" borderColor="gray.700">
                    <MenuItem isDisabled>
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm">{user.username}</Text>
                        <Text fontSize="xs" color="gray.400">{user.email}</Text>
                      </VStack>
                    </MenuItem>
                    <MenuDivider />
                    <MenuItem icon={<FaBookmark />} onClick={() => navigate('/library')}>
                      I miei manga
                    </MenuItem>
                    <MenuDivider />
                    <MenuItem onClick={handleLogout} color="red.400" icon={<FaSignOutAlt />}>
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
            <HStack>
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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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
                  <Text px={3} fontSize="sm" color="gray.400">
                    Connesso come: {user.username}
                  </Text>
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
