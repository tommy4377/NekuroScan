import React from 'react';
import { Box, Container, VStack, Heading, Text, Button, Code, HStack } from '@chakra-ui/react';
import { FaExclamationTriangle, FaHome, FaRedo } from 'react-icons/fa';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
    
    // Log to error reporting service if needed
    if (window.Sentry) {
      window.Sentry.captureException(error);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container maxW="container.md" py={20}>
          <VStack spacing={6} align="center">
            <FaExclamationTriangle size={60} color="#F56565" />
            <Heading size="xl">Oops! Qualcosa è andato storto</Heading>
            <Text color="gray.400" textAlign="center">
              Si è verificato un errore imprevisto. Ci scusiamo per l'inconveniente.
            </Text>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box w="100%" p={4} bg="gray.800" borderRadius="md">
                <Text fontWeight="bold" mb={2}>Dettagli errore:</Text>
                <Code colorScheme="red" p={2} borderRadius="md" fontSize="sm">
                  {this.state.error.toString()}
                </Code>
                {this.state.errorInfo && (
                  <Code 
                    mt={2} 
                    p={2} 
                    borderRadius="md" 
                    fontSize="xs" 
                    display="block"
                    whiteSpace="pre-wrap"
                  >
                    {this.state.errorInfo.componentStack}
                  </Code>
                )}
              </Box>
            )}
            
            <HStack spacing={4}>
              <Button
                leftIcon={<FaRedo />}
                colorScheme="purple"
                onClick={this.handleReset}
              >
                Ricarica pagina
              </Button>
              <Button
                leftIcon={<FaHome />}
                variant="outline"
                onClick={this.handleGoHome}
              >
                Torna alla Home
              </Button>
            </HStack>
          </VStack>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
