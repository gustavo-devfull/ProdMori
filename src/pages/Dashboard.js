import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Spinner,
  Alert,
  Button,
  ListGroup
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import factoryService from '../services/factoryService';
import productService from '../services/productService';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    factories: 0,
    products: 0
  });
  const [recentItems, setRecentItems] = useState({
    factories: [],
    products: []
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [factories, products] = await Promise.all([
        factoryService.getAllFactories(),
        productService.getAllProducts()
      ]);
      
      // Verificar se os dados são arrays válidos
      const validFactories = Array.isArray(factories) ? factories : [];
      const validProducts = Array.isArray(products) ? products : [];
      
      // Ordenar por data de criação (mais recentes primeiro) e pegar os 5 últimos
      const recentFactories = validFactories
        .filter(factory => factory && typeof factory === 'object')
        .sort((a, b) => {
          const dateA = new Date(a.createdAt || a.id || 0);
          const dateB = new Date(b.createdAt || b.id || 0);
          return dateB - dateA;
        })
        .slice(0, 5);
      
      const recentProducts = validProducts
        .filter(product => product && typeof product === 'object')
        .sort((a, b) => {
          const dateA = new Date(a.createdAt || a.id || 0);
          const dateB = new Date(b.createdAt || b.id || 0);
          return dateB - dateA;
        })
        .slice(0, 5);
      
      setStats({
        factories: validFactories.length,
        products: validProducts.length
      });
      
      setRecentItems({
        factories: recentFactories,
        products: recentProducts
      });
    } catch (err) {
      setError('Erro ao carregar estatísticas');
      console.error(err);
      
      // Definir valores padrão em caso de erro
      setStats({
        factories: 0,
        products: 0
      });
      
      setRecentItems({
        factories: [],
        products: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="bg-primary text-white p-3 rounded mb-3">
        <h2 className="mb-0 fs-5 fw-semibold">ProductMobile Ravi</h2>
      </div>
      
      {error && (
        <Alert variant="danger" className="mb-3">
          <Alert.Heading>Erro</Alert.Heading>
          {error}
        </Alert>
      )}

      <Row className="g-3">
        <Col xs={12} md={6}>
          <Card 
            className="h-100"
            onClick={() => navigate('/factories')}
            style={{ cursor: 'pointer' }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center">
                  <i className="bi bi-shop me-2 text-success fs-5"></i>
                  <span className="fw-medium">Total de Fábricas/Lojas</span>
                </div>
                <div className="fs-3 fw-bold text-success">
                  {stats.factories}
                </div>
              </div>
              
              {/* Lista dos 5 últimos cadastrados */}
              <div className="mb-3">
                <div className="d-flex align-items-center mb-2 text-muted small">
                  <i className="bi bi-calendar me-1"></i>
                  Últimos 5 cadastrados:
                </div>
                <ListGroup variant="flush">
                  {recentItems.factories.map((factory, index) => (
                    <ListGroup.Item key={index} className="px-0 py-1 border-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-truncate me-2 flex-grow-1">
                          {factory?.name || 'Nome não disponível'}
                        </span>
                        <small className="text-muted">
                          {factory?.segment || 'Sem segmento'}
                        </small>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
              
              <Button 
                variant="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/factories');
                }}
                className="w-100"
                size="lg"
              >
                <i className="bi bi-plus-circle me-2"></i>
                Cadastrar Fábrica
              </Button>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card 
            className="h-100"
            onClick={() => navigate('/products')}
            style={{ cursor: 'pointer' }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center">
                  <i className="bi bi-bag me-2 text-primary fs-5"></i>
                  <span className="fw-medium">Total de Produtos</span>
                </div>
                <div className="fs-3 fw-bold text-primary">
                  {stats.products}
                </div>
              </div>
              
              {/* Lista dos 5 últimos cadastrados */}
              <div className="mb-3">
                <div className="d-flex align-items-center mb-2 text-muted small">
                  <i className="bi bi-calendar me-1"></i>
                  Últimos 5 cadastrados:
                </div>
                <ListGroup variant="flush">
                  {recentItems.products.map((product, index) => (
                    <ListGroup.Item key={index} className="px-0 py-1 border-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-truncate me-2 flex-grow-1">
                          {product?.name || 'Nome não disponível'}
                        </span>
                        <small className="text-muted">
                          {product?.price && typeof product.price === 'number' ? `¥ ${product.price.toFixed(2)}` : 'Sob consulta'}
                        </small>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
              
              <Button 
                variant="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/products');
                }}
                className="w-100"
                size="lg"
              >
                <i className="bi bi-plus-circle me-2"></i>
                Cadastrar Produto
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
