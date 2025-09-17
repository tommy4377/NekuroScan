import React from 'react';
import { ChakraProvider, Box } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { theme } from './styles/theme';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Search from './pages/Search';
import MangaDetails from './pages/MangaDetails';
import ReaderPage from './pages/ReaderPage';
import Library from './components/Library';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Categories from './pages/Categories';

function App() {
  return (
    <ChakraProvider theme={theme}>
      <Router>
        <Routes>
          {/* Welcome page */}
          <Route path="/" element={<Welcome />} />
          
          {/* Login page */}
          <Route path="/login" element={<Login />} />
          
          {/* Main app pages with navigation */}
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
          
          <Route path="/categories" element={
            <Box minH="100vh" bg="gray.900">
              <Navigation />
              <Box pt="60px">
                <Categories />
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
          
          {/* Reader without navigation */}
          <Route path="/read/:source/:mangaId/:chapterId" element={<ReaderPage />} />
          
          {/* Redirect invalid routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ChakraProvider>
  );
}

export default App;
