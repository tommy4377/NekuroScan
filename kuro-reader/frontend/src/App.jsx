import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ChakraProvider, Box, Spinner, Center, VStack, Text, useToast, Button } from '@chakra-ui/react';
// import { AnimatePresence, motion } from 'framer-motion'; // Rimosso per evitare errori React #300
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { theme } from './styles/theme';
import Navigation from './components/Navigation';
import Breadcrumbs from './components/Breadcrumbs';
import FloatingActionButton from './components/FloatingActionButton';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import useAuthStore from './hooks/useAuth';
import statusBar from './utils/statusBar';

// ✅ FIX React #300: Tutti i componenti caricati DIRETTAMENTE senza lazy/Suspense
import ReaderPage from './pages/ReaderPage';
import Welcome from './pages/Welcome';
import Home from './pages/Home';
import Search from './pages/Search';
import MangaDetails from './pages/MangaDetails';
import Library from './components/Library';
import Categories from './pages/Categories';
import Latest from './pages/Latest';
import Popular from './pages/Popular';
import Trending from './pages/Trending';
import TopType from './pages/TopType';
import Login from './pages/Login';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import Dashboard from './pages/Dashboard';
import Downloads from './pages/Downloads';
import Lists from './pages/Lists';
import NotFound from './pages/NotFound';

const PageLoader = () => (
  <Center h="100vh" bg="gray.900">
    <VStack spacing={4}>
      <Spinner 
        size="xl" 
        color="purple.500" 
        thickness="4px"
        speed="0.65s"
        emptyColor="gray.700"
      />
      <Text color="gray.400" fontSize="sm">Caricamento...</Text>
    </VStack>
  </Center>
);

// Protected Route
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const loading = useAuthStore(state => state.loading);
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
    }
  }, [isAuthenticated, loading, toast]);
  
  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  return children;
};

// ✅ ROUTES UNIFICATE CON GESTIONE READER - FIX React #300
function AnimatedRoutes() {
  const location = useLocation();

  // Aggiorna colore status bar in base alla route
  useEffect(() => {
    statusBar.setForRoute(location.pathname);
  }, [location.pathname]);

  return (
    <Routes location={location}>
        {/* Reader Route - caricato direttamente */}
        <Route path="/read/:source/:mangaId/:chapterId" element={<ReaderPage />} />
        
        {/* Altre pagine */}
        <Route path="/" element={<Welcome />} />
        <Route path="/home" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/manga/:source/:id" element={<MangaDetails />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/latest" element={<Latest />} />
        <Route path="/popular" element={<Popular />} />
        <Route path="/trending" element={<Trending />} />
        <Route path="/top/:type" element={<TopType />} />
        <Route path="/login" element={<Login />} />
        <Route path="/user/:username" element={<PublicProfile />} />
        
        <Route path="/library" element={
          <ProtectedRoute>
            <Library />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        } />
        <Route path="/downloads" element={
          <ProtectedRoute>
            <Downloads />
          </ProtectedRoute>
        } />
        <Route path="/lists" element={
          <ProtectedRoute>
            <Lists />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
  );
}

function AppContent() {
  const initAuth = useAuthStore(state => state.initAuth);
  const startAutoSync = useAuthStore(state => state.startAutoSync);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const toast = useToast();

  // Gestione routing per URL diretti
  useEffect(() => {
    const handleDirectUrl = () => {
      const path = window.location.pathname;
      console.log('🔍 Current path:', path);
      
      // Se siamo su una route valida, non fare nulla
      const validRoutes = [
        '/', '/home', '/search', '/categories', '/latest', '/popular', 
        '/trending', '/login', '/library', '/dashboard', '/profile', '/settings', '/notifications', '/downloads'
      ];
      
      const isMangaRoute = path.startsWith('/manga/');
      const isUserRoute = path.startsWith('/user/');
      const isValidRoute = validRoutes.includes(path) || isMangaRoute || isUserRoute;
      
      if (!isValidRoute && path !== '/') {
        console.log('⚠️ Invalid route detected, redirecting to home');
        // Non fare redirect automatico, lascia che NotFound gestisca
      }
    };
    
    handleDirectUrl();
  }, []);

  useEffect(() => {
    initAuth();
    
    let cleanup;
    if (isAuthenticated) {
      cleanup = startAutoSync();
    }

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

    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('Service Worker registrato:', registration);
          
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
        (error) => console.error('Service Worker registrazione fallita:', error)
      );
    }

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

    const preconnectLink = document.createElement('link');
    preconnectLink.rel = 'preconnect';
    preconnectLink.href = 'https://www.mangaworld.cx';
    document.head.appendChild(preconnectLink);

    return () => {
      if (cleanup) cleanup();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [initAuth, startAutoSync, isAuthenticated, toast]);

  // Richiedi permessi notifiche all'avvio
  // Rimosso: richiesta permessi notifiche automatica (crea warning in console)

  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector('input[placeholder*="Cerca"]')?.focus();
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        window.location.href = '/library';
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <Box minH="100vh" bg="gray.900">
      <Helmet>
        <title>NeKuro Scan - Manga Reader</title>
        <meta name="description" content="Leggi manga e light novel gratuitamente" />
        <meta name="theme-color" content="#805AD5" />
        <link rel="manifest" href="/manifest.json" />
      </Helmet>
      
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
      
      <Box>
        <Box maxW="container.xl" mx="auto">
          <Breadcrumbs />
        </Box>
        <AnimatedRoutes />
      </Box>
      
      <FloatingActionButton user={user} />
    </Box>
  );
}

function App() {
  return (
    <HelmetProvider>
      <ChakraProvider theme={theme}>
        <ThemeProvider>
          <Router basename="/">
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </Router>
        </ThemeProvider>
      </ChakraProvider>
    </HelmetProvider>
  );
}

export default App;