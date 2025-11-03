// 📌 STICKY HEADER - Header fisso con scroll
import React, { useState, useEffect } from 'react';
import { Box, HStack, Heading, Badge, useColorModeValue } from '@chakra-ui/react';

function StickyHeader({ title, badge = null, children }) {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Box
      position="sticky"
      top={isSticky ? "60px" : "0"}
      zIndex={8}
      bg={isSticky ? "gray.900" : "transparent"}
      backdropFilter={isSticky ? "blur(10px)" : "none"}
      borderBottom={isSticky ? "1px solid" : "none"}
      borderColor="gray.700"
      py={isSticky ? 3 : 4}
      px={{ base: 4, md: 0 }}
      transition="all 0.3s"
      boxShadow={isSticky ? "lg" : "none"}
      mb={4}
    >
      <HStack justify="space-between" maxW="container.xl" mx="auto">
        <HStack>
          <Heading size={isSticky ? "md" : "lg"}>{title}</Heading>
          {badge && <Badge colorScheme="purple" fontSize={isSticky ? "sm" : "md"}>{badge}</Badge>}
        </HStack>
        {children}
      </HStack>
    </Box>
  );
}

export default StickyHeader;

