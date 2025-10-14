import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

// Hook para tradução automática de campos
export const useAutoTranslation = (initialFields = {}) => {
  const { language, translateFields, isTranslating } = useLanguage();
  const [fields, setFields] = useState(initialFields);
  const [translatedFields, setTranslatedFields] = useState(initialFields);

  // Função para atualizar campos
  const updateFields = useCallback((newFields) => {
    setFields(newFields);
  }, []);

  // Função para traduzir campos manualmente
  const translateCurrentFields = useCallback(async () => {
    if (Object.keys(fields).length === 0) return;
    
    try {
      const translated = await translateFields(fields);
      setTranslatedFields(translated);
    } catch (error) {
      console.warn('Failed to translate fields:', error);
      setTranslatedFields(fields);
    }
  }, [fields, translateFields]);

  // Escutar mudanças de idioma
  useEffect(() => {
    const handleLanguageChange = async (event) => {
      const { newLanguage, previousLanguage } = event.detail;
      
      // Se mudou de português para chinês ou vice-versa, traduzir campos
      if (previousLanguage !== newLanguage && Object.keys(fields).length > 0) {
        try {
          const translated = await translateFields(fields);
          setTranslatedFields(translated);
        } catch (error) {
          console.warn('Failed to auto-translate on language change:', error);
        }
      }
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, [fields, translateFields]);

  return {
    fields,
    translatedFields,
    updateFields,
    translateCurrentFields,
    isTranslating
  };
};

// Hook para tradução automática de texto simples
export const useAutoTranslateText = (initialText = '') => {
  const { language, translateText, isTranslating } = useLanguage();
  const [text, setText] = useState(initialText);
  const [translatedText, setTranslatedText] = useState(initialText);

  // Função para atualizar texto
  const updateText = useCallback((newText) => {
    setText(newText);
  }, []);

  // Função para traduzir texto manualmente
  const translateCurrentText = useCallback(async () => {
    if (!text || text.trim() === '') {
      setTranslatedText(text);
      return;
    }
    
    try {
      const translated = await translateText(text);
      setTranslatedText(translated);
    } catch (error) {
      console.warn('Failed to translate text:', error);
      setTranslatedText(text);
    }
  }, [text, translateText]);

  // Escutar mudanças de idioma
  useEffect(() => {
    const handleLanguageChange = async (event) => {
      const { newLanguage, previousLanguage } = event.detail;
      
      // Se mudou de português para chinês ou vice-versa, traduzir texto
      if (previousLanguage !== newLanguage && text && text.trim() !== '') {
        try {
          const translated = await translateText(text);
          setTranslatedText(translated);
        } catch (error) {
          console.warn('Failed to auto-translate text on language change:', error);
        }
      }
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, [text, translateText]);

  return {
    text,
    translatedText,
    updateText,
    translateCurrentText,
    isTranslating
  };
};
