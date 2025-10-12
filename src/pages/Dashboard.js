import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Spin,
  Alert,
  Button,
  List,
  Typography
} from 'antd';
import { ShopOutlined, ShoppingOutlined, PlusOutlined, CalendarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import factoryService from '../services/factoryService';
import productService from '../services/productService';

const { Text } = Typography;

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
      
      // Ordenar por data de criação (mais recentes primeiro) e pegar os 5 últimos
      const recentFactories = factories
        .sort((a, b) => new Date(b.createdAt || b.id) - new Date(a.createdAt || a.id))
        .slice(0, 5);
      
      const recentProducts = products
        .sort((a, b) => new Date(b.createdAt || b.id) - new Date(a.createdAt || a.id))
        .slice(0, 5);
      
      setStats({
        factories: factories.length,
        products: products.length
      });
      
      setRecentItems({
        factories: recentFactories,
        products: recentProducts
      });
    } catch (err) {
      setError('Erro ao carregar estatísticas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#ffffff', backgroundColor: '#0175a6', padding: '10px', borderRadius: '5px' }}>ProductMobile Ravi</h2>
      </div>
      
      {error && (
        <Alert
          message="Erro"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card 
            hoverable
            onClick={() => navigate('/factories')}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <ShopOutlined style={{ fontSize: '20px', color: '#3f8600', marginRight: '8px' }} />
                <span style={{ fontSize: '16px', fontWeight: '500' }}>Total de Fábricas/Lojas</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3f8600' }}>
                {stats.factories}
              </div>
            </div>
            
            {/* Lista dos 5 últimos cadastrados */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: 8,
                fontSize: '14px',
                fontWeight: '500',
                color: '#666'
              }}>
                <CalendarOutlined style={{ marginRight: '4px' }} />
                Últimos 5 cadastrados:
              </div>
              <List
                size="small"
                dataSource={recentItems.factories}
                renderItem={(factory) => (
                  <List.Item style={{ padding: '4px 0', fontSize: '12px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      width: '100%'
                    }}>
                      <Text ellipsis style={{ flex: 1, marginRight: '8px' }}>
                        {factory.name}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '10px' }}>
                        {factory.segment || 'Sem segmento'}
                      </Text>
                    </div>
                  </List.Item>
                )}
              />
            </div>
            
            <div>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/factories');
                }}
                size="large"
                style={{ width: '100%', height: '48px', fontSize: '16px' }}
              >
                Cadastrar Fábrica
              </Button>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card 
            hoverable
            onClick={() => navigate('/products')}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <ShoppingOutlined style={{ fontSize: '20px', color: '#1890ff', marginRight: '8px' }} />
                <span style={{ fontSize: '16px', fontWeight: '500' }}>Total de Produtos</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                {stats.products}
              </div>
            </div>
            
            {/* Lista dos 5 últimos cadastrados */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: 8,
                fontSize: '14px',
                fontWeight: '500',
                color: '#666'
              }}>
                <CalendarOutlined style={{ marginRight: '4px' }} />
                Últimos 5 cadastrados:
              </div>
              <List
                size="small"
                dataSource={recentItems.products}
                renderItem={(product) => (
                  <List.Item style={{ padding: '4px 0', fontSize: '12px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      width: '100%'
                    }}>
                      <Text ellipsis style={{ flex: 1, marginRight: '8px' }}>
                        {product.name}
                      </Text>
                      <Text type="secondary" style={{ fontSize: '10px' }}>
                        {product.price ? `¥ ${product.price.toFixed(2)}` : 'Sob consulta'}
                      </Text>
                    </div>
                  </List.Item>
                )}
              />
            </div>
            
            <div>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/products');
                }}
                size="large"
                style={{ width: '100%', height: '48px', fontSize: '16px' }}
              >
                Cadastrar Produto
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
