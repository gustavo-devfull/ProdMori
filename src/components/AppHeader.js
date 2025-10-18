import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Button, Dropdown } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const AppHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, toggleLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  
  // Detectar se estamos na página de produtos
  const isProductsPage = location.pathname === '/products';
  // Detectar se estamos na página de tags
  const isTagsPage = location.pathname === '/tags';

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

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <Navbar bg="dark" variant="dark" className="px-3">
      <Navbar.Brand className="d-flex align-items-center">
        {/* Logo Ravi - oculto em mobile */}
        {!isMobile && (
          <img 
            src="/RAVI-LOGO-COLOR.svg" 
            alt="RAVI Logo" 
            style={{ 
              height: '40px'
            }}
          />
        )}
        
        {/* Ícone de Tradução */}
        <Dropdown 
          show={showLanguageDropdown} 
          onToggle={setShowLanguageDropdown}
          className={!isMobile ? "ms-3" : ""}
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
      
      <Nav className="ms-auto d-flex align-items-center" style={{ gap: isMobile ? '8px' : '12px' }}>
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
          title={t('Fábricas', '工厂')}
        >
          {t('FÁBRICAS', '工厂')}
        </Button>
        
        <Button
          variant={isProductsPage ? "success" : "outline-light"}
          onClick={() => handleNavigation('/products')}
          size={isMobile ? 'sm' : 'md'}
          className="px-3 d-flex align-items-center"
          style={{
            backgroundColor: isProductsPage ? '#198754' : 'transparent',
            borderColor: isProductsPage ? '#198754' : 'white',
            color: 'white'
          }}
          title={t('Produtos', '产品')}
        >
          <i className="bi bi-box-seam"></i>
        </Button>

        <Button
          variant={isTagsPage ? "warning" : "outline-light"}
          onClick={() => handleNavigation('/tags')}
          size={isMobile ? 'sm' : 'md'}
          className="px-3 d-flex align-items-center"
          style={{
            backgroundColor: isTagsPage ? '#ffc107' : 'transparent',
            borderColor: isTagsPage ? '#ffc107' : 'white',
            color: 'white'
          }}
          title={t('Tags', '标签')}
        >
          <i className="bi bi-tags"></i>
        </Button>

        {/* Botão de Logout */}
        <Button
          variant="outline-danger"
          onClick={handleLogout}
          size={isMobile ? 'sm' : 'md'}
          className="px-3 d-flex align-items-center"
          style={{
            backgroundColor: 'transparent',
            borderColor: '#dc3545',
            color: '#dc3545',
            minWidth: isMobile ? '40px' : 'auto'
          }}
          title={t('Sair', '退出')}
        >
          <i className="bi bi-box-arrow-right"></i>
          {!isMobile && <span className="ms-1">{t('Sair', '退出')}</span>}
        </Button>
      </Nav>
    </Navbar>
  );
};

export default AppHeader;
