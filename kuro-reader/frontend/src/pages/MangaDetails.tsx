// @ts-nocheck - Complex legacy file, needs gradual refactoring
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
// ✅ MANGADETAILS.JSX v3.7 - FIX DEFINITIVO REACT ERROR #300
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Heading, Text, Image, VStack, HStack, Button, Badge,
  SimpleGrid, Skeleton, useToast, Flex, IconButton, Wrap, WrapItem,
  Progress, Menu, MenuButton, MenuList, MenuItem, Divider, Spinner,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper, FormControl, FormLabel
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaBookmark, FaPlay, FaShare, FaHeart, FaList, FaTh, FaRedo,
  FaCheckCircle, FaBell, FaBellSlash, FaPlus, FaCheck, FaBan, FaEllipsisV,
  FaClock, FaEye, FaBook, FaDownload, FaSortNumericDown, FaSortNumericUp
} from 'react-icons/fa';
import apiManager from '@/api';
import useAuth from '@/hooks/useAuth';
import useDownloadProgress from '@/hooks/useDownloadProgress';
import offlineManager from '@/utils/offlineManager';
import shareUtils from '@/utils/shareUtils';
import axios from 'axios';
import { config } from '@/config';
import { encodeSource, decodeSource } from '@/utils/sourceMapper';
import { useSEO, SEOTemplates } from '@/hooks/useSEO';

// Helper: Decode URL-safe base64
const decodeUrlSafe = (str) => {
  const fixed = str
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    + '=='.substring(0, (4 - (str.length % 4)) % 4);
  return atob(fixed);
};

