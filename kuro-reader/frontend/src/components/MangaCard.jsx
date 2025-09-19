import React from 'react';
import { Box, Image, Text, VStack, Badge } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const MotionBox = motion(Box);

function MangaCard({ manga, hideSource = false, showLatest = false }) {
  const navigate = useNavigate();
  
  const handleClick = () => {
    const mangaId = btoa(manga.url);
    const source = manga.source || (manga.isAdult ? 'mangaWorldAdult' : 'mangaWorld');
    navigate(`/manga/${source}/${mangaId}`);
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
        position="relative"
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
            fallbackSrc="https://via.placeholder.com/200x280"
          />
          
          {/* Badge posizionati sull'immagine con sfondo semitrasparente */}
          {showLatest && manga.latestChapter && (
            <Badge 
              position="absolute" 
              bottom={2} 
              left={2} 
              right={2}
              colorScheme="blue"
              fontSize="xs"
              textAlign="center"
              bg="blue.600"
              color="white"
              opacity={0.95}
            >
              Capitolo {manga.latestChapter.replace(/^cap\.\s*/i, '')}
            </Badge>
          )}
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
        </VStack>
      </VStack>
    </MotionBox>
  );
}

export default MangaCard;
