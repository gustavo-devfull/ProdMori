import React, { useState } from 'react';
import { Spin } from 'antd';
import { ShoppingOutlined } from '@ant-design/icons';

const CustomImage = ({ 
  src, 
  alt, 
  style = {}, 
  fallback, 
  onError,
  ...props 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  const defaultStyle = {
    width: '100%',
    height: '200px',
    objectFit: 'contain',
    backgroundColor: '#f5f5f5',
    ...style
  };

  const placeholderStyle = {
    ...defaultStyle,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999',
    backgroundColor: '#f5f5f5'
  };

  if (error || !src) {
    return (
      <div style={placeholderStyle}>
        <ShoppingOutlined style={{ fontSize: '48px' }} />
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', ...defaultStyle }}>
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
          zIndex: 1
        }}>
          <Spin size="large" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        style={{
          ...defaultStyle,
          opacity: loading ? 0 : 1,
          transition: 'opacity 0.3s ease'
        }}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  );
};

export default CustomImage;
