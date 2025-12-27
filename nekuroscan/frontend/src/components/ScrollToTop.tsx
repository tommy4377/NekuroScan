/**
 * SCROLL TO TOP - Smooth scroll button with bounce animation
 * ✅ SEZIONE 1: Micro-interactions
 */

import { useState, useEffect } from 'react';
import { IconButton, Box } from '@chakra-ui/react';
import { FaArrowUp } from 'react-icons/fa';

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <Box
      position="fixed"
      bottom={8}
      right={8}
      zIndex={1000}
    >
      <IconButton
        aria-label="Torna in cima"
        icon={<FaArrowUp />}
        onClick={scrollToTop}
        colorScheme="purple"
        size="lg"
        borderRadius="full"
        boxShadow="0 10px 25px -5px rgba(128, 90, 213, 0.4)"
        sx={{
          animation: 'bounce 2s ease-in-out infinite',
          '@keyframes bounce': {
            '0%, 100%': {
              transform: 'translateY(0)',
            },
            '50%': {
              transform: 'translateY(-10px)',
            },
          },
          _hover: {
            transform: 'translateY(-5px) scale(1.1)',
            boxShadow: '0 15px 30px -5px rgba(128, 90, 213, 0.5)',
          },
        }}
      />
    </Box>
  );
};

export default ScrollToTop;

