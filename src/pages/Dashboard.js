import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Spin,
  Alert,
  Button
} from 'antd';
import { ShopOutlined, ShoppingOutlined, PlusOutlined } from '@ant-design/icons';
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
      
      setStats({
        factories: factories.length,
        products: products.length
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
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Dashboard</h2>
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
                wave={false}
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
                wave={false}
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
