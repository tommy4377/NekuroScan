// ErrorBoundary.jsx - VERSIONE CORRETTA v2.0
import React from 'react';
import { Box, Container, VStack, Heading, Text, Button, Code, HStack } from '@chakra-ui/react';
import { FaExclamationTriangle, FaHome } from 'react-icons/fa';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught:', error, errorInfo);
    
    this.setState((prevState) => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    if (window.Sentry) {
      window.Sentry.captureException(error);
    }

    // Previeni loop infinito
    if (this.state.errorCount >= 3) {
      console.error('Too many errors, forcing redirect');
      window.location.href = '/home';
    }
  }

  handleGoHome = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    // NON usare reload! Naviga direttamente
    window.location.href = '/home';
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
              </Box>
            )}

            <Button
              leftIcon={<FaHome />}
              colorScheme="purple"
              onClick={this.handleGoHome}
            >
              Torna alla Home
            </Button>
          </VStack>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
