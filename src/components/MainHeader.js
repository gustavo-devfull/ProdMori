import React from 'react';
import { Container, Navbar, Nav } from 'react-bootstrap';
import './MainHeader.css';

const MainHeader = () => {
  const navigationLinks = [
    {
      label: 'Sistema de Cotações Online',
      url: 'https://prod-mori.vercel.app/',
      variant: 'primary'
    },
    {
      label: 'Exportar Cotações Online',
      url: 'https://exporta-planilha-gamma.vercel.app/',
      variant: 'info'
    },
    {
      label: 'Gerenciador de Cotações',
      url: 'https://cotacoes2025.vercel.app/',
      variant: 'success'
    },
    {
      label: 'Importar Imagens Cotações',
      url: 'https://upload-imagens.onrender.com/',
      variant: 'success'
    },
    {
      label: 'Base de Produtos',
      url: 'https://baseravi2025.vercel.app/',
      variant: 'warning'
    },
    {
      label: 'Importar Imagens Base',
      url: 'https://imagens-base.vercel.app/',
      variant: 'warning'
    },
    {
      label: 'Controle de Pedidos',
      url: 'https://controle-pedidos-ravi.vercel.app/',
      variant: 'light'
    }
  ];

  return (
    <header className="main-header">
      <Container fluid>
        <Nav className="main-header-nav">
          {navigationLinks.map((link, index) => (
            <Nav.Link
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`main-header-link main-header-link-${link.variant}`}
            >
              {link.label}
            </Nav.Link>
          ))}
        </Nav>
      </Container>
    </header>
  );
};

export default MainHeader;

