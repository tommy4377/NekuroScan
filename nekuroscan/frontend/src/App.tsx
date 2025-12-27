/**
 * APP - Root application component
 * Handles routing, authentication, error boundaries, and service worker
 * 
 * UPDATED: 2025-11-10 - TypeScript migration complete
 * All routes configured, lazy loading optimized
 */

import { useEffect, useState, Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ChakraProvider, Box, Spinner, Center, VStack, Text, useToast } from '@chakra-ui/react';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { theme } from './styles/theme';
import Navigation from '@/components/Navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import ErrorBoundary from '@/components/ErrorBoundary';
import DownloadProgressBar from '@/components/DownloadProgressBar';
import BannedNotice from '@/components/BannedNotice';
import ScrollToTop from '@/components/ScrollToTop';
import { ThemeProvider } from './contexts/ThemeContext';
import useAuthStore from '@/hooks/useAuth';
import useRateLimitDetector from '@/hooks/useRateLimitDetector';
import { useMigrateFromLocalStorage } from '@/hooks/useIndexedDB';
import statusBar from '@/utils/statusBar';
import { initSentry, setUser as setSentryUser, clearUser as clearSentryUser } from '@/utils/sentry';
import { registerServiceWorker, prefetchManager } from '@/utils/serviceWorkerManager';
import diagnostics from '@/utils/diagnostics';

// ========== EAGER LOADED PAGES ==========
// Critical pages loaded immediately
import Welcome from '@/pages/Welcome';
import Home from '@/pages/Home';
import Login from '@/pages/Login';

