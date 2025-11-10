/**
 * MANGA CARD - Optimized manga display card with Cloudinary
 * Shows manga cover, title, badges, and latest chapter
 */

import { useState, useCallback, useMemo, memo } from 'react';
import type { SyntheticEvent } from 'react';
import { Box, Image, Text, VStack, Badge, Skeleton } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import type { Manga } from '@/types/manga';
import { encodeSource } from '@/utils/sourceMapper';
import { CloudinaryPresets, shouldUseCloudinary } from '@/utils/cloudinaryHelper';

// ========== TYPES ==========

interface MangaCardProps {
  manga: Manga;
  showLatestChapter?: boolean;
  priority?: boolean;
}

// ========== UTILITIES ==========

/**
 * URL-safe base64 encoding
 */
function safeEncodeUrl(url: string): string {
  try {
    return btoa(url)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } catch {
    return encodeURIComponent(url);
  }
}

// ========== COMPONENT ==========

const MangaCard = memo<MangaCardProps>(({ 
  manga, 
  showLatestChapter = false, 
  priority = false 
}) => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);

  // Optimize cover with Cloudinary (automatic AVIF/WebP)
  const originalCoverUrl = manga.coverUrl;
  const coverUrl = shouldUseCloudinary() && originalCoverUrl && CloudinaryPresets.mangaCover
    ? CloudinaryPresets.mangaCover(originalCoverUrl)
    : originalCoverUrl;

  const handleClick = useCallback(() => {
    if (!manga?.url) {
      return;
    }

    const mangaId = safeEncodeUrl(manga.url);
    const source = manga.source || (manga.isAdult ? 'mangaWorldAdult' : 'mangaWorld');
    const encodedSource = encodeSource(source);
    navigate(`/manga/${encodedSource}/${mangaId}`);
  }, [manga, navigate]);

  const cleanChapter = useMemo(() => 
    manga.lastChapter?.toString().replace(/cap\.?|capitolo|chapter|ch\.?/i, '').trim()
  , [manga.lastChapter]);
  
  const shouldShowChapter = cleanChapter && (showLatestChapter || manga.isTrending || manga.isRecent);

  const handleImageError = (e: SyntheticEvent<HTMLImageElement>): void => {
    setImageLoaded(true);
    const target = e.target as HTMLImageElement;
    // Placeholder if image fails
    const titleEncoded = encodeURIComponent(manga.title.substring(0, 20));
    target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='280' viewBox='0 0 200 280'%3E%3Crect width='200' height='280' fill='%234A5568'%3E%3C/rect%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23A0AEC0' font-family='sans-serif' font-size='16'%3E${titleEncoded}%3C/text%3E%3C/svg%3E`;
  };

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
            <Skeleton 
              position="absolute" 
              top={0} 
              left={0} 
              width="100%" 
              height="100%"
              startColor="gray.700"
              endColor="gray.600"
              speed={1.2}
            />
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
            fetchPriority={priority ? "high" : "low"}
            decoding="async"
            htmlWidth="200"
            htmlHeight="280"
            onLoad={() => setImageLoaded(true)}
            onError={handleImageError}
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
          <Text 
            fontSize="13px" 
            fontWeight="bold" 
            noOfLines={2} 
            title={manga.title} 
            lineHeight="short"
            bgGradient="linear(to-r, purple.200, pink.200)" 
            bgClip="text"
          >
            {manga.title}
          </Text>
        </VStack>
      </VStack>
    </Box>
  );
});

MangaCard.displayName = 'MangaCard';

export default MangaCard;

