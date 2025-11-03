// 📱 SIDEBAR - Navigation laterale per desktop
import React from 'react';
import {
  Box, VStack, HStack, Text, Icon, Button, Divider,
  useBreakpointValue, Collapse, Badge, Tooltip
} from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaHome, FaSearch, FaBook, FaFire, FaClock, FaStar,
  FaLayerGroup, FaChartLine, FaBell, FaDownload, FaCog,
  FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import { BiCategoryAlt } from 'react-icons/bi';

const menuItems = [
  { path: '/home', label: 'Home', icon: FaHome, color: 'purple' },
  { path: '/search', label: 'Cerca', icon: FaSearch, color: 'blue' },
  { path: '/trending', label: 'Trending', icon: FaFire, color: 'orange' },
  { path: '/popular', label: 'Popolari', icon: FaStar, color: 'yellow' },
  { path: '/latest', label: 'Ultimi', icon: FaClock, color: 'green' },
  { path: '/categories', label: 'Categorie', icon: BiCategoryAlt, color: 'pink' },
  { type: 'divider' },
  { path: '/library', label: 'La mia libreria', icon: FaBook, color: 'purple', protected: true },
  { path: '/dashboard', label: 'Dashboard', icon: FaChartLine, color: 'blue', protected: true },
  { path: '/notifications', label: 'Notifiche', icon: FaBell, color: 'orange', protected: true, badge: 'new' },
  { path: '/downloads', label: 'Download', icon: FaDownload, color: 'green', protected: true },
  { type: 'divider' },
  { path: '/settings', label: 'Impostazioni', icon: FaCog, color: 'gray', protected: true }
];

function Sidebar({ isCollapsed, setIsCollapsed, user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useBreakpointValue({ base: false, lg: true });

  // Nascondi sidebar nel reader
  if (location.pathname.includes('/read/')) return null;
  
  // Nascondi su mobile
  if (!isDesktop) return null;

  return (
    <Box
      position="fixed"
      left={0}
      top="60px"
      h="calc(100vh - 60px)"
      w={isCollapsed ? '70px' : '250px'}
      bg="gray.900"
      borderRight="1px solid"
      borderColor="gray.800"
      transition="width 0.3s"
      zIndex={5}
      overflowY="auto"
      css={{
        '&::-webkit-scrollbar': { width: '6px' },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': {
          background: 'var(--chakra-colors-purple-500)',
          borderRadius: '3px'
        }
      }}
    >
      <VStack spacing={1} align="stretch" p={2}>
        {/* Toggle Button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsCollapsed(!isCollapsed)}
          justifyContent={isCollapsed ? 'center' : 'flex-start'}
          leftIcon={isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
          mb={2}
        >
          {!isCollapsed && 'Comprimi'}
        </Button>

        {menuItems.map((item, i) => {
          if (item.type === 'divider') {
            return <Divider key={i} borderColor="gray.700" my={2} />;
          }

          // Nascondi item protetti se non loggato
          if (item.protected && !user) return null;

          const isActive = location.pathname === item.path;
          const IconComponent = item.icon;

          return (
            <Tooltip
              key={item.path}
              label={isCollapsed ? item.label : ''}
              placement="right"
              isDisabled={!isCollapsed}
            >
              <Button
                size="sm"
                variant={isActive ? 'solid' : 'ghost'}
                colorScheme={isActive ? item.color : 'gray'}
                onClick={() => navigate(item.path)}
                justifyContent={isCollapsed ? 'center' : 'flex-start'}
                px={isCollapsed ? 2 : 4}
                position="relative"
              >
                <HStack spacing={3} w="100%">
                  <Icon as={IconComponent} boxSize={5} />
                  {!isCollapsed && (
                    <>
                      <Text flex="1" textAlign="left">{item.label}</Text>
                      {item.badge && (
                        <Badge colorScheme="purple" fontSize="xs">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </HStack>
                
                {isActive && (
                  <Box
                    position="absolute"
                    left={0}
                    top="50%"
                    transform="translateY(-50%)"
                    w="3px"
                    h="70%"
                    bg={`${item.color}.500`}
                    borderRadius="0 3px 3px 0"
                  />
                )}
              </Button>
            </Tooltip>
          );
        })}
      </VStack>
    </Box>
  );
}

export default Sidebar;

