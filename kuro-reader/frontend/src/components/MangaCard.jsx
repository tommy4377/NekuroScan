// MangaCard.jsx - Optimized
import React, { useState } from 'react';
import { Box, Image, Text, VStack, Badge, Skeleton } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { encodeSource } from '../utils/sourceMapper';

// URL-safe base64 encoding
function safeEncodeUrl(url) {
  try {
    return btoa(url)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } catch (e) {
    console.error('Encoding error:', e);
    return encodeURIComponent(url);
  }
}

const MangaCard = React.memo(({ manga, hideSource = false, showLatestChapter = false, priority = false }) => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);

  // Usa cover URL diretto - il CDN non supporta resize
  const coverUrl = manga.cover || manga.coverUrl;

  const handleClick = React.useCallback(() => {
    if (!manga?.url) {
      console.error('Invalid manga data:', manga);
      return;
    }

    const mangaId = safeEncodeUrl(manga.url);
    const source = manga.source || (manga.isAdult ? 'mangaWorldAdult' : 'mangaWorld');
    const encodedSource = encodeSource(source);
    navigate(`/manga/${encodedSource}/${mangaId}`);
  }, [manga, navigate]);

  const cleanChapter = React.useMemo(() => 
    manga.latestChapter?.toString().replace(/cap\.?|capitolo|chapter|ch\.?/i, '').trim()
  , [manga.latestChapter]);
  
  const shouldShowChapter = cleanChapter && (showLatestChapter || manga.isTrending || manga.isRecent);

  return (
    <Box
      className="manga-card"
      cursor="pointer"
      onClick={handleClick}
      height="100%"
      overflow="visible"
      position="relative"
      zIndex={1}
      _hover={{
        zIndex: 999
      }}
    >
      <VStack
        bg="gray.800"
        borderRadius="xl"
        spacing={0}
        height="100%"
        transition="all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
        position="relative"
        border="1px solid"
        borderColor="transparent"
        willChange="transform"
        sx={{
          overflow: 'visible'
        }}
        _hover={{
          bg: 'gray.700',
          borderColor: 'purple.500',
          boxShadow: '0 12px 30px -5px rgba(128, 90, 213, 0.4), 0 8px 16px -8px rgba(128, 90, 213, 0.3)',
          transform: 'translateY(-8px) scale(1.02)',
          zIndex: 999
        }}
      >
        <Box 
          position="relative" 
          width="100%" 
          paddingBottom="140%" 
          bg="gray.800"
          sx={{
            borderTopLeftRadius: 'xl',
            borderTopRightRadius: 'xl',
            overflow: 'hidden'
          }}
        >
          {!imageLoaded && (
            <Skeleton position="absolute" top={0} left={0} width="100%" height="100%" />
          )}
          <Image
            src={coverUrl}
            alt={manga.title}
            position="absolute"
            top={0}
            left={0}
            width="100%"
            height="100%"
            objectFit="cover"
            loading={priority ? "eager" : "lazy"}
            fetchpriority={priority ? "high" : "auto"}
            decoding="async"
            htmlWidth="200"
            htmlHeight="280"
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              setImageLoaded(true);
              // Placeholder se immagine fallisce
              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='280' viewBox='0 0 200 280'%3E%3Crect width='200' height='280' fill='%234A5568'%3E%3C/rect%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23A0AEC0' font-family='sans-serif' font-size='16'%3E"+encodeURIComponent(manga.title.substring(0, 20))+ "%3C/text%3E%3C/svg%3E";
            }}
            fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='280' viewBox='0 0 200 280'%3E%3Crect width='200' height='280' fill='%234A5568'%3E%3C/rect%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23A0AEC0' font-family='sans-serif' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E"
            style={{ 
              transition: 'opacity 0.3s ease',
              opacity: imageLoaded ? 1 : 0
            }}
          />

          {manga.isAdult && (
            <Badge
              position="absolute"
              top={2}
              right={2}
              colorScheme="pink"
              fontSize="xs"
              px={2}
              py={1}
            >
              18+
            </Badge>
          )}

          {manga.isRecent && (
            <Badge
              position="absolute"
              top={2}
              left={2}
              colorScheme="green"
              fontSize="xs"
              px={2}
              py={1}
            >
              NEW
            </Badge>
          )}

          {shouldShowChapter && (
            <Box
              position="absolute"
              bottom={2}
              left={2}
              right={2}
              bg="blue.600"
              color="white"
              px={2}
              py={1}
              borderRadius="md"
              fontSize="xs"
              textAlign="center"
              fontWeight="bold"
              opacity={0.95}
              boxShadow="lg"
            >
              Capitolo {cleanChapter}
            </Box>
          )}
        </Box>

        <VStack p={3} spacing={1} align="stretch" flex={1} width="100%">
          <Text fontSize="sm" fontWeight="bold" noOfLines={2} title={manga.title} lineHeight="short"
            bgGradient="linear(to-r, purple.200, pink.200)" bgClip="text">
            {manga.title}
          </Text>
        </VStack>
      </VStack>
    </Box>
  );
});

MangaCard.displayName = 'MangaCard';

export default MangaCard;
