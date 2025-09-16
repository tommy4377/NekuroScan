import React from 'react';
import { ChakraProvider, Box } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { theme } from './styles/theme';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Search from './pages/Search';
import MangaDetails from './pages/MangaDetails';
import ReaderPage from './pages/ReaderPage';
import { useStore } from './hooks/useStore';

function App() {
  return (
    <ChakraProvider theme={theme}>
      <Router>
        <Box minH="100vh" bg="gray.900">
          <Navigation />
          
          <Box pt="60px" pb={{ base: "60px", md: "0" }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/manga/:source/:id" element={<MangaDetails />} />
              <Route path="/read/:source/:mangaId/:chapterId" element={<ReaderPage />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ChakraProvider>
  );
}

export default App;