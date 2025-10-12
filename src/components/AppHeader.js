import React, { useState, useEffect } from 'react';
import { Layout, Typography, Button } from 'antd';
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
      padding: isMobile ? '0 12px' : '0 16px',
      backgroundColor: '#001529',
      minHeight: '64px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
        <img 
          src="/RAVI-LOGO-BRANCO.svg" 
          alt="RAVI Logo" 
          style={{ 
            height: isMobile ? '28px' : '32px',
            marginRight: isMobile ? '8px' : '12px'
          }}
        />
        <Title 
          level={isMobile ? 5 : 4} 
          style={{ 
            color: 'white', 
            margin: 0,
            fontSize: isMobile ? '14px' : '16px',
            fontWeight: '600'
          }}
        >
          ProductMobile
        </Title>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '8px' }}>
        <Button
          type={location.pathname === '/' ? 'primary' : 'default'}
          onClick={() => handleNavigation('/')}
          size={isMobile ? 'small' : 'middle'}
          style={{
            color: location.pathname === '/' ? 'white' : '#1890ff',
            borderColor: '#1890ff',
            backgroundColor: location.pathname === '/' ? '#1890ff' : 'transparent',
            fontSize: isMobile ? '12px' : '14px',
            padding: isMobile ? '4px 8px' : '6px 12px',
            height: isMobile ? '28px' : '32px',
            minWidth: isMobile ? '60px' : '80px'
          }}
        >
          Dashboard
        </Button>
        <Button
          type={location.pathname === '/factories' ? 'primary' : 'default'}
          onClick={() => handleNavigation('/factories')}
          size={isMobile ? 'small' : 'middle'}
          style={{
            color: location.pathname === '/factories' ? 'white' : '#1890ff',
            borderColor: '#1890ff',
            backgroundColor: location.pathname === '/factories' ? '#1890ff' : 'transparent',
            fontSize: isMobile ? '12px' : '14px',
            padding: isMobile ? '4px 8px' : '6px 12px',
            height: isMobile ? '28px' : '32px',
            minWidth: isMobile ? '60px' : '80px'
          }}
        >
          Fábricas
        </Button>
        <Button
          type={location.pathname === '/products' ? 'primary' : 'default'}
          onClick={() => handleNavigation('/products')}
          size={isMobile ? 'small' : 'middle'}
          style={{
            color: location.pathname === '/products' ? 'white' : '#1890ff',
            borderColor: '#1890ff',
            backgroundColor: location.pathname === '/products' ? '#1890ff' : 'transparent',
            fontSize: isMobile ? '12px' : '14px',
            padding: isMobile ? '4px 8px' : '6px 12px',
            height: isMobile ? '28px' : '32px',
            minWidth: isMobile ? '60px' : '80px'
          }}
        >
          Produtos
        </Button>
      </div>
    </Header>
  );
};

export default AppHeader;
