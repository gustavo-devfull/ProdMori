import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import AppHeader from './components/AppHeader';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Factories from './pages/Factories';
import Products from './pages/Products';
import FactoryDetail from './pages/FactoryDetail';
import Tags from './pages/Tags';
import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      <div className="min-vh-100 d-flex flex-column">
        <AppHeader />
        <Container fluid className="flex-grow-1 py-3">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/factories" element={<Factories />} />
              <Route path="/products" element={<Products />} />
              <Route path="/factory/:factoryId" element={<FactoryDetail />} />
              <Route path="/tags" element={<Tags />} />
            </Routes>
          </ErrorBoundary>
        </Container>
      </div>
    </LanguageProvider>
  );
}

export default App;
