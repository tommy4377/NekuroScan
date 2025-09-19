import React, { useEffect, lazy, Suspense } from 'react';
import { ChakraProvider, Box, Spinner, Center } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { theme } from './styles/theme';
import ErrorBoundary from './components/ErrorBoundary';

// Components
import Navigation from './components/Navigation';
import Library from './components/Library';

// Pages - Lazy load
const Home = lazy(() => import('./pages/Home'));
const Search = lazy(() => import('./pages/Search'));
const MangaDetails = lazy(() => import('./pages/MangaDetails'));
const ReaderPage = lazy(() => import('./pages/ReaderPage'));
const Welcome = lazy(() => import('./pages/Welcome'));
const Login = lazy(() => import('./pages/Login'));
const Categories = lazy(() => import('./pages/Categories'));
const Latest = lazy(() => import('./pages/Latest'));
const Popular = lazy(() => import('./pages/Popular'));
const TopType = lazy(() => import('./pages/TopType'));
const Profile = lazy(() => import('./pages/Profile'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const Settings = lazy(() => import('./pages/Settings'));
const Notifications = lazy(() => import('./pages/Notifications'));
const NotFound = lazy(() => import('./pages/NotFound'));

import useAuth from './hooks/useAuth';

// Loading component
function LoadingScreen() {
  return (
    <Center minH="100vh" bg="gray.900">
      <Spinner size="xl" color="purple.500" thickness="4px" />
    </Center>
  );
}

// Scroll to top component
function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    if (!pathname.includes('/read/')) {
      window.scrollTo(0, 0);
    }
  }, [pathname]);
  
  return null;
}

// Protected Route
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
}

// Layout wrapper
function Layout({ children }) {
  const location = useLocation();
  const isReaderPage = location.pathname.includes('/read/');
  
  return (
    <Box minH="100vh" bg="gray.900">
      {!isReaderPage && <Navigation />}
      <Box>{children}</Box>
    </Box>
  );
}

// Main App Component
function App() {
  const { initAuth, startAutoSync } = useAuth();
  
  useEffect(() => {
    // Initialize auth
    initAuth();
    
    // Start auto sync
    const cleanup = startAutoSync();
    
    // PWA Service Worker with auto-update
    if ('serviceWorker' in navigator) {
      let refreshing = false;
      
      navigator.serviceWorker.register('/sw.js').then(registration => {
        console.log('SW registered');
        
        // Check for updates every 30 seconds
        setInterval(() => {
          registration.update();
        }, 30000);
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New update available
              const shouldUpdate = window.confirm('Nuovo aggiornamento disponibile! Vuoi ricaricare?');
              if (shouldUpdate) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            }
          });
        });
      }).catch(err => {
        console.error('SW registration failed:', err);
      });
      
      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          window.location.reload();
          refreshing = true;
        }
      });
    }
    
    // Clear old cache periodically
    const cacheInterval = setInterval(() => {
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            if (!name.includes('kuroreader-v2')) {
              caches.delete(name);
            }
          });
        });
      }
    }, 60000); // Every minute
    
    // PWA install prompt
    let deferredPrompt;
    
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show install prompt after 5 seconds
      setTimeout(() => {
        if (deferredPrompt && !window.matchMedia('(display-mode: standalone)').matches) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then(() => {
            deferredPrompt = null;
          });
        }
      }, 5000);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Cleanup
    return () => {
      cleanup();
      clearInterval(cacheInterval);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [initAuth, startAutoSync]);

  const routes = [
    { path: '/', element: <Welcome />, layout: false },
    { path: '/login', element: <Login />, layout: false },
    { path: '/home', element: <Home /> },
    { path: '/search', element: <Search /> },
    { path: '/categories', element: <Categories /> },
    { path: '/library', element: <Library /> },
    { path: '/manga/:source/:id', element: <MangaDetails /> },
    { path: '/latest', element: <Latest /> },
    { path: '/popular', element: <Popular /> },
    { path: '/top/:type', element: <TopType /> },
    { path: '/profile', element: <ProtectedRoute><Profile /></ProtectedRoute> },
    { path: '/settings', element: <Settings /> },
    { path: '/notifications', element: <Notifications /> },
    { path: '/user/:username', element: <PublicProfile /> },
    { path: '/read/:source/:mangaId/:chapterId', element: <ReaderPage />, layout: false },
    { path: '/404', element: <NotFound /> },
    { path: '*', element: <Navigate to="/404" replace /> }
  ];

  return (
    <ChakraProvider theme={theme}>
      <ErrorBoundary>
        <Router>
          <ScrollToTop />
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              {routes.map(({ path, element, layout = true }) => (
                <Route
                  key={path}
                  path={path}
                  element={layout ? <Layout>{element}</Layout> : element}
                />
              ))}
            </Routes>
          </Suspense>
        </Router>
      </ErrorBoundary>
    </ChakraProvider>
  );
}

export default App;
