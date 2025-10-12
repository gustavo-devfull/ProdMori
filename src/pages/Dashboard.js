import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Spin,
  Alert,
  Button,
  List
} from 'antd';
import { ShopOutlined, ShoppingOutlined, PlusOutlined, CalendarOutlined } from '@ant-design/icons';
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
                      <span style={{ 
                        flex: 1, 
                        marginRight: '8px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {factory?.name || 'Nome não disponível'}
                      </span>
                      <span style={{ 
                        fontSize: '10px',
                        color: '#666'
                      }}>
                        {factory?.segment || 'Sem segmento'}
                      </span>
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
                      <span style={{ 
                        flex: 1, 
                        marginRight: '8px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {product?.name || 'Nome não disponível'}
                      </span>
                      <span style={{ 
                        fontSize: '10px',
                        color: '#666'
                      }}>
                        {product?.price ? `¥ ${product.price.toFixed(2)}` : 'Sob consulta'}
                      </span>
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
