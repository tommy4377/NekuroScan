import React from 'react';
import { Box } from '@chakra-ui/react';
import { Link } from 'react-router-dom';

const Logo = ({ boxSize = '40px', showText = true, fontSize = '2xl', height = '40px', showImage = true, ...rest }) => {
  // Determina l'immagine ottimale in base alla dimensione
  const getOptimalImage = (size) => {
    const numSize = parseInt(size);
    if (numSize <= 96) return '/favicon-96x96.png';
    if (numSize <= 192) return '/web-app-manifest-192x192.png';
    return '/web-app-manifest-512x512.png';
  };

  const optimalImage = getOptimalImage(boxSize);

  return (
    <Box {...rest}>
      <Link 
        to="/home" 
        style={{ 
          textDecoration: 'none',
          display: 'inline-block',
          minWidth: '48px',
          minHeight: '48px',
          padding: '4px'
        }}
      >
        <Box
          display="inline-block"
          transition="transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
          _hover={{
            transform: 'translate3d(0, -2px, 0)'
          }}
        >
          {showImage ? (
            <img
              src={optimalImage}
              alt="NeKuro Scan"
              loading="eager"
              fetchpriority="high"
              width={boxSize}
              height={boxSize}
              style={{ 
                width: boxSize,
                height: boxSize,
                borderRadius: '0.5rem',
                objectFit: 'contain',
                display: 'block'
              }}
              onError={(e) => {
                // Fallback to NK text
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = `
                  <div style="
                    width: ${boxSize};
                    height: ${boxSize};
                    background: #805AD5;
                    border-radius: 0.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 1.25rem;
                    color: white;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                  ">NK</div>
                `;
              }}
            />
          ) : (
            <Box
              boxSize={boxSize}
              bg="purple.500"
              borderRadius="lg"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontWeight="bold"
              fontSize="xl"
              color="white"
              boxShadow="md"
            >
              NK
            </Box>
          )}
        </Box>
      </Link>
    </Box>
  );
};

export default Logo;
