// frontend/src/components/MangaCard.jsx
import React from 'react';
import { Box, Image, Text, VStack } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const MotionBox = motion(Box);

function MangaCard({ manga, hideSource = true, showLatest = true }) {
  const navigate = useNavigate();
  
  const handleClick = () => {
    const mangaId = btoa(manga.url);
    navigate(`/manga/${manga.source || (manga.isAdult ? 'mangaWorldAdult' : 'mangaWorld')}/${mangaId}`);
  };

  return (
    <MotionBox
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      cursor="pointer"
      onClick={handleClick}
    >
      <VStack
        bg="gray.800"
        borderRadius="lg"
        overflow="hidden"
        spacing={0}
        height="100%"
        transition="all 0.3s"
        _hover={{ bg: 'gray.700' }}
      >
        <Box position="relative" width="100%" paddingBottom="140%">
          <Image
            src={manga.cover || manga.coverUrl}
            alt={manga.title}
            position="absolute"
            top={0}
            left={0}
            width="100%"
            height="100%"
            objectFit="cover"
            loading="lazy"
            fallbackSrc="https://via.placeholder.com/200x280?text=Kuro"
          />
        </Box>
        
        <VStack p={3} spacing={1} align="stretch" flex={1}>
          <Text
            fontSize="sm"
            fontWeight="bold"
            noOfLines={2}
            title={manga.title}
          >
            {manga.title}
          </Text>
          
          {showLatest && manga.latestChapter && (
            <Text fontSize="xs" color="gray.400" noOfLines={1}>
              Cap. {manga.latestChapter}
            </Text>
          )}
        </VStack>
      </VStack>
    </MotionBox>
  );
}

export default MangaCard;
