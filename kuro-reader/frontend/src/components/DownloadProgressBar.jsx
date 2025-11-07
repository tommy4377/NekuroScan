import React from 'react';
import {
  Box, VStack, HStack, Text, Progress, IconButton, Collapse, Badge,
  useDisclosure, Tooltip, Divider
} from '@chakra-ui/react';
import { FaTimes, FaChevronDown, FaChevronUp, FaCheck, FaExclamationTriangle, FaDownload } from 'react-icons/fa';
import useDownloadProgress from '../hooks/useDownloadProgress';

const DownloadProgressBar = () => {
  const { downloads, removeDownload, clearCompleted } = useDownloadProgress();
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true });
  
  if (downloads.length === 0) return null;

  const activeDownloads = downloads.filter(d => d.status === 'downloading');
  const completedDownloads = downloads.filter(d => d.status === 'completed');
  const errorDownloads = downloads.filter(d => d.status === 'error');

  return (
    <Box
      position="fixed"
      bottom={{ base: '70px', md: 4 }}
      right={4}
      zIndex={1400}
      maxW={{ base: '90vw', sm: '400px', md: '450px' }}
      bg="gray.900"
      borderRadius="xl"
      boxShadow="2xl"
      border="2px solid"
      borderColor="purple.500"
      overflow="hidden"
    >
      {/* Header */}
      <HStack
        bg="purple.600"
        p={3}
        justify="space-between"
        cursor="pointer"
        onClick={onToggle}
        _hover={{ bg: 'purple.700' }}
        transition="background 0.2s"
      >
        <HStack spacing={2}>
          <FaDownload />
          <Text fontWeight="bold" fontSize="sm">
            Download {activeDownloads.length > 0 && `(${activeDownloads.length})`}
          </Text>
          {completedDownloads.length > 0 && (
            <Badge colorScheme="green" fontSize="xs">
              {completedDownloads.length} ✓
            </Badge>
          )}
          {errorDownloads.length > 0 && (
            <Badge colorScheme="red" fontSize="xs">
              {errorDownloads.length} ✗
            </Badge>
          )}
        </HStack>
        <HStack spacing={1}>
          {completedDownloads.length > 0 && (
            <Tooltip label="Rimuovi completati">
              <IconButton
                icon={<FaCheck />}
                size="xs"
                variant="ghost"
                colorScheme="whiteAlpha"
                onClick={(e) => {
                  e.stopPropagation();
                  clearCompleted();
                }}
                aria-label="Rimuovi download completati"
              />
            </Tooltip>
          )}
          <IconButton
            icon={isOpen ? <FaChevronDown /> : <FaChevronUp />}
            size="xs"
            variant="ghost"
            colorScheme="whiteAlpha"
            aria-label={isOpen ? "Minimizza" : "Espandi"}
          />
        </HStack>
      </HStack>

      {/* Download List */}
      <Collapse in={isOpen} animateOpacity>
        <VStack
          spacing={2}
          p={3}
          maxH={{ base: '40vh', md: '300px' }}
          overflowY="auto"
          align="stretch"
          css={{
            '&::-webkit-scrollbar': {
              width: '6px'
            },
            '&::-webkit-scrollbar-track': {
              background: '#1A202C'
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#805AD5',
              borderRadius: '3px'
            }
          }}
        >
          {downloads.map((download) => {
            const overallProgress = download.totalChapters > 0
              ? Math.round(((download.completedChapters + (download.currentChapter.percentage / 100)) / download.totalChapters) * 100)
              : 0;

            return (
              <Box
                key={download.id}
                bg="gray.800"
                p={3}
                borderRadius="lg"
                border="1px solid"
                borderColor={
                  download.status === 'completed' ? 'green.600' :
                  download.status === 'error' ? 'red.600' :
                  'gray.700'
                }
              >
                <VStack spacing={2} align="stretch">
                  {/* Titolo e azioni */}
                  <HStack justify="space-between">
                    <VStack align="start" spacing={0} flex={1} minW={0}>
                      <Text fontSize="sm" fontWeight="bold" noOfLines={1}>
                        {download.mangaTitle}
                      </Text>
                      <Text fontSize="xs" color="gray.400" noOfLines={1}>
                        {download.status === 'downloading' && download.currentChapter.title && (
                          <>📖 {download.currentChapter.title}</>
                        )}
                        {download.status === 'completed' && '✅ Completato'}
                        {download.status === 'error' && '⚠️ Errore'}
                      </Text>
                    </VStack>
                    <HStack spacing={1}>
                      {download.status === 'completed' && (
                        <Badge colorScheme="green" fontSize="xs">
                          <FaCheck />
                        </Badge>
                      )}
                      {download.status === 'error' && (
                        <Badge colorScheme="red" fontSize="xs">
                          <FaExclamationTriangle />
                        </Badge>
                      )}
                      <IconButton
                        icon={<FaTimes />}
                        size="xs"
                        variant="ghost"
                        colorScheme="gray"
                        onClick={() => removeDownload(download.id)}
                        aria-label="Rimuovi"
                      />
                    </HStack>
                  </HStack>

                  {/* Progress Bar */}
                  {download.status === 'downloading' && (
                    <>
                      <Progress
                        value={overallProgress}
                        size="sm"
                        colorScheme="purple"
                        borderRadius="full"
                        hasStripe
                        isAnimated
                      />
                      <HStack justify="space-between" fontSize="xs" color="gray.400">
                        <Text>
                          Capitolo {download.completedChapters + 1}/{download.totalChapters}
                        </Text>
                        <Text fontWeight="bold">
                          {overallProgress}%
                        </Text>
                      </HStack>
                      {download.currentChapter.total > 0 && (
                        <Text fontSize="xs" color="gray.500">
                          Pagina {download.currentChapter.current}/{download.currentChapter.total}
                        </Text>
                      )}
                    </>
                  )}
                </VStack>
              </Box>
            );
          })}
        </VStack>
      </Collapse>
    </Box>
  );
};

export default DownloadProgressBar;

