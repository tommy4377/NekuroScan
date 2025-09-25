import { useEffect } from 'react';
import { useToast } from '@chakra-ui/react';
import useAuth from '../hooks/useAuth';

function NotificationManager() {
  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    // Registra service worker
    registerServiceWorker();
  }, [user]);

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registrato:', registration);
        
        // Controlla se ci sono aggiornamenti
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              toast({
                title: 'Nuova versione disponibile',
                description: 'Ricarica per aggiornare',
                status: 'info',
                duration: 5000,
              });
            }
          });
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  };

  return null;
}

export default NotificationManager;