// ✅ HOME.JSX v3.3 - COMPLETO E OTTIMIZZATO
import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import PageTransition from '../components/PageTransition';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Button, useToast, Skeleton, IconButton, Tabs, TabList, Tab,
  TabPanels, TabPanel, Badge, Icon, Center, Select
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { 
  FaFire, FaClock, FaBookOpen, FaHeart,
  FaChevronRight, FaChevronLeft, FaSync, FaTrophy, FaDragon, FaArrowRight
} from 'react-icons/fa';
import { getBaseUrl } from '../config/sources';
import { GiDragonHead } from 'react-icons/gi';
import { BiBook } from 'react-icons/bi';
import MangaCard from '../components/MangaCard';
import apiManager from '../api';
import statsAPI from '../api/stats';
import { useLocalStorage } from '../hooks/useLocalStorage';
import useAuth from '../hooks/useAuth';
import useGridDensity from '../hooks/useGridDensity';
import { config } from '../config';

// ✅ PULISCE NUMERO CAPITOLO
const cleanChapterNumber = (chapter) => {
  if (!chapter) return '';
  return chapter
    .replace(/^(cap\.|capitolo|chapter|ch\.)\s*/i, '')
    .replace(/^vol\.\s*\d+\s*-\s*/i, '')
    .replace(/^0+/, '')
    .trim();
};

