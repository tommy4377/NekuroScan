// 🧭 BREADCRUMBS - Navigazione a briciole di pane
import React from 'react';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, Text, Icon
} from '@chakra-ui/react';
import { ChevronRightIcon } from '@chakra-ui/icons';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaBook, FaSearch, FaStar } from 'react-icons/fa';

const routeNames = {
  home: { label: 'Home', icon: FaHome },
  search: { label: 'Cerca', icon: FaSearch },
  library: { label: 'La mia libreria', icon: FaBook },
  dashboard: { label: 'Dashboard', icon: FaStar },
  notifications: { label: 'Notifiche', icon: FaStar },
  downloads: { label: 'Download', icon: FaStar },
  profile: { label: 'Profilo', icon: FaStar },
  settings: { label: 'Impostazioni', icon: FaStar },
  categories: { label: 'Categorie', icon: FaStar },
  trending: { label: 'Trending', icon: FaStar },
  popular: { label: 'Popolari', icon: FaStar },
  latest: { label: 'Ultimi', icon: FaStar },
  manga: { label: 'Manga', icon: FaBook },
  read: { label: 'Lettura', icon: FaBook }
};

function Breadcrumbs() {
  // ✅ FIX React #300: Chiama TUTTI gli hooks PRIMA di qualsiasi return condizionale
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  // Return condizionali DOPO tutti gli hooks
  // Nascondi nel reader
  if (location.pathname.includes('/read/')) return null;
  
  // Nascondi in home e welcome
  if (location.pathname === '/' || location.pathname === '/home') return null;
  
  if (pathSegments.length === 0) return null;

  return (
    <Breadcrumb
      spacing={2}
      separator={<ChevronRightIcon color="gray.500" />}
      fontSize="sm"
      py={4}
      px={{ base: 4, md: 0 }}
    >
      <BreadcrumbItem>
        <BreadcrumbLink as={Link} to="/home" color="gray.400" _hover={{ color: 'purple.400' }}>
          <Icon as={FaHome} mr={1} />
          Home
        </BreadcrumbLink>
      </BreadcrumbItem>
      
      {pathSegments.map((segment, index) => {
        const route = routeNames[segment];
        const isLast = index === pathSegments.length - 1;
        const path = '/' + pathSegments.slice(0, index + 1).join('/');
        
        // Per route con parametri (manga, user, etc)
        if (!route) {
          if (segment.length > 20) {
            // È probabilmente un ID encoded
            return null;
          }
          return (
            <BreadcrumbItem key={index} isCurrentPage={isLast}>
              <Text color={isLast ? 'white' : 'gray.400'}>
                {decodeURIComponent(segment)}
              </Text>
            </BreadcrumbItem>
          );
        }
        
        return (
          <BreadcrumbItem key={index} isCurrentPage={isLast}>
            {isLast ? (
              <Text color="white" fontWeight="bold">
                {route.icon && <Icon as={route.icon} mr={1} />}
                {route.label}
              </Text>
            ) : (
              <BreadcrumbLink 
                as={Link} 
                to={path} 
                color="gray.400"
                _hover={{ color: 'purple.400' }}
              >
                {route.icon && <Icon as={route.icon} mr={1} />}
                {route.label}
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
        );
      })}
    </Breadcrumb>
  );
}

export default Breadcrumbs;

