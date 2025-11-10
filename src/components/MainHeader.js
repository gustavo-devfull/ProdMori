import React, { useState } from 'react';
import './MainHeader.css';

const MainHeader = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const navigationLinks = [
    {
      label: 'Sistemas Cotações Online',
      url: 'https://prod-mori.vercel.app/',
      icon: 'bi-cart',
      colorClass: 'bg-blue-600 hover:bg-blue-700 text-white'
    },
    {
      label: 'Gerenciador de Cotações',
      url: 'https://cotacoes2025.vercel.app/',
      icon: 'bi-clipboard-check',
      colorClass: 'bg-green-600 hover:bg-green-700 text-white'
    },
    {
      label: 'Base de Produtos',
      url: 'https://baseravi2025.vercel.app/',
      icon: 'bi-box-seam',
      colorClass: 'bg-orange-600 hover:bg-orange-700 text-white'
    },
    {
      label: 'Controle Pedidos',
      url: 'https://controle-pedidos-ravi.vercel.app/',
      icon: 'bi-bag',
      colorClass: 'bg-purple-600 hover:bg-purple-700 text-white'
    }
  ];

  return (
    <header className={`main-header ${isCollapsed ? 'main-header-collapsed' : ''}`}>
      {/* Botão de Colapsar/Expandir */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="main-header-toggle-btn"
        aria-label={isCollapsed ? 'Expandir menu' : 'Colapsar menu'}
      >
        {isCollapsed ? (
          <i className="bi bi-chevron-down"></i>
        ) : (
          <i className="bi bi-chevron-up"></i>
        )}
      </button>

      {!isCollapsed && (
        <div className="main-header-content">
          {/* Menu Desktop - Grid com Boxes */}
          <div className="main-header-grid-desktop">
            {navigationLinks.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`main-header-link-box ${link.colorClass}`}
              >
                <div className="main-header-icon-wrapper">
                  <i className={`bi ${link.icon}`}></i>
                </div>
                <span className="main-header-link-label">{link.label}</span>
              </a>
            ))}
          </div>

          {/* Menu Mobile - Grid com Boxes */}
          <div className="main-header-grid-mobile">
            {navigationLinks.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsCollapsed(true)}
                className={`main-header-link-box-mobile ${link.colorClass}`}
              >
                <div className="main-header-icon-wrapper-mobile">
                  <i className={`bi ${link.icon}`}></i>
                </div>
                <span className="main-header-link-label-mobile">{link.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default MainHeader;
