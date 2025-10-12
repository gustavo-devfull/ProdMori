import React, { useState, useEffect } from 'react';
import { Layout, Typography, Button, Space } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header } = Layout;
const { Title } = Typography;

const AppHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <Header className="ant-layout-header" style={{ 
      display: 'flex', 
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      backgroundColor: '#001529'
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img 
          src="/RAVI-LOGO-BRANCO.svg" 
          alt="RAVI Logo" 
          style={{ 
            height: isMobile ? '32px' : '40px',
            marginRight: '16px'
          }}
        />
        <Title 
          level={isMobile ? 4 : 3} 
          style={{ color: 'white', margin: 0 }}
        >
          ProductMobile
        </Title>
      </div>
      
      <Space size="middle">
        <Button
          type={location.pathname === '/' ? 'primary' : 'default'}
          onClick={() => handleNavigation('/')}
          style={{
            color: location.pathname === '/' ? 'white' : '#1890ff',
            borderColor: '#1890ff',
            backgroundColor: location.pathname === '/' ? '#1890ff' : 'transparent'
          }}
        >
          Dashboard
        </Button>
        <Button
          type={location.pathname === '/factories' ? 'primary' : 'default'}
          onClick={() => handleNavigation('/factories')}
          style={{
            color: location.pathname === '/factories' ? 'white' : '#1890ff',
            borderColor: '#1890ff',
            backgroundColor: location.pathname === '/factories' ? '#1890ff' : 'transparent'
          }}
        >
          Fábricas
        </Button>
        <Button
          type={location.pathname === '/products' ? 'primary' : 'default'}
          onClick={() => handleNavigation('/products')}
          style={{
            color: location.pathname === '/products' ? 'white' : '#1890ff',
            borderColor: '#1890ff',
            backgroundColor: location.pathname === '/products' ? '#1890ff' : 'transparent'
          }}
        >
          Produtos
        </Button>
      </Space>
    </Header>
  );
};

export default AppHeader;
