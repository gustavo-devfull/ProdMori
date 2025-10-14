import React from 'react';
import { Form } from 'react-bootstrap';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageToggle = () => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <div className="d-flex justify-content-center align-items-center py-2 bg-light border-bottom">
      <div className="language-toggle-container d-flex align-items-center gap-3">
        <span className="text-muted small">Choose the language</span>
        <Form.Check
          type="switch"
          id="language-switch"
          label={language === 'pt' ? 'PT' : '中文'}
          checked={language === 'zh'}
          onChange={toggleLanguage}
          style={{ color: '#333' }}
        />
      </div>
    </div>
  );
};

export default LanguageToggle;
