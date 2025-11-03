// 🎯 FLOATING ACTION BUTTON - Pulsante azioni rapide
import React, { useState } from 'react';
import {
  Box, IconButton, VStack, Tooltip, useDisclosure,
  ScaleFade
} from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaPlus, FaSearch, FaBook, FaArrowUp, FaRandom,
  FaDownload, FaBell
} from 'react-icons/fa';

function FloatingActionButton({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen, onToggle } = useDisclosure();
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Nascondi nel reader
  if (location.pathname.includes('/read/')) return null;

  // Controlla scroll per mostrare "Torna su"
  React.useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToRandom = () => {
    // Vai a una pagina random
    const randomPages = ['/trending', '/popular', '/latest', '/categories'];
    const random = randomPages[Math.floor(Math.random() * randomPages.length)];
    navigate(random);
  };

  const actions = [
    { icon: FaSearch, label: 'Cerca', action: () => navigate('/search'), color: 'blue' },
    { icon: FaBook, label: 'Libreria', action: () => navigate('/library'), color: 'purple', protected: true },
    { icon: FaRandom, label: 'Random', action: goToRandom, color: 'pink' },
    { icon: FaDownload, label: 'Download', action: () => navigate('/downloads'), color: 'green', protected: true },
  ];

  return (
    <>
      {/* Pulsante principale */}
      <Box
        position="fixed"
        bottom={{ base: '20px', md: '30px' }}
        right={{ base: '20px', md: '30px' }}
        zIndex={999}
      >
        <VStack spacing={3} align="end">
          {/* Azioni */}
          <ScaleFade in={isOpen} initialScale={0.8}>
            <VStack spacing={2}>
              {actions.map((action, i) => {
                // Nascondi azioni protette se non loggato
                if (action.protected && !user) return null;
                
                return (
                  <Tooltip key={i} label={action.label} placement="left">
                    <IconButton
                      icon={<action.icon />}
                      colorScheme={action.color}
                      size="md"
                      borderRadius="full"
                      boxShadow="lg"
                      onClick={() => {
                        action.action();
                        onToggle();
                      }}
                      aria-label={action.label}
                    />
                  </Tooltip>
                );
              })}
            </VStack>
          </ScaleFade>

          {/* Torna su (solo se scrollato) */}
          {showScrollTop && !isOpen && (
            <ScaleFade in={showScrollTop}>
              <Tooltip label="Torna su" placement="left">
                <IconButton
                  icon={<FaArrowUp />}
                  colorScheme="gray"
                  size="md"
                  borderRadius="full"
                  boxShadow="lg"
                  onClick={scrollToTop}
                  aria-label="Torna su"
                  mb={2}
                />
              </Tooltip>
            </ScaleFade>
          )}

          {/* Main FAB */}
          <Tooltip label={isOpen ? 'Chiudi' : 'Azioni rapide'} placement="left">
            <IconButton
              icon={<FaPlus style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />}
              colorScheme="purple"
              size="lg"
              borderRadius="full"
              boxShadow="2xl"
              onClick={onToggle}
              aria-label="Menu azioni"
              _hover={{
                transform: 'scale(1.1)',
                boxShadow: '0 0 30px rgba(139, 92, 246, 0.6)'
              }}
              transition="all 0.3s"
            />
          </Tooltip>
        </VStack>
      </Box>
    </>
  );
}

export default FloatingActionButton;

