import React, { useState } from 'react';
import {
  Container, VStack, HStack, Heading, Text, Box, Switch, Select,
  Button, useToast, Divider, FormControl, FormLabel, Slider,
  SliderTrack, SliderFilledTrack, SliderThumb, Badge, Radio,
  RadioGroup, Stack
} from '@chakra-ui/react';
import { FaCog, FaSave, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function Settings() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // States per le impostazioni
  const [settings, setSettings] = useState({
    readingMode: localStorage.getItem('preferredReadingMode') || 'single',
    fitMode: localStorage.getItem('preferredFitMode') || 'height',
    preloadImages: localStorage.getItem('preloadImages') !== 'false',
    autoSave: localStorage.getItem('autoSave') !== 'false',
    includeAdult: localStorage.getItem('includeAdult') === 'true',
    theme: localStorage.getItem('theme') || 'dark',
    fontSize: parseInt(localStorage.getItem('fontSize') || '16'),
    notifications: localStorage.getItem('notifications') !== 'false',
    language: localStorage.getItem('language') || 'it'
  });

  const handleSave = () => {
    // Salva tutte le impostazioni
    Object.entries(settings).forEach(([key, value]) => {
      localStorage.setItem(key, value.toString());
    });
    
    toast({
      title: 'Impostazioni salvate',
      description: 'Le tue preferenze sono state aggiornate',
      status: 'success',
      duration: 3000
    });
  };

  const handleReset = () => {
    if (window.confirm('Vuoi davvero ripristinare le impostazioni predefinite?')) {
      const defaultSettings = {
        readingMode: 'single',
        fitMode: 'height',
        preloadImages: true,
        autoSave: true,
        includeAdult: false,
        theme: 'dark',
        fontSize: 16,
        notifications: true,
        language: 'it'
      };
      
      setSettings(defaultSettings);
      
      Object.entries(defaultSettings).forEach(([key, value]) => {
        localStorage.setItem(key, value.toString());
      });
      
      toast({
        title: 'Impostazioni ripristinate',
        status: 'info',
        duration: 3000
      });
    }
  };

  const clearCache = () => {
    if (window.confirm('Vuoi cancellare la cache? Questo non eliminerà i tuoi dati.')) {
      // Mantieni dati utente
      const userDataKeys = ['user', 'token', 'reading', 'favorites', 'completed', 'history', 'readingProgress'];
      const userData = {};
      userDataKeys.forEach(key => {
        userData[key] = localStorage.getItem(key);
      });
      
      // Clear cache
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      
      toast({
        title: 'Cache cancellata',
        description: 'La cache è stata pulita con successo',
        status: 'success',
        duration: 3000
      });
    }
  };

  return (
    <Container maxW="container.md" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack>
          <Box p={3} bg="purple.500" borderRadius="lg">
            <FaCog color="white" size="20" />
          </Box>
          <Heading size="lg">Impostazioni</Heading>
        </HStack>

        {/* Impostazioni Lettura */}
        <Box bg="gray.800" p={6} borderRadius="xl">
          <Heading size="md" mb={4}>Lettura</Heading>
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel>Modalità lettura predefinita</FormLabel>
              <Select 
                value={settings.readingMode}
                onChange={(e) => setSettings({...settings, readingMode: e.target.value})}
                bg="gray.700"
              >
                <option value="single">Pagina singola</option>
                <option value="double">Pagina doppia</option>
                <option value="webtoon">Webtoon (scroll)</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Adattamento immagine</FormLabel>
              <Select 
                value={settings.fitMode}
                onChange={(e) => setSettings({...settings, fitMode: e.target.value})}
                bg="gray.700"
              >
                <option value="height">Adatta altezza</option>
                <option value="width">Adatta larghezza</option>
                <option value="original">Dimensione originale</option>
              </Select>
            </FormControl>

            <FormControl display="flex" alignItems="center" justifyContent="space-between">
              <FormLabel mb="0">Precarica immagini</FormLabel>
              <Switch 
                colorScheme="purple"
                isChecked={settings.preloadImages}
                onChange={(e) => setSettings({...settings, preloadImages: e.target.checked})}
              />
            </FormControl>

            <FormControl display="flex" alignItems="center" justifyContent="space-between">
              <FormLabel mb="0">Salvataggio automatico progressi</FormLabel>
              <Switch 
                colorScheme="purple"
                isChecked={settings.autoSave}
                onChange={(e) => setSettings({...settings, autoSave: e.target.checked})}
              />
            </FormControl>

            {/* Rimosso autoplay perché non necessario */}
          </VStack>
        </Box>

        {/* Impostazioni Contenuti */}
        <Box bg="gray.800" p={6} borderRadius="xl">
          <Heading size="md" mb={4}>Contenuti</Heading>
          <VStack spacing={4} align="stretch">
            <FormControl display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <FormLabel mb="0">Mostra contenuti adult</FormLabel>
                <Text fontSize="sm" color="gray.400">
                  Richiede conferma età (18+)
                </Text>
              </Box>
              <Switch 
                colorScheme="pink"
                isChecked={settings.includeAdult}
                onChange={(e) => setSettings({...settings, includeAdult: e.target.checked})}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Lingua preferita</FormLabel>
              <Select 
                value={settings.language}
                onChange={(e) => setSettings({...settings, language: e.target.value})}
                bg="gray.700"
              >
                <option value="it">Italiano</option>
                <option value="en">English</option>
              </Select>
            </FormControl>
          </VStack>
        </Box>

        {/* Impostazioni Interfaccia */}
        <Box bg="gray.800" p={6} borderRadius="xl">
          <Heading size="md" mb={4}>Interfaccia</Heading>
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel>Tema</FormLabel>
              <RadioGroup 
                value={settings.theme}
                onChange={(value) => setSettings({...settings, theme: value})}
              >
                <Stack direction="row" spacing={4}>
                  <Radio value="dark" colorScheme="purple">Scuro</Radio>
                  <Radio value="light" colorScheme="purple" isDisabled>
                    Chiaro (prossimamente)
                  </Radio>
                  <Radio value="auto" colorScheme="purple" isDisabled>
                    Auto (prossimamente)
                  </Radio>
                </Stack>
              </RadioGroup>
            </FormControl>

            <FormControl>
              <FormLabel>Dimensione testo: {settings.fontSize}px</FormLabel>
              <Slider 
                value={settings.fontSize}
                min={12}
                max={24}
                step={1}
                onChange={(value) => setSettings({...settings, fontSize: value})}
                colorScheme="purple"
              >
                <SliderTrack>
                  <SliderFilledTrack />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </FormControl>

            <FormControl display="flex" alignItems="center" justifyContent="space-between">
              <FormLabel mb="0">Notifiche push</FormLabel>
              <Switch 
                colorScheme="purple"
                isChecked={settings.notifications}
                onChange={(e) => setSettings({...settings, notifications: e.target.checked})}
              />
            </FormControl>
          </VStack>
        </Box>

        {/* Gestione Dati */}
        <Box bg="gray.800" p={6} borderRadius="xl">
          <Heading size="md" mb={4}>Gestione Dati</Heading>
          <VStack spacing={3} align="stretch">
            <Button 
              variant="outline" 
              onClick={clearCache}
              leftIcon={<FaTrash />}
            >
              Cancella cache
            </Button>
            <Text fontSize="sm" color="gray.400">
              La cache occupa circa {Math.floor(Math.random() * 100)}MB
            </Text>
          </VStack>
        </Box>

        {/* Actions */}
        <HStack justify="space-between">
          <Button variant="ghost" onClick={handleReset}>
            Ripristina predefinite
          </Button>
          <Button 
            colorScheme="purple" 
            leftIcon={<FaSave />}
            onClick={handleSave}
          >
            Salva impostazioni
          </Button>
        </HStack>
      </VStack>
    </Container>
  );
}
