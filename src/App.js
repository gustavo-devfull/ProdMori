import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import AppHeader from './components/AppHeader';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import CreateAdminUser from './components/CreateAdminUser';
import Dashboard from './pages/Dashboard';
import Factories from './pages/Factories';
import Products from './pages/Products';
import FactoryDetail from './pages/FactoryDetail';
import FactoryCreate from './pages/FactoryCreate';
import Tags from './pages/Tags';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <div className="min-vh-100 d-flex flex-column">
          <Routes>
            <Route path="/create-admin" element={<CreateAdminUser />} />
            <Route path="*" element={
              <ProtectedRoute>
                <AppHeader />
                <Container fluid className="flex-grow-1 py-3">
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/factories" element={<Factories />} />
                      <Route path="/products" element={<Products />} />
                      <Route path="/factory/:factoryId" element={<FactoryDetail />} />
                      <Route path="/factory/create" element={<FactoryCreate />} />
                      <Route path="/tags" element={<Tags />} />
                    </Routes>
                  </ErrorBoundary>
                </Container>
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
