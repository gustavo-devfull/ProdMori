import React, { useState, useEffect } from 'react';
import { Spinner } from 'react-bootstrap';
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
    console.log('CustomImage - src recebido:', src);
    let isMounted = true;
    
    if (src) {
      const processedUrl = imageService.getImageUrl(src);
      console.log('CustomImage - URL processada:', processedUrl);
      
      if (isMounted) {
        setImageUrl(processedUrl);
        setLoading(true);
        setError(false);
        setRetryCount(0);
      }
    } else {
      console.log('CustomImage - src vazio ou inválido');
      
      if (isMounted) {
        setImageUrl('');
        setLoading(false);
        setError(true);
      }
    }
    
    return () => {
      isMounted = false;
    };
  }, [src]);

  // Pré-carregar imagem quando a URL muda
  useEffect(() => {
    if (imageUrl && imageUrl !== '') {
      console.log('CustomImage - Iniciando pré-carregamento:', imageUrl);
      let isMounted = true;
      
      const img = new Image();
      img.onload = () => {
        if (isMounted) {
          console.log('CustomImage - Pré-carregamento bem-sucedido:', imageUrl);
          setLoading(false);
          setError(false);
        }
      };
      img.onerror = (e) => {
        if (isMounted) {
          console.log('CustomImage - Erro no pré-carregamento:', imageUrl, e);
          // Tentar novamente após um pequeno delay se for uma URL local
          if (imageUrl.includes('localhost:3001') && retryCount < 2) {
            console.log('CustomImage - Tentando novamente após erro...');
            setTimeout(() => {
              if (isMounted) {
                const retryImg = new Image();
                retryImg.onload = () => {
                  if (isMounted) {
                    console.log('CustomImage - Retry bem-sucedido:', imageUrl);
                    setLoading(false);
                    setError(false);
                  }
                };
                retryImg.onerror = () => {
                  if (isMounted) {
                    console.log('CustomImage - Retry falhou:', imageUrl);
                    setLoading(false);
                    setError(true);
                  }
                };
                retryImg.src = imageUrl;
              }
            }, 500);
          } else {
            setLoading(false);
            setError(true);
          }
        }
      };
      img.src = imageUrl;
      
      return () => {
        isMounted = false;
      };
    }
  }, [imageUrl, retryCount]);


  const handleRetry = async () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      setLoading(true);
      setError(false);
      
      // Aguardar um pouco antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Recarregar a imagem apenas se o componente ainda estiver montado
      if (imageUrl) {
        const img = new Image();
        img.onload = () => {
          setLoading(false);
          setError(false);
        };
        img.onerror = () => {
          setLoading(false);
          setError(true);
        };
        img.src = imageUrl;
      }
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
    aspectRatio: '1 / 1', // Força formato quadrado
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
          border: '1px solid #d9d9d9',
          width: '100%',
          height: '250px',
          objectFit: 'contain',
          aspectRatio: '1 / 1' // Força formato quadrado no loading
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
          color: '#999',
          aspectRatio: '1 / 1' // Força formato quadrado no erro
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
      src={imageUrl}
      alt={alt || 'Imagem do produto'}
      style={hoverStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={showPreview ? handlePreview : undefined}
      title={showPreview ? 'Clique para visualizar' : undefined}
      {...props}
    />
  );

  return imageElement;
};

export default CustomImage;