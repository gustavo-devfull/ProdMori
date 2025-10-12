import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import AppHeader from './components/AppHeader';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Factories from './pages/Factories';
import Products from './pages/Products';

function App() {
  return (
    <div className="min-vh-100 d-flex flex-column">
      <AppHeader />
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
  );
}

export default App;
