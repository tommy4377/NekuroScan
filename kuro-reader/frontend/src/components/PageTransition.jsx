// ✨ PAGE TRANSITION - Animazioni transizione tra pagine
import React from 'react';
import { Box } from '@chakra-ui/react';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

const PageTransition = ({ children }) => {
  return (
    <MotionBox
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1]
      }}
      style={{ willChange: 'opacity, transform' }}
    >
      {children}
    </MotionBox>
  );
};

export default PageTransition;

