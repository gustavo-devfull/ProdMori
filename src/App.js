import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import AppHeader from './components/AppHeader';
import LanguageToggle from './components/LanguageToggle';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Factories from './pages/Factories';
import Products from './pages/Products';
import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      <div className="min-vh-100 d-flex flex-column">
        <AppHeader />
        <LanguageToggle />
        <Container fluid className="flex-grow-1 py-3">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/factories" element={<Factories />} />
              <Route path="/products" element={<Products />} />
            </Routes>
          </ErrorBoundary>
        </Container>
      </div>
    </LanguageProvider>
  );
}

export default App;
