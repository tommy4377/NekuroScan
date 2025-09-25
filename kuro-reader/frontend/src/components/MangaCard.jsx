import React from 'react';
import { Box, Image, Text, VStack, Badge, Skeleton } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const MotionBox = motion(Box);

function MangaCard({ manga, hideSource = false, showChapterBadge = false }) {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = React.useState(false);
  
  const handleClick = () => {
    const mangaId = btoa(manga.url);
    const source = manga.source || (manga.isAdult ? 'mangaWorldAdult' : 'mangaWorld');
    navigate(`/manga/${source}/${mangaId}`);
  };

  // Pulisce il numero del capitolo
  const getCleanChapterNumber = () => {
    if (!manga.latestChapter) return null;
    
    let chapter = manga.latestChapter;
    if (typeof chapter === 'string') {
      // Rimuovi prefissi comuni
      chapter = chapter
        .replace(/^(cap\.|capitolo|chapter|ch\.)\s*/i, '')
        .replace(/^vol\.\s*\d+\s*-\s*/i, '')
        .trim();
      
      // Estrai solo il numero
      const match = chapter.match(/^(\d+(?:\.\d+)?)/);
      if (match) {
        return match[1];
      }
    }
    return chapter;
  };

  const chapterNumber = showChapterBadge ? getCleanChapterNumber() : null;

  return (
    <MotionBox
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      cursor="pointer"
      onClick={handleClick}
      height="100%"
    >
      <VStack
        bg="gray.800"
        borderRadius="lg"
        overflow="hidden"
        spacing={0}
        height="100%"
        transition="all 0.3s"
        _hover={{ 
          bg: 'gray.700',
          boxShadow: 'xl'
        }}
        position="relative"
      >
        {/* Container Immagine */}
        <Box position="relative" width="100%" paddingBottom="140%">
          {!imageLoaded && (
            <Skeleton 
              position="absolute"
              top={0}
              left={0}
              width="100%"
              height="100%"
            />
          )}
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
            onLoad={() => setImageLoaded(true)}
            fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='280' viewBox='0 0 200 280'%3E%3Crect width='200' height='280' fill='%234A5568'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23A0AEC0' font-family='sans-serif' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E"
          />
          
          {/* Badge Adult - sempre in alto a destra */}
          {manga.isAdult && (
            <Badge 
              position="absolute" 
              top={2} 
              right={2} 
              colorScheme="pink" 
              fontSize="xs"
              px={2}
              py={1}
              zIndex={2}
            >
              18+
            </Badge>
          )}
        </Box>
        
        {/* Sezione Titolo */}
        <VStack p={3} spacing={1} align="stretch" flex={1} width="100%">
          <Text
            fontSize="sm"
            fontWeight="bold"
            noOfLines={2}
            title={manga.title}
            lineHeight="short"
          >
            {manga.title}
          </Text>
        </VStack>

        {/* Badge Capitolo - SOLO se richiesto e presente, fuori dall'immagine */}
        {showChapterBadge && chapterNumber && (
          <Box
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            bg="blue.600"
            color="white"
            px={2}
            py={1}
            textAlign="center"
            fontSize="xs"
            fontWeight="bold"
          >
            Cap. {chapterNumber}
          </Box>
        )}
      </VStack>
    </MotionBox>
  );
}

export default MangaCard;