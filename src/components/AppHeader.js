import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Button } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';

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
    <Navbar bg="dark" variant="dark" expand="lg" className="px-3">
      <Navbar.Brand className="d-flex align-items-center">
        <img 
          src="/RAVI-LOGO-BRANCO.svg" 
          alt="RAVI Logo" 
          style={{ 
            height: isMobile ? '32px' : '40px'
          }}
        />
      </Navbar.Brand>
      
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        <Nav className="ms-auto d-flex align-items-center gap-2">
          <Button
            variant={location.pathname === '/' ? 'primary' : 'outline-primary'}
            onClick={() => handleNavigation('/')}
            size={isMobile ? 'sm' : 'md'}
            className="px-3"
          >
            Dashboard
          </Button>
          <Button
            variant={location.pathname === '/factories' ? 'primary' : 'outline-primary'}
            onClick={() => handleNavigation('/factories')}
            size={isMobile ? 'sm' : 'md'}
            className="px-3"
          >
            Fábricas
          </Button>
          <Button
            variant={location.pathname === '/products' ? 'primary' : 'outline-primary'}
            onClick={() => handleNavigation('/products')}
            size={isMobile ? 'sm' : 'md'}
            className="px-3"
          >
            Produtos
          </Button>
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
};

export default AppHeader;
