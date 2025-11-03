// ✨ PAGE TRANSITION - Animazioni transizione tra pagine
import React from 'react';
import { Box } from '@chakra-ui/react';

const PageTransition = ({ children }) => {
  return (
    <Box
      animation="fadeSlideIn 0.4s ease-out"
      sx={{
        '@keyframes fadeSlideIn': {
          '0%': {
            opacity: 0,
            transform: 'translateY(20px)'
          },
          '100%': {
            opacity: 1,
            transform: 'translateY(0)'
          }
        }
      }}
    >
      {children}
    </Box>
  );
};

export default PageTransition;

