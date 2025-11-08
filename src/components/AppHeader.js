import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import './AppHeader.css';

const AppHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { logout, user } = useAuth();
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

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // Determinar qual item está ativo
  const isActive = (path) => {
    if (path === '/dashboard' || path === '/') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  // Obter informações do usuário
  const getUserInitial = () => {
    if (user?.displayName) {
      return user.displayName.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getUserName = () => {
    if (user?.displayName) {
      return user.displayName;
    }
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1) + ' Santos';
    }
    return 'Guto Santos';
  };

  const getUserRole = () => {
    // Verificar se é admin
    const adminEmails = ['gutopc@gmail.com', 'vinicius@ravi.com.br', 'cotacao@ravi.com.br'];
    if (user?.email && adminEmails.includes(user.email)) {
      return 'Administrador';
    }
    return 'Usuário';
  };

  return (
    <header className="app-header">
      {/* Left: Logo and Title */}
      {!isMobile && (
        <div className="app-header-left">
          <img 
            src="/RAVI-LOGO-COLOR.svg" 
            alt="RAVI Logo" 
            className="app-header-logo"
          />
          <h1 className="app-header-title">
            {t('Cotação Online', '在线报价')}
          </h1>
        </div>
      )}

      {/* Center: Navigation Menu */}
      <nav className="app-header-nav">
        <button
          className={`app-header-nav-item ${isActive('/dashboard') || isActive('/') ? 'active' : ''}`}
          onClick={() => handleNavigation('/dashboard')}
          title={t('Fábricas', '工厂')}
        >
          <i className="bi bi-shop"></i>
          {!isMobile && <span>{t('Fábricas', '工厂')}</span>}
        </button>

        {!isMobile && <span className="app-header-nav-divider">|</span>}

        <button
          className={`app-header-nav-item ${isActive('/products') ? 'active' : ''}`}
          onClick={() => handleNavigation('/products')}
          title={t('Produtos', '产品')}
        >
          <i className="bi bi-box-seam"></i>
          {!isMobile && <span>{t('Produtos', '产品')}</span>}
        </button>

        {!isMobile && <span className="app-header-nav-divider">|</span>}

        <button
          className={`app-header-nav-item ${isActive('/tags') ? 'active' : ''}`}
          onClick={() => handleNavigation('/tags')}
          title={t('Tags', '标签')}
        >
          <i className="bi bi-tags"></i>
          {!isMobile && <span>{t('Tags', '标签')}</span>}
        </button>

        {!isMobile && <span className="app-header-nav-divider">|</span>}

        <button
          className="app-header-logout-btn"
          onClick={handleLogout}
          title={t('Sair', '退出')}
        >
          <i className="bi bi-box-arrow-right"></i>
          {!isMobile && <span>{t('Sair', '退出')}</span>}
        </button>
      </nav>

      {/* Right: User Profile - Only Desktop */}
      {!isMobile && (
        <div className="app-header-right">
          <div className="app-header-user">
            <div className="app-header-avatar">
              {getUserInitial()}
            </div>
            <div className="app-header-user-info">
              <p className="app-header-user-name">
                {getUserName()}
              </p>
              <p className="app-header-user-role">
                {getUserRole()}
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default AppHeader;
