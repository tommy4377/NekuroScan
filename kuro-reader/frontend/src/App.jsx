import React, { useEffect } from 'react';
import { ChakraProvider, Box } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { theme } from './styles/theme';
import Navigation from './components/Navigation';
import Welcome from './pages/Welcome';
import Home from './pages/Home';
import Search from './pages/Search';
import MangaDetails from './pages/MangaDetails';
import ReaderPage from './pages/ReaderPage';
import Library from './components/Library';

function App() {
  return (
    <ChakraProvider theme={theme}>
      <Router>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/home" element={
            <Box minH="100vh" bg="gray.900">
              <Navigation />
              <Box pt="60px">
                <Home />
              </Box>
            </Box>
          } />
          <Route path="/search" element={
            <Box minH="100vh" bg="gray.900">
              <Navigation />
              <Box pt="60px">
                <Search />
              </Box>
            </Box>
          } />
          <Route path="/library" element={
            <Box minH="100vh" bg="gray.900">
              <Navigation />
              <Box pt="60px">
                <Library />
              </Box>
            </Box>
          } />
          <Route path="/manga/:source/:id" element={
            <Box minH="100vh" bg="gray.900">
              <Navigation />
              <Box pt="60px">
                <MangaDetails />
              </Box>
            </Box>
          } />
          <Route path="/read/:source/:mangaId/:chapterId" element={<ReaderPage />} />
        </Routes>
      </Router>
    </ChakraProvider>
  );
}

export default App;
