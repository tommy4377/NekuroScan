import React, { useState, useRef, useEffect } from 'react';
import {
  Container, VStack, HStack, Heading, Text, Avatar, Box, Button, Input,
  FormControl, FormLabel, SimpleGrid, Divider, useToast, InputGroup,
  InputRightElement, IconButton, Switch, Badge, Tabs, TabList, Tab,
  TabPanels, TabPanel, useClipboard, Image, Stack
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
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
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
  const [reading, setReading] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [favorites, setFavorites] = useState([]);

  // Load library data
  useEffect(() => {
    const savedReading = JSON.parse(localStorage.getItem('reading') || '[]');
    const savedCompleted = JSON.parse(localStorage.getItem('completed') || '[]');
    const savedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    setReading(savedReading);
    setCompleted(savedCompleted);
    setFavorites(savedFavorites);
  }, []);

  // Load saved data
  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
      
      const savedAvatar = localStorage.getItem(`avatar_${user.id}`) || 
                        localStorage.getItem('userAvatar') || 
                        user.avatar || '';
      if (savedAvatar) {
        setAvatar(savedAvatar);
      }
      
      const savedBio = localStorage.getItem(`bio_${user.id}`) || 
                      localStorage.getItem('userBio') || '';
      setBio(savedBio);
      
      const savedPublic = localStorage.getItem(`public_${user.id}`) === 'true' ||
                         localStorage.getItem('profilePublic') === 'true';
      setIsPublic(savedPublic);
      
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
      
      if (user) {
        localStorage.setItem(`avatar_${user.id}`, result);
      }
      localStorage.setItem('userAvatar', result);
      
      toast({ title: 'Avatar aggiornato', status: 'success' });
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    setLoading(true);
    
    try {
      if (user) {
        // Salva localmente
        localStorage.setItem(`bio_${user.id}`, bio);
        localStorage.setItem(`avatar_${user.id}`, avatar);
        localStorage.setItem(`public_${user.id}`, isPublic.toString());
        
        localStorage.setItem('userBio', bio);
        localStorage.setItem('userAvatar', avatar);
        localStorage.setItem('profilePublic', isPublic.toString());
        
        // FIX: Salva profilo pubblico in modo che sia accessibile globalmente
        // Usiamo una struttura JSON che simula un database pubblico
        if (isPublic) {
          // Crea un ID univoco per il profilo
          const profileData = {
            username: username.toLowerCase(),
            displayName: username,
            avatar: avatar || '',
            bio: bio || '',
            stats: {
              totalRead: reading.length + completed.length,
              favorites: favorites.length,
              completed: completed.length
            },
            reading: reading.slice(0, 12),
            completed: completed.slice(0, 12),
            favorites: favorites.slice(0, 12),
            privacy: 'public',
            lastUpdated: new Date().toISOString()
          };
          
          // Salva nel "database pubblico simulato"
          const publicProfiles = JSON.parse(localStorage.getItem('PUBLIC_PROFILES_DB') || '{}');
          publicProfiles[username.toLowerCase()] = profileData;
          localStorage.setItem('PUBLIC_PROFILES_DB', JSON.stringify(publicProfiles));
          
          // IMPORTANTE: In un'app reale, qui invieresti i dati al server
          console.log('Profile saved to public database:', profileData);
          
          await generateQRCode();
        } else {
          // Rimuovi dal database pubblico se diventa privato
          const publicProfiles = JSON.parse(localStorage.getItem('PUBLIC_PROFILES_DB') || '{}');
          delete publicProfiles[username.toLowerCase()];
          localStorage.setItem('PUBLIC_PROFILES_DB', JSON.stringify(publicProfiles));
        }
        
        if (persistUserData) {
          persistUserData(user.id);
        }
      }
      
      setIsEditing(false);
      
      toast({ 
        title: 'Profilo salvato', 
        description: isPublic ? 'Il tuo profilo è ora pubblico e visibile a tutti' : 'Il tuo profilo è privato',
        status: 'success',
        duration: 3000
      });
      
    } catch (error) {
      console.error('Save profile error:', error);
      toast({ 
        title: 'Errore nel salvataggio', 
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
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

  if (!user) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8}>
          <Text>Caricamento profilo...</Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header Profile - FIX MOBILE */}
        <Box bg="gray.800" p={{ base: 4, md: 6 }} borderRadius="xl" position="relative">
          <Stack 
            direction={{ base: 'column', md: 'row' }} 
            spacing={{ base: 4, md: 6 }} 
            align={{ base: 'center', md: 'start' }}
          >
            <Box position="relative">
              <Avatar 
                size={{ base: 'xl', md: '2xl' }}
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

            <VStack align={{ base: 'center', md: 'stretch' }} flex={1} spacing={4} width="100%">
              <Stack 
                direction={{ base: 'column', md: 'row' }} 
                justify="space-between" 
                width="100%"
                align={{ base: 'center', md: 'start' }}
                spacing={{ base: 3, md: 0 }}
              >
                <VStack align={{ base: 'center', md: 'start' }} spacing={1}>
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
                    <Text color="gray.400" fontSize={{ base: 'sm', md: 'md' }}>{email}</Text>
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
                        size={{ base: 'sm', md: 'md' }}
                      >
                        Salva
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => setIsEditing(false)}
                        size={{ base: 'sm', md: 'md' }}
                      >
                        Annulla
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        leftIcon={<EditIcon />} 
                        onClick={() => setIsEditing(true)}
                        size={{ base: 'sm', md: 'md' }}
                      >
                        Modifica
                      </Button>
                      <Button 
                        leftIcon={<FaShare />} 
                        variant="outline" 
                        onClick={shareProfile}
                        isDisabled={!isPublic}
                        size={{ base: 'sm', md: 'md' }}
                      >
                        Condividi
                      </Button>
                    </>
                  )}
                </HStack>
              </Stack>

              {isEditing ? (
                <Input
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Scrivi una bio..."
                  maxLength={200}
                />
              ) : (
                bio && <Text color="gray.300" textAlign={{ base: 'center', md: 'left' }}>{bio}</Text>
              )}

              {/* Privacy Toggle */}
              <FormControl display="flex" alignItems="center" justifyContent={{ base: 'center', md: 'flex-start' }}>
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
                <Box p={4} bg="gray.700" borderRadius="lg" width="100%">
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
                      <Image src={qrCode} w="100px" alt="QR Code" />
                    </Box>
                  )}
                </Box>
              )}
            </VStack>
          </Stack>
        </Box>

        {/* Tabs Content */}
        <Tabs colorScheme="purple" variant="enclosed">
          <TabList>
            <Tab fontSize={{ base: 'sm', md: 'md' }}>Libreria</Tab>
            <Tab fontSize={{ base: 'sm', md: 'md' }}>Impostazioni</Tab>
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
              <Box bg="gray.800" p={{ base: 4, md: 6 }} borderRadius="lg">
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
