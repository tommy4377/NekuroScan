import React, { useState, useRef, useEffect } from 'react';
import {
  Container, VStack, HStack, Heading, Text, Avatar, Box, Button, Input,
  FormControl, FormLabel, SimpleGrid, Divider, useToast, InputGroup,
  InputRightElement, IconButton, Switch, Badge, Tabs, TabList, Tab,
  TabPanels, TabPanel, useClipboard, Image, Stack, Textarea, Modal,
  ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, Progress, Stat, StatLabel, StatNumber, StatHelpText,
  Wrap, WrapItem, Tooltip, useDisclosure, Alert, AlertIcon,
  Skeleton, SkeletonCircle, SkeletonText, Flex, Center, Spinner,
  Menu, MenuButton, MenuList, MenuItem, AvatarBadge
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon, EditIcon, CheckIcon, CopyIcon, CloseIcon } from '@chakra-ui/icons';
import { 
  FaCamera, FaSave, FaShare, FaLock, FaGlobe, FaTrash, FaQrcode,
  FaTrophy, FaClock, FaBookOpen, FaHeart, FaEye, FaUserPlus,
  FaTwitter, FaDiscord, FaInstagram, FaGithub, FaTiktok,
  FaImage, FaUserFriends, FaMedal, FaCrown
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MangaCard from '../components/MangaCard';
import useAuth from '../hooks/useAuth';
import QRCode from 'qrcode';
import axios from 'axios';
import { config } from '../config';

const MotionBox = motion(Box);

// Stats card component
const StatsCard = ({ icon: Icon, label, value, color = 'purple', helpText }) => (
  <Stat
    p={4}
    bg="gray.800"
    borderRadius="lg"
    borderLeft="4px solid"
    borderLeftColor={`${color}.500`}
    _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
    transition="all 0.2s"
  >
    <HStack spacing={3}>
      <Box p={2} bg={`${color}.500`} borderRadius="lg">
        <Icon color="white" size="16" />
      </Box>
      <Box flex={1}>
        <StatLabel fontSize="xs" color="gray.400">{label}</StatLabel>
        <StatNumber fontSize="xl">{value}</StatNumber>
        {helpText && <StatHelpText fontSize="xs">{helpText}</StatHelpText>}
      </Box>
    </HStack>
  </Stat>
);

export default function Profile() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user, updateProfile, syncToServer } = useAuth();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const fileRef = useRef();
  const bannerRef = useRef();
  
  // States
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  
  // Profile data - SENZA TEMI
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
      instagram: '',
      github: '',
      tiktok: ''
    }
  });
  
  // Password change
  const [showPass, setShowPass] = useState(false);
  const [passwords, setPasswords] = useState({
    old: '',
    new: '',
    confirm: ''
  });
  
  // Stats
  const [stats, setStats] = useState({
    totalManga: 0,
    reading: 0,
    completed: 0,
    favorites: 0,
    chaptersRead: 0,
    readingTime: 0,
    profileViews: 0,
    followers: 0,
    following: 0,
    badges: []
  });
  
  // Library data
  const [libraryData, setLibraryData] = useState({
    reading: [],
    completed: [],
    favorites: []
  });
  
  // QR Code
  const [qrCode, setQrCode] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  
  // Profile URL con username corretto
  const profileUrl = user ? `${window.location.origin}/user/${user.username}` : '';
  const { hasCopied, onCopy } = useClipboard(profileUrl);

  // Load data on mount
  useEffect(() => {
    if (user) {
      loadUserData();
      loadStats();
    }
  }, [user]);

  // Generate QR when public
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
        reading: reading.slice(0, 12),
        completed: completed.slice(0, 12),
        favorites: favorites.slice(0, 12)
      });
      
      // Salva anche in localStorage per accesso offline
      localStorage.setItem('profilePublic', profile?.isPublic ? 'true' : 'false');
      
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const response = await axios.get(`${config.API_URL}/api/user/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const generateQRCode = async () => {
    if (!user) return;
    
    try {
      const url = `${window.location.origin}/user/${user.username}`;
      const qr = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#805AD5',
          light: '#FFFFFF'
        }
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
        
        // Ricarica i dati per assicurarsi che siano persistiti
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
        
        // Salva anche in localStorage
        localStorage.setItem('profilePublic', profileData.isPublic ? 'true' : 'false');
        
        toast({
          title: 'Profilo salvato',
          description: profileData.isPublic 
            ? 'Il tuo profilo è ora pubblico e visibile a tutti'
            : 'Il tuo profilo è privato',
          status: 'success',
          duration: 3000
        });
        
        if (profileData.isPublic) {
          await generateQRCode();
        }
        
        // Sincronizza dati con server
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

  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      toast({
        title: 'Le password non coincidono',
        status: 'error',
        duration: 2000
      });
      return;
    }
    
    if (passwords.new.length < 6) {
      toast({
        title: 'Password troppo corta',
        description: 'Minimo 6 caratteri',
        status: 'error',
        duration: 2000
      });
      return;
    }

    try {
      const response = await axios.post(
        `${config.API_URL}/api/auth/change-password`,
        {
          oldPassword: passwords.old,
          newPassword: passwords.new
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      if (response.data.success) {
        setPasswords({ old: '', new: '', confirm: '' });
        toast({
          title: 'Password cambiata',
          status: 'success',
          duration: 2000
        });
      }
    } catch (error) {
      toast({
        title: 'Errore',
        description: error.response?.data?.message || 'Impossibile cambiare password',
        status: 'error',
        duration: 3000
      });
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
      }).catch(err => {
        if (err.name !== 'AbortError') {
          onCopy();
          toast({ title: 'Link copiato!', status: 'success', duration: 2000 });
        }
      });
    } else {
      onCopy();
      toast({ title: 'Link copiato!', status: 'success', duration: 2000 });
    }
  };

  const formatReadingTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  if (!user) {
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
        {/* Banner & Avatar Section */}
        <Box position="relative" borderRadius="xl" overflow="hidden">
          {/* Banner */}
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
          
          {/* Profile Content */}
          <Box bg="gray.800" px={{ base: 4, md: 8 }} pb={6}>
            <Flex
              direction={{ base: 'column', md: 'row' }}
              align={{ base: 'center', md: 'end' }}
              position="relative"
              mt="-50px"
            >
              {/* Avatar */}
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
              
              {/* Profile Info */}
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
                  
                  {/* Action Buttons */}
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
                
                {/* Bio */}
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
                
                {/* Social Links */}
                {isEditing ? (
                  <VStack align="start" width="100%" spacing={2}>
                    <Text fontSize="sm" fontWeight="bold">Link Social</Text>
                    <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2} width="100%">
                      <InputGroup size="sm">
                        <Input
                          placeholder="Twitter username"
                          value={profileData.socialLinks.twitter || ''}
                          onChange={(e) => setProfileData({
                            ...profileData,
                            socialLinks: { ...profileData.socialLinks, twitter: e.target.value }
                          })}
                        />
                      </InputGroup>
                      <InputGroup size="sm">
                        <Input
                          placeholder="Discord username"
                          value={profileData.socialLinks.discord || ''}
                          onChange={(e) => setProfileData({
                            ...profileData,
                            socialLinks: { ...profileData.socialLinks, discord: e.target.value }
                          })}
                        />
                      </InputGroup>
                    </SimpleGrid>
                  </VStack>
                ) : (
                  Object.entries(profileData.socialLinks || {}).length > 0 && (
                    <HStack spacing={2}>
                      {profileData.socialLinks.twitter && (
                        <IconButton
                          icon={<FaTwitter />}
                          size="sm"
                          variant="ghost"
                          as="a"
                          href={`https://twitter.com/${profileData.socialLinks.twitter}`}
                          target="_blank"
                        />
                      )}
                      {profileData.socialLinks.discord && (
                        <Tooltip label={profileData.socialLinks.discord}>
                          <IconButton icon={<FaDiscord />} size="sm" variant="ghost" />
                        </Tooltip>
                      )}
                      {profileData.socialLinks.instagram && (
                        <IconButton
                          icon={<FaInstagram />}
                          size="sm"
                          variant="ghost"
                          as="a"
                          href={`https://instagram.com/${profileData.socialLinks.instagram}`}
                          target="_blank"
                        />
                      )}
                    </HStack>
                  )
                )}
                
                {/* Privacy Toggle */}
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

        {/* Stats Grid */}
        <Box>
          <Heading size="md" mb={4}>Statistiche</Heading>
          {loadingStats ? (
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} height="100px" borderRadius="lg" />
              ))}
            </SimpleGrid>
          ) : (
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
              <StatsCard
                icon={FaBookOpen}
                label="Manga totali"
                value={stats.totalManga}
                color="purple"
              />
              <StatsCard
                icon={FaClock}
                label="In lettura"
                value={stats.reading}
                color="blue"
              />
              <StatsCard
                icon={FaTrophy}
                label="Completati"
                value={stats.completed}
                color="green"
              />
              <StatsCard
                icon={FaHeart}
                label="Preferiti"
                value={stats.favorites}
                color="pink"
              />
              <StatsCard
                icon={FaBookOpen}
                label="Capitoli letti"
                value={stats.chaptersRead}
                color="orange"
              />
              <StatsCard
                icon={FaClock}
                label="Tempo lettura"
                value={formatReadingTime(stats.readingTime)}
                color="cyan"
              />
              <StatsCard
                icon={FaEye}
                label="Visite profilo"
                value={stats.profileViews}
                color="purple"
                helpText={profileData.isPublic ? 'Profilo pubblico' : 'Solo tu'}
              />
              <StatsCard
                icon={FaUserFriends}
                label="Followers"
                value={stats.followers}
                color="blue"
              />
            </SimpleGrid>
          )}
        </Box>

        {/* Share Section */}
        {profileData.isPublic && !isEditing && (
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
              {qrCode && (
                <Box>
                  <Text fontSize="sm" mb={2}>QR Code</Text>
                  <Image src={qrCode} alt="QR Code" maxW="150px" />
                </Box>
              )}
            </SimpleGrid>
          </Box>
        )}

        {/* Tabs Content */}
        <Tabs colorScheme="purple" variant="enclosed">
          <TabList>
            <Tab>Libreria</Tab>
            <Tab>Impostazioni</Tab>
            <Tab>Privacy & Sicurezza</Tab>
          </TabList>

          <TabPanels>
            {/* Library Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Box>
                  <HStack justify="space-between" mb={3}>
                    <Heading size="md">In lettura ({libraryData.reading.length})</Heading>
                    <Button size="sm" variant="ghost" onClick={() => navigate('/library')}>
                      Vedi tutti
                    </Button>
                  </HStack>
                  {libraryData.reading.length ? (
                    <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                      {libraryData.reading.map((manga, i) => (
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

                <Box>
                  <HStack justify="space-between" mb={3}>
                    <Heading size="md">Preferiti ({libraryData.favorites.length})</Heading>
                    <Button size="sm" variant="ghost" onClick={() => navigate('/library')}>
                      Vedi tutti
                    </Button>
                  </HStack>
                  {libraryData.favorites.length ? (
                    <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
                      {libraryData.favorites.map((manga, i) => (
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

            {/* Settings Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Box bg="gray.800" p={6} borderRadius="lg">
                  <Heading size="md" mb={4}>Informazioni account</Heading>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <FormControl>
                      <FormLabel>Username</FormLabel>
                      <Input value={profileData.username} isReadOnly bg="gray.700" />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Email</FormLabel>
                      <Input value={profileData.email} isReadOnly bg="gray.700" />
                    </FormControl>
                  </SimpleGrid>
                </Box>

                <Box bg="gray.800" p={6} borderRadius="lg">
                  <Heading size="md" mb={4}>Notifiche</Heading>
                  <VStack align="stretch" spacing={3}>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0" flex={1}>Nuovi capitoli</FormLabel>
                      <Switch colorScheme="purple" defaultChecked />
                    </FormControl>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0" flex={1}>Nuovi followers</FormLabel>
                      <Switch colorScheme="purple" defaultChecked />
                    </FormControl>
                    <FormControl display="flex" alignItems="center">
                      <FormLabel mb="0" flex={1}>Aggiornamenti sistema</FormLabel>
                      <Switch colorScheme="purple" />
                    </FormControl>
                  </VStack>
                </Box>
              </VStack>
            </TabPanel>

            {/* Security Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Box bg="gray.800" p={6} borderRadius="lg">
                  <Heading size="md" mb={4}>Cambia password</Heading>
                  <VStack spacing={4}>
                    <FormControl>
                      <FormLabel>Password attuale</FormLabel>
                      <InputGroup>
                        <Input
                          type={showPass ? 'text' : 'password'}
                          value={passwords.old}
                          onChange={(e) => setPasswords({ ...passwords, old: e.target.value })}
                        />
                        <InputRightElement>
                          <IconButton
                            size="sm"
                            variant="ghost"
                            icon={showPass ? <ViewOffIcon /> : <ViewIcon />}
                            onClick={() => setShowPass(!showPass)}
                            aria-label="Toggle password"
                          />
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} width="100%">
                      <FormControl>
                        <FormLabel>Nuova password</FormLabel>
                        <Input
                          type={showPass ? 'text' : 'password'}
                          value={passwords.new}
                          onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Conferma password</FormLabel>
                        <Input
                          type={showPass ? 'text' : 'password'}
                          value={passwords.confirm}
                          onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                        />
                      </FormControl>
                    </SimpleGrid>
                    <Button colorScheme="purple" onClick={handlePasswordChange}>
                      Cambia password
                    </Button>
                  </VStack>
                </Box>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  );
}