import React from 'react';
import { Alert, Button, Card } from 'react-bootstrap';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // Update state with error info
    this.setState({ 
      errorInfo,
      retryCount: this.state.retryCount + 1
    });
    
    // Log to external service if needed
    if (process.env.NODE_ENV === 'production') {
      // Here you could send error to logging service
      console.error('Production error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  }

  handleReload = () => {
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '400px' }}>
          <Card className="w-100" style={{ maxWidth: '600px' }}>
            <Card.Header className="text-center">
              <i className="bi bi-bug-fill text-danger me-2"></i>
              Erro na Aplicação
            </Card.Header>
            <Card.Body>
              <Alert variant="danger">
                <Alert.Heading>Ocorreu um erro inesperado</Alert.Heading>
                <div>
                  <p>Algo deu errado na aplicação. Isso pode ser causado por:</p>
                  <ul>
                    <li>Problemas de conectividade</li>
                    <li>Dados corrompidos</li>
                    <li>Conflitos de CSS dinâmico</li>
                    <li>Problemas de Hot Module Replacement</li>
                  </ul>
                  <p><strong>Tentativas de recuperação:</strong> {this.state.retryCount}</p>
                </div>
              </Alert>
              
              <div className="d-flex gap-2 justify-content-center">
                <Button 
                  variant="primary" 
                  onClick={this.handleRetry}
                  size="lg"
                >
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Tentar Novamente
                </Button>
                
                <Button 
                  variant="outline-secondary"
                  onClick={this.handleReload}
                  size="lg"
                >
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Recarregar Página
                </Button>
              </div>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="fw-bold" style={{ cursor: 'pointer' }}>
                    Detalhes do Erro (Desenvolvimento)
                  </summary>
                  <div className="mt-3">
                    <h5>Erro:</h5>
                    <pre className="bg-light p-3 rounded border" style={{ fontSize: '12px' }}>
                      {this.state.error && this.state.error.toString()}
                    </pre>
                    
                    <h5>Stack Trace:</h5>
                    <pre className="bg-light p-3 rounded border" style={{ fontSize: '12px' }}>
                      {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                </details>
              )}
            </Card.Body>
          </Card>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;