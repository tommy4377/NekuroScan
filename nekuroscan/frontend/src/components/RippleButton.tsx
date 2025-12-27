/**
 * RIPPLE BUTTON - Button con ripple effect
 * ✅ SEZIONE 1: Micro-interactions
 */

import { Box, Button, ButtonProps } from '@chakra-ui/react';
import { useRipple } from '@/hooks/useRipple';
import type { ReactNode } from 'react';

interface RippleButtonProps extends ButtonProps {
  children: ReactNode;
}

const RippleButton = ({ children, onClick, ...props }: RippleButtonProps) => {
  const { ripples, addRipple } = useRipple();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    addRipple(e);
    onClick?.(e);
  };

  return (
    <Button
      {...props}
      onClick={handleClick}
      position="relative"
      overflow="hidden"
    >
      {children}
      {ripples.map(ripple => (
        <Box
          key={ripple.id}
          position="absolute"
          left={`${ripple.x}px`}
          top={`${ripple.y}px`}
          width={`${ripple.size}px`}
          height={`${ripple.size}px`}
          borderRadius="50%"
          bg="whiteAlpha.400"
          transform="scale(0)"
          sx={{
            animation: 'ripple 0.6s ease-out',
            '@keyframes ripple': {
              'to': {
                transform: 'scale(4)',
                opacity: 0,
              },
            },
          }}
        />
      ))}
    </Button>
  );
};

export default RippleButton;

