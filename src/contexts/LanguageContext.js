import React, { createContext, useContext, useState } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('pt'); // 'pt' ou 'zh'

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'pt' ? 'zh' : 'pt');
  };

  const t = (ptText, zhText) => {
    if (language === 'zh') {
      return zhText;
    }
    return ptText;
  };

  const value = {
    language,
    toggleLanguage,
    t
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
