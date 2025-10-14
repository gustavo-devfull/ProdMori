import React, { createContext, useContext, useState, useCallback } from 'react';
import translationService from '../services/translationService';

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
  const [isTranslating, setIsTranslating] = useState(false);

  const toggleLanguage = useCallback(async () => {
    const newLanguage = language === 'pt' ? 'zh' : 'pt';
    setLanguage(newLanguage);
    
    // Disparar evento personalizado para notificar componentes sobre mudança de idioma
    window.dispatchEvent(new CustomEvent('languageChanged', { 
      detail: { 
        newLanguage, 
        previousLanguage: language 
      } 
    }));
  }, [language]);

  const t = (ptText, zhText) => {
    if (language === 'zh') {
      return zhText;
    }
    return ptText;
  };

  // Função para traduzir texto automaticamente
  const translateText = useCallback(async (text) => {
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return text;
    }

    try {
      setIsTranslating(true);
      const translatedText = await translationService.autoTranslate(text, language);
      return translatedText;
    } catch (error) {
      console.warn('Auto-translation failed:', error);
      return text;
    } finally {
      setIsTranslating(false);
    }
  }, [language]);

  // Função para traduzir múltiplos campos
  const translateFields = useCallback(async (fields) => {
    if (!fields || typeof fields !== 'object') {
      return fields;
    }

    try {
      setIsTranslating(true);
      const translatedFields = {};
      
      for (const [key, value] of Object.entries(fields)) {
        if (value && typeof value === 'string' && value.trim() !== '') {
          translatedFields[key] = await translationService.autoTranslate(value, language);
        } else {
          translatedFields[key] = value;
        }
      }
      
      return translatedFields;
    } catch (error) {
      console.warn('Auto-translation of fields failed:', error);
      return fields;
    } finally {
      setIsTranslating(false);
    }
  }, [language]);

  const value = {
    language,
    toggleLanguage,
    t,
    translateText,
    translateFields,
    isTranslating
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
