import React, { useState, useEffect } from 'react';
import { Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import imageService from '../services/imageService';

const CustomImage = ({ 
  src, 
  alt, 
  style = {}, 
  fallback, 
  onError,
  showPreview = false,
  onPreview,
  ...props 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [imageUrl, setImageUrl] = useState('');

  // Processar URL da imagem quando src muda
  useEffect(() => {
    if (src) {
      const processedUrl = imageService.getImageUrl(src);
      setImageUrl(processedUrl);
      setLoading(true);
      setError(false);
      setRetryCount(0);
    } else {
      setImageUrl('');
      setLoading(false);
      setError(true);
    }
  }, [src]);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = (e) => {
    setLoading(false);
    setError(true);
    if (onError) {
      onError(e);
    }
  };

  const handleRetry = async () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      setLoading(true);
      setError(false);
      
      // Aguardar um pouco antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Recarregar a imagem
      const img = new Image();
      img.onload = handleLoad;
      img.onerror = handleError;
      img.src = imageUrl;
    }
  };

  const handlePreview = () => {
    if (onPreview && imageUrl) {
      onPreview(imageUrl);
    }
  };

  const defaultStyle = {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    borderRadius: '8px',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    cursor: showPreview ? 'pointer' : 'default',
    ...style
  };

  const hoverStyle = {
    ...defaultStyle,
    transform: hovered ? 'scale(1.05)' : 'scale(1)',
    boxShadow: hovered ? '0 8px 25px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.1)'
  };

  if (loading) {
    return (
      <div 
        style={{
          ...defaultStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          border: '1px solid #d9d9d9'
        }}
      >
        <Spinner animation="border" size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div 
        style={{
          ...defaultStyle,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          border: '1px solid #d9d9d9',
          color: '#999'
        }}
      >
        <i className="bi bi-image text-muted fs-1"></i>
        <small className="mt-2">Erro ao carregar imagem</small>
        {retryCount < 3 && (
          <button 
            className="btn btn-sm btn-outline-secondary mt-2"
            onClick={handleRetry}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  const imageElement = (
    <img
      src={imageUrl || src}
      alt={alt || 'Imagem do produto'}
      style={hoverStyle}
      onLoad={handleLoad}
      onError={handleError}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={showPreview ? handlePreview : undefined}
      {...props}
    />
  );

  if (showPreview) {
    return (
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip>
            Clique para visualizar
          </Tooltip>
        }
      >
        {imageElement}
      </OverlayTrigger>
    );
  }

  return imageElement;
};

export default CustomImage;