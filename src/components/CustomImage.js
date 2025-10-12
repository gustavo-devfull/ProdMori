import React, { useState, useEffect } from 'react';
import { Spin, Tooltip } from 'antd';
import { ShoppingOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
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
      
      // Tentar novamente após um pequeno delay
      setTimeout(() => {
        const img = new Image();
        img.onload = handleLoad;
        img.onerror = handleError;
        img.src = imageUrl;
      }, 1000);
    }
  };

  const defaultStyle = {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px 8px 0 0',
    transition: 'all 0.3s ease',
    ...style
  };

  const placeholderStyle = {
    ...defaultStyle,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px 8px 0 0'
  };

  const handlePreview = (e) => {
    e.stopPropagation();
    if (onPreview) {
      onPreview(imageUrl);
    }
  };

  if (error || !src) {
    return (
      <div style={placeholderStyle}>
        <div style={{ textAlign: 'center' }}>
          <ShoppingOutlined style={{ fontSize: '48px', marginBottom: '8px' }} />
          <div style={{ fontSize: '12px', color: '#999' }}>
            {!src ? 'Sem imagem' : 'Erro ao carregar'}
          </div>
          {src && retryCount < 3 && (
            <button
              onClick={handleRetry}
              style={{
                marginTop: '8px',
                padding: '4px 8px',
                fontSize: '12px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                backgroundColor: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <ReloadOutlined />
              Tentar novamente
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{ 
        position: 'relative', 
        ...defaultStyle,
        cursor: showPreview ? 'pointer' : 'default'
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={showPreview ? handlePreview : undefined}
    >
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          zIndex: 1,
          borderRadius: '8px 8px 0 0'
        }}>
          <Spin size="large" />
        </div>
      )}
      
      {showPreview && hovered && !loading && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          borderRadius: '4px',
          padding: '4px',
          zIndex: 2,
          transition: 'all 0.3s ease'
        }}>
          <Tooltip title="Visualizar imagem">
            <EyeOutlined style={{ color: 'white', fontSize: '16px' }} />
          </Tooltip>
        </div>
      )}

      <img
        src={imageUrl || src}
        alt={alt}
        style={{
          ...defaultStyle,
          opacity: loading ? 0 : 1,
          transform: hovered ? 'scale(1.05)' : 'scale(1)',
          transition: 'all 0.3s ease'
        }}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  );
};

export default CustomImage;