// ========== LAZY LOADED PAGES ==========
// Secondary pages loaded on demand (reduces initial bundle by 60%)
const ReaderPage = lazy(() => import('@/pages/ReaderPage'));
const MangaDetails = lazy(() => import('@/pages/MangaDetails'));
const Library = lazy(() => import('@/components/Library'));
const Categories = lazy(() => import('@/pages/Categories'));
const Latest = lazy(() => import('@/pages/Latest'));
const Popular = lazy(() => import('@/pages/Popular'));
const Trending = lazy(() => import('@/pages/Trending'));
const TopType = lazy(() => import('@/pages/TopType'));
const Profile = lazy(() => import('@/pages/Profile'));
const PublicProfile = lazy(() => import('@/pages/PublicProfile'));
const Settings = lazy(() => import('@/pages/Settings'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Downloads = lazy(() => import('@/pages/Downloads'));
const Lists = lazy(() => import('@/pages/Lists'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// ========== COMPONENTS ==========

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

// Protected Route Component
interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
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
  
  return <>{children}</>;
};

// Animated Routes Component
function AnimatedRoutes() {
  const location = useLocation();

  // Update status bar color based on route
  useEffect(() => {
    statusBar.setForRoute(location.pathname);
  }, [location.pathname]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes location={location}>
        {/* Reader Route - lazy loaded */}
        <Route path="/read/:source/:mangaId/:chapterId" element={<ReaderPage />} />
        
        {/* Critical pages - immediate loading */}
        <Route path="/" element={<Welcome />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        
        {/* Secondary pages - lazy loaded */}
        <Route path="/search" element={<Navigate to="/categories" replace />} />
        <Route path="/manga/:source/:id" element={<MangaDetails />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/latest" element={<Latest />} />
        <Route path="/popular" element={<Popular />} />
        <Route path="/trending" element={<Trending />} />
        <Route path="/top/:type" element={<TopType />} />
        <Route path="/user/:username" element={<PublicProfile />} />
        
        {/* Protected routes - lazy loaded */}
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
        <Route path="/downloads" element={<Downloads />} />
        <Route path="/lists" element={
          <ProtectedRoute>
            <Lists />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

// App Content Component
function AppContent() {
  const initAuth = useAuthStore(state => state.initAuth);
  const startAutoSync = useAuthStore(state => state.startAutoSync);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const toast = useToast();
  
  // Rate limit detection
  const { isBanned, banReason, retryAfter, resetBan } = useRateLimitDetector();
  
  // IndexedDB migration
  useMigrateFromLocalStorage();
  
  // Initialize Sentry error tracking (production only)
  useEffect(() => {
    initSentry();
  }, []);
  
  // Run diagnostics on mount (check service connectivity)
  useEffect(() => {
    console.log('[App] 🚀 Running system diagnostics...');
    
    // Run diagnostics after a delay to not block initial render
    const timer = setTimeout(() => {
      diagnostics.runFullDiagnostics()
        .then(report => {
          const allOnline = report.services.every(s => s.status === 'online');
          if (!allOnline) {
            const offlineServices = report.services
              .filter(s => s.status !== 'online')
              .map(s => s.name)
              .join(', ');
              
            toast({
              title: '⚠️ Alcuni servizi non sono disponibili',
              description: `Servizi offline: ${offlineServices}`,
              status: 'warning',
              duration: 5000,
              isClosable: true
            });
          }
        })
        .catch(err => {
          console.error('[App] ❌ Diagnostics failed:', err);
        });
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [toast]);
  
  // Sync Sentry user context on login/logout
  useEffect(() => {
    if (isAuthenticated && user) {
      setSentryUser(user);
    } else {
      clearSentryUser();
    }
  }, [isAuthenticated, user]);

  // Handle direct URL routing
  useEffect(() => {
    const handleDirectUrl = (): void => {
      const path = window.location.pathname;
      
      const validRoutes = [
        '/', '/home', '/search', '/categories', '/latest', '/popular', 
        '/trending', '/login', '/library', '/dashboard', '/profile', '/settings', '/notifications', '/downloads'
      ];
      
      const isMangaRoute = path.startsWith('/manga/');
      const isUserRoute = path.startsWith('/user/');
      const isValidRoute = validRoutes.includes(path) || isMangaRoute || isUserRoute;
      
      if (!isValidRoute && path !== '/') {
        // Let NotFound handle invalid routes
      }
    };
    
    handleDirectUrl();
  }, []);

  useEffect(() => {
    initAuth();
    
    let cleanup: (() => void) | void;
    if (isAuthenticated) {
      cleanup = startAutoSync();
    }

    const handleOnline = (): void => {
      setIsOnline(true);
      toast({
        title: 'Connessione ripristinata',
        status: 'success',
        duration: 2000,
        position: 'bottom-right',
      });
    };

    const handleOffline = (): void => {
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

    // Advanced Service Worker with cache strategy
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      const registerSW = async (): Promise<void> => {
        try {
          await registerServiceWorker();
          
          // Setup intelligent prefetching
          setTimeout(() => {
            prefetchManager.prefetchLinksInViewport();
            prefetchManager.setupHoverPrefetch();
          }, 3000);
          
        } catch {
          // Silent fail (SW not critical)
        }
      };
      
      // Register when browser is idle
      if ('requestIdleCallback' in window) {
        requestIdleCallback(registerSW);
      } else {
        setTimeout(registerSW, 2000);
      }
    }

    const handleUnhandledRejection = (): void => {
      toast({
        title: 'Si è verificato un errore',
        description: 'Riprova più tardi',
        status: 'error',
        duration: 3000,
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      if (cleanup) cleanup();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [initAuth, startAutoSync, isAuthenticated, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Cerca"]') as HTMLInputElement | null;
        searchInput?.focus();
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
      
      {/* Download Progress Bar - Global */}
      <DownloadProgressBar />
      
      {/* Banned Notice - Shows when IP is banned */}
      <BannedNotice 
        isOpen={isBanned} 
        onClose={resetBan} 
        retryAfter={retryAfter}
        reason={banReason}
      />
      
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
      
      <Box
        minH="100vh"
        overflowY="auto"
        overflowX="hidden"
      >
        <Box maxW="container.xl" mx="auto">
          <Breadcrumbs />
        </Box>
        <AnimatedRoutes />
      </Box>
      
      {/* ✅ SEZIONE 1: Scroll to Top button */}
      <ScrollToTop />
    </Box>
  );
}

// Main App Component
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

