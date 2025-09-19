import React, { useState, useRef, useEffect } from 'react';
import {
  Container, VStack, HStack, Heading, Text, Avatar, Box, Button, Input,
  FormControl, FormLabel, SimpleGrid, Divider, useToast, InputGroup,
  InputRightElement, IconButton, Switch, Badge, Tabs, TabList, Tab,
  TabPanels, TabPanel, Select, useClipboard
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon, EditIcon, CheckIcon, CopyIcon } from '@chakra-ui/icons';
import { FaCamera, FaSave, FaShare, FaLock, FaGlobe, FaTrash, FaQrcode } from 'react-icons/fa';
import MangaCard from '../components/MangaCard';
import useAuth from '../hooks/useAuth';
import QRCode from 'qrcode';

export default function Profile() {
  const toast = useToast();
  const { user, updateProfile, changePassword, persistUserData } = useAuth();
  const fileRef = useRef();
  
  // States
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState('');
  
  // Profile URL
  const profileUrl = `${window.location.origin}/user/${username}`;
  const { hasCopied, onCopy } = useClipboard(profileUrl);

  // Library data
  const [reading] = useState(() => JSON.parse(localStorage.getItem('reading') || '[]'));
  const [completed] = useState(() => JSON.parse(localStorage.getItem('completed') || '[]'));
  const [favorites] = useState(() => JSON.parse(localStorage.getItem('favorites') || '[]'));

  // Load saved data
  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
      
      // Load persistent avatar
      const savedAvatar = localStorage.getItem(`avatar_${user.id}`) || 
                        localStorage.getItem('userAvatar') || 
                        user.avatar;
      if (savedAvatar) {
        setAvatar(savedAvatar);
      }
      
      // Load bio
      const savedBio = localStorage.getItem(`bio_${user.id}`) || 
                      localStorage.getItem('userBio') || '';
      setBio(savedBio);
      
      // Load privacy
      const savedPublic = localStorage.getItem(`public_${user.id}`) === 'true' ||
                         localStorage.getItem('profilePublic') === 'true';
      setIsPublic(savedPublic);
      
      // Generate QR code
      if (savedPublic) {
        generateQRCode();
      }
    }
  }, [user]);

  const generateQRCode = async () => {
    try {
      const qr = await QRCode.toDataURL(profileUrl);
      setQrCode(qr);
    } catch (err) {
      console.error('QR generation failed:', err);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File troppo grande (max 5MB)', status: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      setAvatar(result);
      
      // Save persistently
      if (user) {
        localStorage.setItem(`avatar_${user.id}`, result);
      }
      localStorage.setItem('userAvatar', result);
      
      // Persist user data
      if (user) {
        persistUserData(user.id);
      }
      
      toast({ title: 'Avatar aggiornato', status: 'success' });
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    setLoading(true);
    
    // Save locally with user ID
    if (user) {
      localStorage.setItem(`bio_${user.id}`, bio);
      localStorage.setItem(`avatar_${user.id}`, avatar);
      localStorage.setItem(`public_${user.id}`, isPublic.toString());
      
      // Also save globally for quick access
      localStorage.setItem('userBio', bio);
      localStorage.setItem('userAvatar', avatar);
      localStorage.setItem('profilePublic', isPublic.toString());
      
      // Save public profile data if public
      if (isPublic) {
        const publicProfiles = JSON.parse(localStorage.getItem('publicProfiles') || '{}');
        publicProfiles[username] = {
          username,
          avatar,
          bio,
          stats: {
            totalRead: reading.length + completed.length,
            favorites: favorites.length,
            completed: completed.length
          },
          reading: reading.slice(0, 12),
          completed: completed.slice(0, 12),
          favorites: favorites.slice(0, 12),
          privacy: 'public'
        };
        localStorage.setItem('publicProfiles', JSON.stringify(publicProfiles));
      }
      
      // Persist all user data
      persistUserData(user.id);
    }
    
    setIsEditing(false);
    setLoading(false);
    
    toast({ 
      title: 'Profilo salvato', 
      description: isPublic ? 'Il tuo profilo è ora pubblico' : 'Il tuo profilo è privato',
      status: 'success' 
    });
    
    if (isPublic) {
      generateQRCode();
    }
  };

  const handlePasswordChange = async () => {
    if (!newPass || newPass.length < 6) {
      toast({ title: 'Password troppo corta (min 6)', status: 'error' });
      return;
    }
    
    if (newPass !== confirmPass) {
      toast({ title: 'Le password non coincidono', status: 'error' });
      return;
    }

    const result = await changePassword(oldPass, newPass);
    
    if (result.success) {
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
      toast({ title: 'Password cambiata', status: 'success' });
    } else {
      toast({ title: result.error || 'Errore', status: 'error' });
    }
  };

  const shareProfile = () => {
    if (!isPublic) {
      toast({ 
        title: 'Profilo privato', 
        description: 'Rendi pubblico il profilo per condividerlo',
        status: 'warning' 
      });
      return;
    }
    
    if (navigator.share) {
      navigator.share({
        title: `Profilo di ${username}`,
        text: `Guarda il mio profilo su KuroReader!`,
        url: profileUrl
      }).catch(err => {
        if (err.name !== 'AbortError') {
          onCopy();
          toast({ title: 'Link copiato!', status: 'success' });
        }
      });
    } else {
      onCopy();
      toast({ title: 'Link copiato!', status: 'success' });
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header Profile */}
        <Box bg="gray.800" p={6} borderRadius="xl" position="relative">
          <HStack spacing={6} align="start" flexWrap="wrap">
            <Box position="relative">
              <Avatar 
                size="2xl" 
                name={username} 
                src={avatar}
                border="4px solid"
                borderColor="purple.500"
              />
              <IconButton
                icon={<FaCamera />}
                size="sm"
                colorScheme="purple"
                borderRadius="full"
                position="absolute"
                bottom={0}
                right={0}
                onClick={() => fileRef.current?.click()}
                aria-label="Cambia avatar"
              />
              <input 
                ref={fileRef} 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                style={{ display: 'none' }} 
              />
            </Box>

            <VStack align="stretch" flex={1} spacing={4}>
              <HStack justify="space-between">
                <VStack align="start" spacing={1}>
                  {isEditing ? (
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      size="lg"
                      fontWeight="bold"
                      maxW="300px"
                    />
                  ) : (
                    <Heading size="lg">@{username}</Heading>
                  )}
                  <HStack spacing={2}>
                    <Text color="gray.400">{email}</Text>
                    <Badge colorScheme={isPublic ? 'green' : 'gray'}>
                      {isPublic ? 'Pubblico' : 'Privato'}
                    </Badge>
                  </HStack>
                </VStack>
                
                <HStack>
                  {isEditing ? (
                    <>
                      <Button 
                        colorScheme="green" 
                        leftIcon={<CheckIcon />}
                        onClick={saveProfile}
                        isLoading={loading}
                      >
                        Salva
                      </Button>
                      <Button variant="ghost" onClick={() => setIsEditing(false)}>
                        Annulla
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button leftIcon={<EditIcon />} onClick={() => setIsEditing(true)}>
                        Modifica
                      </Button>
                      <Button 
                        leftIcon={<FaShare />} 
                        variant="outline" 
                        onClick={shareProfile}
                        isDisabled={!isPublic}
                      >
                        Condividi
                      </Button>
                    </>
                  )}
                </HStack>
              </HStack>

              {isEditing ? (
                <Input
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Scrivi una bio..."
                  maxLength={200}
                />
              ) : (
                bio && <Text color="gray.300">{bio}</Text>
              )}

              {/* Privacy Toggle */}
              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Profilo pubblico</FormLabel>
                <Switch 
                  colorScheme="green"
                  isChecked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  isDisabled={!isEditing}
                />
              </FormControl>

              {/* Share Section */}
              {isPublic && !isEditing && (
                <Box p={4} bg="gray.700" borderRadius="lg">
                  <Text fontSize="sm" mb={2}>Link pubblico:</Text>
                  <HStack>
                    <Input 
                      value={profileUrl}
                      isReadOnly
                      size="sm"
                    />
                    <IconButton 
                      icon={<CopyIcon />}
                      size="sm"
                      onClick={onCopy}
                      aria-label="Copia"
                    />
                  </HStack>
                  {hasCopied && (
                    <Text fontSize="xs" color="green.400" mt={1}>
                      Copiato!
                    </Text>
                  )}
                  {qrCode && (
                    <Box mt={3}>
                      <Text fontSize="xs" mb={1}>QR Code:</Text>
                      <Image src={qrCode} w="100px" />
                    </Box>
                  )}
                </Box>
              )}
            </VStack>
          </HStack>
        </Box>

        {/* Tabs Content */}
        <Tabs colorScheme="purple" variant="enclosed">
          <TabList>
            <Tab>Libreria</Tab>
            <Tab>Impostazioni</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Box>
                  <Heading size="md" mb={3}>In lettura ({reading.length})</Heading>
                  {reading.length ? (
                    <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                      {reading.slice(0, 10).map((manga, i) => (
                        <MangaCard key={i} manga={manga} />
                      ))}
                    </SimpleGrid>
                  ) : (
                    <Text color="gray.500">Nessun manga in lettura</Text>
                  )}
                </Box>

                <Box>
                  <Heading size="md" mb={3}>Preferiti ({favorites.length})</Heading>
                  {favorites.length ? (
                    <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                      {favorites.slice(0, 10).map((manga, i) => (
                        <MangaCard key={i} manga={manga} />
                      ))}
                    </SimpleGrid>
                  ) : (
                    <Text color="gray.500">Nessun preferito</Text>
                  )}
                </Box>
              </VStack>
            </TabPanel>

            <TabPanel>
              <Box bg="gray.800" p={6} borderRadius="lg">
                <Heading size="md" mb={4}>Cambia password</Heading>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                  <FormControl>
                    <FormLabel>Password attuale</FormLabel>
                    <Input 
                      type={showPass ? 'text' : 'password'} 
                      value={oldPass} 
                      onChange={(e) => setOldPass(e.target.value)} 
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Nuova password</FormLabel>
                    <InputGroup>
                      <Input 
                        type={showPass ? 'text' : 'password'} 
                        value={newPass} 
                        onChange={(e) => setNewPass(e.target.value)} 
                      />
                      <InputRightElement>
                        <IconButton 
                          size="sm" 
                          variant="ghost" 
                          icon={showPass ? <ViewOffIcon /> : <ViewIcon />} 
                          onClick={() => setShowPass(!showPass)} 
                          aria-label="Toggle"
                        />
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Conferma password</FormLabel>
                    <Input 
                      type={showPass ? 'text' : 'password'} 
                      value={confirmPass} 
                      onChange={(e) => setConfirmPass(e.target.value)} 
                    />
                  </FormControl>
                </SimpleGrid>
                <Button colorScheme="purple" mt={4} onClick={handlePasswordChange}>
                  Cambia password
                </Button>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  );
}
