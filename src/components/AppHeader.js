import React, { useState, useEffect } from 'react';
import { Layout, Typography, Button } from 'antd';
import { ShopOutlined, MenuOutlined } from '@ant-design/icons';

const { Header } = Layout;
const { Title } = Typography;

const AppHeader = ({ onMenuClick }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <Header className="ant-layout-header" style={{ 
      display: 'flex', 
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Button
          type="text"
          icon={<MenuOutlined />}
          onClick={onMenuClick}
          style={{ 
            color: 'white', 
            marginRight: '16px',
            display: 'block'
          }}
          className="mobile-menu-button"
        />
        <ShopOutlined 
          style={{ 
            fontSize: '24px', 
            color: 'white', 
            marginRight: '16px',
            display: isMobile ? 'none' : 'block'
          }} 
        />
        <Title 
          level={isMobile ? 4 : 3} 
          style={{ color: 'white', margin: 0 }}
        >
          {isMobile ? 'ProductMobile' : 'Sistema de Produtos China'}
        </Title>
      </div>
    </Header>
  );
};

export default AppHeader;
