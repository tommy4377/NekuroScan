import React, { useEffect, lazy, Suspense } from 'react';
import { ChakraProvider, Box, Spinner, Center } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { theme } from './styles/theme';

// Components
import Navigation from './components/Navigation';
import Library from './components/Library';

// Pages - Lazy load for better performance
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

// Scroll to top on route change
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

// Route configuration
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
  { path: '/settings', element: <ProtectedRoute><Settings /></ProtectedRoute> },
  { path: '/user/:username', element: <PublicProfile /> },
  { path: '/read/:source/:mangaId/:chapterId', element: <ReaderPage />, layout: false },
  { path: '/404', element: <NotFound /> },
  { path: '*', element: <Navigate to="/404" replace /> }
];

// Main App Component
function App() {
  const { initAuth, startAutoSync } = useAuth();
  
  useEffect(() => {
    // Initialize auth
    initAuth();
    
    // Start auto sync
    const cleanup = startAutoSync();
    
    // Service Worker registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
          console.log('SW registration failed:', err);
        });
      });
    }
    
    // Cleanup
    return cleanup;
  }, []);

  // PWA install prompt
  useEffect(() => {
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show install button if needed
      const installBtn = document.getElementById('install-btn');
      if (installBtn) {
        installBtn.style.display = 'block';
        installBtn.addEventListener('click', () => {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choice) => {
            deferredPrompt = null;
          });
        });
      }
    });
  }, []);

  return (
    <ChakraProvider theme={theme}>
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
    </ChakraProvider>
  );
}

export default App;
