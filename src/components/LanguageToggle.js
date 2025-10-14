import React from 'react';
import { Form } from 'react-bootstrap';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageToggle = () => {
  const { language, toggleLanguage, t } = useLanguage();

  // Determinar qual idioma será ativado quando o toggle for clicado
  const nextLanguage = language === 'pt' ? '中文' : 'PT';
  const currentLanguage = language === 'pt' ? 'PT' : '中文';

  return (
    <div className="d-flex justify-content-center align-items-center py-2 bg-light border-bottom">
      <div className="language-toggle-container d-flex align-items-center gap-3">
        <span className="text-muted small">{t('Choose the language', '选择语言')}</span>
        <div className="d-flex align-items-center gap-2">
          <span className="small text-muted">{currentLanguage}</span>
          <Form.Check
            type="switch"
            id="language-switch"
            label={nextLanguage}
            checked={language === 'zh'}
            onChange={toggleLanguage}
            style={{ color: '#333' }}
          />
        </div>
      </div>
    </div>
  );
};

export default LanguageToggle;
