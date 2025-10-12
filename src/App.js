import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import AppHeader from './components/AppHeader';
import AppSidebar from './components/AppSidebar';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Factories from './pages/Factories';
import Products from './pages/Products';

const { Content } = Layout;

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMenuClick = () => {
    if (isMobile) {
      setDrawerVisible(true);
    } else {
      setCollapsed(!collapsed);
    }
  };

  const handleDrawerClose = () => {
    setDrawerVisible(false);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppSidebar 
        collapsed={collapsed}
        onCollapse={setCollapsed}
        isMobile={isMobile}
        visible={drawerVisible}
        onClose={handleDrawerClose}
      />
      <Layout>
        <AppHeader onMenuClick={handleMenuClick} />
        <Content className="ant-layout-content">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/factories" element={<Factories />} />
              <Route path="/products" element={<Products />} />
            </Routes>
          </ErrorBoundary>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
