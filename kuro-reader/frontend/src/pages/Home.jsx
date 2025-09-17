// Sostituisci la sezione categorie con questa:
const categories = [
  { name: 'Azione', query: 'action manga' },
  { name: 'Romance', query: 'romance manga' },
  { name: 'Fantasy', query: 'fantasy manga' },
  { name: 'Isekai', query: 'isekai manga' },
  { name: 'Shounen', query: 'shounen manga' },
  { name: 'Seinen', query: 'seinen manga' },
  { name: 'Josei', query: 'josei manga' },
  { name: 'Shoujo', query: 'shoujo manga' }
];

// Nella sezione Categories:
<SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
  {categories.map(category => (
    <MotionBox
      key={category.name}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => navigate(`/search?q=${encodeURIComponent(category.query)}`)}
    >
      <Box
        bg="gray.800"
        p={6}
        borderRadius="lg"
        textAlign="center"
        cursor="pointer"
        transition="all 0.3s"
        _hover={{ bg: 'gray.700' }}
      >
        <Text fontWeight="bold">{category.name}</Text>
      </Box>
    </MotionBox>
  ))}
</SimpleGrid>

// Aggiungi import:
import { useNavigate } from 'react-router-dom';
// E poi nel componente:
const navigate = useNavigate();