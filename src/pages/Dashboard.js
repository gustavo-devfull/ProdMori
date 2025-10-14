import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Spinner,
  Alert,
  Button,
  Form
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import factoryServiceAPI from '../services/factoryServiceAPI';
import productServiceAPI from '../services/productServiceAPI';
import { useLanguage } from '../contexts/LanguageContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    factories: 0,
    products: 0
  });
  const [allFactories, setAllFactories] = useState([]);
  const [selectedFactory, setSelectedFactory] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const [factories, products] = await Promise.all([
          factoryServiceAPI.getAllFactories(),
          productServiceAPI.getAllProducts()
        ]);
        
        // Verificar se os dados são arrays válidos
        const validFactories = Array.isArray(factories) ? factories : [];
        const validProducts = Array.isArray(products) ? products : [];
        
        setStats({
          factories: validFactories.length,
          products: validProducts.length
        });
        
        setAllFactories(validFactories);
      } catch (err) {
        setError(t('Erro ao carregar estatísticas', '加载统计信息时出错'));
        console.error(err);
        
        // Definir valores padrão em caso de erro
        setStats({
          factories: 0,
          products: 0
        });
        
        setAllFactories([]);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [t]);

  const handleFactorySelect = (factoryId) => {
    if (factoryId) {
      // Navegar para a página de produtos com a fábrica selecionada
      navigate(`/products?factory=${factoryId}`);
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
        <h2 className="mb-0 fs-5 fw-semibold">{t('ProductMobile Ravi', '产品移动端拉维')}</h2>
      </div>
      
      {error && (
        <Alert variant="danger" className="mb-3">
          <Alert.Heading>{t('Erro', '错误')}</Alert.Heading>
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
                  <span className="fw-medium">{t('Total de Fábricas/Lojas', '工厂/商店总数')}</span>
                </div>
                <div className="fs-3 fw-bold text-success">
                  {stats.factories}
                </div>
              </div>
              
              {/* Caixa de seleção de fábricas */}
              <div className="mb-3">
                <div className="d-flex align-items-center mb-2 text-muted small">
                  <i className="bi bi-list-ul me-1"></i>
                  {t('Selecionar Fábrica:', '选择工厂:')}
                </div>
                <Form.Select
                  value={selectedFactory}
                  onChange={(e) => {
                    setSelectedFactory(e.target.value);
                    handleFactorySelect(e.target.value);
                  }}
                  size="sm"
                >
                  <option value="">{t('Escolha uma fábrica...', '选择工厂...')}</option>
                  {allFactories.map((factory) => (
                    <option key={factory.id} value={factory.id}>
                      {factory.name} - {factory.segment || t('Sem segmento', '无行业')}
                    </option>
                  ))}
                </Form.Select>
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
                {t('Cadastrar Fábrica', '注册工厂')}
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
                  <span className="fw-medium">{t('Total de Produtos', '产品总数')}</span>
                </div>
                <div className="fs-3 fw-bold text-primary">
                  {stats.products}
                </div>
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
                {t('Cadastrar Produto', '注册产品')}
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
