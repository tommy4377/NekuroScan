import React, { useState, useRef, useEffect } from 'react';
import {
  Container, VStack, HStack, Heading, Text, Avatar, Box, Button, Input,
  FormControl, FormLabel, SimpleGrid, Divider, useToast, InputGroup,
  InputRightElement, IconButton, Switch, Badge, Tabs, TabList, Tab,
  TabPanels, TabPanel, useClipboard, Image, Stack, Textarea, Modal,
  ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, Progress, Stat, StatLabel, StatNumber,
  Wrap, WrapItem, Tooltip, useDisclosure, Alert, AlertIcon,
  Skeleton, SkeletonCircle, SkeletonText, Flex, Center, Spinner,
  Menu, MenuButton, MenuList, MenuItem, AvatarBadge
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon, EditIcon, CheckIcon, CopyIcon, CloseIcon } from '@chakra-ui/icons';
import { 
  FaCamera, FaSave, FaShare, FaLock, FaGlobe, FaTrash,
  FaTrophy, FaBookOpen, FaHeart, FaEye, FaUserPlus,
  FaTwitter, FaDiscord, FaInstagram, FaGithub, FaTiktok,
  FaImage, FaUserFriends, FaCrown, FaBook
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MangaCard from '../components/MangaCard';
import useAuth from '../hooks/useAuth';
import QRCode from 'qrcode';
import axios from 'axios';
import { config } from '../config';

const MotionBox = motion(Box);

export default function Profile() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user, updateProfile, syncToServer } = useAuth();
  const fileRef = useRef();
  const bannerRef = useRef();
  
  // States
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  // Profile data
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    displayName: '',
    bio: '',
    avatarUrl: '',
    bannerUrl: '',
    isPublic: false,
    socialLinks: {
      twitter: '',
      discord: '',
      instagram: ''
    }
  });
  
  // Library data
  const [libraryData, setLibraryData] = useState({
    reading: [],
    completed: [],
    favorites: []
  });
  
  // Friends data
  const [friends, setFriends] = useState({
    followers: [],
    following: []
  });
  
  // QR Code
  const [qrCode, setQrCode] = useState('');
  
  const profileUrl = user ? `${window.location.origin}/user/${user.username}` : '';
  const { hasCopied, onCopy } = useClipboard(profileUrl);

  useEffect(() => {
    if (user) {
      loadUserData();
      loadFriends();
    }
  }, [user]);

  useEffect(() => {
    if (profileData.isPublic && user) {
      generateQRCode();
    }
  }, [profileData.isPublic, user]);

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      const response = await axios.get(`${config.API_URL}/api/user/data`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      const { profile, reading, completed, favorites } = response.data;
      
      setProfileData({
        username: user.username,
        email: user.email,
        displayName: profile?.displayName || user.username,
        bio: profile?.bio || '',
        avatarUrl: profile?.avatarUrl || '',
        bannerUrl: profile?.bannerUrl || '',
        isPublic: profile?.isPublic || false,
        socialLinks: profile?.socialLinks || {}
      });
      
      setLibraryData({
        reading: reading || [],
        completed: completed || [],
        favorites: favorites || []
      });
      
      localStorage.setItem('profilePublic', profile?.isPublic ? 'true' : 'false');
      
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadFriends = async () => {
    try {
      const [followersRes, followingRes] = await Promise.all([
        axios.get(`${config.API_URL}/api/user/followers`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(`${config.API_URL}/api/user/following`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);
      
      setFriends({
        followers: followersRes.data.followers || [],
        following: followingRes.data.following || []
      });
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const generateQRCode = async () => {
    if (!user) return;
    
    try {
      const url = `${window.location.origin}/user/${user.username}`;
      const qr = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: { dark: '#805AD5', light: '#FFFFFF' }
      });
      setQrCode(qr);
    } catch (err) {
      console.error('QR generation failed:', err);
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File troppo grande',
        description: 'Massimo 5MB consentiti',
        status: 'error',
        duration: 3000
      });
      return;
    }

    const setUploading = type === 'avatar' ? setUploadingAvatar : setUploadingBanner;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append(type, file);
      formData.append('bio', profileData.bio);
      formData.append('isPublic', profileData.isPublic);
      formData.append('displayName', profileData.displayName);
      formData.append('socialLinks', JSON.stringify(profileData.socialLinks));

      const response = await axios.put(
        `${config.API_URL}/api/user/profile`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        const profile = response.data.profile;
        setProfileData(prev => ({
          ...prev,
          avatarUrl: profile.avatarUrl || prev.avatarUrl,
          bannerUrl: profile.bannerUrl || prev.bannerUrl
        }));
        
        toast({
          title: `${type === 'avatar' ? 'Avatar' : 'Banner'} aggiornato`,
          status: 'success',
          duration: 2000
        });
        
        await loadUserData();
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Errore upload',
        description: error.response?.data?.message || 'Errore durante il caricamento',
        status: 'error',
        duration: 3000
      });
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('bio', profileData.bio);
      formData.append('isPublic', profileData.isPublic);
      formData.append('displayName', profileData.displayName);
      formData.append('socialLinks', JSON.stringify(profileData.socialLinks));

      const response = await axios.put(
        `${config.API_URL}/api/user/profile`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setIsEditing(false);
        localStorage.setItem('profilePublic', profileData.isPublic ? 'true' : 'false');
        
        toast({
          title: 'Profilo salvato',
          description: profileData.isPublic 
            ? 'Il tuo profilo è ora pubblico'
            : 'Il tuo profilo è privato',
          status: 'success',
          duration: 3000
        });
        
        if (profileData.isPublic) {
          await generateQRCode();
        }
        
        await syncToServer();
      }
    } catch (error) {
      console.error('Save profile error:', error);
      toast({
        title: 'Errore salvataggio',
        description: error.response?.data?.message || 'Impossibile salvare il profilo',
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  const shareProfile = () => {
    if (!profileData.isPublic) {
      toast({
        title: 'Profilo privato',
        description: 'Rendi pubblico il profilo per condividerlo',
        status: 'warning',
        duration: 2000
      });
      return;
    }
    
    if (navigator.share) {
      navigator.share({
        title: `Profilo di ${profileData.displayName}`,
        text: `Guarda il mio profilo su KuroReader!`,
        url: profileUrl
      }).catch(() => {
        onCopy();
        toast({ title: 'Link copiato!', status: 'success', duration: 2000 });
      });
    } else {
      onCopy();
      toast({ title: 'Link copiato!', status: 'success', duration: 2000 });
    }
  };

  if (!user || loadingStats) {
    return (
      <Container maxW="container.xl" py={8}>
        <Center minH="50vh">
          <VStack spacing={4}>
            <Spinner size="xl" color="purple.500" />
            <Text>Caricamento profilo...</Text>
          </VStack>
        </Center>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Banner & Avatar */}
        <Box position="relative" borderRadius="xl" overflow="hidden">
          <Box
            h={{ base: '150px', md: '250px' }}
            bg={profileData.bannerUrl ? `url(${profileData.bannerUrl})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}
            bgSize="cover"
            bgPosition="center"
            position="relative"
          >
            {isEditing && (
              <IconButton
                icon={uploadingBanner ? <Spinner /> : <FaImage />}
                position="absolute"
                top={4}
                right={4}
                colorScheme="blackAlpha"
                onClick={() => bannerRef.current?.click()}
                aria-label="Change banner"
                isLoading={uploadingBanner}
              />
            )}
            <input
              ref={bannerRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, 'banner')}
              style={{ display: 'none' }}
            />
          </Box>
          
          <Box bg="gray.800" px={{ base: 4, md: 8 }} pb={6}>
            <Flex
              direction={{ base: 'column', md: 'row' }}
              align={{ base: 'center', md: 'end' }}
              position="relative"
              mt="-50px"
            >
              <Box position="relative">
                <Avatar
                  size="2xl"
                  name={profileData.displayName}
                  src={profileData.avatarUrl}
                  border="4px solid"
                  borderColor="gray.800"
                  bg="purple.500"
                >
                  {uploadingAvatar && (
                    <AvatarBadge boxSize="1.25em" bg="gray.700" border="none">
                      <Spinner size="sm" color="white" />
                    </AvatarBadge>
                  )}
                </Avatar>
                {isEditing && (
                  <IconButton
                    icon={<FaCamera />}
                    size="sm"
                    colorScheme="purple"
                    borderRadius="full"
                    position="absolute"
                    bottom={0}
                    right={0}
                    onClick={() => fileRef.current?.click()}
                    aria-label="Change avatar"
                  />
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'avatar')}
                  style={{ display: 'none' }}
                />
              </Box>
              
              <VStack
                align={{ base: 'center', md: 'start' }}
                flex={1}
                ml={{ base: 0, md: 6 }}
                mt={{ base: 4, md: 0 }}
                spacing={3}
                width="100%"
              >
                <HStack justify="space-between" width="100%" flexWrap="wrap">
                  <VStack align={{ base: 'center', md: 'start' }} spacing={1}>
                    {isEditing ? (
                      <Input
                        value={profileData.displayName}
                        onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                        size="lg"
                        fontWeight="bold"
                        maxW="300px"
                      />
                    ) : (
                      <Heading size="lg">{profileData.displayName}</Heading>
                    )}
                    <HStack>
                      <Text color="gray.400">@{profileData.username}</Text>
                      <Badge colorScheme={profileData.isPublic ? 'green' : 'gray'}>
                        {profileData.isPublic ? (
                          <HStack spacing={1}>
                            <FaGlobe size="10" />
                            <Text>Pubblico</Text>
                          </HStack>
                        ) : (
                          <HStack spacing={1}>
                            <FaLock size="10" />
                            <Text>Privato</Text>
                          </HStack>
                        )}
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
                        <Button
                          variant="ghost"
                          leftIcon={<CloseIcon />}
                          onClick={() => {
                            setIsEditing(false);
                            loadUserData();
                          }}
                        >
                          Annulla
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          leftIcon={<EditIcon />}
                          onClick={() => setIsEditing(true)}
                        >
                          Modifica
                        </Button>
                        <Button
                          leftIcon={<FaShare />}
                          variant="outline"
                          onClick={shareProfile}
                          isDisabled={!profileData.isPublic}
                        >
                          Condividi
                        </Button>
                      </>
                    )}
                  </HStack>
                </HStack>
                
                {isEditing ? (
                  <Textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    placeholder="Scrivi una bio..."
                    maxLength={500}
                    rows={3}
                    width="100%"
                  />
                ) : (
                  profileData.bio && (
                    <Text color="gray.300" width="100%">
                      {profileData.bio}
                    </Text>
                  )
                )}
                
                {isEditing ? (
                  <VStack align="start" width="100%" spacing={2}>
                    <Text fontSize="sm" fontWeight="bold">Link Social</Text>
                    <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={2} width="100%">
                      <Input
                        placeholder="Twitter username"
                        size="sm"
                        value={profileData.socialLinks.twitter || ''}
                        onChange={(e) => setProfileData({
                          ...profileData,
                          socialLinks: { ...profileData.socialLinks, twitter: e.target.value }
                        })}
                      />
                      <Input
                        placeholder="Discord username"
                        size="sm"
                        value={profileData.socialLinks.discord || ''}
                        onChange={(e) => setProfileData({
                          ...profileData,
                          socialLinks: { ...profileData.socialLinks, discord: e.target.value }
                        })}
                      />
                      <Input
                        placeholder="Instagram username"
                        size="sm"
                        value={profileData.socialLinks.instagram || ''}
                        onChange={(e) => setProfileData({
                          ...profileData,
                          socialLinks: { ...profileData.socialLinks, instagram: e.target.value }
                        })}
                      />
                    </SimpleGrid>
                  </VStack>
                ) : (
                  profileData.socialLinks && Object.keys(profileData.socialLinks).length > 0 && (
                    <HStack spacing={2}>
                      {profileData.socialLinks.twitter && (
                        <IconButton
                          icon={<FaTwitter />}
                          size="sm"
                          variant="ghost"
                          as="a"
                          href={`https://twitter.com/${profileData.socialLinks.twitter.replace('@', '')}`}
                          target="_blank"
                        />
                      )}
                      {profileData.socialLinks.discord && (
                        <Tooltip label={`Discord: ${profileData.socialLinks.discord}`}>
                          <IconButton
                            icon={<FaDiscord />}
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              navigator.clipboard.writeText(profileData.socialLinks.discord);
                              toast({
                                title: 'Discord username copiato',
                                description: profileData.socialLinks.discord,
                                status: 'success',
                                duration: 2000
                              });
                            }}
                          />
                        </Tooltip>
                      )}
                      {profileData.socialLinks.instagram && (
                        <IconButton
                          icon={<FaInstagram />}
                          size="sm"
                          variant="ghost"
                          as="a"
                          href={`https://instagram.com/${profileData.socialLinks.instagram.replace('@', '')}`}
                          target="_blank"
                        />
                      )}
                    </HStack>
                  )
                )}
                
                {isEditing && (
                  <FormControl display="flex" alignItems="center">
                    <FormLabel mb="0">Profilo pubblico</FormLabel>
                    <Switch
                      colorScheme="green"
                      isChecked={profileData.isPublic}
                      onChange={(e) => setProfileData({ ...profileData, isPublic: e.target.checked })}
                    />
                  </FormControl>
                )}
              </VStack>
            </Flex>
          </Box>
        </Box>

        {/* Stats semplificati */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Stat p={4} bg="gray.800" borderRadius="lg">
            <HStack spacing={3}>
              <Box p={2} bg="purple.500" borderRadius="lg">
                <FaBookOpen color="white" size="16" />
              </Box>
              <Box>
                <StatLabel fontSize="xs">In lettura</StatLabel>
                <StatNumber fontSize="xl">{libraryData.reading.length}</StatNumber>
              </Box>
            </HStack>
          </Stat>
          
          <Stat p={4} bg="gray.800" borderRadius="lg">
            <HStack spacing={3}>
              <Box p={2} bg="pink.500" borderRadius="lg">
                <FaHeart color="white" size="16" />
              </Box>
              <Box>
                <StatLabel fontSize="xs">Preferiti</StatLabel>
                <StatNumber fontSize="xl">{libraryData.favorites.length}</StatNumber>
              </Box>
            </HStack>
          </Stat>
          
          <Stat p={4} bg="gray.800" borderRadius="lg">
            <HStack spacing={3}>
              <Box p={2} bg="green.500" borderRadius="lg">
                <FaTrophy color="white" size="16" />
              </Box>
              <Box>
                <StatLabel fontSize="xs">Completati</StatLabel>
                <StatNumber fontSize="xl">{libraryData.completed.length}</StatNumber>
              </Box>
            </HStack>
          </Stat>
          
          <Stat p={4} bg="gray.800" borderRadius="lg">
            <HStack spacing={3}>
              <Box p={2} bg="blue.500" borderRadius="lg">
                <FaUserFriends color="white" size="16" />
              </Box>
              <Box>
                <StatLabel fontSize="xs">Amici</StatLabel>
                <StatNumber fontSize="xl">
                  {friends.followers.length + friends.following.length}
                </StatNumber>
              </Box>
            </HStack>
          </Stat>
        </SimpleGrid>

        {/* Share Section */}
        {profileData.isPublic && !isEditing && qrCode && (
          <Box p={6} bg="gray.800" borderRadius="xl">
            <Heading size="md" mb={4}>Condividi profilo</Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <Box>
                <Text fontSize="sm" mb={2}>Link pubblico</Text>
                <InputGroup>
                  <Input value={profileUrl} isReadOnly />
                  <InputRightElement>
                    <IconButton
                      icon={<CopyIcon />}
                      size="sm"
                      onClick={onCopy}
                      aria-label="Copia"
                    />
                  </InputRightElement>
                </InputGroup>
                {hasCopied && (
                  <Text fontSize="xs" color="green.400" mt={1}>
                    Link copiato!
                  </Text>
                )}
              </Box>
              <Box>
                <Text fontSize="sm" mb={2}>QR Code</Text>
                <Image src={qrCode} alt="QR Code" maxW="150px" />
              </Box>
            </SimpleGrid>
          </Box>
        )}

        {/* Tabs */}
        <Tabs colorScheme="purple" variant="enclosed" index={activeTab} onChange={setActiveTab}>
          <TabList>
            <Tab>La mia Libreria</Tab>
            <Tab>Amici ({friends.followers.length + friends.following.length})</Tab>
          </TabList>

          <TabPanels>
            {/* Library Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                {/* Reading */}
                <Box>
                  <HStack justify="space-between" mb={3}>
                    <Heading size="md">In lettura ({libraryData.reading.length})</Heading>
                    {libraryData.reading.length > 12 && (
                      <Button size="sm" variant="ghost" onClick={() => navigate('/library')}>
                        Vedi tutti
                      </Button>
                    )}
                  </HStack>
                  {libraryData.reading.length > 0 ? (
                    <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                      {libraryData.reading.slice(0, 10).map((manga, i) => (
                        <MotionBox
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <MangaCard manga={manga} />
                        </MotionBox>
                      ))}
                    </SimpleGrid>
                  ) : (
                    <Center py={8} bg="gray.800" borderRadius="lg">
                      <Text color="gray.500">Nessun manga in lettura</Text>
                    </Center>
                  )}
                </Box>

                {/* Favorites */}
                <Box>
                  <HStack justify="space-between" mb={3}>
                    <Heading size="md">Preferiti ({libraryData.favorites.length})</Heading>
                    {libraryData.favorites.length > 12 && (
                      <Button size="sm" variant="ghost" onClick={() => navigate('/library')}>
                        Vedi tutti
                      </Button>
                    )}
                  </HStack>
                  {libraryData.favorites.length > 0 ? (
                    <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                      {libraryData.favorites.slice(0, 10).map((manga, i) => (
                        <MotionBox
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <MangaCard manga={manga} />
                        </MotionBox>
                      ))}
                    </SimpleGrid>
                  ) : (
                    <Center py={8} bg="gray.800" borderRadius="lg">
                      <Text color="gray.500">Nessun preferito</Text>
                    </Center>
                  )}
                </Box>
              </VStack>
            </TabPanel>

            {/* Friends Tab */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                {/* Followers */}
                <Box>
                  <Heading size="md" mb={4}>
                    Followers ({friends.followers.length})
                  </Heading>
                  <VStack align="stretch" spacing={2} maxH="400px" overflowY="auto">
                    {friends.followers.length > 0 ? (
                      friends.followers.map((follower) => (
                        <HStack
                          key={follower.id}
                          p={3}
                          bg="gray.800"
                          borderRadius="md"
                          cursor="pointer"
                          _hover={{ bg: 'gray.700' }}
                          onClick={() => navigate(`/user/${follower.username}`)}
                        >
                          <Avatar size="sm" name={follower.displayName} src={follower.avatarUrl} />
                          <VStack align="start" spacing={0} flex={1}>
                            <Text fontSize="sm" fontWeight="bold">{follower.displayName}</Text>
                            <Text fontSize="xs" color="gray.400">@{follower.username}</Text>
                          </VStack>
                        </HStack>
                      ))
                    ) : (
                      <Center py={8} bg="gray.800" borderRadius="lg">
                        <Text color="gray.500" fontSize="sm">Nessun follower</Text>
                      </Center>
                    )}
                  </VStack>
                </Box>

                {/* Following */}
                <Box>
                  <Heading size="md" mb={4}>
                    Seguiti ({friends.following.length})
                  </Heading>
                  <VStack align="stretch" spacing={2} maxH="400px" overflowY="auto">
                    {friends.following.length > 0 ? (
                      friends.following.map((following) => (
                        <HStack
                          key={following.id}
                          p={3}
                          bg="gray.800"
                          borderRadius="md"
                          cursor="pointer"
                          _hover={{ bg: 'gray.700' }}
                          onClick={() => navigate(`/user/${following.username}`)}
                        >
                          <Avatar size="sm" name={following.displayName} src={following.avatarUrl} />
                          <VStack align="start" spacing={0} flex={1}>
                            <Text fontSize="sm" fontWeight="bold">{following.displayName}</Text>
                            <Text fontSize="xs" color="gray.400">@{following.username}</Text>
                          </VStack>
                        </HStack>
                      ))
                    ) : (
                      <Center py={8} bg="gray.800" borderRadius="lg">
                        <Text color="gray.500" fontSize="sm">Non segui nessuno</Text>
                      </Center>
                    )}
                  </VStack>
                </Box>
              </SimpleGrid>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  );
}