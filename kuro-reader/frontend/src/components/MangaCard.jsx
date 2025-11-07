// MangaCard.jsx - FIX ENCODING
import React, { useState } from 'react';
import { Box, Image, Text, VStack, Badge, Skeleton } from '@chakra-ui/react';
// import { motion } from 'framer-motion'; // Rimosso per evitare errori React #300
import { useNavigate } from 'react-router-dom';

// const Box = motion(Box); // Rimosso per evitare errori React #300

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
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleClick = React.useCallback(() => {
    if (!manga?.url) {
      console.error('Invalid manga data:', manga);
      return;
    }

    const mangaId = safeEncodeUrl(manga.url);
    const source = manga.source || (manga.isAdult ? 'mangaWorldAdult' : 'mangaWorld');
    navigate(`/manga/${source}/${mangaId}`);
  }, [manga, navigate]);

  const handleMouseMove = React.useCallback((e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    setRotation({ x: rotateX, y: rotateY });
  }, []);

  const handleMouseLeave = React.useCallback(() => {
    setRotation({ x: 0, y: 0 });
  }, []);

  const cleanChapter = React.useMemo(() => 
    manga.latestChapter?.toString().replace(/cap\.?|capitolo|chapter|ch\.?/i, '').trim()
  , [manga.latestChapter]);
  
  const shouldShowChapter = cleanChapter && (showLatestChapter || manga.isTrending || manga.isRecent);

  return (
    <Box
      cursor="pointer"
      onClick={handleClick}
      height="100%"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: '1000px', transformStyle: 'preserve-3d', willChange: 'transform' }}
    >
      <VStack
        bg="gray.800"
        borderRadius="xl"
        overflow="hidden"
        spacing={0}
        height="100%"
        transition="all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
        position="relative"
        border="1px solid"
        borderColor="transparent"
        _hover={{
          bg: 'gray.700',
          borderColor: 'purple.500',
          boxShadow: '0 30px 60px rgba(128, 90, 213, 0.35)',
          transform: 'translateY(-8px) scale(1.02)'
        }}
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transformStyle: 'preserve-3d',
          willChange: 'transform'
        }}
      >
        <Box position="relative" width="100%" paddingBottom="140%">
          {/* Glow gradiente */}
          <Box
            position="absolute"
            inset={0}
            bgGradient="linear(to-b, rgba(139,92,246,0.25), rgba(236,72,153,0.15))"
            opacity={0.0}
            transition="opacity 0.3s"
            _groupHover={{ opacity: 1 }}
            pointerEvents="none"
            style={{ transform: 'translateZ(5px)' }}
          />
          {!imageLoaded && (
            <Skeleton position="absolute" top={0} left={0} width="100%" height="100%" />
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
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              setImageLoaded(true);
              // Retry con placeholder se l'immagine fallisce
              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='280' viewBox='0 0 200 280'%3E%3Crect width='200' height='280' fill='%234A5568'%3E%3C/rect%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23A0AEC0' font-family='sans-serif' font-size='16'%3E"+encodeURIComponent(manga.title.substring(0, 20))+ "%3C/text%3E%3C/svg%3E";
            }}
            fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='280' viewBox='0 0 200 280'%3E%3Crect width='200' height='280' fill='%234A5568'%3E%3C/rect%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23A0AEC0' font-family='sans-serif' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E"
            style={{ 
              transform: 'translateZ(20px)',
              transition: 'opacity 0.3s ease',
              opacity: imageLoaded ? 1 : 0
            }}
          />

          {/* Riflesso dinamico */}
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            height="40%"
            bgGradient="linear(to-b, rgba(255,255,255,0.18), rgba(255,255,255,0))"
            mixBlendMode="overlay"
            pointerEvents="none"
            style={{ transform: 'translateZ(22px)' }}
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
              style={{ transform: 'translateZ(30px)' }}
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
              style={{ transform: 'translateZ(30px)' }}
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
              style={{ transform: 'translateZ(25px)' }}
            >
              Capitolo {cleanChapter}
            </Box>
          )}
        </Box>

        <VStack p={3} spacing={1} align="stretch" flex={1} width="100%" style={{ transform: 'translateZ(15px)' }}>
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
