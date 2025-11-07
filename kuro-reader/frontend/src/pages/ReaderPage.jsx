// ✅ READERPAGE.JSX v4.0 - COMPLETO CON TUTTE LE FUNZIONALITÀ
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box, IconButton, useToast, Image, Spinner, Text, VStack, HStack,
  Drawer, DrawerOverlay, DrawerContent, DrawerBody, DrawerHeader,
  FormControl, FormLabel, Slider, SliderTrack, SliderFilledTrack,
  SliderThumb, Button, Progress, DrawerCloseButton, Select, Divider,
  Switch, Badge, Heading, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Textarea
} from '@chakra-ui/react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  FaChevronLeft, FaChevronRight, FaTimes, FaCog, FaBook, FaPlay, FaPause, FaBookmark, FaRegBookmark, FaStickyNote, FaRegStickyNote
} from 'react-icons/fa';
import { MdFullscreen, MdFullscreenExit } from 'react-icons/md';
import apiManager from '../api';
import bookmarksManager from '../utils/bookmarks';
import notesManager from '../utils/notes';
import chapterCache from '../utils/chapterCache';
import ProxiedImage from '../components/ProxiedImage';
import { config } from '../config';
import { encodeSource, decodeSource } from '../utils/sourceMapper';

function ReaderPage() {
  // ========== HOOKS ESSENZIALI (SEMPRE CHIAMATI PER PRIMI) ==========
  const { source: encodedSource, mangaId, chapterId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  // Decodifica source per uso interno
  const source = decodeSource(encodedSource);
  
  // ✅ VALIDAZIONE PARAMETRI (ma hooks devono essere chiamati prima)
  const hasValidParams = Boolean(source && mangaId && chapterId);
  
  // ========== STATES CON LOCALSTORAGE ==========
  const [chapter, setChapter] = useState(null);
  const [manga, setManga] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  // Impostazioni salvate
  const [readingMode, setReadingMode] = useState(() => localStorage.getItem('readingMode') || 'webtoon');
  const [imageScale, setImageScale] = useState(() => parseInt(localStorage.getItem('imageScale') || '100'));
  const [brightness, setBrightness] = useState(() => parseInt(localStorage.getItem('brightness') || '100'));
  const [showControls, setShowControls] = useState(true);
  const [autoNextChapter, setAutoNextChapter] = useState(() => localStorage.getItem('autoNextChapter') === 'true');
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(() => parseInt(localStorage.getItem('scrollSpeed') || '2'));
  const [bookmarks, setBookmarks] = useState([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [rotationLock, setRotationLock] = useState(() => localStorage.getItem('rotationLock') === 'true');
  const [currentNote, setCurrentNote] = useState('');
  const [hasNote, setHasNote] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  
  // ========== REFS ESSENZIALI ==========
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const preloadedImages = useRef(new Set());
  const webtoonScrollRef = useRef(null);
  const autoScrollInterval = useRef(null);
  
  // Touch/Gesture refs
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const lastTapTime = useRef(0);
  
  // ========== CALCOLI ==========
  const chapterIndex = parseInt(searchParams.get('chapter') || '0');
  const totalPages = chapter?.pages?.length || 0;
  const progressPercentage = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;
  
  // Calcolo pagine da mostrare in base alla modalità - MEMOIZED
  const pagesToShow = useMemo(() => {
    return readingMode === 'double' ? 2 : 1;
  }, [readingMode]);
  
  const currentImages = useMemo(() => {
    // ✅ Guard: Non calcolare se non abbiamo chapter con pagine
    if (!chapter?.pages || totalPages === 0) {
      return [];
    }
    
    const images = [];
    for (let i = 0; i < pagesToShow; i++) {
      const pageIndex = currentPage + i;
      if (pageIndex < totalPages) {
        images.push({
          url: chapter.pages[pageIndex],
          index: pageIndex
        });
      }
    }
    return images;
  }, [pagesToShow, currentPage, totalPages, chapter?.pages]);
  
  // ========== SALVA IMPOSTAZIONI ==========
  useEffect(() => {
    localStorage.setItem('readingMode', readingMode);
  }, [readingMode]);
  
  useEffect(() => {
    localStorage.setItem('imageScale', imageScale.toString());
  }, [imageScale]);
  
  useEffect(() => {
    localStorage.setItem('brightness', brightness.toString());
  }, [brightness]);
  
  useEffect(() => {
    localStorage.setItem('autoNextChapter', autoNextChapter.toString());
  }, [autoNextChapter]);
  
  useEffect(() => {
    localStorage.setItem('scrollSpeed', scrollSpeed.toString());
  }, [scrollSpeed]);

  useEffect(() => {
    localStorage.setItem('rotationLock', rotationLock.toString());
    
    // Lock orientamento se supportato
    if (rotationLock && readingMode !== 'webtoon') {
      // Blocca in landscape per doppia pagina, portrait per singola
      const orientation = readingMode === 'double' ? 'landscape' : 'portrait';
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock(orientation).catch(() => {
          console.log('Orientation lock not supported on this device');
        });
      }
    } else if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
    
    return () => {
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    };
  }, [rotationLock, readingMode]);

  // Carica segnalibri e note
  useEffect(() => {
    if (manga && chapter) {
      const chapterBookmarks = bookmarksManager.getByChapter(manga.url, chapter.url);
      setBookmarks(chapterBookmarks);
      
      const isCurrentBookmarked = bookmarksManager.isBookmarked(
        manga.url, 
        chapter.url, 
        currentPage
      );
      setIsBookmarked(isCurrentBookmarked);
      
      // Carica nota per pagina corrente
      const existingNote = notesManager.getForPage(manga.url, chapter.url, currentPage);
      if (existingNote) {
        setCurrentNote(existingNote.text);
        setHasNote(true);
      } else {
        setCurrentNote('');
        setHasNote(false);
      }
    }
  }, [manga, chapter, currentPage]);

  // Toggle bookmark
  const toggleBookmark = useCallback(() => {
    if (!manga || !chapter) return;
    
    if (isBookmarked) {
      const id = `${manga.url}-${chapter.url}-${currentPage}`;
      bookmarksManager.removeBookmark(id);
      setIsBookmarked(false);
      toast({
        title: 'Segnalibro rimosso',
        status: 'info',
        duration: 2000
      });
    } else {
      bookmarksManager.addBookmark(
        manga.url,
        chapter.url,
        currentPage,
        `Pagina ${currentPage + 1}`
      );
      setIsBookmarked(true);
      toast({
        title: 'Segnalibro aggiunto',
        description: `Pagina ${currentPage + 1}`,
        status: 'success',
        duration: 2000
      });
    }
    
    // Aggiorna lista
    const updated = bookmarksManager.getByChapter(manga.url, chapter.url);
    setBookmarks(updated);
  }, [manga, chapter, currentPage, isBookmarked, toast]);

  // Salva/aggiorna nota
  const saveNote = useCallback(() => {
    if (!manga || !chapter || !currentNote.trim()) return;
    
    notesManager.saveNote(
      manga.url,
      chapter.url,
      currentPage,
      currentNote
    );
    
    setHasNote(true);
    setShowNoteModal(false);
    
    toast({
      title: 'Nota salvata',
      description: `Pagina ${currentPage + 1}`,
      status: 'success',
      duration: 2000
    });
  }, [manga, chapter, currentPage, currentNote, toast]);

  // Rimuovi nota
  const removeNote = useCallback(() => {
    if (!manga || !chapter) return;
    
    const id = `${manga.url}-${chapter.url}-${currentPage}`;
    notesManager.removeNote(id);
    
    setCurrentNote('');
    setHasNote(false);
    setShowNoteModal(false);
    
    toast({
      title: 'Nota eliminata',
      status: 'info',
      duration: 2000
    });
  }, [manga, chapter, currentPage, toast]);
  
  // ========== HANDLERS ==========
  
  // ✅ WRAP saveProgress in useCallback per evitare React error #300
  const saveProgress = React.useCallback(async () => {
    if (!manga || !chapter) return;
    
    try {
      const readingProgress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
      readingProgress[manga.url] = {
        chapterId: chapter.url,
        chapterIndex,
        chapterTitle: manga.chapters?.[chapterIndex]?.title || '',
        page: currentPage,
        totalPages: chapter.pages?.length || 0,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('readingProgress', JSON.stringify(readingProgress));
      
      const reading = JSON.parse(localStorage.getItem('reading') || '[]');
      const existingIndex = reading.findIndex(r => r.url === manga.url);
      
      const readingItem = {
        url: manga.url,
        title: manga.title,
        cover: manga.coverUrl,
        type: manga.type,
        source: manga.source || source,
        lastChapterIndex: chapterIndex,
        lastChapterTitle: manga.chapters?.[chapterIndex]?.title || '',
        lastPage: currentPage,
        progress: Math.round(((chapterIndex + 1) / (manga.chapters?.length || 1)) * 100),
        lastRead: new Date().toISOString()
      };
      
      if (existingIndex !== -1) {
        reading[existingIndex] = readingItem;
      } else {
        reading.unshift(readingItem);
      }
      
      const updatedReading = reading.slice(0, 100);
      localStorage.setItem('reading', JSON.stringify(updatedReading));
      window.dispatchEvent(new CustomEvent('library-updated'));
      
      // ✅ SYNC con profilo pubblico se loggato
      try {
        const { syncReading } = await import('../hooks/useAuth');
        if (syncReading) {
          await syncReading.getState().syncReading(updatedReading);
        }
      } catch (syncError) {
        // Sync fallita ma non critico
        console.log('Sync failed (offline?):', syncError.message);
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }, [manga, chapter, chapterIndex, currentPage, source]);

  // ✅ WRAP navigateChapter in useCallback per evitare React error #300
  const navigateChapter = useCallback((direction) => {
    if (!manga?.chapters || !Array.isArray(manga.chapters)) return;
    
    const newIndex = chapterIndex + direction;
    
    try {
      if (newIndex >= 0 && newIndex < manga.chapters.length) {
        saveProgress();
        const newChapter = manga.chapters[newIndex];
        if (!newChapter || !newChapter.url) return;
        
        // URL-safe base64
        const newChapterId = btoa(newChapter.url)
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
        setCurrentPage(0);
        navigate(`/read/${encodeSource(source)}/${mangaId}/${newChapterId}?chapter=${newIndex}`);
      } else if (direction > 0) {
        saveProgress();
        toast({
          title: 'Manga completato!',
          description: 'Hai finito di leggere questo manga',
          status: 'success',
          duration: 2000,
        });
        setTimeout(() => {
          navigate(`/manga/${encodeSource(source)}/${mangaId}`);
        }, 1200);
      } else if (direction < 0) {
        toast({
          title: 'Primo capitolo',
          description: 'Sei già al primo capitolo',
          status: 'info',
          duration: 1500,
        });
      }
    } catch (error) {
      console.error('Error navigating chapter:', error);
      toast({
        title: 'Errore navigazione',
        status: 'error',
        duration: 2000
      });
    }
  }, [manga, chapterIndex, saveProgress, navigate, source, mangaId, toast]);

  // Naviga alla pagina successiva/precedente
  const changePage = useCallback((delta) => {
    if (!chapter || !chapter.pages) return;
    
    const newPage = currentPage + delta;
    try {
      if (newPage >= 0 && newPage < totalPages) {
        setCurrentPage(newPage);
      } else if (newPage >= totalPages && autoNextChapter && manga?.chapters && Array.isArray(manga.chapters) && chapterIndex < manga.chapters.length - 1) {
        navigateChapter(1);
      } else if (newPage < 0 && autoNextChapter && chapterIndex > 0) {
        navigateChapter(-1);
      }
    } catch (error) {
      console.error('Error changing page:', error);
    }
  }, [currentPage, totalPages, autoNextChapter, navigateChapter, manga, chapterIndex, chapter]);

  // ✅ WRAP toggleFullscreen in useCallback per evitare React error #300
  const toggleFullscreen = React.useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // ✅ WRAP handleKeyPress in useCallback per evitare React error #300
  const handleKeyPress = useCallback((e) => {
    if (readingMode === 'webtoon') return; // Webtoon usa scroll nativo
    
    if (e.key === 'Escape') {
      if (isFullscreen) {
        toggleFullscreen();
      } else {
        saveProgress();
        navigate(`/manga/${source}/${mangaId}`);
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      const step = readingMode === 'double' ? 2 : 1;
      const newPage = currentPage - step;
      if (newPage >= 0) {
        setCurrentPage(newPage);
      } else if (autoNextChapter && chapterIndex > 0) {
        navigateChapter(-1);
      }
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      const step = readingMode === 'double' ? 2 : 1;
      const newPage = currentPage + step;
      if (newPage < totalPages) {
        setCurrentPage(newPage);
      } else if (autoNextChapter && manga?.chapters && chapterIndex < manga.chapters.length - 1) {
        navigateChapter(1);
      }
    } else if (e.key === ' ') {
      e.preventDefault();
      if (currentPage < totalPages - 1) {
        setCurrentPage(currentPage + 1);
      } else if (autoNextChapter && manga?.chapters && chapterIndex < manga.chapters.length - 1) {
        navigateChapter(1);
      }
    }
  }, [isFullscreen, toggleFullscreen, saveProgress, navigate, source, mangaId, navigateChapter, currentPage, chapterIndex, readingMode, totalPages, autoNextChapter, manga]);

  // ✅ WRAP handlePageClick in useCallback per evitare React error #300
  const handlePageClick = useCallback((e) => {
    if (!chapter?.pages || readingMode === 'webtoon') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const step = readingMode === 'double' ? 2 : 1;
    
    // Click sinistra = pagina precedente
    if (clickX < width * 0.3) {
      const newPage = currentPage - step;
      if (newPage >= 0) {
        setCurrentPage(newPage);
      } else if (autoNextChapter && chapterIndex > 0) {
        navigateChapter(-1);
      }
    } 
    // Click destra = pagina successiva
    else if (clickX > width * 0.7) {
      const newPage = currentPage + step;
      if (newPage < totalPages) {
        setCurrentPage(newPage);
      } else if (autoNextChapter && manga?.chapters && chapterIndex < manga.chapters.length - 1) {
        navigateChapter(1);
      }
    }
  }, [chapter, currentPage, chapterIndex, navigateChapter, readingMode, totalPages, autoNextChapter, manga]);

  // ✅ Touch Gestures
  const handleTouchStart = useCallback((e) => {
    if (!chapter || readingMode === 'webtoon') return;
    
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
  }, [chapter, readingMode]);

  const handleTouchEnd = useCallback((e) => {
    if (!chapter || readingMode === 'webtoon') return;
    
    const touch = e.changedTouches[0];
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;
    const touchEndTime = Date.now();
    
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;
    const deltaTime = touchEndTime - touchStartTime.current;
    
    // Double-tap to zoom
    if (deltaTime < 300 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      if (touchEndTime - lastTapTime.current < 300) {
        // Double tap detected
        if (imageScale === 100) {
          setImageScale(200);
        } else {
          setImageScale(100);
        }
        lastTapTime.current = 0;
      } else {
        lastTapTime.current = touchEndTime;
      }
      return;
    }
    
    // Swipe gestures
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      // Horizontal swipe
      if (deltaX > 0) {
        // Swipe right = previous page
        const step = readingMode === 'double' ? 2 : 1;
        const newPage = currentPage - step;
        if (newPage >= 0) {
          setCurrentPage(newPage);
        } else if (autoNextChapter && chapterIndex > 0) {
          navigateChapter(-1);
        }
      } else {
        // Swipe left = next page
        const step = readingMode === 'double' ? 2 : 1;
        const newPage = currentPage + step;
        if (newPage < totalPages) {
          setCurrentPage(newPage);
        } else if (autoNextChapter && manga?.chapters && chapterIndex < manga.chapters.length - 1) {
          navigateChapter(1);
        }
      }
    }
  }, [chapter, readingMode, imageScale, setImageScale, currentPage, totalPages, autoNextChapter, chapterIndex, manga, navigateChapter]);

  // ========== EFFECTS ==========
  
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    const loadData = async () => {
      // VALIDAZIONE PARAMETRI
      if (!chapterId || !mangaId || !source) {
        console.error('Parametri mancanti:', { source, mangaId, chapterId });
        toast({
          title: 'Errore',
          description: 'Link non valido',
          status: 'error',
          duration: 2000,
        });
        navigate('/home');
        return;
      }
      
      try {
        setLoading(true);

        let chapterUrl, mangaUrl;
        
        // DECODIFICA URL-SAFE BASE64
        try {
          // Ripristina i caratteri base64 standard
          const chapterIdFixed = chapterId
            .replace(/-/g, '+')
            .replace(/_/g, '/')
            + '=='.substring(0, (4 - (chapterId.length % 4)) % 4); // Aggiungi padding
          
          const mangaIdFixed = mangaId
            .replace(/-/g, '+')
            .replace(/_/g, '/')
            + '=='.substring(0, (4 - (mangaId.length % 4)) % 4);
          
          chapterUrl = atob(chapterIdFixed);
          mangaUrl = atob(mangaIdFixed);
          
          // VALIDAZIONE URL DECODIFICATI
          if (!chapterUrl.startsWith('http') || !mangaUrl.startsWith('http')) {
            throw new Error('URL non validi dopo decodifica');
          }
        } catch (decodeError) {
          console.error('Errore decodifica:', decodeError);
          throw new Error('Link corrotto o non valido');
        }

        console.log('Caricamento:', { chapterUrl, mangaUrl });

        // ========== TENTATIVO 1: CARICA DA OFFLINE STORAGE ==========
        let mangaData = null;
        let chapterData = null;
        let fromOffline = false;
        
        try {
          const { default: offlineManager } = await import('../utils/offlineManager');
          const offlineChapterId = `${mangaUrl}-${chapterUrl}`;
          const offlineChapter = await offlineManager.getChapter(offlineChapterId);
          
          if (offlineChapter && offlineChapter.pages && offlineChapter.pages.length > 0) {
            console.log('✅ Capitolo trovato offline!');
            
            // getChapter già restituisce blob URLs pronti!
            chapterData = {
              pages: offlineChapter.pages, // Già blob URLs
              title: offlineChapter.chapterTitle,
              url: chapterUrl
            };
            
            console.log(`✅ Capitolo offline caricato: ${chapterData.pages.length} pagine con blob URLs`);
            
            // Prova a recuperare anche i dati del manga da cache locale
            const cachedManga = localStorage.getItem(`manga_${mangaUrl}`);
            if (cachedManga) {
              try {
                mangaData = JSON.parse(cachedManga);
                console.log('✅ Manga caricato da cache');
              } catch (e) {
                console.log('Cache manga non valida');
              }
            }
            
            // Se non c'è cache manga ma abbiamo il capitolo, crea un manga fittizio
            if (!mangaData) {
              console.log('⚠️ Manga non in cache, creo dati minimi per lettura offline');
              
              // Prova a recuperare altri capitoli dello stesso manga da offline storage
              let offlineChapters = [];
              try {
                const allOffline = await offlineManager.getByManga(mangaUrl);
                offlineChapters = allOffline.map(ch => ({
                  url: ch.chapterUrl,
                  title: ch.chapterTitle,
                  isOffline: true
                })).sort((a, b) => {
                  // Ordina per numero capitolo se possibile
                  const numA = parseInt(a.title.match(/\d+/)?.[0] || '0');
                  const numB = parseInt(b.title.match(/\d+/)?.[0] || '0');
                  return numA - numB;
                });
              } catch (err) {
                console.log('Impossibile recuperare capitoli offline');
              }
              
              mangaData = {
                url: mangaUrl,
                title: offlineChapter.mangaTitle || 'Manga Offline',
                cover: offlineChapter.mangaCover || '',
                chapters: offlineChapters.length > 0 ? offlineChapters : [{ 
                  url: chapterUrl, 
                  title: offlineChapter.chapterTitle || 'Capitolo',
                  isOffline: true
                }]
              };
              
              console.log(`✅ Creato manga fittizio con ${mangaData.chapters.length} capitoli offline`);
            }
            
            fromOffline = true;
            setIsOfflineMode(true);
            
            // Mostra badge offline
            toast({
              title: '📥 Modalità Offline',
              description: `Caricato: ${chapterData.pages.length} pagine`,
              status: 'info',
              duration: 2000,
              position: 'top'
            });
          }
        } catch (offlineError) {
          console.log('Offline storage non disponibile o capitolo non scaricato:', offlineError.message);
          setIsOfflineMode(false);
        }

        // ========== TENTATIVO 2: CARICA DALLA RETE ==========
        if (!chapterData) {
          // Controlla se siamo online
          if (!navigator.onLine) {
            throw new Error('⚠️ Offline: Capitolo non disponibile offline. Scaricalo quando torni online.');
          }
          
          try {
            console.log('Caricamento dalla rete...');
            [mangaData, chapterData] = await Promise.all([
              apiManager.getMangaDetails(mangaUrl, source).catch(err => {
                console.error('Errore caricamento manga:', err);
                return null;
              }),
              apiManager.getChapter(chapterUrl, source).catch(err => {
                console.error('Errore caricamento capitolo:', err);
                return null;
              })
            ]);
            
            // Cache manga per uso offline futuro
            if (mangaData) {
              try {
                localStorage.setItem(`manga_${mangaUrl}`, JSON.stringify(mangaData));
              } catch (e) {
                console.log('Impossibile cachare manga');
              }
            }
          } catch (err) {
            console.error('Errore Promise.all:', err);
            throw new Error('Impossibile contattare il server. Sei offline?');
          }
        }
        
        if (!isMounted) return;
        
        // VALIDAZIONI ROBUSTE
        if (!mangaData) {
          throw new Error('Manga non trovato. Il link potrebbe essere scaduto.');
        }
        
        if (!chapterData) {
          throw new Error('Capitolo non trovato. Potrebbe essere stato rimosso.');
        }
        
        if (!chapterData.pages || !Array.isArray(chapterData.pages)) {
          console.error('Formato pages non valido:', chapterData);
          throw new Error('Formato capitolo non valido');
        }
        
        if (chapterData.pages.length === 0) {
          throw new Error('Capitolo vuoto. Il sito potrebbe aver cambiato struttura.');
        }
        
        // VALIDAZIONE URL IMMAGINI (accetta http e blob URLs)
        const validPages = chapterData.pages.filter(url => {
          if (!url || typeof url !== 'string') return false;
          // Accetta sia http che blob URLs (per capitoli offline)
          if (!url.startsWith('http') && !url.startsWith('blob:')) return false;
          return true;
        });
        
        if (validPages.length === 0) {
          console.error('Nessuna immagine valida trovata:', chapterData.pages);
          throw new Error('Nessuna immagine valida nel capitolo');
        }
        
        if (validPages.length < chapterData.pages.length) {
          console.warn(`Trovate solo ${validPages.length}/${chapterData.pages.length} immagini valide`);
          chapterData.pages = validPages;
        }
        
        const isBlobUrl = validPages[0]?.startsWith('blob:');
        console.log(`✅ Caricato: ${chapterData.pages.length} pagine ${isBlobUrl ? '(offline - blob URLs)' : '(online)'}`);

        
        // SALVA DATI
        setManga(mangaData);
        setChapter(chapterData);
        
        // RIPRISTINA PROGRESSO
        try {
          const progress = JSON.parse(localStorage.getItem('readingProgress') || '{}');
          const mangaProgress = progress[mangaData.url];
          if (mangaProgress && mangaProgress.chapterId === chapterUrl) {
            const savedPage = mangaProgress.page || 0;
            if (savedPage >= 0 && savedPage < chapterData.pages.length) {
              setCurrentPage(savedPage);
            }
          }
        } catch (err) {
          console.error('Errore ripristino progresso:', err);
        }
        
      } catch (error) {
        if (!isMounted) return;
        
        console.error('Errore caricamento:', error);
        
        // RETRY AUTOMATICO
        if (retryCount < MAX_RETRIES && error.message.includes('server')) {
          retryCount++;
          console.log(`Retry ${retryCount}/${MAX_RETRIES}...`);
          setTimeout(() => {
            if (isMounted) loadData();
          }, 2000 * retryCount);
          return;
        }
        
        // MOSTRA ERRORE ALL'UTENTE
        toast({
          title: 'Errore',
          description: error.message || 'Impossibile caricare il capitolo',
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
        
        // REDIRECT DOPO ERRORE
        setTimeout(() => {
          if (isMounted && mangaId && source) {
            navigate(`/manga/${encodeSource(source)}/${mangaId}`);
          } else {
            navigate('/home');
          }
        }, 3000);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (source && mangaId && chapterId) {
      loadData();
    } else {
      navigate('/home');
    }
    
    return () => {
      isMounted = false;
    };
  }, [source, mangaId, chapterId, navigate, toast]);

  // ✅ FIX dipendenze useEffect
  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const hideControls = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    if (showControls) {
      hideControls();
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, currentPage]);

  // Preload immagini successive
  useEffect(() => {
    if (!chapter?.pages || readingMode === 'webtoon') return;
    
    const preloadCount = 3;
    for (let i = 1; i <= preloadCount; i++) {
      const nextPage = currentPage + i;
      if (nextPage < totalPages && chapter.pages[nextPage]) {
        const imgUrl = chapter.pages[nextPage];
        if (!preloadedImages.current.has(imgUrl)) {
          const imgElement = document.createElement('img');
          imgElement.src = imgUrl;
          preloadedImages.current.add(imgUrl);
        }
      }
    }
  }, [currentPage, totalPages, chapter, readingMode]);

  // Auto-scroll per modalità webtoon
  useEffect(() => {
    if (readingMode !== 'webtoon' || !autoScroll || !webtoonScrollRef.current) {
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
        autoScrollInterval.current = null;
      }
      return;
    }
    
    const scrollContainer = webtoonScrollRef.current;
    const pixelsPerSecond = scrollSpeed * 50; // 1=50px/s, 2=100px/s, etc
    
    autoScrollInterval.current = setInterval(() => {
      if (scrollContainer) {
        scrollContainer.scrollTop += pixelsPerSecond / 60; // 60fps
        
        // Check se siamo alla fine
        const isAtBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop <= scrollContainer.clientHeight + 100;
        if (isAtBottom && autoNextChapter) {
          setAutoScroll(false);
          setTimeout(() => {
            navigateChapter(1);
          }, 1000);
        }
      }
    }, 1000 / 60); // 60fps
    
    return () => {
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
        autoScrollInterval.current = null;
      }
    };
  }, [autoScroll, readingMode, scrollSpeed, autoNextChapter, navigateChapter]);

  // Salva progresso con debounce
  useEffect(() => {
    if (!manga || !chapter) return;
    
    const timeout = setTimeout(() => {
      try {
        saveProgress();
      } catch (error) {
        console.error('Error saving progress:', error);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [currentPage, chapterIndex, manga, chapter, saveProgress]);

  // ========== RENDER ==========
  
  // ✅ CRITICAL: Mostra loading fino a quando non abbiamo TUTTI i dati necessari
  if (loading || !manga || !chapter) {
    return (
      <Box h="100vh" bg="black" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={6}>
          <Spinner 
            size="xl" 
            color="purple.500" 
            thickness="4px"
            speed="0.65s"
          />
          <VStack spacing={2}>
            <Text color="white" fontSize="lg" fontWeight="bold">Caricamento capitolo...</Text>
            <Text color="gray.400" fontSize="sm">{manga?.title || 'Attendere...'}</Text>
            {chapterIndex >= 0 && (
              <Badge colorScheme="purple">
                Capitolo {chapterIndex + 1}
              </Badge>
            )}
          </VStack>
        </VStack>
      </Box>
    );
  }

  // ✅ VALIDAZIONE: Controlla che ci siano pagine
  if (!chapter.pages || !Array.isArray(chapter.pages) || chapter.pages.length === 0) {
      return (
      <Box h="100vh" bg="black" display="flex" alignItems="center" justifyContent="center">
          <VStack spacing={4}>
          <Text color="white" fontSize="lg">Capitolo non trovato o vuoto</Text>
          <Button onClick={() => navigate(`/manga/${source}/${mangaId}`)}>
              Torna al manga
            </Button>
          </VStack>
        </Box>
      );
    }

    return (
      <Box
      h="100vh" 
        bg="black"
        position="relative"
      ref={containerRef}
      onMouseMove={() => setShowControls(true)}
      onClick={handlePageClick}
        cursor="pointer"
        overflow="hidden"
    >
      {/* Top Controls */}
      {showControls && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bg="blackAlpha.900"
          p={2}
          zIndex={10}
          transition="opacity 0.3s"
          backdropFilter="blur(10px)"
        >
          <HStack justify="space-between">
            <HStack spacing={1}>
              <IconButton
                icon={<FaChevronLeft />}
                onClick={(e) => { e.stopPropagation(); navigateChapter(-1); }}
                aria-label="Capitolo precedente"
                variant="ghost"
                color="white"
                size="sm"
              />
              <VStack spacing={0} px={2}>
                <Text color="white" fontSize="xs" fontWeight="bold">
                  Cap. {chapterIndex + 1} / {manga.chapters?.length}
                </Text>
                {readingMode !== 'webtoon' && (
                  <Text color="gray.400" fontSize="xs">
                    Pag. {currentPage + 1} / {totalPages}
                  </Text>
                )}
              </VStack>
              <IconButton
                icon={<FaChevronRight />}
                onClick={(e) => { e.stopPropagation(); navigateChapter(1); }}
                aria-label="Capitolo successivo"
                variant="ghost"
                color="white"
                size="sm"
              />
              {readingMode === 'webtoon' && (
                <IconButton
                  icon={autoScroll ? <FaPause /> : <FaPlay />}
                  onClick={(e) => { e.stopPropagation(); setAutoScroll(!autoScroll); }}
                  aria-label={autoScroll ? "Pausa auto-scroll" : "Avvia auto-scroll"}
                  variant={autoScroll ? "solid" : "ghost"}
                  colorScheme={autoScroll ? "green" : "gray"}
                  color="white"
                  size="sm"
                />
              )}
            </HStack>

            <HStack>
          <IconButton
            icon={isBookmarked ? <FaBookmark /> : <FaRegBookmark />}
            onClick={(e) => { e.stopPropagation(); toggleBookmark(); }}
            aria-label="Segnalibro"
            variant="ghost"
            color={isBookmarked ? "yellow.400" : "white"}
            size="sm"
          />
          <IconButton
            icon={hasNote ? <FaStickyNote /> : <FaRegStickyNote />}
            onClick={(e) => { e.stopPropagation(); setShowNoteModal(true); }}
            aria-label="Note"
            variant="ghost"
            color={hasNote ? "green.400" : "white"}
            size="sm"
          />
          <IconButton
            icon={<FaCog />}
            onClick={(e) => { e.stopPropagation(); setSettingsOpen(true); }}
            aria-label="Impostazioni"
                variant="ghost"
            color="white"
                size="sm"
          />
          <IconButton
            icon={isFullscreen ? <MdFullscreenExit /> : <MdFullscreen />}
            onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
            aria-label="Schermo intero"
            variant="ghost"
            color="white"
            size="sm"
            display={{ base: 'none', md: 'flex' }}
          />
          <IconButton
            icon={<FaTimes />}
            onClick={(e) => {
              e.stopPropagation();
              saveProgress();
              navigate(`/manga/${encodeSource(source)}/${mangaId}`);
            }}
            aria-label="Chiudi"
            variant="solid"
            colorScheme="red"
            color="white"
            size="sm"
            _hover={{ bg: 'red.600' }}
          />
        </HStack>
      </HStack>
        </Box>
      )}

      {/* Progress Bar con dettagli */}
      {showControls && (
        <Box
          position="absolute"
          top="50px"
          left={0}
          right={0}
          bg="blackAlpha.900"
          p={3}
          zIndex={10}
          backdropFilter="blur(10px)"
        >
          <VStack spacing={2}>
            <HStack w="100%" justify="space-between" px={2}>
              <Text fontSize="xs" color="gray.400">
                Progresso capitolo
              </Text>
              <Text fontSize="xs" color="white" fontWeight="bold">
                {currentPage + 1} / {totalPages} pagine ({Math.round(progressPercentage)}%)
              </Text>
            </HStack>
            <Progress
              value={progressPercentage}
              colorScheme="purple"
              size="sm"
              borderRadius="full"
              w="100%"
              hasStripe
              isAnimated
            />
          </VStack>
        </Box>
      )}

      {/* Main Content */}
      {readingMode === 'webtoon' ? (
        // Modalità Verticale/Webtoon - scroll continuo
        <Box
          ref={webtoonScrollRef}
          h="100%"
          overflowY="auto"
          pt={showControls ? "60px" : "20px"}
          pb="80px"
          onScroll={(e) => {
            // Traccia quale pagina è visibile durante lo scroll
            const container = e.target;
            const scrollTop = container.scrollTop;
            const images = container.querySelectorAll('.css-1p64fpw');
            
            images.forEach((img, index) => {
              const rect = img.getBoundingClientRect();
              const containerRect = container.getBoundingClientRect();
              
              // Considera visibile se almeno metà dell'immagine è nella viewport
              if (rect.top < containerRect.height / 2 && rect.bottom > containerRect.height / 2) {
                if (currentPage !== index) {
                  setCurrentPage(index);
                }
              }
            });
          }}
          css={{
            '&::-webkit-scrollbar': { width: '10px' },
            '&::-webkit-scrollbar-track': { background: '#1a202c' },
            '&::-webkit-scrollbar-thumb': { 
              background: 'var(--chakra-colors-purple-500)', 
              borderRadius: '5px',
              border: '2px solid #1a202c'
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'var(--chakra-colors-purple-400)'
            }
          }}
        >
          <VStack spacing={0} align="center">
            {chapter?.pages?.map((page, i) => (
              <Box 
                key={i} 
                w="100%" 
                maxW="900px"
                position="relative"
                className="css-1p64fpw"
              >
                {/* Indicatore numero pagina */}
                <Box
                  position="absolute"
                  top={4}
                  left={4}
                  bg="blackAlpha.700"
                  color="white"
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontSize="xs"
                  fontWeight="bold"
                  zIndex={1}
                >
                  {i + 1} / {totalPages}
                </Box>
                <ProxiedImage
                  src={page}
                  alt={`Pagina ${i + 1}`}
                  w="100%"
                  style={{
                    filter: `brightness(${brightness}%)`,
                  }}
                />
              </Box>
            ))}
          </VStack>
          
          {/* Bottoni navigazione capitoli fissi in basso per webtoon */}
          <HStack
            position="fixed"
            bottom={4}
            left="50%"
            transform="translateX(-50%)"
            spacing={2}
            bg="blackAlpha.900"
            p={2}
            borderRadius="full"
            border="1px solid"
            borderColor="whiteAlpha.300"
            boxShadow="xl"
            backdropFilter="blur(10px)"
            zIndex={5}
          >
            <IconButton
              icon={<FaChevronLeft />}
              onClick={(e) => { e.stopPropagation(); navigateChapter(-1); }}
              aria-label="Capitolo precedente"
              variant="ghost"
              colorScheme="purple"
              color="white"
              size="sm"
              isDisabled={chapterIndex === 0}
            />
            <VStack spacing={0} px={3}>
              <Text color="white" fontSize="xs" fontWeight="bold">
                Capitolo {chapterIndex + 1}
              </Text>
              <Text color="gray.400" fontSize="xs">
                di {manga.chapters?.length}
              </Text>
            </VStack>
            <IconButton
              icon={<FaChevronRight />}
              onClick={(e) => { e.stopPropagation(); navigateChapter(1); }}
              aria-label="Capitolo successivo"
              variant="ghost"
              colorScheme="purple"
              color="white"
              size="sm"
              isDisabled={chapterIndex >= (manga.chapters?.length || 0) - 1}
            />
          </HStack>
        </Box>
      ) : (
        // Modalità Pagina Singola/Doppia
        <Box
          h="100%"
          display="flex"
          alignItems="center"
          justifyContent="center"
          pt={showControls ? "100px" : 0}
          gap={4}
          position="relative"
          overflow="hidden"
        >
          {currentImages.map((img) => (
            <Box
              key={img.index}
              flex={readingMode === 'double' ? '1' : 'none'}
              maxW={readingMode === 'double' ? '50%' : '90vw'}
              maxH="calc(100vh - 140px)"
              display="flex"
              alignItems="center"
              justifyContent="center"
              position="relative"
            >
              {img.url ? (
                <Box
                  maxW="100%"
                  maxH="100%"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Image
                    src={img.url.includes(atob('Y2RuLm1hbmdhd29ybGQ=')) 
                      ? `${config.PROXY_URL}/api/image-proxy?url=${encodeURIComponent(img.url)}`
                      : img.url
                    }
                    alt={`Pagina ${img.index + 1}`}
                    maxH="calc(100vh - 140px)"
                    maxW="100%"
                    objectFit="contain"
                    style={{
                      transform: `scale(${imageScale / 100})`,
                      filter: `brightness(${brightness}%)`,
                    }}
                    loading="lazy"
                  />
                </Box>
              ) : (
                <Spinner size="xl" color="purple.500" />
              )}
            </Box>
          ))}
          
          {/* Freccia Sinistra */}
          {currentPage > 0 && (
            <IconButton
              icon={<FaChevronLeft size={30} />}
              position="absolute"
              left={4}
              top="50%"
              transform="translateY(-50%)"
              bg="blackAlpha.600"
              color="white"
              size="lg"
              borderRadius="full"
              opacity={showControls ? 0.8 : 0}
              transition="opacity 0.3s"
              _hover={{ opacity: 1, bg: 'blackAlpha.800' }}
              onClick={(e) => {
                e.stopPropagation();
                changePage(-pagesToShow);
              }}
              aria-label="Pagina precedente"
              zIndex={5}
            />
          )}
          
          {/* Freccia Destra */}
          {currentPage < totalPages - 1 && (
            <IconButton
              icon={<FaChevronRight size={30} />}
              position="absolute"
              right={4}
              top="50%"
              transform="translateY(-50%)"
              bg="blackAlpha.600"
              color="white"
              size="lg"
              borderRadius="full"
              opacity={showControls ? 0.8 : 0}
              transition="opacity 0.3s"
              _hover={{ opacity: 1, bg: 'blackAlpha.800' }}
              onClick={(e) => {
                e.stopPropagation();
                changePage(pagesToShow);
              }}
              aria-label="Pagina successiva"
              zIndex={5}
            />
          )}
          
          {/* Indicatore Pagina */}
          <Box
            position="absolute"
            bottom={4}
            left="50%"
            transform="translateX(-50%)"
            bg="blackAlpha.800"
            color="white"
            px={4}
            py={2}
            borderRadius="full"
            fontSize="sm"
            fontWeight="bold"
            border="1px solid"
            borderColor="whiteAlpha.300"
            boxShadow="lg"
            zIndex={5}
          >
            {currentPage + 1} / {totalPages}
          </Box>
        </Box>
      )}

      {/* Settings Drawer - COMPLETO */}
      <Drawer
        isOpen={settingsOpen}
        placement="right"
        onClose={() => setSettingsOpen(false)}
        size="sm"
      >
        <DrawerOverlay />
        <DrawerContent bg="gray.900" color="white">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" borderColor="gray.700">
            <HStack spacing={2}>
              <FaCog />
              <Heading size="md">Impostazioni Lettura</Heading>
            </HStack>
          </DrawerHeader>
          <DrawerBody py={6}>
            <VStack spacing={6} align="stretch">
              
              {/* Modalità Lettura */}
              <FormControl>
                <FormLabel fontWeight="bold" mb={3}>📖 Modalità di lettura</FormLabel>
                <Select
                  value={readingMode}
                  onChange={(e) => setReadingMode(e.target.value)}
                  bg="gray.800"
                  border="1px solid"
                  borderColor="gray.700"
                  _hover={{ borderColor: 'purple.500' }}
                  _focus={{ borderColor: 'purple.400', bg: 'gray.700' }}
                >
                  <option value="single">Pagina Singola</option>
                  <option value="double">Doppia Pagina</option>
                  <option value="webtoon">Verticale (Webtoon)</option>
                </Select>
                <Text fontSize="xs" color="gray.400" mt={2}>
                  {readingMode === 'webtoon' 
                    ? 'Scroll continuo verticale' 
                    : readingMode === 'double'
                    ? 'Visualizza 2 pagine affiancate'
                    : 'Una pagina per volta'}
                </Text>
              </FormControl>

              <Divider />

              {/* Scala Immagine */}
              {readingMode !== 'webtoon' && (
                <FormControl>
                  <FormLabel fontWeight="bold">🔍 Zoom: {imageScale}%</FormLabel>
                  <Slider
                    value={imageScale}
                    onChange={setImageScale}
                    min={50}
                    max={300}
                    step={10}
                    colorScheme="purple"
                  >
                    <SliderTrack bg="gray.700">
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb boxSize={6}>
                      <Box color="purple.500" />
                    </SliderThumb>
                  </Slider>
                  <HStack justify="space-between" mt={1}>
                    <Text fontSize="xs" color="gray.500">50%</Text>
                    <Text fontSize="xs" color="gray.500">300%</Text>
                  </HStack>
                </FormControl>
              )}

              {/* Luminosità */}
              <FormControl>
                <FormLabel fontWeight="bold">💡 Luminosità: {brightness}%</FormLabel>
                <Slider
                  value={brightness}
                  onChange={setBrightness}
                  min={50}
                  max={150}
                  step={5}
                  colorScheme="orange"
                >
                  <SliderTrack bg="gray.700">
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb boxSize={6}>
                    <Box color="orange.500" />
                  </SliderThumb>
                </Slider>
                <HStack justify="space-between" mt={1}>
                  <Text fontSize="xs" color="gray.500">50%</Text>
                  <Text fontSize="xs" color="gray.500">150%</Text>
                </HStack>
              </FormControl>

              <Divider />

              {/* Auto Next Chapter */}
              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel htmlFor="auto-next" mb={0} fontWeight="bold">
                  ⏭️ Capitolo automatico
                </FormLabel>
                <Switch
                  id="auto-next"
                  colorScheme="purple"
                  isChecked={autoNextChapter}
                  onChange={(e) => setAutoNextChapter(e.target.checked)}
                />
              </FormControl>
              <Text fontSize="xs" color="gray.400" mt={-3}>
                Passa automaticamente al capitolo successivo alla fine
              </Text>

              {/* Auto Scroll per Webtoon */}
              {readingMode === 'webtoon' && (
                <>
                  <Divider />
                  <FormControl display="flex" alignItems="center" justifyContent="space-between">
                    <FormLabel htmlFor="auto-scroll" mb={0} fontWeight="bold">
                      📜 Auto-scroll
                    </FormLabel>
                    <Switch
                      id="auto-scroll"
                      colorScheme="green"
                      isChecked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                    />
                  </FormControl>
                  <Text fontSize="xs" color="gray.400" mt={-3}>
                    Scroll automatico in modalità verticale
                  </Text>

                  {autoScroll && (
                    <FormControl>
                      <FormLabel fontWeight="bold">🚀 Velocità scroll: {scrollSpeed}</FormLabel>
                      <Slider
                        value={scrollSpeed}
                        onChange={setScrollSpeed}
                        min={1}
                        max={10}
                        step={1}
                        colorScheme="green"
                      >
                        <SliderTrack bg="gray.700">
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb boxSize={6}>
                          <Box color="green.500" />
                        </SliderThumb>
                      </Slider>
                      <HStack justify="space-between" mt={1}>
                        <Text fontSize="xs" color="gray.500">Lento</Text>
                        <Text fontSize="xs" color="gray.500">Veloce</Text>
                      </HStack>
                    </FormControl>
                  )}
                </>
              )}

              <Divider />

              {/* Info Capitolo */}
              <Box bg="gray.800" p={4} borderRadius="lg" border="1px solid" borderColor="gray.700">
                <VStack align="stretch" spacing={2}>
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.400">Manga:</Text>
                    <Text fontSize="sm" fontWeight="bold" noOfLines={1}>{manga?.title}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.400">Capitolo:</Text>
                    <Badge colorScheme="purple">{chapterIndex + 1} / {manga?.chapters?.length}</Badge>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.400">Pagina:</Text>
                    <Badge colorScheme="blue">{currentPage + 1} / {totalPages}</Badge>
                  </HStack>
                  <Progress 
                    value={progressPercentage} 
                    colorScheme="purple" 
                    size="sm" 
                    borderRadius="full" 
                    mt={2}
                  />
                </VStack>
              </Box>

              <Divider />

              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  saveProgress();
                  navigate(`/manga/${encodeSource(source)}/${mangaId}`);
                }}
                colorScheme="purple"
                size="lg"
                leftIcon={<FaBook />}
              >
                Torna al manga
              </Button>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Modal Note */}
      <Modal isOpen={showNoteModal} onClose={() => setShowNoteModal(false)} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent bg="gray.800" color="white">
          <ModalHeader>
            <HStack>
              <FaStickyNote color="var(--chakra-colors-green-400)" />
              <Text>Nota - Pagina {currentPage + 1}</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color="gray.400">
                {manga?.title} - {chapter?.title || `Capitolo ${chapterIndex + 1}`}
              </Text>
              <Textarea
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                placeholder="Scrivi una nota per questa pagina..."
                rows={6}
                bg="gray.700"
                border="1px solid"
                borderColor="gray.600"
                _focus={{ borderColor: 'green.400', outline: 'none' }}
                fontSize="16px"
              />
              <Text fontSize="xs" color="gray.500">
                {currentNote.length}/500 caratteri
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            {hasNote && (
              <Button
                colorScheme="red"
                variant="ghost"
                mr="auto"
                onClick={removeNote}
              >
                Elimina nota
              </Button>
            )}
            <Button variant="ghost" mr={3} onClick={() => setShowNoteModal(false)}>
              Annulla
            </Button>
            <Button
              colorScheme="green"
              onClick={saveNote}
              isDisabled={!currentNote.trim()}
            >
              Salva
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default ReaderPage;