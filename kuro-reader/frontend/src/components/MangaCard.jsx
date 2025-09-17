import React from 'react';
import { Box, Image, Text, Badge, VStack, HStack } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { useNavigate } from 'react-router-dom';
import 'react-lazy-load-image-component/src/effects/blur.css';

const MotionBox = motion(Box);

function MangaCard({ manga }) {
  const navigate = useNavigate();
  
  const handleClick = () => {
    const mangaId = btoa(manga.url);
    navigate(`/manga/${manga.source || 'unknown'}/${mangaId}`);
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
          <img
            src={manga.cover || manga.coverUrl || 'https://via.placeholder.com/200x280'}
            alt={manga.title}
            loading="lazy"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/200x280';
            }}
          />
          
          {manga.type && (
            <Badge
              position="absolute"
              top={2}
              right={2}
              colorScheme={manga.type === 'novel' ? 'purple' : 'blue'}
              fontSize="xs"
            >
              {manga.type === 'novel' ? 'NOVEL' : 'MANGA'}
            </Badge>
          )}
          
          {manga.source && (
            <Badge
              position="absolute"
              bottom={2}
              left={2}
              colorScheme="gray"
              fontSize="xs"
              bg="blackAlpha.700"
            >
              {manga.source}
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
          
          {manga.latestChapter && (
            <Text fontSize="xs" color="gray.400" noOfLines={1}>
              Cap. {manga.latestChapter}
            </Text>
          )}
          
          {manga.progress !== undefined && (
            <Box mt={2}>
              <Box bg="gray.700" height="3px" borderRadius="full">
                <Box
                  bg="purple.500"
                  height="100%"
                  width={`${manga.progress}%`}
                  borderRadius="full"
                />
              </Box>
            </Box>
          )}
        </VStack>
      </VStack>
    </MotionBox>
  );
}

export default MangaCard;