// frontend/src/App.jsx
import React, { useEffect } from 'react';
import { ChakraProvider, Box } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { theme } from './styles/theme';

import Navigation from './components/Navigation';
import Library from './components/Library';
import Home from './pages/Home';
import Search from './pages/Search';
import MangaDetails from './pages/MangaDetails';
import ReaderPage from './pages/ReaderPage';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Categories from './pages/Categories';

import Latest from './pages/Latest';
import Popular from './pages/Popular';
import TopType from './pages/TopType';
import PublicProfile from './pages/PublicProfile';

import useAuth from './hooks/useAuth';

function Layout({ children }) {
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

          <Route path="/home" element={<Layout><Home /></Layout>} />
          <Route path="/search" element={<Layout><Search /></Layout>} />
          <Route path="/categories" element={<Layout><Categories /></Layout>} />
          <Route path="/library" element={<Layout><Library /></Layout>} />
          <Route path="/manga/:source/:id" element={<Layout><MangaDetails /></Layout>} />

          {/* Vedi tutti con scroll infinito */}
          <Route path="/latest" element={<Layout><Latest /></Layout>} />
          <Route path="/popular" element={<Layout><Popular /></Layout>} />
          <Route path="/top/:type" element={<Layout><TopType /></Layout>} />

          {/* Profilo pubblico */}
          <Route path="/user/:username" element={<Layout><PublicProfile /></Layout>} />

          {/* Reader senza navbar */}
          <Route path="/read/:source/:mangaId/:chapterId" element={<ReaderPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ChakraProvider>
  );
}

export default App;
