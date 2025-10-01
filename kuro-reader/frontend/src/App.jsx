import React, { useEffect, lazy, Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ChakraProvider, Box, Spinner, Center, useColorModeValue, VStack, Text, useToast, Button } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import theme from './styles/theme';
import Navigation from './components/Navigation';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import useAuth from './hooks/useAuth';

// Lazy load delle pagine
const Home = lazy(() => import('./pages/Home'));
const Search = lazy(() => import('./pages/Search'));
const MangaDetails = lazy(() => import('./pages/MangaDetails'));
const ReaderPage = lazy(() => import('./pages/ReaderPage'));
const Library = lazy(() => import('./components/Library'));
const Categories = lazy(() => import('./pages/Categories'));
const Latest = lazy(() => import('./pages/Latest'));
const Popular = lazy(() => import('./pages/Popular'));
const Trending = lazy(() => import('./pages/Trending'));
const Login = lazy(() => import('./pages/Login'));
const Profile = lazy(() => import('./pages/Profile'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Loading component con animazione
const PageLoader = () => {
  const spinnerColor = useColorModeValue('purple.500', 'purple.300');
  
  return (
    <Center h="100vh" bg="gray.900">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <VStack spacing={4}>
          <Spinner 
            size="xl" 
            color={spinnerColor} 
            thickness="4px"
            speed="0.65s"
            emptyColor="gray.700"
          />
          <Text color="gray.400" fontSize="sm">Caricamento...</Text>
        </VStack>
      </motion.div>
    </Center>
  );
};

// Protected Route Component con animazione
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      toast({
        title: 'Accesso richiesto',
        description: 'Devi effettuare il login per accedere a questa pagina',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate, toast]);
  
  if (loading) {
    return <PageLoader />;
  }
  
  return isAuthenticated ? children : null;
};

// Route con transizione animata
const AnimatedRoute = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

function AppContent() {
  const { initAuth, startAutoSync, isAuthenticated } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const toast = useToast();

  useEffect(() => {
    // Inizializza autenticazione
    initAuth();

    // Avvia auto-sync se loggato
    let cleanup;
    if (isAuthenticated) {
      cleanup = startAutoSync();
    }

    // Gestione stato online/offline
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: 'Connessione ripristinata',
        status: 'success',
        duration: 2000,
        position: 'bottom-right',
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: 'Connessione persa',
        description: 'Alcune funzionalità potrebbero non essere disponibili',
        status: 'warning',
        duration: 5000,
        position: 'bottom-right',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Registra service worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('Service Worker registrato:', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                toast({
                  title: 'Nuovo aggiornamento disponibile',
                  description: 'Ricarica la pagina per aggiornare',
                  status: 'info',
                  duration: null,
                  isClosable: true,
                  position: 'top',
                  action: (
                    <Button size="sm" onClick={() => window.location.reload()}>
                      Ricarica
                    </Button>
                  ),
                });
              }
            });
          });
        },
        (error) => {
          console.error('Service Worker registrazione fallita:', error);
        }
      );
    }

    // Gestione errori globali
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      toast({
        title: 'Si è verificato un errore',
        description: 'Riprova più tardi',
        status: 'error',
        duration: 3000,
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Preconnect to external domains
    const preconnectLink = document.createElement('link');
    preconnectLink.rel = 'preconnect';
    preconnectLink.href = 'https://www.mangaworld.cx';
    document.head.appendChild(preconnectLink);

    // Cleanup
    return () => {
      if (cleanup) cleanup();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [initAuth, startAutoSync, isAuthenticated, toast]);

  // Gestione tasti rapidi globali
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl/Cmd + K per search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector('input[placeholder*="Cerca"]')?.focus();
      }
      
      // Ctrl/Cmd + B per library
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        window.location.href = '/library';
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <Router>
      <ErrorBoundary>
        <Helmet>
          <title>NeKuro Scan - Manga Reader</title>
          <meta name="description" content="Leggi manga e light novel gratuitamente" />
          <meta name="theme-color" content="#805AD5" />
          <link rel="manifest" href="/manifest.json" />
        </Helmet>
        
        <Box minH="100vh" bg="gray.900">
          <Navigation />
          
          {!isOnline && (
            <Box
              bg="orange.600"
              color="white"
              p={2}
              textAlign="center"
              position="fixed"
              top="60px"
              left={0}
              right={0}
              zIndex={1000}
            >
              <Text fontSize="sm">Modalità offline - Contenuto limitato disponibile</Text>
            </Box>
          )}
          
          <AnimatePresence mode="wait">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={
                  <AnimatedRoute>
                    <Navigate to="/home" replace />
                  </AnimatedRoute>
                } />
                <Route path="/home" element={
                  <AnimatedRoute>
                    <Home />
                  </AnimatedRoute>
                } />
                <Route path="/search" element={
                  <AnimatedRoute>
                    <Search />
                  </AnimatedRoute>
                } />
                <Route path="/manga/:source/:id" element={
                  <AnimatedRoute>
                    <MangaDetails />
                  </AnimatedRoute>
                } />
                <Route path="/read/:source/:mangaId/:chapterId" element={
                  <ReaderPage />
                } />
                <Route path="/categories" element={
                  <AnimatedRoute>
                    <Categories />
                  </AnimatedRoute>
                } />
                <Route path="/latest" element={
                  <AnimatedRoute>
                    <Latest />
                  </AnimatedRoute>
                } />
                <Route path="/popular" element={
                  <AnimatedRoute>
                    <Popular />
                  </AnimatedRoute>
                } />
                <Route path="/trending" element={
                  <AnimatedRoute>
                    <Trending />
                  </AnimatedRoute>
                } />
                <Route path="/login" element={
                  <AnimatedRoute>
                    <Login />
                  </AnimatedRoute>
                } />
                <Route path="/user/:username" element={
                  <AnimatedRoute>
                    <PublicProfile />
                  </AnimatedRoute>
                } />
                
                {/* Protected Routes */}
                <Route path="/library" element={
                  <ProtectedRoute>
                    <AnimatedRoute>
                      <Library />
                    </AnimatedRoute>
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <AnimatedRoute>
                      <Profile />
                    </AnimatedRoute>
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <AnimatedRoute>
                      <Settings />
                    </AnimatedRoute>
                  </ProtectedRoute>
                } />
                
                {/* 404 */}
                <Route path="*" element={
                  <AnimatedRoute>
                    <NotFound />
                  </AnimatedRoute>
                } />
              </Routes>
            </Suspense>
          </AnimatePresence>
        </Box>
      </ErrorBoundary>
    </Router>
  );
}

function App() {
  return (
    <HelmetProvider>
      <ChakraProvider theme={theme}>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </ChakraProvider>
    </HelmetProvider>
  );
}

export default App;