function Home() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { density, setDensity, config: gridConfig, densityOptions } = useGridDensity();
  
  const [includeAdult, setIncludeAdult] = useLocalStorage('includeAdult', false);
  
  // ========= STATE =========
  const [content, setContent] = useState({
    trending: [],
    latest: [],
    popular: [],
    topManga: [],
    topManhwa: [],
    topManhua: [],
    topOneshot: [],
    continueReading: []
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [downloadedCount, setDownloadedCount] = useState(0);

  // ========= CHECK OFFLINE =========
  const checkOfflineStatus = useCallback(async () => {
    // Prima controlla la connessione del browser
    if (!navigator.onLine) {
      console.log('🔴 Browser offline');
      setIsOffline(true);
      return true;
    }
    
    try {
      // Tentativo 1: Ping al proxy con timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${config.PROXY_URL}/health`, {
        signal: controller.signal,
        cache: 'no-cache',
        mode: 'cors'
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        setIsOffline(false);
        return false;
      }
      
      // Se non ok, prova un altro endpoint
      console.warn('⚠️ Proxy health non OK, provo endpoint alternativo...');
      
      // Tentativo 2: Prova a fare una richiesta reale
      const testController = new AbortController();
      const testTimeout = setTimeout(() => testController.abort(), 3000);
      
      const testResponse = await fetch(`${config.PROXY_URL}/api/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: getBaseUrl('m'),
          headers: {}
        }),
        signal: testController.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(testTimeout);
      
      if (testResponse.ok) {
        console.log('✅ Proxy funzionante (test endpoint)');
        setIsOffline(false);
        return false;
      }
      
      console.error('❌ Proxy non risponde');
      setIsOffline(true);
      return true;
      
    } catch (error) {
      console.error('❌ Errore connessione:', error.message);
      
      // Se l'errore è un abort, probabilmente è solo lento, non offline
      if (error.name === 'AbortError') {
        console.warn('⚠️ Timeout - server lento, ma potresti essere online');
        // Non impostare offline immediatamente per timeout
        setIsOffline(false);
        return false;
      }
      
      setIsOffline(true);
      return true;
    }
  }, []);

  // ========= LOAD CONTENT =========
  const loadAllContent = useCallback(async () => {
    setLoading(true);
    
    // Check se offline - ma NON bloccare se stiamo ricaricando dopo "Riprova"
    const offline = await checkOfflineStatus();
    
    if (offline) {
      // Modalità OFFLINE: mostra solo download
      console.log('📡 Modalità offline attiva');
      setIsOffline(true);
      setLoading(false);
      return;
    }
    
    // Se arriviamo qui, siamo online
    setIsOffline(false);
    
    try {
      // Carica tutto in parallelo
      const [
        trendingRes,
        latestRes, 
        popularRes, 
        mangaRes, 
        manhwaRes, 
        manhuaRes, 
        oneshotRes
      ] = await Promise.allSettled([
        apiManager.getTrending(includeAdult),
        apiManager.getRecentChapters(includeAdult),
        statsAPI.searchAdvanced({ sort: 'newest', page: 1, includeAdult }), // Trending per popolari
        statsAPI.getTopByType('manga', includeAdult, 1),
        statsAPI.getTopByType('manhwa', includeAdult, 1),
        statsAPI.getTopByType('manhua', includeAdult, 1),
        statsAPI.getTopByType('oneshot', includeAdult, 1)
      ]);
      
      // Processa risultati
      const processResult = (result, fallback = []) => {
        if (result.status === 'fulfilled') {
          const data = Array.isArray(result.value) 
            ? result.value 
            : result.value?.results || [];
          
          return data.slice(0, 8).map(item => ({ // RIDOTTO: 15 → 8 per evitare overload
            ...item,
            latestChapter: cleanChapterNumber(item.latestChapter)
          }));
        }
        return fallback;
      };
      
      // Continua a leggere
      const reading = JSON.parse(localStorage.getItem('reading') || '[]');
      const readingWithProgress = reading.slice(0, 6).map(item => ({ // RIDOTTO: 10 → 6
        ...item,
        continueFrom: item.lastChapterIndex ? `Cap. ${item.lastChapterIndex + 1}` : null
      }));
      
      setContent({
        trending: processResult(trendingRes),
        latest: processResult(latestRes),
        popular: processResult(popularRes),
        topManga: processResult(mangaRes),
        topManhwa: processResult(manhwaRes),
        topManhua: processResult(manhuaRes),
        topOneshot: processResult(oneshotRes),
        continueReading: readingWithProgress
      });
      
    } catch (error) {
      console.error('Error loading home content:', error);
      toast({
        title: 'Errore caricamento',
        description: 'Alcuni contenuti potrebbero non essere disponibili',
        status: 'warning',
        duration: 3000
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [includeAdult, toast, checkOfflineStatus, user]);

  useEffect(() => {
    loadAllContent();
    
    // Conta download offline
    const loadDownloadCount = async () => {
      try {
        const { default: offlineManager } = await import('../utils/offlineManager');
        const downloads = await offlineManager.getAllDownloaded();
        setDownloadedCount(downloads.length);
      } catch (err) {
        // Offline manager not available
      }
    };
    
    loadDownloadCount();
    
    // Ascolta aggiornamenti
    const handleLibraryUpdate = () => {
      loadAllContent();
      loadDownloadCount();
    };
    
    // Ascolta cambiamenti connessione
    const handleOnline = async () => {
      console.log('🌐 Connessione ripristinata');
      setIsOffline(false);
      toast({
        title: '🌐 Sei online!',
        description: 'Ricaricamento automatico...',
        status: 'success',
        duration: 2000
      });
      
      // Aspetta un momento per assicurarsi che la connessione sia stabile
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verifica che sia davvero online
      const isReallyOnline = await checkOfflineStatus();
      if (!isReallyOnline) {
        console.log('⚠️ Falso positivo online, ancora offline');
        return;
      }
      
      // Ricarica tutto automaticamente
      await loadAllContent();
      
      // Forza refresh completo per caricare tutte le risorse
      setTimeout(() => {
        window.location.reload();
      }, 500);
    };
    
    const handleOffline = () => {
      console.log('📡 Connessione persa');
      setIsOffline(true);
      toast({
        title: '📡 Sei offline',
        description: 'Puoi accedere ai manga scaricati',
        status: 'warning',
        duration: 3000
      });
    };
    
    window.addEventListener('library-updated', handleLibraryUpdate);
    window.addEventListener('downloads-updated', loadDownloadCount);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('library-updated', handleLibraryUpdate);
      window.removeEventListener('downloads-updated', loadDownloadCount);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadAllContent, toast]);

  // ✅ WRAP handleRefresh in useCallback per evitare React error #300
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllContent();
  }, [loadAllContent]);

  // ✅ WRAP navigateToSection in useCallback per evitare React error #300
  const navigateToSection = useCallback((path) => {
    navigate(path, { state: { includeAdult } });
  }, [navigate, includeAdult]);

  // ========= SEZIONE CONTENUTI =========
  const ContentSection = useCallback(({ 
    title, 
    icon, 
    items, 
    color = 'purple', 
    viewAllPath,
    showLatestChapter = false,
    showProgress = false,
    emptyMessage = 'Nessun contenuto disponibile'
  }) => {
    const scrollRef = React.useRef(null);
    const [canScrollLeft, setCanScrollLeft] = React.useState(false);
    const [canScrollRight, setCanScrollRight] = React.useState(false);

    const checkScroll = React.useCallback(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      }
    }, []);

    React.useEffect(() => {
      checkScroll();
      const current = scrollRef.current;
      if (current) {
        current.addEventListener('scroll', checkScroll);
        window.addEventListener('resize', checkScroll);
        return () => {
          current.removeEventListener('scroll', checkScroll);
          window.removeEventListener('resize', checkScroll);
        };
      }
    }, [checkScroll, items]);

    const scroll = (direction) => {
      if (scrollRef.current) {
        const scrollAmount = 400;
        scrollRef.current.scrollBy({
          left: direction === 'left' ? -scrollAmount : scrollAmount,
          behavior: 'smooth'
        });
      }
    };

    if (!items || (items.length === 0 && !loading)) {
      return (
        <Box 
          bg="gray.800" 
          p={{ base: 4, md: 6 }} 
          borderRadius="xl"
          border="1px solid"
          borderColor="gray.700"
        >
          <HStack justify="space-between" mb={4}>
            <HStack spacing={3}>
              <Box
  p={2}
  bg={`${color}.500`}
  borderRadius="lg"
  boxShadow="lg"
  display="flex"
  alignItems="center"
  justifyContent="center"
  lineHeight={0}
>
  <Icon as={icon} color="white" boxSize={5} />
</Box>
              <Heading size={{ base: 'sm', md: 'md' }}>{title}</Heading>
            </HStack>
          </HStack>
          <Center py={8}>
            <Text color="gray.500">{emptyMessage}</Text>
          </Center>
        </Box>
      );
    }

    return (
      <VStack align="stretch" spacing={4}>
        <Box 
          bg="gray.800" 
          p={{ base: 4, md: 6 }}
          borderRadius="xl"
          border="1px solid"
          borderColor="gray.700"
          transition="all 0.3s"
          overflow="visible"
          position="relative"
          _hover={{ borderColor: `${color}.500` }}
        >
          <HStack justify="space-between" mb={6}>
            <HStack spacing={3}>
              <Box
  p={2}
  bg={`${color}.500`}
  borderRadius="lg"
  boxShadow="lg"
  display="flex"
  alignItems="center"
  justifyContent="center"
  lineHeight={0}
>
  <Icon as={icon} color="white" boxSize={5} />
</Box>

              <VStack align="start" spacing={0}>
                <Heading size={{ base: 'sm', md: 'md' }}>{title}</Heading>
              </VStack>
            </HStack>
            {viewAllPath && (
              <Button
                variant="ghost"
                size="sm"
                rightIcon={<FaChevronRight />}
                onClick={() => navigateToSection(viewAllPath)}
                color={`${color}.400`}
                _hover={{ bg: `${color}.900` }}
              >
                Vedi tutti
              </Button>
            )}
          </HStack>

          {/* Container con frecce di navigazione */}
          <Box position="relative" px={2} pb={6}>
            {/* Freccia Sinistra - SOLO DESKTOP */}
            {canScrollLeft && (
              <IconButton
                icon={<FaChevronLeft />}
                position="absolute"
                left={0}
                top="50%"
                transform="translateY(-50%)"
                zIndex={1000}
                size="lg"
                borderRadius="full"
                onClick={() => scroll('left')}
                aria-label="Scorri a sinistra"
                display={{ base: 'none', md: 'flex' }}
                bg="transparent"
                color="white"
                opacity={0.3}
                boxShadow="none"
                _hover={{ 
                  opacity: 1,
                  bg: `${color}.600`,
                  transform: 'translateY(-50%) scale(1.15)',
                  boxShadow: 'xl'
                }}
                transition="all 0.3s"
              />
            )}

            {/* Freccia Destra - SOLO DESKTOP */}
            {canScrollRight && (
              <IconButton
                icon={<FaChevronRight />}
                position="absolute"
                right={0}
                top="50%"
                transform="translateY(-50%)"
                zIndex={1000}
                size="lg"
                borderRadius="full"
                onClick={() => scroll('right')}
                aria-label="Scorri a destra"
                display={{ base: 'none', md: 'flex' }}
                bg="transparent"
                color="white"
                opacity={0.3}
                boxShadow="none"
                _hover={{ 
                  opacity: 1,
                  bg: `${color}.600`,
                  transform: 'translateY(-50%) scale(1.15)',
                  boxShadow: 'xl'
                }}
                transition="all 0.3s"
              />
            )}

            {/* Scroll orizzontale SENZA scrollbar */}
            <Box 
              ref={scrollRef}
              overflowX="auto" 
              overflowY="visible"
              pt={6}
              pb={8}
              px={4}
              mx={-4}
              css={{
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              <HStack spacing={6} align="center" overflow="visible" px={2}>
                {items.map((item, i) => (
                  <Box
                    key={`${item.url}-${i}`}
                    minW={{ base: '150px', md: '180px' }}
                    maxW={{ base: '150px', md: '180px' }}
                    w={{ base: '150px', md: '180px' }}
                    h={{ base: '260px', md: '300px' }}
                    flexShrink={0}
                    position="relative"
                    overflow="visible"
                  >
                    <MangaCard 
                      manga={item} 
                      hideSource 
                      showLatestChapter={showLatestChapter}
                      priority={i < 5}
                    />
                    
                    {showProgress && item.continueFrom && (
                      <Box
                        position="absolute"
                        bottom="60px"
                        left={2}
                        right={2}
                        bg="green.600"
                        color="white"
                        px={2}
                        py={1}
                        borderRadius="md"
                        fontSize="xs"
                        textAlign="center"
                        fontWeight="bold"
                        opacity={0.95}
                        zIndex={10}
                        boxShadow="lg"
                      >
                        {item.continueFrom}
                      </Box>
                    )}
                  </Box>
                ))}
              </HStack>
            </Box>
          </Box>
        </Box>
      </VStack>
    );
  }, [loading, navigateToSection]);

  // ========= OFFLINE MODE =========
  if (isOffline || !navigator.onLine) {
    return (
      <PageTransition>
        <Helmet>
          <title>Home - NeKuro Scan</title>
          <meta name="description" content="Scopri gli ultimi aggiornamenti manga, trending e top series su NeKuro Scan" />
          <link rel="canonical" href="https://nekuroscan.onrender.com/home" />
        </Helmet>
        <Container maxW="container.xl" py={8}>
          <VStack spacing={8} align="stretch">
            
            {/* Header offline */}
            <Box textAlign="center" py={6}>
              <Badge colorScheme="orange" fontSize="md" px={4} py={2} mb={4}>
                📡 Modalità Offline
              </Badge>
              <Heading size="lg" mb={2}>Manga Scaricati</Heading>
              <Text color="gray.400">
                Server non raggiungibile. Accedi ai tuoi manga offline
              </Text>
            </Box>

            {/* Card download */}
            <Box
              bg="gray.800"
              borderRadius="xl"
              p={10}
              textAlign="center"
              border="2px dashed"
              borderColor="purple.500"
              cursor="pointer"
              onClick={() => navigate('/downloads')}
              transition="all 0.3s"
              _hover={{
                transform: 'translateY(-8px)',
                boxShadow: '0 20px 40px rgba(128, 90, 213, 0.4)',
                borderColor: 'purple.400'
              }}
            >
              <VStack spacing={6}>
                <Icon as={FaBookOpen} boxSize={20} color="purple.400" />
                <Heading size="xl">📥 Manga Offline</Heading>
                <Text color="gray.300" fontSize="xl" fontWeight="bold">
                  {downloadedCount} {downloadedCount === 1 ? 'capitolo' : 'capitoli'}
                </Text>
                <Button 
                  colorScheme="purple" 
                  size="lg"
                  rightIcon={<FaChevronRight />}
                >
                  Apri i miei download
                </Button>
              </VStack>
            </Box>

            {/* Info e riconnessione */}
            <Box bg="gray.800" p={6} borderRadius="lg" textAlign="center">
              <VStack spacing={4}>
                <Text color="gray.400" fontSize="sm">
                  💡 I tuoi manga scaricati sono sempre disponibili offline
                </Text>
                <Text color="gray.500" fontSize="xs">
                  Quando torni online potrai cercare e scaricare nuovi contenuti
                </Text>
                <Button
                  colorScheme="green"
                  variant="outline"
                  isLoading={refreshing}
                  onClick={async () => {
                    setRefreshing(true);
                    
                    // Aspetta un attimo prima di controllare
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    const online = await checkOfflineStatus();
                    
                    if (!online) {
                      setRefreshing(false);
                      toast({
                        title: 'Ancora offline',
                        description: 'Server non raggiungibile. Riprova più tardi.',
                        status: 'warning',
                        duration: 3000
                      });
                    } else {
                      // Siamo online! Ricarica TUTTO
                      toast({
                        title: '🌐 Connesso!',
                        description: 'Ricaricamento pagina...',
                        status: 'success',
                        duration: 1500
                      });
                      
                      // Forza refresh completo della pagina
                      setTimeout(() => {
                        window.location.reload();
                      }, 1000);
                    }
                  }}
                  size="md"
                  loadingText="Controllo..."
                >
                  🔄 Riprova connessione
                </Button>
              </VStack>
            </Box>
          </VStack>
        </Container>
      </PageTransition>
    );
  }

  // ========= LOADING STATE =========
  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8}>
          <Skeleton height="150px" borderRadius="xl" />
          <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4} w="100%">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} height="280px" borderRadius="lg" />
            ))}
          </SimpleGrid>
        </VStack>
      </Container>
    );
  }

  return (
    <PageTransition>
      <Helmet>
        <title>Home - NeKuro Scan | Manga Online Gratuito</title>
        <meta name="description" content="Scopri gli ultimi aggiornamenti manga, serie trending e classifiche top su NeKuro Scan. Leggi gratuitamente migliaia di titoli." />
        <link rel="canonical" href="https://nekuroscan.onrender.com/home" />
        <meta property="og:title" content="Home - NeKuro Scan" />
        <meta property="og:description" content="Ultimi aggiornamenti, trending e top series manga" />
        <meta property="og:url" content="https://nekuroscan.onrender.com/home" />
      </Helmet>
      <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        
        {/* ========= HEADER ========= */}
        <Box 
          bg="gray.800" 
          p={{ base: 4, md: 6 }} 
          borderRadius="xl"
          border="1px solid"
          borderColor="gray.700"
          boxShadow="xl"
        >
          <HStack justify="space-between" flexWrap="wrap" spacing={4}>
            <VStack align="start" spacing={1}>
              <Heading 
                size={{ base: 'lg', md: 'xl' }}
                bgGradient="linear(to-r, purple.400, pink.400)" 
                bgClip="text"
              >
                Benvenuto su NeKuro Scan
              </Heading>
              <Text color="gray.400" fontSize={{ base: 'sm', md: 'md' }}>
                Scopri i tuoi manga preferiti
              </Text>
            </VStack>
            <HStack spacing={3}>
              <Button
                variant={includeAdult ? 'solid' : 'outline'}
                colorScheme="pink"
                size={{ base: 'sm', md: 'md' }}
                onClick={() => setIncludeAdult(!includeAdult)}
                boxShadow={includeAdult ? 'lg' : 'none'}
              >
                {includeAdult ? '🔞 Adult ON' : '🔞 Adult OFF'}
              </Button>
              <IconButton
                icon={<FaSync />}
                onClick={handleRefresh}
                aria-label="Ricarica"
                isLoading={refreshing}
                variant="ghost"
                colorScheme="purple"
                size={{ base: 'sm', md: 'md' }}
              />
            </HStack>
          </HStack>
        </Box>

        {/* ========= IN LETTURA ========= */}
        {content.continueReading.length > 0 && (
          <ContentSection
            title="In lettura"
            icon={FaBookOpen}
            items={content.continueReading}
            color="green"
            viewAllPath="/library"
            showProgress={true}
          />
        )}


        {/* ========= TABS CONTENUTI ========= */}
        <Box 
          bg="gray.800" 
          borderRadius="xl" 
          p={{ base: 3, md: 4 }}
          border="1px solid"
          borderColor="gray.700"
        >
          <Tabs colorScheme="purple" variant="soft-rounded" isLazy>
            <TabList 
              bg="gray.900" 
              p={2} 
              borderRadius="lg" 
              overflowX="auto"
              css={{
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none'
              }}
            >
              <Tab 
                aria-label="Aggiornamenti - Ultimi capitoli pubblicati"
                color="gray.200"
                _selected={{ 
                  bg: 'blue.500', 
                  color: 'white',
                  boxShadow: 'md'
                }}
                _hover={{ color: 'white' }}
              >
                <HStack spacing={2}>
                  <FaClock />
                  <Text display={{ base: 'none', sm: 'block' }}>Aggiornamenti</Text>
                </HStack>
              </Tab>
              <Tab
                aria-label="Trending - Manga di tendenza più popolari"
                color="gray.200"
                _selected={{ 
                  bg: 'orange.500', 
                  color: 'white',
                  boxShadow: 'md'
                }}
                _hover={{ color: 'white' }}
              >
                <HStack spacing={2}>
                  <FaFire />
                  <Text display={{ base: 'none', sm: 'block' }}>Trending</Text>
                </HStack>
              </Tab>
              <Tab
                aria-label="Top Series - Classifiche migliori manga"
                color="gray.200"
                _selected={{ 
                  bg: 'teal.500', 
                  color: 'white',
                  boxShadow: 'md'
                }}
                _hover={{ color: 'white' }}
              >
                <HStack spacing={2}>
                  <FaTrophy />
                  <Text display={{ base: 'none', sm: 'block' }}>Top Series</Text>
                </HStack>
              </Tab>
            </TabList>
            
            <TabPanels overflow="visible">
              {/* TAB AGGIORNAMENTI */}
              <TabPanel px={0} pt={6} overflow="visible">
                <VStack spacing={6} align="stretch" overflow="visible">
                  {content.trending.length > 0 && (
                    <ContentSection 
                      title="Capitoli di tendenza" 
                      icon={FaFire} 
                      items={content.trending} 
                      color="orange" 
                      viewAllPath="/trending"
                      showLatestChapter={true}
                    />
                  )}
                  
                  {content.latest.length > 0 && (
                    <ContentSection 
                      title="Ultimi capitoli aggiunti" 
                      icon={FaClock} 
                      items={content.latest} 
                      color="blue" 
                      viewAllPath="/latest"
                      showLatestChapter={true}
                    />
                  )}
                </VStack>
              </TabPanel>
              
              {/* TAB POPOLARI */}
              <TabPanel px={0} pt={6} overflow="visible">
                <ContentSection 
                  title="Trending" 
                  icon={FaFire} 
                  items={content.popular} 
                  color="orange" 
                  viewAllPath="/popular"
                />
              </TabPanel>
              
              {/* TAB TOP SERIES */}
              <TabPanel px={0} pt={6} overflow="visible">
                <VStack spacing={6} align="stretch" overflow="visible">
                  <ContentSection 
                    title="Top Manga" 
                    icon={GiDragonHead} 
                    items={content.topManga} 
                    color="orange"
                  />
                  <ContentSection 
                    title="Top Manhwa" 
                    icon={BiBook} 
                    items={content.topManhwa} 
                    color="purple"
                  />
                  <ContentSection 
                    title="Top Manhua" 
                    icon={FaDragon} 
                    items={content.topManhua} 
                    color="red"
                  />
                  <ContentSection 
                    title="Top Oneshot" 
                    icon={FaBookOpen} 
                    items={content.topOneshot} 
                    color="green"
                  />
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>

        {/* ========= CTA ESPLORA ========= */}
        <Box 
          bg="gray.800" 
          p={6} 
          borderRadius="xl"
          border="1px solid"
          borderColor="gray.700"
          textAlign="center"
        >
          <VStack spacing={4}>
            <Heading size={{ base: 'sm', md: 'md' }}>Esplora per categoria</Heading>
            <Button 
              colorScheme="purple" 
              onClick={() => navigate('/categories')} 
              rightIcon={<FaArrowRight />}
              size={{ base: 'md', md: 'lg' }}
              w={{ base: '100%', md: 'auto' }}
              boxShadow="lg"
              _hover={{ transform: 'translateY(-2px)', boxShadow: 'xl' }}
              transition="all 0.2s"
            >
              Scopri tutte le categorie
            </Button>
          </VStack>
        </Box>
      </VStack>
    </Container>
    </PageTransition>
  );
}

export default Home;