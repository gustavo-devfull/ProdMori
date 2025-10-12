import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import AppHeader from './components/AppHeader';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Factories from './pages/Factories';
import Products from './pages/Products';

const { Content } = Layout;

function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader />
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
  );
}

export default App;
