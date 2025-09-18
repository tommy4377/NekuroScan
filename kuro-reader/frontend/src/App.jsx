import React, { useEffect } from 'react';
import { ChakraProvider, Box } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { theme } from './styles/theme';

// Components
import Navigation from './components/Navigation';
import Library from './components/Library';

// Pages
import Home from './pages/Home';
import Search from './pages/Search';
import MangaDetails from './pages/MangaDetails';
import ReaderPage from './pages/ReaderPage';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Categories from './pages/Categories';
import Profile from './pages/Profile';

// Hooks
import useAuth from './hooks/useAuth';

// Layout wrapper per pagine con navigation
function AppLayout({ children }) {
  return (
    <Box minH="100vh" bg="gray.900">
      <Navigation />
      <Box>{children}</Box>
    </Box>
  );
}

function App() {
  const { initAuth, startAutoSync } = useAuth();
  
  useEffect(() => {
    // Initialize auth on app start
    initAuth();
    
    // Start auto-sync
    const cleanup = startAutoSync();
    
    // Cleanup on unmount
    return cleanup;
  }, []);

  return (
    <ChakraProvider theme={theme}>
      <Router>
        <Routes>
          {/* Welcome page - no navigation */}
          <Route path="/" element={<Welcome />} />
          
          {/* Login page - no navigation */}
          <Route path="/login" element={<Login />} />
          
          {/* Main app pages with navigation */}
          <Route path="/home" element={
            <AppLayout>
              <Home />
            </AppLayout>
          } />
          
          <Route path="/search" element={
            <AppLayout>
              <Search />
            </AppLayout>
          } />
          
          <Route path="/categories" element={
            <AppLayout>
              <Categories />
            </AppLayout>
          } />
          
          <Route path="/library" element={
            <AppLayout>
              <Library />
            </AppLayout>
          } />
          
          <Route path="/manga/:source/:id" element={
            <AppLayout>
              <MangaDetails />
            </AppLayout>
          } />
          
          <Route path="/profile" element={
            <AppLayout>
              <Profile />
            </AppLayout>
          } />
          
          {/* Reader without navigation */}
          <Route path="/read/:source/:mangaId/:chapterId" element={<ReaderPage />} />
          
          {/* Public profile */}
          <Route path="/user/:username" element={
            <AppLayout>
              <Profile isPublic={true} />
            </AppLayout>
          } />
          
          {/* Redirect old routes */}
          <Route path="/settings" element={<Navigate to="/profile" replace />} />
          
          {/* Catch all - redirect to welcome */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ChakraProvider>
  );
}

export default App;
