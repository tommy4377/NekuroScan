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
import Latest from './pages/Latest';
import Popular from './pages/Popular';
import TopType from './pages/TopType';

// Hooks
import useAuth from './hooks/useAuth';

function AppLayout({ children }) {
  return (
    <Box minH="100vh" bg="gray.900">
      <Navigation />
      {children}
    </Box>
  );
}

function App() {
  const { initAuth, startAutoSync } = useAuth();
  
  useEffect(() => {
    initAuth();
    const cleanup = startAutoSync();
    return cleanup;
  }, []);

  return (
    <ChakraProvider theme={theme}>
      <Router>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          
          <Route path="/home" element={<AppLayout><Home /></AppLayout>} />
          <Route path="/search" element={<AppLayout><Search /></AppLayout>} />
          <Route path="/categories" element={<AppLayout><Categories /></AppLayout>} />
          <Route path="/library" element={<AppLayout><Library /></AppLayout>} />
          <Route path="/manga/:source/:id" element={<AppLayout><MangaDetails /></AppLayout>} />
          <Route path="/profile" element={<AppLayout><Profile /></AppLayout>} />
          <Route path="/user/:username" element={<AppLayout><Profile isPublic={true} /></AppLayout>} />
          <Route path="/latest" element={<AppLayout><Latest /></AppLayout>} />
          <Route path="/popular" element={<AppLayout><Popular /></AppLayout>} />
          <Route path="/latest" element={<AppLayout><Latest /></AppLayout>} />
          <Route path="/popular" element={<AppLayout><Popular /></AppLayout>} />
          <Route path="/top/:type" element={<AppLayout><TopType /></AppLayout>} />
          
          <Route path="/read/:source/:mangaId/:chapterId" element={<ReaderPage />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ChakraProvider>
  );
}

export default App;


