import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Button } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const AppHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
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
    <Navbar bg="dark" variant="dark" className="px-3">
      <Navbar.Brand className="d-flex align-items-center">
        <img 
          src="/RAVI-LOGO-COLOR.svg" 
          alt="RAVI Logo" 
          style={{ 
            height: isMobile ? '32px' : '40px'
          }}
        />
      </Navbar.Brand>
      
      <Nav className="ms-auto d-flex align-items-center gap-2">
        <Button
          variant={location.pathname === '/' ? 'primary' : 'outline-light'}
          onClick={() => handleNavigation('/')}
          size={isMobile ? 'sm' : 'md'}
          className="px-2 fw-semibold"
          style={location.pathname === '/' ? {
            backgroundColor: '#0d6efd',
            borderColor: '#0d6efd',
            color: 'white'
          } : {
            backgroundColor: 'transparent',
            borderColor: 'white',
            color: 'white'
          }}
          title={t('Dashboard', '仪表板')}
        >
          <i className="bi bi-speedometer2"></i>
        </Button>
        <Button
          variant={location.pathname === '/factories' ? 'primary' : 'outline-light'}
          onClick={() => handleNavigation('/factories')}
          size={isMobile ? 'sm' : 'md'}
          className="px-3 fw-semibold"
          style={location.pathname === '/factories' ? {
            backgroundColor: '#0d6efd',
            borderColor: '#0d6efd',
            color: 'white'
          } : {
            backgroundColor: 'transparent',
            borderColor: 'white',
            color: 'white'
          }}
        >
          {t('Fábricas', '工厂')}
        </Button>
        <Button
          variant={location.pathname === '/products' ? 'primary' : 'outline-light'}
          onClick={() => handleNavigation('/products')}
          size={isMobile ? 'sm' : 'md'}
          className="px-3 fw-semibold"
          style={location.pathname === '/products' ? {
            backgroundColor: '#0d6efd',
            borderColor: '#0d6efd',
            color: 'white'
          } : {
            backgroundColor: 'transparent',
            borderColor: 'white',
            color: 'white'
          }}
        >
          {t('Produtos', '产品')}
        </Button>
      </Nav>
    </Navbar>
  );
};

export default AppHeader;
