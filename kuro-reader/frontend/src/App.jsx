import React, { useEffect, lazy, Suspense } from 'react';
import { ChakraProvider, Box, Spinner, Center } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { theme } from './styles/theme';

import Navigation from './components/Navigation';
import Library from './components/Library';
import ErrorBoundary from './components/ErrorBoundary';

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
const Trending = lazy(() => import('./pages/Trending'));
const Profile = lazy(() => import('./pages/Profile'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const Settings = lazy(() => import('./pages/Settings'));
const Notifications = lazy(() => import('./pages/Notifications'));
const NotFound = lazy(() => import('./pages/NotFound'));

import useAuth from './hooks/useAuth';

function LoadingScreen() {
  return (
    <Center minH="100vh" bg="gray.900">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Spinner size="xl" color="purple.500" thickness="4px" />
      </motion.div>
    </Center>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!pathname.includes('/read/')) {
      window.scrollTo(0, 0);
    }
  }, [pathname]);
  return null;
}

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

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

function AnimatedRoutes() {
  const location = useLocation();
  
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

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
    { path: '/trending', element: <Trending /> },
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
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {routes.map(({ path, element, layout = true }) => (
          <Route
            key={path}
            path={path}
            element={
              <motion.div
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                {layout ? <Layout>{element}</Layout> : element}
              </motion.div>
            }
          />
        ))}
      </Routes>
    </AnimatePresence>
  );
}

function AppContent() {
  const { initAuth, startAutoSync, user, isAuthenticated, syncToServer } = useAuth();
  const location = useLocation();

  useEffect(() => {
    initAuth();
    const cleanup = startAutoSync();

    // PWA Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(registration => {
        setInterval(() => registration.update(), 30000);
        
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              if (window.confirm('Nuovo aggiornamento disponibile! Vuoi ricaricare?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          window.location.reload();
          refreshing = true;
        }
      });
    }

    // Push Notifications
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(() => {
        Notification.requestPermission();
      }, 10000);
    }

    const cacheInterval = setInterval(() => {
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            if (name !== 'NeKuro Scan-v2') caches.delete(name);
          });
        });
      }
    }, 60000);

    return () => {
      clearInterval(cacheInterval);
      cleanup && cleanup();
    };
  }, []);

  useEffect(() => {
    let deferredPrompt;
    const handler = (e) => {
      e.preventDefault();
      deferredPrompt = e;
      setTimeout(() => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.finally(() => {
            deferredPrompt = null;
          });
        }
      }, 5000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    return () => {
      if (user && isAuthenticated) {
        try { syncToServer(); } catch {}
      }
    };
  }, [location.pathname, user, isAuthenticated, syncToServer]);

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<LoadingScreen />}>
        <AnimatedRoutes />
      </Suspense>
    </>
  );
}

function App() {
  return (
    <ChakraProvider theme={theme}>
      <Router>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </Router>
    </ChakraProvider>
  );
}

export default App;