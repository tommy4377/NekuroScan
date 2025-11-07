// 📊 DASHBOARD.JSX - Dashboard avanzata con statistiche complete
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Container, Heading, SimpleGrid, Text, VStack, HStack,
  Stat, StatLabel, StatNumber, StatHelpText, StatArrow,
  Progress, Badge, Button, useToast, Card, CardBody,
  Divider, Avatar, Wrap, WrapItem, Icon, Tooltip,
  Select, Center, Spinner
} from '@chakra-ui/react';
import {
  FaBook, FaBookmark, FaFire, FaCheck, FaBan, FaClock,
  FaTrophy, FaChartLine, FaCalendar, FaDownload, FaUpload
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import MangaCard from '../components/MangaCard';
import useAuth from '../hooks/useAuth';

function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  
  const [reading, setReading] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [dropped, setDropped] = useState([]);
  const [history, setHistory] = useState([]);
  const [readingProgress, setReadingProgress] = useState({});
  const [timeFilter, setTimeFilter] = useState('all'); // all, week, month
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    
    const handleUpdate = () => loadData();
    window.addEventListener('library-updated', handleUpdate);
    
    return () => window.removeEventListener('library-updated', handleUpdate);
  }, []);

  const loadData = () => {
    try {
      setReading(JSON.parse(localStorage.getItem('reading') || '[]'));
      setFavorites(JSON.parse(localStorage.getItem('favorites') || '[]'));
      setCompleted(JSON.parse(localStorage.getItem('completed') || '[]'));
      setDropped(JSON.parse(localStorage.getItem('dropped') || '[]'));
      setHistory(JSON.parse(localStorage.getItem('history') || '[]'));
      setReadingProgress(JSON.parse(localStorage.getItem('readingProgress') || '{}'));
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  };

  // ========== STATISTICHE ==========
  
  const stats = useMemo(() => {
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    const filterByTime = (items, dateField = 'lastRead') => {
      if (timeFilter === 'all') return items;
      const cutoff = timeFilter === 'week' ? now - oneWeek : now - oneMonth;
      return items.filter(item => {
        const date = new Date(item[dateField]).getTime();
        return date >= cutoff;
      });
    };

    const filteredReading = filterByTime(reading);
    const filteredHistory = filterByTime(history, 'timestamp');

    // Conta capitoli letti
    const chaptersRead = Object.values(readingProgress).reduce((sum, manga) => {
      return sum + (manga.chapterIndex || 0) + 1;
    }, 0);

    // Pagine lette (stima: 30 pagine per capitolo)
    const pagesRead = chaptersRead * 30;

    // Generi preferiti
    const genreCounts = {};
    [...reading, ...favorites, ...completed].forEach(manga => {
      if (manga.genres) {
        manga.genres.forEach(g => {
          const genre = g.genre || g;
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      }
    });
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);

    // Manga quasi finiti (>80% progresso)
    const almostFinished = reading.filter(m => m.progress > 80);

    // Nuovi capitoli disponibili (simulato - da implementare con backend)
    const newChapters = reading.filter(m => {
      // Logica placeholder
      return Math.random() > 0.7;
    }).length;

    // Streak di lettura (giorni consecutivi)
    const sortedHistory = [...history].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (const item of sortedHistory) {
      const itemDate = new Date(item.timestamp);
      itemDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((currentDate - itemDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === streak) {
        streak++;
      } else if (diffDays > streak) {
        break;
      }
    }

    // Media progresso
    const avgProgress = reading.length > 0
      ? Math.round(reading.reduce((sum, m) => sum + (m.progress || 0), 0) / reading.length)
      : 0;

    // Tempo stimato per finire (in ore, assumendo 2 minuti per capitolo)
    const remainingChapters = reading.reduce((sum, m) => {
      const total = m.totalChapters || 0;
      const current = m.lastChapterIndex || 0;
      return sum + Math.max(0, total - current - 1);
    }, 0);
    const hoursToFinish = Math.round((remainingChapters * 2) / 60);

    return {
      totalReading: filteredReading.length,
      totalFavorites: favorites.length,
      totalCompleted: completed.length,
      totalDropped: dropped.length,
      totalManga: reading.length + favorites.length + completed.length,
      chaptersRead,
      pagesRead,
      topGenres,
      almostFinished,
      newChapters,
      streak,
      avgProgress,
      hoursToFinish,
      lastRead: sortedHistory[0]
    };
  }, [reading, favorites, completed, dropped, history, readingProgress, timeFilter]);

  // ========== AZIONI ==========
  
  const exportLibrary = () => {
    const data = {
      reading,
      favorites,
      completed,
      dropped,
      history,
      readingProgress,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nekuro-library-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: '📥 Esportazione completata',
      description: 'La tua libreria è stata salvata',
      status: 'success',
      duration: 3000
    });
  };

  const importLibrary = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        if (data.reading) localStorage.setItem('reading', JSON.stringify(data.reading));
        if (data.favorites) localStorage.setItem('favorites', JSON.stringify(data.favorites));
        if (data.completed) localStorage.setItem('completed', JSON.stringify(data.completed));
        if (data.dropped) localStorage.setItem('dropped', JSON.stringify(data.dropped));
        if (data.history) localStorage.setItem('history', JSON.stringify(data.history));
        if (data.readingProgress) localStorage.setItem('readingProgress', JSON.stringify(data.readingProgress));

        loadData();
        window.dispatchEvent(new CustomEvent('library-updated'));

        toast({
          title: '📤 Importazione completata',
          description: `Importati ${(data.reading?.length || 0) + (data.favorites?.length || 0)} manga`,
          status: 'success',
          duration: 3000
        });
      } catch (error) {
        toast({
          title: 'Errore importazione',
          description: 'File non valido',
          status: 'error',
          duration: 3000
        });
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={20}>
        <Center>
          <Spinner size="xl" color="purple.500" />
        </Center>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        
        {/* Header */}
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <VStack align="start" spacing={1}>
            <Heading size="xl">📊 Dashboard</Heading>
            <Text color="gray.400">
              Panoramica completa della tua libreria
            </Text>
          </VStack>
          
          <HStack spacing={3}>
            <Select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              w="150px"
              size="sm"
              aria-label="Filtra statistiche per periodo temporale"
            >
              <option value="all">Tutto</option>
              <option value="week">Questa settimana</option>
              <option value="month">Questo mese</option>
            </Select>
            
            <input
              type="file"
              accept=".json"
              onChange={importLibrary}
              style={{ display: 'none' }}
              id="import-file"
            />
            <Tooltip label="Importa libreria">
              <IconButton
                icon={<FaUpload />}
                size="sm"
                onClick={() => document.getElementById('import-file').click()}
                aria-label="Importa"
              />
            </Tooltip>
            
            <Tooltip label="Esporta libreria">
              <IconButton
                icon={<FaDownload />}
                size="sm"
                colorScheme="purple"
                onClick={exportLibrary}
                aria-label="Esporta"
              />
            </Tooltip>
          </HStack>
        </HStack>

        {/* Statistiche Principali */}
        <SimpleGrid columns={{ base: 2, md: 4, lg: 6 }} spacing={4}>
          <Card bg="gray.800">
            <CardBody>
              <Stat>
                <StatLabel>
                  <HStack>
                    <Icon as={FaBook} color="blue.400" />
                    <Text>In Lettura</Text>
                  </HStack>
                </StatLabel>
                <StatNumber>{stats.totalReading}</StatNumber>
                {stats.avgProgress > 0 && (
                  <StatHelpText>Media: {stats.avgProgress}%</StatHelpText>
                )}
              </Stat>
            </CardBody>
          </Card>

          <Card bg="gray.800">
            <CardBody>
              <Stat>
                <StatLabel>
                  <HStack>
                    <Icon as={FaBookmark} color="pink.400" />
                    <Text>Preferiti</Text>
                  </HStack>
                </StatLabel>
                <StatNumber>{stats.totalFavorites}</StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card bg="gray.800">
            <CardBody>
              <Stat>
                <StatLabel>
                  <HStack>
                    <Icon as={FaCheck} color="green.400" />
                    <Text>Completati</Text>
                  </HStack>
                </StatLabel>
                <StatNumber>{stats.totalCompleted}</StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card bg="gray.800">
            <CardBody>
              <Stat>
                <StatLabel>
                  <HStack>
                    <Icon as={FaBan} color="red.400" />
                    <Text>Droppati</Text>
                  </HStack>
                </StatLabel>
                <StatNumber>{stats.totalDropped}</StatNumber>
              </Stat>
            </CardBody>
          </Card>

          <Card bg="gray.800">
            <CardBody>
              <Stat>
                <StatLabel>
                  <HStack>
                    <Icon as={FaFire} color="orange.400" />
                    <Text>Streak</Text>
                  </HStack>
                </StatLabel>
                <StatNumber>{stats.streak}</StatNumber>
                <StatHelpText>giorni consecutivi</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg="gray.800">
            <CardBody>
              <Stat>
                <StatLabel>
                  <HStack>
                    <Icon as={FaChartLine} color="purple.400" />
                    <Text>Capitoli</Text>
                  </HStack>
                </StatLabel>
                <StatNumber>{stats.chaptersRead}</StatNumber>
                <StatHelpText>{stats.pagesRead.toLocaleString()} pag</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Insights */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          
          {/* Generi Preferiti */}
          <Card bg="gray.800">
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <Heading size="md">🎨 Generi Preferiti</Heading>
                {stats.topGenres.length > 0 ? (
                  <Wrap>
                    {stats.topGenres.map((genre, i) => (
                      <WrapItem key={i}>
                        <Badge
                          colorScheme={['purple', 'pink', 'blue', 'green', 'orange'][i]}
                          fontSize="md"
                          px={3}
                          py={1}
                        >
                          {genre}
                        </Badge>
                      </WrapItem>
                    ))}
                  </Wrap>
                ) : (
                  <Text color="gray.500">Inizia a leggere per scoprire i tuoi generi preferiti</Text>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* Quick Stats */}
          <Card bg="gray.800">
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <Heading size="md">⚡ Info Rapide</Heading>
                
                <HStack justify="space-between">
                  <Text color="gray.400">Quasi finiti (&gt;80%)</Text>
                  <Badge colorScheme="green">{stats.almostFinished.length}</Badge>
                </HStack>
                
                <HStack justify="space-between">
                  <Text color="gray.400">Nuovi capitoli</Text>
                  <Badge colorScheme="purple">{stats.newChapters}</Badge>
                </HStack>
                
                <HStack justify="space-between">
                  <Text color="gray.400">Ore per finire tutto</Text>
                  <Badge colorScheme="blue">{stats.hoursToFinish}h</Badge>
                </HStack>
                
                <HStack justify="space-between">
                  <Text color="gray.400">Totale manga</Text>
                  <Badge colorScheme="orange">{stats.totalManga}</Badge>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Ultima lettura */}
        {stats.lastRead && (
          <Card bg="gray.800">
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <HStack justify="space-between">
                  <Heading size="md">📖 Ultima Lettura</Heading>
                  <Badge colorScheme="purple">
                    {new Date(stats.lastRead.timestamp).toLocaleDateString()}
                  </Badge>
                </HStack>
                <Text fontSize="lg" fontWeight="bold">{stats.lastRead.title}</Text>
                <Button
                  colorScheme="purple"
                  onClick={() => {
                    const encoded = btoa(stats.lastRead.url)
                      .replace(/\+/g, '-')
                      .replace(/\//g, '_')
                      .replace(/=/g, '');
                    const sourceCode = stats.lastRead.source === 'mangaWorldAdult' ? 'ma' : 'm';
                    navigate(`/manga/${sourceCode}/${encoded}`);
                  }}
                >
                  Continua a leggere
                </Button>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Manga quasi finiti */}
        {stats.almostFinished.length > 0 && (
          <Box>
            <Heading size="md" mb={4}>
              🎯 Quasi Finiti ({stats.almostFinished.length})
            </Heading>
            <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 6 }} spacing={4}>
              {stats.almostFinished.map((manga, i) => (
                <MangaCard key={i} manga={manga} priority={i < 6} />
              ))}
            </SimpleGrid>
          </Box>
        )}

        {/* Call to Action */}
        <Card bg="purple.900" borderColor="purple.500" borderWidth={2}>
          <CardBody>
            <HStack justify="space-between" flexWrap="wrap" gap={4}>
              <VStack align="start">
                <Heading size="md">🚀 Continua la tua avventura!</Heading>
                <Text>Hai {stats.totalReading} manga in corso</Text>
              </VStack>
              <Button
                colorScheme="purple"
                size="lg"
                onClick={() => navigate('/library')}
              >
                Vai alla libreria
              </Button>
            </HStack>
          </CardBody>
        </Card>

      </VStack>
    </Container>
  );
}

export default Dashboard;

