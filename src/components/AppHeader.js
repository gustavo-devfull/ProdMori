import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Button, Dropdown } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const AppHeader = () => {
  const navigate = useNavigate();
  const { t, language, toggleLanguage } = useLanguage();
  const [isMobile, setIsMobile] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

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
        
        {/* Ícone de Tradução */}
        <Dropdown 
          show={showLanguageDropdown} 
          onToggle={setShowLanguageDropdown}
          className="ms-3"
        >
          <Dropdown.Toggle 
            variant="outline-light" 
            size="sm"
            className="d-flex align-items-center"
            style={{
              backgroundColor: 'transparent',
              borderColor: 'rgba(255,255,255,0.5)',
              color: 'white',
              padding: '4px 8px'
            }}
            title={t('Choose Language', '选择语言')}
          >
            <i className="bi bi-translate me-1"></i>
            <span className="small">{language === 'pt' ? 'PT' : '中文'}</span>
          </Dropdown.Toggle>
          
          <Dropdown.Menu align="end">
            <Dropdown.Item 
              active={language === 'pt'}
              onClick={() => {
                if (language !== 'pt') {
                  toggleLanguage();
                }
                setShowLanguageDropdown(false);
              }}
            >
              <i className="bi bi-flag me-2"></i>
              Português
            </Dropdown.Item>
            <Dropdown.Item 
              active={language === 'zh'}
              onClick={() => {
                if (language !== 'zh') {
                  toggleLanguage();
                }
                setShowLanguageDropdown(false);
              }}
            >
              <i className="bi bi-flag me-2"></i>
              中文
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </Navbar.Brand>
      
      <Nav className="ms-auto d-flex align-items-center gap-3">
        <Button
          variant="primary"
          onClick={() => handleNavigation('/')}
          size={isMobile ? 'sm' : 'md'}
          className="px-3 fw-semibold"
          style={{
            backgroundColor: '#0d6efd',
            borderColor: '#0d6efd',
            color: 'white'
          }}
          title={t('Dashboard', '仪表板')}
        >
          {t('DASHBOARD', '仪表板')}
        </Button>
        
        <Button
          variant="outline-light"
          onClick={() => handleNavigation('/products')}
          size={isMobile ? 'sm' : 'md'}
          className="px-3 d-flex align-items-center"
          style={{
            backgroundColor: 'transparent',
            borderColor: 'white',
            color: 'white'
          }}
          title={t('Produtos', '产品')}
        >
          <i className="bi bi-box-seam"></i>
        </Button>
      </Nav>
    </Navbar>
  );
};

export default AppHeader;
