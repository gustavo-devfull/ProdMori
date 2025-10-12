import React from 'react';
import { Alert, Button, Card } from 'antd';
import { ReloadOutlined, BugOutlined } from '@ant-design/icons';

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
        <div style={{ 
          padding: '24px', 
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Card 
            style={{ 
              maxWidth: '600px', 
              width: '100%',
              textAlign: 'center'
            }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BugOutlined style={{ marginRight: '8px', color: '#ff4d4f' }} />
                Erro na Aplicação
              </div>
            }
          >
            <Alert
              message="Ocorreu um erro inesperado"
              description={
                <div>
                  <p>Algo deu errado na aplicação. Isso pode ser causado por:</p>
                  <ul style={{ textAlign: 'left', margin: '16px 0' }}>
                    <li>Problemas de conectividade</li>
                    <li>Dados corrompidos</li>
                    <li>Conflitos de CSS dinâmico</li>
                    <li>Problemas de Hot Module Replacement</li>
                  </ul>
                  <p><strong>Tentativas de recuperação:</strong> {this.state.retryCount}</p>
                </div>
              }
              type="error"
              showIcon
              style={{ marginBottom: '24px' }}
            />
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Button 
                type="primary" 
                icon={<ReloadOutlined />}
                onClick={this.handleRetry}
                size="large"
              >
                Tentar Novamente
              </Button>
              
              <Button 
                icon={<ReloadOutlined />}
                onClick={this.handleReload}
                size="large"
              >
                Recarregar Página
              </Button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ 
                marginTop: '24px', 
                textAlign: 'left',
                backgroundColor: '#f5f5f5',
                padding: '16px',
                borderRadius: '6px',
                border: '1px solid #d9d9d9'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                  Detalhes do Erro (Desenvolvimento)
                </summary>
                <div style={{ marginTop: '12px' }}>
                  <h4>Erro:</h4>
                  <pre style={{ 
                    whiteSpace: 'pre-wrap', 
                    fontSize: '12px',
                    backgroundColor: '#fff',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #d9d9d9'
                  }}>
                    {this.state.error && this.state.error.toString()}
                  </pre>
                  
                  <h4>Stack Trace:</h4>
                  <pre style={{ 
                    whiteSpace: 'pre-wrap', 
                    fontSize: '12px',
                    backgroundColor: '#fff',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #d9d9d9'
                  }}>
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </div>
              </details>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;