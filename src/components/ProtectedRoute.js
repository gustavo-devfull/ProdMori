import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from '../components/Login';
import { Spinner } from 'react-bootstrap';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  console.log('🛡️ ProtectedRoute - Estado:', { user: user ? 'logado' : 'não logado', loading });

  if (loading) {
    console.log('🛡️ ProtectedRoute - Mostrando tela de carregamento...');
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('🛡️ ProtectedRoute - Mostrando tela de login...');
    return <Login />;
  }

  console.log('🛡️ ProtectedRoute - Usuário autenticado, renderizando conteúdo protegido');
  return children;
};

export default ProtectedRoute;
