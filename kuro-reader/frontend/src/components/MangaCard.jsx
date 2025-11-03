// MangaCard.jsx - FIX ENCODING
import React, { useState } from 'react';
import { Box, Image, Text, VStack, Badge, Skeleton } from '@chakra-ui/react';
// import { motion } from 'framer-motion'; // Rimosso per evitare errori React #300
import { useNavigate } from 'react-router-dom';

// const Box = motion(Box); // Rimosso per evitare errori React #300

// FUNZIONE SICURA per encoding URL
function safeEncodeUrl(url) {
  try {
    // Usa btoa direttamente come nel resto dell'app
    return btoa(url);
  } catch (e) {
    console.error('Encoding error:', e);
    // Fallback: usa solo encodeURIComponent
    return encodeURIComponent(url);
  }
}

function MangaCard({ manga, hideSource = false, showLatestChapter = false, priority = false }) {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleClick = () => {
    if (!manga?.url) {
      console.error('Invalid manga data:', manga);
      return;
    }

    const mangaId = safeEncodeUrl(manga.url);
    const source = manga.source || (manga.isAdult ? 'mangaWorldAdult' : 'mangaWorld');
    navigate(`/manga/${source}/${mangaId}`);
  };

  // Resto del componente uguale...
  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  const cleanChapter = manga.latestChapter?.toString().replace(/cap\.?|capitolo|chapter|ch\.?/i, '').trim();
  const shouldShowChapter = cleanChapter && (showLatestChapter || manga.isTrending || manga.isRecent);

  return (
    <Box
      cursor="pointer"
      onClick={handleClick}
      height="100%"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
    >
      <VStack
        bg="gray.800"
        borderRadius="xl"
        overflow="hidden"
        spacing={0}
        height="100%"
        transition="all 0.3s ease"
        position="relative"
        border="1px solid"
        borderColor="transparent"
        _hover={{
          bg: 'gray.700',
          borderColor: 'purple.500',
          boxShadow: '0 30px 60px rgba(128, 90, 213, 0.35)',
          transform: 'translateY(-10px)'
        }}
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transformStyle: 'preserve-3d'
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
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
            fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='280' viewBox='0 0 200 280'%3E%3Crect width='200' height='280' fill='%234A5568'%3E%3C/rect%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23A0AEC0' font-family='sans-serif' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E"
            style={{ transform: 'translateZ(20px)' }}
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
}

export default MangaCard;