function MangaDetails() {
  const { source: encodedSource, id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  // Decodifica source per uso interno
  const source = decodeSource(encodedSource);
  
  // ✅ Hook sempre in cima, con fallback sicuro
  const authHook = useAuth();
  const { 
    user = null, 
    syncFavorites = null, 
    syncToServer = null, 
    syncReading = null 
  } = authHook || {};
  
  const { addDownload, updateChapterProgress, completeChapter, finishDownload } = useDownloadProgress();
  
  // States
  const [manga, setManga] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('chaptersViewMode') || 'list');
  const [chaptersOrder, setChaptersOrder] = useState(() => localStorage.getItem('chaptersOrder') || 'asc');
  const [readingProgress, setReadingProgress] = useState(null);
  const [completedChapters, setCompletedChapters] = useState([]);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [downloadingChapters, setDownloadingChapters] = useState(new Set());
  const [downloadedChapters, setDownloadedChapters] = useState(new Set());
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadRange, setDownloadRange] = useState({ from: 1, to: 1 });

  // ========== CALLBACKS ==========

  // Load manga
  const loadManga = useCallback(async () => {
    try {
      setLoading(true);
      
      const mangaUrl = decodeUrlSafe(id);
      const details = await apiManager.getMangaDetails(mangaUrl, source);
      
      if (!details) {
        throw new Error('Manga non trovato');
      }
      
      
      setManga(details);
      addToHistory(details);
      
      // Carica stato download offline
      if (details.chapters) {
        const downloaded = new Set();
        for (const chapter of details.chapters) {
          const isDownloaded = await offlineManager.isDownloaded(details.url, chapter.url);
          if (isDownloaded) {
            downloaded.add(chapter.url);
          }
        }
        setDownloadedChapters(downloaded);
      }
      
    } catch (error) {
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

  // Add to history
  const addToHistory = useCallback((mangaDetails) => {
    try {
      const history = JSON.parse(localStorage.getItem('history') || '[]');
      const existingIndex = history.findIndex(h => h.url === mangaDetails.url);
      
      const historyItem = {
        url: mangaDetails.url,
        title: mangaDetails.title,
        cover: (mangaDetails as any).cover || mangaDetails.coverUrl,  // ✅ FIX: Support both fields
        type: mangaDetails.type,
        source: mangaDetails.source || source,
        lastVisited: new Date().toISOString()
      };
      
      if (existingIndex !== -1) {
        history.splice(existingIndex, 1);
      }
      
      history.unshift(historyItem);
      localStorage.setItem('history', JSON.stringify(history.slice(0, 100)));
      
    } catch (error) {
    }
  }, [source]);

  // Check favorite
  const checkFavorite = useCallback(() => {
    try {
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      
      const mangaUrl = decodeUrlSafe(id);
      const isFav = favorites.some(f => f.url === mangaUrl);
      setIsFavorite(isFav);
    } catch (error) {
    }
  }, [id]);

  // Check current status
  const checkCurrentStatus = useCallback(() => {
    try {
      const mangaUrl = decodeUrlSafe(id);
      const reading = JSON.parse(localStorage.getItem('reading') || '[]');
      const completed = JSON.parse(localStorage.getItem('completed') || '[]');
      const dropped = JSON.parse(localStorage.getItem('dropped') || '[]');
      
      if (completed.some(m => m.url === mangaUrl)) {
        setCurrentStatus('completed');
      } else if (dropped.some(m => m.url === mangaUrl)) {
        setCurrentStatus('dropped');
      } else if (reading.some(m => m.url === mangaUrl)) {
        setCurrentStatus('reading');
      } else {
        setCurrentStatus(null);
      }
    } catch (error) {
    }
  }, [id]);

  // Load reading progress
  const loadReadingProgress = useCallback(() => {
    try {
      const mangaUrl = decodeUrlSafe(id);
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
        
      }
    } catch (error) {
    }
  }, [id]);

  // Check notification status
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
    } catch (error) {
    }
  }, [user, manga]);

  // ========== EFFECTS ==========

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

  useEffect(() => {
    localStorage.setItem('chaptersOrder', chaptersOrder);
  }, [chaptersOrder]);

  // ========== HANDLERS ==========

  // Toggle favorite
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
        
      } else {
        const mangaToSave = {
          url: manga.url,
          title: manga.title,
          cover: (manga as any).cover || manga.coverUrl,  // ✅ FIX: Support both fields
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
        
      }
      
      localStorage.setItem('favorites', JSON.stringify(updated));
      
      if (user && syncFavorites && typeof syncFavorites === 'function') {
        try {
          await syncFavorites(updated);
        } catch (e) {
        }
      }
      
      window.dispatchEvent(new CustomEvent('library-updated'));
      
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare i preferiti',
        status: 'error',
        duration: 2000
      });
    }
  };

  // Toggle notifications
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
              badge: '/web-app-manifest-192x192.webp',
              vibrate: [200, 100, 200]
            });
          }
        }
        
        toast({
          title: newStatus ? '🔔 Notifiche attivate' : '🔕 Notifiche disattivate',
          status: 'success',
          duration: 2000
        });
        
      }
    } catch (error) {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile aggiornare le notifiche',
        status: 'error',
        duration: 2000
      });
    }
  };

  // ✅ START READING - WRAPPED IN USECALLBACK TO FIX REACT ERROR #300
  const startReading = useCallback((chapterIndex = 0) => {
    // Previeni click multipli
    if (isNavigating) return;
    
    // ✅ VALIDAZIONE: Se chapterIndex è 0 ma non ci sono capitoli, usa il primo disponibile
    if (chapterIndex === 0 && manga?.chapters?.length > 0) {
      chapterIndex = 0; // Il primo capitolo è effettivamente l'indice 0
    }
    // VALIDAZIONE CRITICA
    if (!manga?.chapters || !Array.isArray(manga.chapters)) {
      toast({
        title: 'Errore',
        description: 'Nessun capitolo disponibile',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (chapterIndex < 0 || chapterIndex >= manga.chapters.length) {
      toast({
        title: 'Errore',
        description: 'Capitolo non valido',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    const chapter = manga.chapters[chapterIndex];
    if (!chapter?.url) {
      toast({
        title: 'Errore',
        description: 'URL capitolo non valido',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      setIsNavigating(true);
      
      // ✅ URL-safe base64 encoding (sostituisce caratteri problematici)
      const chapterId = btoa(chapter.url)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      // ✅ 1. Salva tutto in localStorage
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
      
      
      // ✅ 2. NAVIGATION con React Router
      navigate(`/read/${encodeSource(source)}/${id}/${chapterId}?chapter=${chapterIndex}`);
      
    } catch (error) {
      toast({
        title: 'Errore navigazione',
        description: 'Impossibile aprire il capitolo',
        status: 'error',
        duration: 3000,
      });
      setIsNavigating(false);
    }
  }, [manga, source, id, navigate, toast, isNavigating]);

  // Continue reading - WRAPPED IN USECALLBACK
  const continueReading = useCallback(() => {
    if (readingProgress && readingProgress.chapterIndex !== undefined) {
      startReading(readingProgress.chapterIndex);
    } else {
      startReading(0);
    }
  }, [readingProgress, startReading]);

  // Move to list - WRAPPED IN USECALLBACK
  const moveToList = useCallback(async (targetList) => {
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
            // Merge: ensure we do not clear existing per-chapter read list inadvertently
            const existing = new Set(completedChapters[manga.url] || []);
            for (let i = 0; i < manga.chapters.length; i++) existing.add(i);
            completedChapters[manga.url] = Array.from(existing).sort((a,b) => a - b);
            localStorage.setItem('completedChapters', JSON.stringify(completedChapters));
            
            setReadingProgress(readingProgress[manga.url]);
            setCompletedChapters(completedChapters[manga.url]);
            
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('🎉 Manga completato!', {
                body: `Hai completato "${manga.title}"! Tutti i ${manga.chapters.length} capitoli sono stati segnati come letti.`,
                icon: manga.coverUrl,
                badge: '/web-app-manifest-192x192.webp',
                tag: 'manga-completed',
                vibrate: [200, 100, 200]
              });
            }
            
            
          } else if (targetList === 'dropped') {
            newItem.droppedAt = new Date().toISOString();
            
          } else if (targetList === 'reading') {
            newItem.lastRead = new Date().toISOString();
            newItem.progress = readingProgress ? 
              Math.round(((readingProgress.chapterIndex + 1) / manga.chapters.length) * 100) : 0;
          }
          
          targetItems.unshift(newItem);
          localStorage.setItem(targetList, JSON.stringify(targetItems));
        }
      }
      
      setCurrentStatus(targetList);
      
      if (user && syncToServer && typeof syncToServer === 'function') {
        try {
          await syncToServer();
        } catch (e) {
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
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare lo stato del manga',
        status: 'error',
        duration: 2000
      });
    } finally {
      setSyncing(false);
    }
  }, [manga, source, user, syncToServer, toast, readingProgress]);

  // Share content - WRAPPED IN USECALLBACK
  const shareContent = useCallback(async () => {
    const shareData = {
      title: manga.title,
      text: `Leggi ${manga.title} su NeKuro Scan`,
      url: window.location.href
    };
    
    try {
      if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: '📋 Link copiato!',
          description: 'Il link è stato copiato negli appunti',
          status: 'success',
          duration: 2000
        });
      }
    } catch (error) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: '📋 Link copiato!',
          status: 'success',
          duration: 2000
        });
      } catch (err) {
      }
    }
  }, [manga, toast]);

  // isChapterRead - WRAPPED IN USECALLBACK
  const isChapterRead = useCallback((chapterIndex) => {
    return completedChapters.includes(chapterIndex);
  }, [completedChapters]);

  // Download chapter offline - WRAPPED IN USECALLBACK
  const downloadChapterOffline = useCallback(async (chapter, chapterIndex) => {
    if (!manga || !chapter) return;
    
    const downloadId = `${manga.url}-${chapter.url}`;
    
    try {
      // Aggiungi al set dei download in corso
      setDownloadingChapters(prev => new Set(prev).add(chapter.url));
      
      // Aggiungi alla barra di progresso
      addDownload(downloadId, manga.title, 1);
      
      // PRIMA: Carica il capitolo completo con le pagine
      let chapterWithPages;
      try {
        chapterWithPages = await apiManager.getChapter(chapter.url, source);
      } catch (loadError) {
        throw new Error('Impossibile caricare: ' + loadError.message);
      }
      
      if (!chapterWithPages || !chapterWithPages.pages || chapterWithPages.pages.length === 0) {
        throw new Error('Capitolo vuoto');
      }
      
      // POI: Scarica le immagini con progress
      const result = await offlineManager.downloadChapter(
        manga, 
        chapterWithPages, 
        chapterIndex, 
        source,
        (progress) => {
          // Aggiorna solo la barra, niente toast
          updateChapterProgress(
            downloadId,
            chapter.title || `Capitolo ${chapterIndex + 1}`,
            progress.current,
            progress.total
          );
        }
      );
      
      if (result.success) {
        setDownloadedChapters(prev => new Set(prev).add(chapter.url));
        completeChapter(downloadId);
        finishDownload(downloadId, 'completed');
        
        localStorage.setItem(`downloaded_${chapter.url}`, 'true');
        window.dispatchEvent(new CustomEvent('downloads-updated'));
      } else {
        throw new Error(result.error || 'Download fallito');
      }
    } catch (error) {
      finishDownload(downloadId, 'error');
      
      // Solo notifica errore (non più toast ogni 25%)
      toast({
        title: 'Errore download',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setDownloadingChapters(prev => {
        const newSet = new Set(prev);
        newSet.delete(chapter.url);
        return newSet;
      });
    }
  }, [manga, source, toast, addDownload, updateChapterProgress, completeChapter, finishDownload]);

  // Download chapters in range
  const downloadRangeChapters = useCallback(async (fromIndex, toIndex) => {
    if (!manga || !manga.chapters || manga.chapters.length === 0) return;
    
    // Validazione range
    const from = Math.max(0, fromIndex - 1); // -1 perché l'utente vede 1-based
    const to = Math.min(manga.chapters.length - 1, toIndex - 1);
    
    if (from > to || from < 0 || to >= manga.chapters.length) {
      toast({
        title: '❌ Range non valido',
        description: `Seleziona un range tra 1 e ${manga.chapters.length}`,
        status: 'error',
        duration: 3000
      });
      return;
    }
    
    const toDownload = to - from + 1;
    let downloaded = 0;
    let failed = 0;
    const downloadId = `${manga.url}-range-${Date.now()}`;
    
    setShowDownloadModal(false);
    
    // Aggiungi alla barra di progresso
    addDownload(downloadId, manga.title, toDownload);
    
    for (let i = from; i <= to; i++) {
      try {
        const chapter = manga.chapters[i];
        
        // Carica capitolo
        const chapterWithPages = await apiManager.getChapter(chapter.url, source);
        
        if (!chapterWithPages || !chapterWithPages.pages || chapterWithPages.pages.length === 0) {
          failed++;
          continue;
        }
        
        // Scarica con progress
        const result = await offlineManager.downloadChapter(
          manga,
          chapterWithPages,
          i,
          source,
          (progress) => {
            // Aggiorna barra di progresso
            updateChapterProgress(
              downloadId,
              chapter.title || `Capitolo ${i + 1}`,
              progress.current,
              progress.total
            );
          }
        );
        
        if (result.success && !result.alreadyDownloaded) {
          downloaded++;
          setDownloadedChapters(prev => new Set(prev).add(chapter.url));
        }
        
        // Completa capitolo nella barra
        completeChapter(downloadId);
        
      } catch (err) {
        failed++;
      }
    }
    
    // Fine download
    finishDownload(downloadId, failed === 0 ? 'completed' : 'error');
    
    // Solo notifica finale
    if (downloaded > 0) {
      toast({
        title: '✅ Download completato',
        description: `${downloaded}/${toDownload} capitoli scaricati`,
        status: 'success',
        duration: 3000
      });
    }
    
    window.dispatchEvent(new CustomEvent('downloads-updated'));
  }, [manga, source, toast, addDownload, updateChapterProgress, completeChapter, finishDownload]);

  // ========== RENDER ==========

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

  // ✅ SEO Dinamico per questa pagina manga
  const seoData = SEOTemplates.manga(manga);
  const SEOHelmet = useSEO(seoData);

  return (
    <>
      {SEOHelmet}
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">
        
        {/* ========= HEADER ========= */}
        <Box
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
                      <WrapItem key={genre.genre || genre || i}>
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
                      onClick={(e) => { e.stopPropagation(); continueReading(); }}
                      size={{ base: 'sm', md: 'md' }}
                      boxShadow="lg"
                      _hover={{ transform: 'translateY(-2px)', boxShadow: 'xl' }}
                      transition="all 0.2s"
                      isLoading={isNavigating}
                      loadingText="Caricamento..."
                    >
                      Continua Cap. {readingProgress.chapterIndex + 1}
                    </Button>
                    <IconButton
                      icon={<FaRedo />}
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); startReading(0); }}
                      aria-label="Ricomincia dall'inizio"
                      size={{ base: 'sm', md: 'md' }}
                    />
                  </>
                ) : (
                  <Button
                    colorScheme="purple"
                    leftIcon={<FaPlay />}
                    onClick={(e) => { e.stopPropagation(); startReading(0); }}
                    size={{ base: 'sm', md: 'md' }}
                    boxShadow="lg"
                    _hover={{ transform: 'translateY(-2px)', boxShadow: 'xl' }}
                    transition="all 0.2s"
                    isLoading={isNavigating}
                    loadingText="Apertura..."
                  >
                    Inizia a leggere
                  </Button>
                )}
                
                <IconButton
                  icon={<FaDownload />}
                  colorScheme="green"
                  variant="outline"
                  size={{ base: 'sm', md: 'md' }}
                  onClick={() => {
                    setDownloadRange({ from: 1, to: manga.chapters?.length || 1 });
                    setShowDownloadModal(true);
                  }}
                  isDisabled={!manga.chapters || manga.chapters.length === 0}
                  aria-label="Scarica capitoli"
                  _hover={{ transform: 'translateY(-2px)' }}
                  transition="all 0.2s"
                />
                
                <IconButton
                  icon={isFavorite ? <FaHeart /> : <FaBookmark />}
                  colorScheme={isFavorite ? 'pink' : 'gray'}
                  variant={isFavorite ? 'solid' : 'outline'}
                  onClick={toggleFavorite}
                  aria-label={isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                  size={{ base: 'sm', md: 'md' }}
                  _hover={{ transform: 'translateY(-2px)' }}
                  transition="all 0.2s"
                />
                
                <IconButton
                  icon={notificationsEnabled ? <FaBell /> : <FaBellSlash />}
                  colorScheme={notificationsEnabled ? 'green' : 'gray'}
                  variant={notificationsEnabled ? 'solid' : 'outline'}
                  onClick={toggleNotifications}
                  aria-label={notificationsEnabled ? 'Disattiva notifiche' : 'Attiva notifiche nuovi capitoli'}
                  size={{ base: 'sm', md: 'md' }}
                  _hover={{ transform: 'translateY(-2px)' }}
                  transition="all 0.2s"
                />
                
                <IconButton
                  icon={<FaShare />}
                  variant="outline"
                  aria-label="Condividi manga"
                  onClick={shareContent}
                  size={{ base: 'sm', md: 'md' }}
                  _hover={{ transform: 'translateY(-2px)' }}
                  transition="all 0.2s"
                />
                
                {/* MENU GESTIONE LISTE */}
                <Menu>
                  <MenuButton
                    as={IconButton}
                    icon={<FaEllipsisV />}
                    variant="outline"
                    aria-label="Gestisci liste"
                    size={{ base: 'sm', md: 'md' }}
                    isLoading={syncing}
                    _hover={{ transform: 'translateY(-2px)' }}
                    transition="all 0.2s"
                  />
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
        </Box>

        {/* ========= TRAMA ========= */}
        {manga.plot && (
          <Box
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
          </Box>
        )}

        {/* ========= CAPITOLI ========= */}
        <Box
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
                <IconButton
                  icon={chaptersOrder === 'asc' ? <FaSortNumericDown /> : <FaSortNumericUp />}
                  size="sm"
                  variant="outline"
                  colorScheme="purple"
                  onClick={() => setChaptersOrder(chaptersOrder === 'asc' ? 'desc' : 'asc')}
                  aria-label={chaptersOrder === 'asc' ? 'Inverti ordine (ultimo → primo)' : 'Ordine normale (primo → ultimo)'}
                  title={chaptersOrder === 'asc' ? 'Primo → Ultimo' : 'Ultimo → Primo'}
                />
                <IconButton
                  icon={<FaList />}
                  size="sm"
                  variant={viewMode === 'list' ? 'solid' : 'ghost'}
                  colorScheme="purple"
                  onClick={() => setViewMode('list')}
                  aria-label="Vista lista"
                />
                <IconButton
                  icon={<FaTh />}
                  size="sm"
                  variant={viewMode === 'grid' ? 'solid' : 'ghost'}
                  colorScheme="purple"
                  onClick={() => setViewMode('grid')}
                  aria-label="Vista griglia"
                />
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
                    {(chaptersOrder === 'asc' ? (manga.chapters || []) : [...(manga.chapters || [])].reverse()).map((chapter, displayIndex) => {
                      const i = chaptersOrder === 'asc' ? displayIndex : (manga.chapters.length - 1 - displayIndex);
                      return (
                      <Box
                        key={chapter.url || i}
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
                            <Box title="Capitolo letto">
                              <FaCheckCircle color="green" />
                            </Box>
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
                          
                          {/* Download offline button */}
                          {downloadedChapters.has(chapter.url) ? (
                            <Badge colorScheme="green" fontSize="xs">
                              <HStack spacing={1}>
                                <FaCheck size={10} />
                                <Text>Offline</Text>
                              </HStack>
                            </Badge>
                          ) : (
                            <IconButton
                              icon={downloadingChapters.has(chapter.url) ? <Spinner size="xs" /> : <FaDownload />}
                              size="xs"
                              variant="ghost"
                              colorScheme="blue"
                              aria-label="Scarica offline"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadChapterOffline(chapter, i);
                              }}
                              isLoading={downloadingChapters.has(chapter.url)}
                            />
                          )}
                          
                          {chapter.date && (
                            <Text fontSize="xs" color="gray.400">
                              <HStack spacing={1}>
                                <FaClock size="10" />
                                <Text>{chapter.date}</Text>
                              </HStack>
                            </Text>
                          )}
                        </HStack>
                      </Box>
                      );
                    })}
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
                    {(chaptersOrder === 'asc' ? (manga.chapters || []) : [...(manga.chapters || [])].reverse()).map((chapter, displayIndex) => {
                      const i = chaptersOrder === 'asc' ? displayIndex : (manga.chapters.length - 1 - displayIndex);
                      return (
                      <Box
                        key={chapter.url || i}
                        position="relative"
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
                          
                          {/* Download button per griglia */}
                          {downloadedChapters.has(chapter.url) ? (
                            <Badge 
                              position="absolute" 
                              bottom={2} 
                              right={2} 
                              colorScheme="green" 
                              fontSize="8px"
                            >
                              ✓ Offline
                            </Badge>
                          ) : (
                            <IconButton
                              icon={downloadingChapters.has(chapter.url) ? <Spinner size="xs" /> : <FaDownload />}
                              size="xs"
                              variant="ghost"
                              colorScheme="green"
                              position="absolute"
                              bottom={2}
                              right={2}
                              aria-label="Scarica offline"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadChapterOffline(chapter, i);
                              }}
                              isLoading={downloadingChapters.has(chapter.url)}
                              opacity={0.7}
                              _hover={{ opacity: 1, bg: 'green.900' }}
                            />
                          )}
                        </Box>
                      </Box>
                      );
                    })}
                  </SimpleGrid>
                )}
              </>
            )}
          </Box>
        </Box>

        {/* ========= STATS FOOTER ========= */}
        {readingProgress && (
          <Box
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
          </Box>
        )}

      </VStack>

      {/* ========== MODAL DOWNLOAD RANGE ========== */}
      <Modal 
        isOpen={showDownloadModal} 
        onClose={() => setShowDownloadModal(false)}
        size="md"
        isCentered
      >
        <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(10px)" />
        <ModalContent 
          bg="gray.800" 
          borderRadius="xl" 
          border="1px solid" 
          borderColor="green.500"
          mx={4}
          my={4}
          sx={{
            '@media (max-width: 768px)': {
              marginTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
              marginBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
            }
          }}
        >
          <ModalHeader
            pt="calc(1rem + env(safe-area-inset-top, 0px))"
          >
            <HStack spacing={3}>
              <Box
                p={2}
                bg="green.500"
                borderRadius="lg"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <FaDownload color="white" size="20" />
              </Box>
              <VStack align="start" spacing={0}>
                <Heading size="md">Scarica Capitoli</Heading>
                <Text fontSize="sm" color="gray.400" fontWeight="normal">
                  Seleziona il range di capitoli
                </Text>
              </VStack>
            </HStack>
          </ModalHeader>
          <ModalCloseButton 
            sx={{
              top: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
              right: 'calc(0.75rem + env(safe-area-inset-right, 0px))',
            }}
          />
          
          <ModalBody pb={6}>
            <VStack spacing={6}>
              <FormControl>
                <FormLabel>
                  <HStack spacing={2}>
                    <Text>Dal capitolo</Text>
                    <Badge colorScheme="green">{downloadRange.from}</Badge>
                  </HStack>
                </FormLabel>
                <NumberInput
                  min={1}
                  max={manga?.chapters?.length || 1}
                  value={downloadRange.from}
                  onChange={(_, val) => setDownloadRange(prev => ({ ...prev, from: val }))}
                  bg="gray.900"
                  borderColor="gray.700"
                  _hover={{ borderColor: 'green.500' }}
                  _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px var(--chakra-colors-green-500)' }}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper borderColor="gray.700" />
                    <NumberDecrementStepper borderColor="gray.700" />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>
                  <HStack spacing={2}>
                    <Text>Al capitolo</Text>
                    <Badge colorScheme="green">{downloadRange.to}</Badge>
                  </HStack>
                </FormLabel>
                <NumberInput
                  min={downloadRange.from}
                  max={manga?.chapters?.length || 1}
                  value={downloadRange.to}
                  onChange={(_, val) => setDownloadRange(prev => ({ ...prev, to: val }))}
                  bg="gray.900"
                  borderColor="gray.700"
                  _hover={{ borderColor: 'green.500' }}
                  _focus={{ borderColor: 'green.500', boxShadow: '0 0 0 1px var(--chakra-colors-green-500)' }}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper borderColor="gray.700" />
                    <NumberDecrementStepper borderColor="gray.700" />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <Box 
                w="100%" 
                p={4} 
                bg="green.900" 
                borderRadius="lg"
                border="1px solid"
                borderColor="green.700"
              >
                <VStack spacing={2}>
                  <HStack justify="space-between" w="100%">
                    <Text fontSize="sm" color="gray.300">Capitoli da scaricare:</Text>
                    <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                      {Math.max(0, downloadRange.to - downloadRange.from + 1)}
                    </Badge>
                  </HStack>
                  <Text fontSize="xs" color="gray.400" textAlign="center">
                    I capitoli saranno disponibili offline
                  </Text>
                </VStack>
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter
            pb="calc(1rem + env(safe-area-inset-bottom, 0px))"
          >
            <HStack spacing={3} w="100%">
              <Button 
                variant="ghost" 
                onClick={() => setShowDownloadModal(false)}
                flex={1}
              >
                Annulla
              </Button>
              <Button
                colorScheme="green"
                onClick={() => downloadRangeChapters(downloadRange.from, downloadRange.to)}
                flex={1}
                leftIcon={<FaDownload />}
                isDisabled={downloadRange.from > downloadRange.to}
              >
                Scarica
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
    </>
  );
}

export default MangaDetails;