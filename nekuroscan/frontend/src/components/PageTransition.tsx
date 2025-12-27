// @ts-nocheck - Legacy component, needs gradual refactoring
/* eslint-disable @typescript-eslint/no-explicit-any */
// ✅ SEZIONE 3.1: Transizioni Smooth tra Pagine - Migliorato con fade-in elegante
import React from 'react';
import { Box } from '@chakra-ui/react';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

const PageTransition = ({ children }) => {
  return (
    <MotionBox
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: {
          duration: 0.25,
          ease: [0.4, 0, 0.2, 1],
          opacity: { duration: 0.2 },
          y: { duration: 0.25 },
          scale: { duration: 0.25 }
        }
      }}
      exit={{ 
        opacity: 0, 
        y: -10,
        scale: 0.98,
        transition: {
          duration: 0.15,
          ease: [0.4, 0, 1, 1]
        }
      }}
      style={{ 
        willChange: 'opacity, transform',
        width: '100%',
        minHeight: '100%'
      }}
    >
      {children}
    </MotionBox>
  );
};

export default PageTransition;

