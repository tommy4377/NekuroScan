// ✅ MANGADETAILS.JSX v3.6 - FIX REACT ERROR #300
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Heading, Text, Image, VStack, HStack, Button, Badge,
  SimpleGrid, Skeleton, useToast, Flex, IconButton, Wrap, WrapItem,
  Progress, Tooltip, Menu, MenuButton, MenuList, MenuItem, Divider
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaBookmark, FaPlay, FaShare, FaHeart, FaList, FaTh, FaRedo,
  FaCheckCircle, FaBell, FaBellSlash, FaPlus, FaCheck, FaBan, FaEllipsisV,
  FaClock, FaEye, FaBook
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import apiManager from '../api';
import useAuth from '../hooks/useAuth';
import axios from 'axios';
import { config } from '../config';

const MotionBox = motion(Box);

function MangaDetails() {
  const { source, id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  // ✅ FIX: Hook sempre in cima, con fallback sicuro
  const authHook = useAuth() || {};
  const { 
    user = null, 
    syncFavorites = null, 
    syncToServer = null, 
    syncReading = null 
  } = authHook;
  
  // States
  const [manga, setManga] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('chaptersViewMode') || 'list');
  const [readingProgress, setReadingProgress] = useState(null);
  const [completedChapters, setCompletedChapters] = useState([]);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // ✅ Load manga callback
  const loadManga = useCallback(async () => {
    try {
      setLoading(true);
      const mangaUrl = atob(id);
      const details = await apiManager.getMangaDetails(mangaUrl, source);
      
      if (!details) {
        throw new Error('Manga non trovato');
      }
      
      console.log('✅ Manga loaded:', details.title);
      console.log('✅ Chapters:', details.chapters?.length || 0);
      
      setManga(details);
      addToHistory(details);
      
    } catch (error) {
      console.error('❌ Error loading manga:', error);
      toast({
        title: 'Errore caricamento',
        description: error.message || 'Impossibile caricare i dettagli del manga',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      navigate('/home');
    } finally {
      setLoading(false);
    }
  }, [id, source, navigate, toast]);

  // ✅ Add to history callback
  const addToHistory = useCallback((mangaDetails) => {
    try {
      const history = JSON.parse(localStorage.getItem('history') || '[]');
      const existingIndex = history.findIndex(h => h.url === mangaDetails.url);
      
      const historyItem = {
        url: mangaDetails.url,
        title: mangaDetails.title,
        cover: mangaDetails.coverUrl,
        type: mangaDetails.type,
        source: mangaDetails.source || source,
        lastVisited: new Date().toISOString()
      };
      
      if (existingIndex !== -1) {
        history.splice(existingIndex, 1);
      }
      
      history.unshift(historyItem);
      localStorage.setItem('history', JSON.stringify(history.slice(0, 100)));
      
      console.log('✅ Added to history:', mangaDetails.title);
    } catch (error) {
      console.error('❌ Error adding to history:', error);
    }
  }, [source]);

  // ✅ Check favorite callback
  const checkFavorite = useCallback(() => {
    try {
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      const mangaUrl = atob(id);
      const isFav = favorites.some(f => f.url === mangaUrl);
      setIsFavorite(isFav);
      console.log('✅ Favorite status:', isFav);
    } catch (error) {
      console.error('❌ Error checking favorite:', error);
    }
  }, [id]);

  // ✅ Check current status callback
  const checkCurrentStatus = useCallback(() => {
    try {
      const mangaUrl = atob(id);
      const reading = JSON.parse(localStorage.getItem('reading') || '[]');
      const completed = JSON.parse(localStorage.getItem('completed') || '[]');
      const dropped = JSON.parse(localStorage.getItem('dropped') || '[]');
      
      if (completed.some(m => m.url === mangaUrl)) {
        setCurrentStatus('completed');
        console.log('✅ Status: Completato');
      } else if (dropped.some(m => m.url === mangaUrl)) {
        setCurrentStatus('dropped');
        console.log('✅ Status: Droppato');
      } else if (reading.some(m => m.url === mangaUrl)) {
        setCurrentStatus('reading');
        console.log('✅ Status: In lettura');
      } else {
        setCurrentStatus(null);
        console.log('✅ Status: Nessuno');
      }
    } catch (error) {
      console.error('❌ Error checking status:', error);
    }
  }, [id]);

  // ✅ Load reading progress callback
  const loadReadingProgress = useCallback(() => {
    try {
      const mangaUrl = atob(id);
      const progress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
      const mangaProgress = progress[mangaUrl];
      
      if (mangaProgress) {
        setReadingProgress(mangaProgress);
        
        const completedChaps = JSON.parse(localStorage.getItem('completedChapters') || '{}');
        if (completedChaps[mangaUrl]) {
          setCompletedChapters(completedChaps[mangaUrl]);
        } else {
          const completed = [];
          for (let i = 0; i < mangaProgress.chapterIndex; i++) {
            completed.push(i);
          }
          setCompletedChapters(completed);
        }
        
        console.log('✅ Reading progress loaded:', mangaProgress);
      }
    } catch (error) {
      console.error('❌ Error loading progress:', error);
    }
  }, [id]);

  // ✅ Check notification status callback
  const checkNotificationStatus = useCallback(async () => {
    if (!user || !manga) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get(`${config.API_URL}/api/user/data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const notificationSettings = response.data.notificationSettings || [];
      const isEnabled = notificationSettings.some(n => n.mangaUrl === manga.url);
      setNotificationsEnabled(isEnabled);
      console.log('✅ Notifications enabled:', isEnabled);
    } catch (error) {
      console.error('❌ Error checking notifications:', error);
    }
  }, [user, manga]);

  // ✅ Effects with proper dependencies
  useEffect(() => {
    loadManga();
    checkFavorite();
    loadReadingProgress();
    checkCurrentStatus();
  }, [loadManga, checkFavorite, loadReadingProgress, checkCurrentStatus]);

  useEffect(() => {
    checkNotificationStatus();
  }, [checkNotificationStatus]);

  useEffect(() => {
    localStorage.setItem('chaptersViewMode', viewMode);
  }, [viewMode]);

  // ✅ Toggle favorite with safe sync
  const toggleFavorite = async () => {
    try {
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      let updated;
      
      if (isFavorite) {
        updated = favorites.filter(f => f.url !== manga.url);
        setIsFavorite(false);
        
        toast({
          title: 'Rimosso dai preferiti',
          status: 'info',
          duration: 2000
        });
        
        console.log('✅ Removed from favorites');
      } else {
        const mangaToSave = {
          url: manga.url,
          title: manga.title,
          cover: manga.coverUrl,
          type: manga.type,
          source: manga.source || source,
          genres: manga.genres || [],
          addedAt: new Date().toISOString()
        };
        
        updated = [mangaToSave, ...favorites];
        setIsFavorite(true);
        
        toast({
          title: '❤️ Aggiunto ai preferiti',
          status: 'success',
          duration: 2000
        });
        
        console.log('✅ Added to favorites');
      }
      
      localStorage.setItem('favorites', JSON.stringify(updated));
      
      // ✅ Safe sync
      if (user && syncFavorites && typeof syncFavorites === 'function') {
        try {
          await syncFavorites(updated);
        } catch (e) {
          console.error('❌ Sync favorites failed:', e);
        }
      }
      
      window.dispatchEvent(new CustomEvent('library-updated'));
      
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare i preferiti',
        status: 'error',
        duration: 2000
      });
    }
  };

  // ✅ Toggle notifications with safe checks
  const toggleNotifications = async () => {
    if (!user) {
      toast({
        title: 'Accedi per attivare le notifiche',
        description: 'Crea un account per ricevere notifiche sui nuovi capitoli',
        status: 'warning',
        duration: 3000
      });
      navigate('/login');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token non trovato');
      }
      
      const newStatus = !notificationsEnabled;
      
      const response = await axios.post(
        `${config.API_URL}/api/notifications/manga`,
        {
          mangaUrl: manga.url,
          mangaTitle: manga.title,
          enabled: newStatus
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setNotificationsEnabled(newStatus);
        
        if (newStatus && 'Notification' in window) {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            new Notification('🔔 Notifiche attivate', {
              body: `Riceverai notifiche per nuovi capitoli di ${manga.title}`,
              icon: manga.coverUrl,
              badge: '/web-app-manifest-192x192.png',
              vibrate: [200, 100, 200]
            });
          }
        }
        
        toast({
          title: newStatus ? '🔔 Notifiche attivate' : '🔕 Notifiche disattivate',
          status: 'success',
          duration: 2000
        });
        
        console.log('✅ Notifications toggled:', newStatus);
      }
    } catch (error) {
      console.error('❌ Error toggling notifications:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile aggiornare le notifiche',
        status: 'error',
        duration: 2000
      });
    }
  };

  // ✅ Start reading with safe updates
  const startReading = (chapterIndex = 0) => {
    if (!manga?.chapters?.[chapterIndex]) {
      toast({
        title: 'Capitolo non disponibile',
        status: 'error',
        duration: 2000
      });
      return;
    }
    
    try {
      const chapter = manga.chapters[chapterIndex];
      const chapterId = btoa(chapter.url);
      
      const progress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
      progress[manga.url] = {
        chapterId: chapter.url,
        chapterIndex: chapterIndex,
        chapterTitle: chapter.title,
        totalChapters: manga.chapters.length,
        page: 0,
        pageIndex: 0,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('readingProgress', JSON.stringify(progress));
      
      updateReadingList(chapterIndex, chapter);
      
      window.dispatchEvent(new CustomEvent('library-updated'));
      
      console.log('✅ Starting chapter:', chapterIndex + 1);
      
      navigate(`/read/${source}/${id}/${chapterId}?chapter=${chapterIndex}`);
      
    } catch (error) {
      console.error('❌ Error starting reading:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile avviare la lettura',
        status: 'error',
        duration: 2000
      });
    }
  };

  // ✅ Update reading list with safe sync
  const updateReadingList = async (chapterIndex, chapter) => {
    try {
      const reading = JSON.parse(localStorage.getItem('reading') || '[]');
      const existingIndex = reading.findIndex(r => r.url === manga.url);
      
      const readingItem = {
        url: manga.url,
        title: manga.title,
        cover: manga.coverUrl,
        type: manga.type,
        source: manga.source || source,
        lastChapterIndex: chapterIndex,
        lastChapterTitle: chapter.title,
        totalChapters: manga.chapters.length,
        progress: Math.round(((chapterIndex + 1) / manga.chapters.length) * 100),
        lastRead: new Date().toISOString()
      };
      
      if (existingIndex !== -1) {
        reading[existingIndex] = readingItem;
      } else {
        reading.unshift(readingItem);
      }
      
      localStorage.setItem('reading', JSON.stringify(reading.slice(0, 100)));
      
      // ✅ Safe sync
      if (user && syncReading && typeof syncReading === 'function') {
        try {
          await syncReading(reading.slice(0, 100));
        } catch (e) {
          console.error('❌ Sync reading failed:', e);
        }
      }
      
      console.log('✅ Reading list updated, progress:', readingItem.progress + '%');
      
    } catch (error) {
      console.error('❌ Error updating reading list:', error);
    }
  };

  const continueReading = () => {
    if (readingProgress && readingProgress.chapterIndex !== undefined) {
      startReading(readingProgress.chapterIndex);
    } else {
      startReading(0);
    }
  };

  // ✅ Move to list with safe sync
  const moveToList = async (targetList) => {
    if (!manga) return;
    
    try {
      setSyncing(true);
      
      const lists = ['reading', 'completed', 'dropped'];
      lists.forEach(list => {
        const items = JSON.parse(localStorage.getItem(list) || '[]');
        const filtered = items.filter(item => item.url !== manga.url);
        localStorage.setItem(list, JSON.stringify(filtered));
      });
      
      if (targetList) {
        const targetItems = JSON.parse(localStorage.getItem(targetList) || '[]');
        const exists = targetItems.find(item => item.url === manga.url);
        
        if (!exists) {
          const newItem = {
            url: manga.url,
            title: manga.title,
            cover: manga.coverUrl,
            type: manga.type,
            source: manga.source || source,
            addedAt: new Date().toISOString()
          };
          
          if (targetList === 'completed') {
            newItem.completedAt = new Date().toISOString();
            newItem.progress = 100;
            
            const readingProgress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
            readingProgress[manga.url] = {
              chapterId: manga.chapters[manga.chapters.length - 1]?.url,
              chapterIndex: manga.chapters.length - 1,
              chapterTitle: manga.chapters[manga.chapters.length - 1]?.title || '',
              totalChapters: manga.chapters.length,
              page: 0,
              pageIndex: 0,
              timestamp: new Date().toISOString()
            };
            localStorage.setItem('readingProgress', JSON.stringify(readingProgress));
            
            const completedChapters = JSON.parse(localStorage.getItem('completedChapters') || '{}');
            completedChapters[manga.url] = Array.from({ length: manga.chapters.length }, (_, i) => i);
            localStorage.setItem('completedChapters', JSON.stringify(completedChapters));
            
            setReadingProgress(readingProgress[manga.url]);
            setCompletedChapters(completedChapters[manga.url]);
            
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('🎉 Manga completato!', {
                body: `Hai completato "${manga.title}"! Tutti i ${manga.chapters.length} capitoli sono stati segnati come letti.`,
                icon: manga.coverUrl,
                badge: '/web-app-manifest-192x192.png',
                tag: 'manga-completed',
                vibrate: [200, 100, 200]
              });
            }
            
            console.log('✅ Manga marked as completed, all chapters marked as read');
            
          } else if (targetList === 'dropped') {
            newItem.droppedAt = new Date().toISOString();
            console.log('✅ Manga marked as dropped');
            
          } else if (targetList === 'reading') {
            newItem.lastRead = new Date().toISOString();
            newItem.progress = readingProgress ? 
              Math.round(((readingProgress.chapterIndex + 1) / manga.chapters.length) * 100) : 0;
            console.log('✅ Manga added to reading list, progress:', newItem.progress + '%');
          }
          
          targetItems.unshift(newItem);
          localStorage.setItem(targetList, JSON.stringify(targetItems));
        }
      }
      
      setCurrentStatus(targetList);
      
      // ✅ Safe sync
      if (user && syncToServer && typeof syncToServer === 'function') {
        try {
          await syncToServer();
          console.log('✅ Data synced to server');
        } catch (e) {
          console.error('❌ Sync to server failed:', e);
        }
      }
      
      window.dispatchEvent(new CustomEvent('library-updated'));
      
      const messages = {
        completed: '✅ Manga completato! Tutti i capitoli segnati come letti.',
        dropped: '❌ Manga droppato',
        reading: '📖 Aggiunto a "In lettura"',
        null: 'ℹ️ Rimosso dalle liste'
      };
      
      toast({
        title: messages[targetList] || 'Aggiornato',
        status: targetList === 'completed' ? 'success' : 'info',
        duration: 3000,
        isClosable: true
      });
      
    } catch (error) {
      console.error('❌ Error moving to list:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare lo stato del manga',
        status: 'error',
        duration: 2000
      });
    } finally {
      setSyncing(false);
    }
  };

  // ✅ Share content
  const shareContent = async () => {
    const shareData = {
      title: manga.title,
      text: `Leggi ${manga.title} su NeKuro Scan`,
      url: window.location.href
    };
    
    try {
      if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        await navigator.share(shareData);
        console.log('✅ Shared via Web Share API');
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: '📋 Link copiato!',
          description: 'Il link è stato copiato negli appunti',
          status: 'success',
          duration: 2000
        });
        console.log('✅ Link copied to clipboard');
      }
    } catch (error) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: '📋 Link copiato!',
          status: 'success',
          duration: 2000
        });
        console.log('✅ Link copied to clipboard (fallback)');
      } catch (err) {
        console.error('❌ Share error:', err);
      }
    }
  };

  const isChapterRead = (chapterIndex) => {
    return completedChapters.includes(chapterIndex);
  };

  // ========= LOADING STATE =========
  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8}>
          <Skeleton height="400px" width="100%" borderRadius="xl" />
          <Skeleton height="200px" width="100%" borderRadius="xl" />
          <Skeleton height="300px" width="100%" borderRadius="xl" />
        </VStack>
      </Container>
    );
  }

  // ========= NOT FOUND STATE =========
  if (!manga) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8}>
          <Text fontSize="xl" color="gray.400">Manga non trovato</Text>
          <Button colorScheme="purple" onClick={() => navigate('/home')}>
            Torna alla Home
          </Button>
        </VStack>
      </Container>
    );
  }

  const readProgress = (currentStatus === 'completed')
    ? 100
    : (readingProgress 
        ? Math.min(100, Math.round(((readingProgress.chapterIndex + 1) / manga.chapters.length) * 100))
        : 0);

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        
        {/* ========= HEADER ========= */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Flex
            direction={{ base: 'column', md: 'row' }}
            gap={8}
            bg="gray.800"
            borderRadius="xl"
            p={{ base: 4, md: 6 }}
            border="1px solid"
            borderColor="gray.700"
            boxShadow="xl"
          >
            {/* COVER */}
            <Box flex="0 0 auto">
              <Image
                src={manga.coverUrl || 'https://via.placeholder.com/300x450?text=No+Cover'}
                alt={manga.title}
                borderRadius="lg"
                width={{ base: '100%', md: '250px' }}
                height={{ base: 'auto', md: '350px' }}
                objectFit="cover"
                boxShadow="2xl"
                border="2px solid"
                borderColor="gray.700"
                fallbackSrc="https://via.placeholder.com/300x450?text=Loading..."
              />
              
              {/* Progress Bar */}
              {readProgress > 0 && (
                <Box mt={4}>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="sm" color="gray.400" fontWeight="medium">
                      Progresso
                    </Text>
                    <Text fontSize="sm" fontWeight="bold" color="purple.400">
                      {readProgress}%
                    </Text>
                  </HStack>
                  <Progress 
                    value={readProgress} 
                    colorScheme="purple" 
                    size="sm" 
                    borderRadius="full"
                    hasStripe={readProgress < 100}
                    isAnimated={readProgress < 100}
                  />
                  {readProgress === 100 && (
                    <Text fontSize="xs" color="green.400" mt={1} textAlign="center">
                      ✓ Completato
                    </Text>
                  )}
                </Box>
              )}
            </Box>

            {/* INFO */}
            <VStack align="stretch" flex={1} spacing={4}>
              <Heading size={{ base: 'lg', md: 'xl' }} lineHeight="shorter">
                {manga.title}
              </Heading>
              
              {manga.alternativeTitles?.length > 0 && (
                <Text color="gray.400" fontSize="sm" fontStyle="italic">
                  {manga.alternativeTitles.join(' • ')}
                </Text>
              )}

              {/* BADGES */}
              <Wrap spacing={2}>
                <WrapItem>
                  <Badge colorScheme="purple" px={3} py={1} borderRadius="md" fontSize="xs">
                    {manga.type || 'MANGA'}
                  </Badge>
                </WrapItem>
                <WrapItem>
                  <Badge colorScheme="green" px={3} py={1} borderRadius="md" fontSize="xs">
                    {manga.status || 'In corso'}
                  </Badge>
                </WrapItem>
                {manga.year && (
                  <WrapItem>
                    <Badge px={3} py={1} borderRadius="md" fontSize="xs">
                      📅 {manga.year}
                    </Badge>
                  </WrapItem>
                )}
                <WrapItem>
                  <Badge colorScheme="blue" px={3} py={1} borderRadius="md" fontSize="xs">
                    📚 {manga.chapters?.length || 0} capitoli
                  </Badge>
                </WrapItem>
                {manga.source === 'mangaWorldAdult' && (
                  <WrapItem>
                    <Badge colorScheme="pink" px={3} py={1} borderRadius="md" fontSize="xs">
                      🔞 Adult
                    </Badge>
                  </WrapItem>
                )}
                {currentStatus && (
                  <WrapItem>
                    <Badge 
                      colorScheme={
                        currentStatus === 'completed' ? 'green' : 
                        currentStatus === 'dropped' ? 'red' : 'purple'
                      }
                      px={3}
                      py={1}
                      borderRadius="md"
                      fontSize="xs"
                    >
                      {currentStatus === 'completed' ? '✓ Completato' : 
                       currentStatus === 'dropped' ? '✗ Droppato' : '📖 In lettura'}
                    </Badge>
                  </WrapItem>
                )}
              </Wrap>

              {/* AUTHORS */}
              {manga.authors?.length > 0 && (
                <HStack spacing={2}>
                  <Text fontSize="sm" color="gray.400">Autore:</Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {manga.authors.join(', ')}
                  </Text>
                </HStack>
              )}

              {/* GENRES */}
              {manga.genres?.length > 0 && (
                <Box>
                  <Text fontSize="sm" color="gray.400" mb={2}>Generi:</Text>
                  <Wrap spacing={2}>
                    {manga.genres.slice(0, 10).map((genre, i) => (
                      <WrapItem key={i}>
                        <Badge 
                          variant="outline" 
                          colorScheme="purple"
                          cursor="pointer"
                          px={3}
                          py={1}
                          borderRadius="full"
                          fontSize="xs"
                          _hover={{ bg: 'purple.900', transform: 'translateY(-2px)' }}
                          transition="all 0.2s"
                          onClick={() => navigate(`/categories?genre=${genre.genre || genre}`)}
                        >
                          {genre.genre || genre}
                        </Badge>
                      </WrapItem>
                    ))}
                  </Wrap>
                </Box>
              )}

              {/* ========= ACTIONS ========= */}
              <HStack spacing={2} pt={4} flexWrap="wrap">
                {readingProgress && readingProgress.chapterIndex >= 0 ? (
                  <>
                    <Button
                      colorScheme="green"
                      leftIcon={<FaPlay />}
                      onClick={continueReading}
                      size={{ base: 'sm', md: 'md' }}
                      boxShadow="lg"
                      _hover={{ transform: 'translateY(-2px)', boxShadow: 'xl' }}
                      transition="all 0.2s"
                    >
                      Continua Cap. {readingProgress.chapterIndex + 1}
                    </Button>
                    <Tooltip label="Ricomincia dall'inizio">
                      <IconButton
                        icon={<FaRedo />}
                        variant="outline"
                        onClick={() => startReading(0)}
                        aria-label="Ricomincia"
                        size={{ base: 'sm', md: 'md' }}
                      />
                    </Tooltip>
                  </>
                ) : (
                  <Button
                    colorScheme="purple"
                    leftIcon={<FaPlay />}
                    onClick={() => startReading(0)}
                    size={{ base: 'sm', md: 'md' }}
                    boxShadow="lg"
                    _hover={{ transform: 'translateY(-2px)', boxShadow: 'xl' }}
                    transition="all 0.2s"
                  >
                    Inizia a leggere
                  </Button>
                )}
                
                <Tooltip label={isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}>
                  <IconButton
                    icon={isFavorite ? <FaHeart /> : <FaBookmark />}
                    colorScheme={isFavorite ? 'pink' : 'gray'}
                    variant={isFavorite ? 'solid' : 'outline'}
                    onClick={toggleFavorite}
                    aria-label="Preferiti"
                    size={{ base: 'sm', md: 'md' }}
                    _hover={{ transform: 'translateY(-2px)' }}
                    transition="all 0.2s"
                  />
                </Tooltip>
                
                <Tooltip label={notificationsEnabled ? 'Disattiva notifiche' : 'Attiva notifiche nuovi capitoli'}>
                  <IconButton
                    icon={notificationsEnabled ? <FaBell /> : <FaBellSlash />}
                    colorScheme={notificationsEnabled ? 'green' : 'gray'}
                    variant={notificationsEnabled ? 'solid' : 'outline'}
                    onClick={toggleNotifications}
                    aria-label="Notifiche"
                    size={{ base: 'sm', md: 'md' }}
                    _hover={{ transform: 'translateY(-2px)' }}
                    transition="all 0.2s"
                  />
                </Tooltip>
                
                <Tooltip label="Condividi manga">
                  <IconButton
                    icon={<FaShare />}
                    variant="outline"
                    aria-label="Condividi"
                    onClick={shareContent}
                    size={{ base: 'sm', md: 'md' }}
                    _hover={{ transform: 'translateY(-2px)' }}
                    transition="all 0.2s"
                  />
                </Tooltip>
                
                {/* MENU GESTIONE LISTE */}
                <Menu>
                  <Tooltip label="Gestisci liste">
                    <MenuButton
                      as={IconButton}
                      icon={<FaEllipsisV />}
                      variant="outline"
                      aria-label="Altre opzioni"
                      size={{ base: 'sm', md: 'md' }}
                      isLoading={syncing}
                      _hover={{ transform: 'translateY(-2px)' }}
                      transition="all 0.2s"
                    />
                  </Tooltip>
                  <MenuList bg="gray.800" borderColor="gray.700">
                    {currentStatus !== 'reading' && (
                      <MenuItem 
                        icon={<FaPlus />}
                        onClick={() => moveToList('reading')}
                        _hover={{ bg: 'gray.700' }}
                      >
                        Aggiungi a "In lettura"
                      </MenuItem>
                    )}
                    {currentStatus !== 'completed' && (
                      <MenuItem 
                        icon={<FaCheck />}
                        onClick={() => moveToList('completed')}
                        _hover={{ bg: 'gray.700' }}
                      >
                        Segna come completato
                      </MenuItem>
                    )}
                    {currentStatus !== 'dropped' && (
                      <MenuItem 
                        icon={<FaBan />}
                        onClick={() => moveToList('dropped')}
                        _hover={{ bg: 'gray.700' }}
                      >
                        Segna come droppato
                      </MenuItem>
                    )}
                    {currentStatus && (
                      <>
                        <Divider my={1} />
                        <MenuItem 
                          icon={<FaCheckCircle />}
                          onClick={() => moveToList(null)}
                          color="red.400"
                          _hover={{ bg: 'gray.700' }}
                        >
                          Rimuovi da tutte le liste
                        </MenuItem>
                      </>
                    )}
                  </MenuList>
                </Menu>
              </HStack>
            </VStack>
          </Flex>
        </MotionBox>

        {/* ========= TRAMA ========= */}
        {manga.plot && (
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Box 
              bg="gray.800" 
              p={{ base: 4, md: 6 }} 
              borderRadius="xl"
              border="1px solid"
              borderColor="gray.700"
            >
              <Heading size={{ base: 'sm', md: 'md' }} mb={4}>
                📖 Trama
              </Heading>
              <Text color="gray.300" lineHeight="tall" whiteSpace="pre-wrap">
                {manga.plot.replace(/^trama:?\s*/i, '').trim()}
              </Text>
            </Box>
          </MotionBox>
        )}

        {/* ========= CAPITOLI ========= */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Box 
            bg="gray.800" 
            p={{ base: 4, md: 6 }} 
            borderRadius="xl"
            border="1px solid"
            borderColor="gray.700"
          >
            <HStack justify="space-between" mb={4} flexWrap="wrap">
              <Heading size={{ base: 'sm', md: 'md' }}>
                📚 Capitoli ({manga.chapters?.length || 0})
              </Heading>
              
              <HStack spacing={2}>
                <Tooltip label="Vista lista">
                  <IconButton
                    icon={<FaList />}
                    size="sm"
                    variant={viewMode === 'list' ? 'solid' : 'ghost'}
                    colorScheme="purple"
                    onClick={() => setViewMode('list')}
                    aria-label="Vista lista"
                  />
                </Tooltip>
                <Tooltip label="Vista griglia">
                  <IconButton
                    icon={<FaTh />}
                    size="sm"
                    variant={viewMode === 'grid' ? 'solid' : 'ghost'}
                    colorScheme="purple"
                    onClick={() => setViewMode('grid')}
                    aria-label="Vista griglia"
                  />
                </Tooltip>
              </HStack>
            </HStack>

            {manga.chapters?.length === 0 ? (
              <VStack py={12} spacing={3}>
                <FaBook size={48} color="gray" />
                <Text color="gray.500" textAlign="center">
                  Nessun capitolo disponibile
                </Text>
              </VStack>
            ) : (
              <>
                {viewMode === 'list' ? (
                  <VStack 
                    align="stretch" 
                    spacing={2} 
                    maxH="600px" 
                    overflowY="auto"
                    css={{
                      '&::-webkit-scrollbar': { width: '8px' },
                      '&::-webkit-scrollbar-track': { background: 'transparent' },
                      '&::-webkit-scrollbar-thumb': { 
                        background: 'var(--chakra-colors-purple-500)', 
                        borderRadius: '4px' 
                      },
                      '&::-webkit-scrollbar-thumb:hover': {
                        background: 'var(--chakra-colors-purple-400)'
                      }
                    }}
                  >
                    {(manga.chapters || []).map((chapter, i) => (
                      <MotionBox
                        key={chapter.url || i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.02 }}
                      >
                        <HStack
                          p={3}
                          bg={readingProgress?.chapterIndex === i ? 'purple.900' : 'gray.700'}
                          borderRadius="lg"
                          cursor="pointer"
                          _hover={{ 
                            bg: 'gray.600', 
                            transform: 'translateX(4px)',
                            borderLeft: '4px solid',
                            borderLeftColor: 'purple.500'
                          }}
                          transition="all 0.2s"
                          onClick={() => startReading(i)}
                          justify="flex-start"
                          opacity={isChapterRead(i) ? 0.6 : 1}
                          border="1px solid"
                          borderColor={readingProgress?.chapterIndex === i ? 'purple.500' : 'transparent'}
                          gap={3}
                        >
                          <Box
                            minW="40px"
                            textAlign="center"
                            fontWeight="bold"
                            fontSize="sm"
                            color="purple.300"
                          >
                            #{i + 1}
                          </Box>
                          
                          {isChapterRead(i) && (
                            <Tooltip label="Capitolo letto">
                              <Box>
                                <FaCheckCircle color="green" />
                              </Box>
                            </Tooltip>
                          )}
                          
                          {currentStatus !== 'completed' && readingProgress?.chapterIndex === i && (
                            <Badge colorScheme="purple" size="sm" borderRadius="md">
                              <HStack spacing={1}>
                                <FaBook size="10" />
                                <Text>Attuale</Text>
                              </HStack>
                            </Badge>
                          )}
                          
                          <Text fontWeight="medium" noOfLines={1} flex={1}>
                            {chapter.title || `Capitolo ${chapter.chapterNumber ?? (i + 1)}`}
                          </Text>
                          
                          {chapter.date && (
                            <Text fontSize="xs" color="gray.400">
                              <HStack spacing={1}>
                                <FaClock size="10" />
                                <Text>{chapter.date}</Text>
                              </HStack>
                            </Text>
                          )}
                        </HStack>
                      </MotionBox>
                    ))}
                  </VStack>
                ) : (
                  <SimpleGrid 
                    columns={{ base: 2, sm: 3, md: 4, lg: 5 }} 
                    spacing={3} 
                    maxH="600px" 
                    overflowY="auto"
                    css={{
                      '&::-webkit-scrollbar': { width: '8px' },
                      '&::-webkit-scrollbar-track': { background: 'transparent' },
                      '&::-webkit-scrollbar-thumb': { 
                        background: 'var(--chakra-colors-purple-500)', 
                        borderRadius: '4px' 
                      },
                      '&::-webkit-scrollbar-thumb:hover': {
                        background: 'var(--chakra-colors-purple-400)'
                      }
                    }}
                  >
                    {(manga.chapters || []).map((chapter, i) => (
                      <MotionBox
                        key={chapter.url || i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2, delay: i * 0.01 }}
                      >
                        <Box
                          p={4}
                          bg={readingProgress?.chapterIndex === i ? 'purple.900' : 'gray.700'}
                          borderRadius="lg"
                          cursor="pointer"
                          _hover={{ 
                            bg: 'gray.600', 
                            transform: 'translateY(-4px)',
                            boxShadow: 'lg'
                          }}
                          transition="all 0.2s"
                          onClick={() => startReading(i)}
                          textAlign="center"
                          position="relative"
                          opacity={isChapterRead(i) ? 0.6 : 1}
                          border="2px solid"
                          borderColor={readingProgress?.chapterIndex === i ? 'purple.500' : 'transparent'}
                        >
                          {isChapterRead(i) && (
                            <Box position="absolute" top={2} right={2}>
                              <FaCheckCircle color="green" size="12" />
                            </Box>
                          )}
                          
                          {currentStatus !== 'completed' && readingProgress?.chapterIndex === i && (
                            <Badge 
                              position="absolute" 
                              top={2} 
                              left={2} 
                              colorScheme="purple" 
                              size="sm"
                              borderRadius="md"
                              fontSize="9px"
                            >
                              Attuale
                            </Badge>
                          )}
                          
                          <Text 
                            fontSize="2xl" 
                            fontWeight="bold" 
                            color="purple.300"
                            mb={2}
                          >
                            {i + 1}
                          </Text>
                          
                          <Text fontSize="xs" fontWeight="medium" noOfLines={2} minH="32px">
                            {chapter.title || `Capitolo ${chapter.chapterNumber ?? (i + 1)}`}
                          </Text>
                        </Box>
                      </MotionBox>
                    ))}
                  </SimpleGrid>
                )}
              </>
            )}
          </Box>
        </MotionBox>

        {/* ========= STATS FOOTER ========= */}
        {readingProgress && (
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Box
              bg="gray.800"
              p={4}
              borderRadius="lg"
              border="1px solid"
              borderColor="gray.700"
            >
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                <HStack>
                  <FaBook color="purple" />
                  <VStack align="start" spacing={0}>
                    <Text fontSize="xs" color="gray.400">Ultimo capitolo</Text>
                    <Text fontSize="sm" fontWeight="bold">
                      {readingProgress.chapterIndex + 1} / {manga.chapters.length}
                    </Text>
                  </VStack>
                </HStack>
                
                <HStack>
                  <FaCheckCircle color="green" />
                  <VStack align="start" spacing={0}>
                    <Text fontSize="xs" color="gray.400">Capitoli letti</Text>
                    <Text fontSize="sm" fontWeight="bold">
                      {completedChapters.length} / {manga.chapters.length}
                    </Text>
                  </VStack>
                </HStack>
                
                <HStack>
                  <FaClock color="blue" />
                  <VStack align="start" spacing={0}>
                    <Text fontSize="xs" color="gray.400">Progresso</Text>
                    <Text fontSize="sm" fontWeight="bold" color="purple.400">
                      {readProgress}%
                    </Text>
                  </VStack>
                </HStack>
                
                <HStack>
                  <FaEye color="orange" />
                  <VStack align="start" spacing={0}>
                    <Text fontSize="xs" color="gray.400">Ultima lettura</Text>
                    <Text fontSize="sm" fontWeight="bold">
                      {new Date(readingProgress.timestamp).toLocaleDateString('it-IT', { 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </Text>
                  </VStack>
                </HStack>
              </SimpleGrid>
            </Box>
          </MotionBox>
        )}

      </VStack>
    </Container>
  );
}

export default MangaDetails;